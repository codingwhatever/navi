import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import config from 'ember-get-config';

let Store, MetadataService;

module('Unit | Model | user', function(hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function() {
    Store = this.owner.lookup('service:store');
    MetadataService = this.owner.lookup('service:bard-metadata');
    await MetadataService.loadMetadata();
  });

  test('Retrieving records', async function(assert) {
    assert.expect(1);

    await run(async () => {
      await Store.findRecord('user', 'navi_user');
      assert.ok(true, 'Found navi user');
    });
  });

  test('Saving records', async function(assert) {
    assert.expect(1);

    await run(async () => {
      const newUser = 'new_user';
      await Store.createRecord('user', { id: newUser }).save();

      Store.unloadAll('user'); // flush cache/store

      await Store.findRecord('user', newUser);
      assert.ok(true, 'Newly created user is successfully persisted');
    });
  });

  test('Linking Reports to Users', function(assert) {
    assert.expect(3);

    run(() => {
      let user = Store.createRecord('user', { id: 'jon_snow' });

      Store.createRecord('report', {
        title: 'How I died! By Jon Snow',
        author: user
      });

      Store.createRecord('report', {
        title: 'You know nothing, Jon Snow',
        author: user
      });

      assert.equal(user.get('reports.length'), 2, 'Two reports are linked to the user');

      assert.deepEqual(
        user.get('reports').map(report => {
          return report.get('title');
        }),
        ['How I died! By Jon Snow', 'You know nothing, Jon Snow'],
        'The user is linked to the report, and the reports can be fetched via the relationship'
      );

      assert.equal(
        user.get('favoriteReports.length'),
        0,
        'Creating reports under a user does not impact their favorite reports'
      );
    });
  });

  test('Favoriting reports', async function(assert) {
    assert.expect(3);

    let naviUser = config.navi.user;

    await run(async () => {
      const user = await Store.findRecord('user', naviUser);
      /**
       * Fetch all reports favorited by test user or else Ember Data throws error when calling `unloadAll`
       * https://github.com/emberjs/data/issues/3084
       */

      await Store.findRecord('report', 2);
      const report = await Store.findRecord('report', 1);

      // Favorite a report
      user.get('favoriteReports').pushObject(report);
      await user.save();

      assert.equal(
        user.get('favoriteReports.lastObject.title'),
        'Hyrule News',
        'Favorite reports contains full report object'
      );

      // flush cache/Store
      Store.unloadAll();

      const savedUser = await Store.findRecord('user', naviUser);

      assert.deepEqual(
        savedUser.get('favoriteReports').mapBy('id'),
        ['2', '1'],
        'Reports can be added to user favorites'
      );

      // Trigger async request and wait
      await savedUser.get('favoriteReports');
      assert.equal(
        savedUser.get('favoriteReports.lastObject.title'),
        'Hyrule News',
        'Accessing favoriteReports relationship returns full report object'
      );
    });
  });

  test('delivery rules relationship', async function(assert) {
    assert.expect(1);

    await run(async () => {
      const deliveryRule = await Store.findRecord('deliveryRule', 1);
      const userModel = await Store.findRecord('user', 'navi_user');
      const rules = await userModel.get('deliveryRules');

      assert.equal(rules.get('firstObject'), deliveryRule, 'user deliveryRule property contains deliveryRule model');
    });
  });
});
