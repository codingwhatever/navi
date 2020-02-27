import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';

module('Unit | Service | navi-search-provider', function(hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  let service;

  hooks.beforeEach(async function() {
    // Load metadata needed for request fragment
    await this.owner.lookup('service:bard-metadata').loadMetadata();
    service = this.owner.lookup('service:navi-search-provider');
    const store = this.owner.lookup('service:store'),
      mockAuthor = store.createRecord('user', { id: 'ciela' });
    this.owner.register(
      'service:user',
      Service.extend({
        getUser: () => mockAuthor
      })
    );
  });

  test('get all search providers', function(assert) {
    let availableSearchProviders = service._all();
    let systemSearchProviders = ['NaviSampleSearchProviderService', 'NaviAssetSearchProviderService'];
    assert.deepEqual(
      availableSearchProviders.map(provider => provider.constructor.name).sort(),
      systemSearchProviders.sort(),
      'Discovered 2 search provider.'
    );
  });

  test('search all providers', async function(assert) {
    let results = await service.search.perform('Revenue');
    assert.ok(
      results.every(result =>
        result.data.filter(d => d.component === 'navi-search-result/sample').every(d => d.includes('Revenue'))
      ),
      'Returns multiple results'
    );
  });

  test('search with no results', async function(assert) {
    let results = await service.search.perform('something');
    assert.equal(results.length, 0, 'Returns no results');
  });
});