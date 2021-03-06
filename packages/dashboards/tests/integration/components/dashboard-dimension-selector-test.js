import { module, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import { setupRenderingTest } from 'ember-qunit';
import { A as arr } from '@ember/array';
import { clickTrigger, selectChoose } from 'ember-power-select/test-support/helpers';
import { settled } from '@ember/test-helpers';

module('Integration | Component | dashboard dimension selector', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders with right options', async function(assert) {
    assert.expect(3);

    const dashboard = {
      widgets: Promise.resolve([
        {
          requests: arr([
            {
              logicalTable: {
                table: {
                  name: 'a',
                  timeGrain: 'day'
                },
                timeGrain: {
                  dimensions: [
                    { name: 'dim1', longName: 'dim1', category: 'cat1' },
                    { name: 'dim2', longName: 'dim2', category: 'cat2' }
                  ]
                }
              }
            }
          ])
        },

        {
          requests: arr([
            {
              logicalTable: {
                table: {
                  name: 'b',
                  timeGrain: 'day'
                },
                timeGrain: {
                  dimensions: [
                    { name: 'dim3', longName: 'dim3', category: 'cat2' },
                    { name: 'dim1', longName: 'dim1', category: 'cat1' }
                  ]
                }
              }
            }
          ])
        }
      ])
    };

    this.set('dashboard', dashboard);

    this.set('changeme', function(selection) {
      assert.deepEqual(
        { dimension: 'dim1', longName: 'dim1', tables: ['a', 'b'] },
        selection,
        'Selection sends correct dimension object'
      );
    });

    await this.render(hbs`{{dashboard-dimension-selector dashboard=dashboard onChange=changeme}}`);

    await settled();

    await clickTrigger();

    const dropdown = document.querySelector('.ember-basic-dropdown-content');

    const structure = [...dropdown.querySelectorAll('.ember-power-select-group')].reduce((obj, el) => {
      const key = el.querySelector('.ember-power-select-group-name').textContent.trim();
      const value = [...el.querySelectorAll('.ember-power-select-option')].map(el => el.textContent.trim());
      return Object.assign({}, obj, { [key]: value });
    }, {});

    assert.deepEqual(structure, { cat1: ['dim1'], cat2: ['dim2', 'dim3'] }, 'Correct select structure is shown');

    assert.dom('.ember-power-select-placeholder').hasText('Select a Dimension');

    await selectChoose('.ember-power-select-trigger', 'dim1');
  });
});
