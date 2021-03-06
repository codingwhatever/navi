import { run } from '@ember/runloop';
import { A } from '@ember/array';
import { helper as buildHelper } from '@ember/component/helper';
import { set, get } from '@ember/object';
import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, findAll, triggerEvent } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { assertTooltipRendered, assertTooltipNotRendered, assertTooltipContent } from 'ember-tooltips/test-support';
import config from 'ember-get-config';
import {
  clickItem,
  clickItemFilter,
  clickShowSelected,
  hasMetricConfig,
  getAll,
  getItem,
  renderAll
} from 'navi-reports/test-support/report-builder';

let Store, MetadataService, AdClicks, PageViews;

module('Integration | Component | metric selector', function(hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function() {
    Store = this.owner.lookup('service:store');
    MetadataService = this.owner.lookup('service:bard-metadata');

    this.owner.register('helper:update-report-action', buildHelper(() => {}), { instantiate: false });
    this.owner.register(
      'helper:can-having',
      buildHelper(([metric]) => {
        return get(metric, 'name') !== 'regUsers';
      }),
      { instantiate: false }
    );

    this.set('addMetric', () => {});
    this.set('removeMetric', () => {});
    this.set('addMetricFilter', () => {});

    return MetadataService.loadMetadata().then(async () => {
      AdClicks = MetadataService.getById('metric', 'adClicks');
      PageViews = MetadataService.getById('metric', 'pageViews');
      //set report object
      this.set(
        'request',
        Store.createFragment('bard-request/request', {
          logicalTable: Store.createFragment('bard-request/fragments/logicalTable', {
            table: MetadataService.getById('table', 'tableA'),
            timeGrainName: 'day'
          }),
          metrics: [
            {
              metric: AdClicks,
              parameters: {
                adType: 'BannerAds'
              }
            },
            {
              metric: AdClicks,
              parameters: {
                adType: 'VideoAds'
              }
            }
          ],
          having: A([{ metric: { metric: AdClicks } }]),
          responseFormat: 'csv'
        })
      );

      await render(hbs`{{metric-selector
            request=request
            onAddMetric=(action addMetric)
            onRemoveMetric=(action removeMetric)
            onToggleMetricFilter=(action addMetricFilter)
          }}`);
    });
  });

  test('it renders', async function(assert) {
    assert.expect(3);

    assert.dom('.checkbox-selector--metric').isVisible('The metric selector component is rendered');

    assert
      .dom('.navi-list-selector')
      .isVisible('a navi-list-selector component is rendered as part of the metric selector');

    assert.dom('.grouped-list').isVisible('a grouped-list component is rendered as part of the metric selector');
  });

  test('show selected', async function(assert) {
    assert.expect(10);
    await renderAll('metric');

    assert.ok(
      findAll('.grouped-list__item').length > this.get('request.metrics.length'),
      'Initially all the metrics are shown in the metric selector'
    );

    assert
      .dom('.navi-list-selector__show-link')
      .hasText('Show Selected (1)', 'The Show Selected link has the correct number of selected base metrics shown');

    let resetShowSelected = await clickShowSelected('metric');

    assert.deepEqual(
      findAll('.grouped-list__item').map(el => el.textContent.trim()),
      ['Ad Clicks'],
      'When show selected is clicked only the selected adClicks base metric is shown'
    );

    assert.notOk(
      findAll('.grouped-list__add-icon--deselected').length,
      'The selected items are marked as added or selected'
    );

    let metrics = get(this, 'request.metrics');
    metrics.removeFragment(metrics.toArray()[0]);

    assert.deepEqual(
      findAll('.grouped-list__item').map(el => el.textContent.trim()),
      ['Ad Clicks'],
      "Removing one metric while another metric with the same base is still selected does not change 'Show Selected'"
    );

    await resetShowSelected();

    assert
      .dom('.navi-list-selector__show-link')
      .hasText(
        'Show Selected (1)',
        'The Show Selected link still has the correct number of selected base metrics shown'
      );

    run(() => {
      metrics.createFragment({
        metric: PageViews,
        parameters: 'Param1'
      });
    });

    assert
      .dom('.navi-list-selector__show-link')
      .hasText(
        'Show Selected (2)',
        'The Show Selected link increases the count when a metric with a different base is added'
      );

    resetShowSelected = await clickShowSelected('metric');

    assert.deepEqual(
      findAll('.grouped-list__item').map(el => el.textContent.trim()),
      ['Ad Clicks', 'Page Views'],
      'Adding a new metric will show its base metric as selected'
    );

    assert.notOk(findAll('.grouped-list__add-icon--deselected').length, 'All selected items are marked as selected');

    await resetShowSelected();

    config.navi.FEATURES.enableRequestPreview = true;

    await render(hbs`{{metric-selector
      request=request
      onAddMetric=(action addMetric)
      onRemoveMetric=(action removeMetric)
      onToggleMetricFilter=(action addMetricFilter)
    }}`);

    await renderAll('metric');
    resetShowSelected = await clickShowSelected('metric');

    assert.equal(
      findAll('.grouped-list__item-container').length,
      findAll('.grouped-list__item-container--selected').length,
      'All selected items are marked as added or selected when enableRequestPreview is on'
    );

    config.navi.FEATURES.enableRequestPreview = false;
    await resetShowSelected();
  });

  test('add and remove metric actions', async function(assert) {
    assert.expect(2);

    this.set('addMetric', metric => {
      assert.equal(metric.get('longName'), 'Total Clicks', 'the clicked metric is passed as a param to the action');
    });

    this.set('removeMetric', metric => {
      assert.equal(metric.get('longName'), 'Ad Clicks', 'the clicked metric is passed as a param to the action');
    });

    //select first time grain

    //add total clicks
    await clickItem('metric', 'Total Clicks');

    //remove ad clicks
    await clickItem('metric', 'Ad Clicks');
  });

  test('filter icon', async function(assert) {
    assert.expect(3);

    let { item: adClicksItem, reset: adClicksReset } = await getItem('metric', 'Ad Clicks');
    assert.ok(
      adClicksItem.querySelector('.grouped-list__filter--active'),
      'The filter icon with the adclicks metric has the active class'
    );
    await adClicksReset();

    let { item: totalClicksItem, reset: totalClicksReset } = await getItem('metric', 'Total Clicks');
    assert.notOk(
      totalClicksItem.querySelector('.grouped-list__filter--active'),
      'The filter icon with the total clicks metric does not have the active class'
    );
    await totalClicksReset();

    this.set('addMetricFilter', metric => {
      assert.deepEqual(metric, AdClicks, 'The adclicks metric is passed to the action when filter icon is clicked');
    });

    await clickItemFilter('metric', 'Ad Clicks');
  });

  test('tooltip', async function(assert) {
    assert.expect(3);

    assertTooltipNotRendered(assert);
    set(AdClicks, 'extended', {
      content: { description: 'foo' }
    });

    // triggerTooltipTargetEvent will not work for hidden elementc
    const { item } = await getItem('metric', 'Ad Clicks');
    await triggerEvent(item.querySelector('.grouped-list__item-info'), 'mouseenter');

    assertTooltipRendered(assert);
    assertTooltipContent(assert, {
      contentString: 'foo'
    });
  });

  test('metric config for metric with parameters', async function(assert) {
    assert.expect(2);

    assert.notOk(
      await hasMetricConfig('Ad Clicks'),
      'The metric config trigger icon is not present for a metric without parameters'
    );

    assert.ok(
      await hasMetricConfig('Revenue'),
      'The metric config trigger icon is present for a metric with parameters'
    );
  });

  test('ranked search', async function(assert) {
    assert.expect(2);

    const pageResults = (await getAll('metric')).filter(item => item.includes('Page'));
    assert.deepEqual(
      pageResults,
      ['Additive Page Views', 'Page Views', 'Total Page Views', 'Total Page Views WoW'],
      'Initially the page view metrics are ordered alphabetically'
    );

    const searchPageResults = await getAll('metric', 'Page');

    assert.deepEqual(
      searchPageResults,
      ['Page Views', 'Total Page Views', 'Additive Page Views', 'Total Page Views WoW'],
      'The search results are ranked based on relevance'
    );
  });

  test('hide filter if metric not allowed to show filter on base metric', async function(assert) {
    const resetRenderAll = await renderAll('metric');
    assert.dom('.grouped-list__icon-set--no-filter').exists({ count: 1 });
    assert.dom('.grouped-list__icon-set--no-filter .grouped-list__filter').doesNotExist();
    assert.dom('.grouped-list__icon-set .grouped-list__filter').exists();
    await resetRenderAll();
  });
});
