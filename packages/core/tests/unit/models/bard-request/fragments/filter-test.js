import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { settled } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import config from 'ember-get-config';
import { A as arr } from '@ember/array';
import { get } from '@ember/object';
import { run } from '@ember/runloop';

let Store, MetadataService;

const TextInput = arr(['mirror', 'shield', 'deku', 'tree']);

const AgeResponse = arr([
  {
    id: '1',
    description: 'under 13'
  },
  {
    id: '2',
    description: '13-17'
  },
  {
    id: '3',
    description: '18-21'
  }
]);

module('Unit | Model Fragment | BardRequest - Filter', function(hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function() {
    Store = this.owner.lookup('service:store');

    this.server.urlPrefix = config.navi.dataSources[0].uri;
    this.server.get(`/v1/dimensions/age/values/`, () => {
      return {
        rows: AgeResponse.slice(0, 2)
      };
    });

    MetadataService = this.owner.lookup('service:bard-metadata');

    await MetadataService.loadMetadata().then(() => {
      //Add instances to the store
      return run(() => {
        Store.pushPayload({
          data: {
            id: 1,
            type: 'fragments-mock',
            attributes: {
              filters: [
                {
                  dimension: 'age',
                  operator: 'in',
                  rawValues: ['1', '2']
                }
              ]
            }
          }
        });
      });
    });
  });

  test('Model using the Filter Fragment', async function(assert) {
    assert.expect(5);

    await settled();
    let mockModel = Store.peekRecord('fragments-mock', 1);
    assert.ok(mockModel, 'mockModel is fetched from the store');

    run(() => {
      /* == Getter Method == */
      assert.equal(
        mockModel
          .get('filters')
          .objectAt(0)
          .get('dimension.longName'),
        'Age',
        'The property dimension is deserialized to the longName `Age`'
      );

      assert.equal(
        mockModel
          .get('filters')
          .objectAt(0)
          .get('operator'),
        'in',
        'The property operator has the value `in`'
      );

      /* == Setter Method == */
      mockModel
        .get('filters')
        .objectAt(0)
        .set('dimension', MetadataService.getById('dimension', 'loginState'));
      mockModel
        .get('filters')
        .objectAt(0)
        .set('operator', 'not-in');
    });

    assert.equal(
      mockModel
        .get('filters')
        .objectAt(0)
        .get('dimension.longName'),
      'Logged-in State',
      'The property filter has the dimension with value `Login State` set using setter'
    );

    assert.equal(
      mockModel
        .get('filters')
        .objectAt(0)
        .get('operator'),
      'not-in',
      'The property filter has the operator `not-in` set using setter'
    );
  });

  test('Get and Set for Contains Filter Fragment', async function(assert) {
    assert.expect(5);

    await settled();
    let mockModel = Store.peekRecord('fragments-mock', 1);
    assert.ok(mockModel, 'mockModel is fetched from the store');

    run(() => {
      /* == Getter Method == */
      assert.equal(
        mockModel
          .get('filters')
          .objectAt(0)
          .get('dimension.longName'),
        'Age',
        'The property dimension is deserialized to the longName `Age`'
      );

      assert.equal(
        mockModel
          .get('filters')
          .objectAt(0)
          .get('operator'),
        'in',
        'The property operator has the value `in`'
      );

      /* == Setter Method == */
      mockModel
        .get('filters')
        .objectAt(0)
        .set('dimension', MetadataService.getById('dimension', 'loginState'));
      mockModel
        .get('filters')
        .objectAt(0)
        .set('operator', 'contains');
    });

    assert.equal(
      mockModel
        .get('filters')
        .objectAt(0)
        .get('dimension.longName'),
      'Logged-in State',
      'The property filter has the dimension with value `Login State` set using setter'
    );

    assert.equal(
      mockModel
        .get('filters')
        .objectAt(0)
        .get('operator'),
      'contains',
      'The property filter has the operator `contains` set using setter'
    );
  });

  test('Computed Value Objects for Contains Filter', async function(assert) {
    assert.expect(4);

    await settled();
    let mockModel = Store.peekRecord('fragments-mock', 1);

    await run(async () => {
      const values = await mockModel.get('filters.firstObject.values');

      mockModel.get('filters.firstObject').set('operator', 'contains');

      assert.equal(get(values, 'length'), 2, 'The property `values` are fetched from the store');

      mockModel.get('filters.firstObject').set('values', TextInput);

      let filterValues = mockModel.get('filters.firstObject.values');
      assert.equal(filterValues.length, 4, 'The property `values` was correctly updated');

      assert.deepEqual(filterValues, ['mirror', 'shield', 'deku', 'tree'], 'The property `values` has been updated');

      assert.deepEqual(
        mockModel.get('filters.firstObject.rawValues'),
        ['mirror', 'shield', 'deku', 'tree'],
        'The property `rawValues` has all of the text input values updated using setter'
      );
    });
  });

  test('Computed Value Objects', async function(assert) {
    assert.expect(6);

    await settled();
    let mockModel = Store.peekRecord('fragments-mock', 1);

    run(() => {
      return mockModel.get('filters.firstObject.values').then(values => {
        assert.equal(get(values, 'length'), 2, 'The property `values` are fetched from the store');

        assert.equal(
          values.objectAt(0).id,
          AgeResponse.objectAt(0).id,
          'The property `values` first object is fetched correctly from dimension service'
        );

        assert.equal(
          values.objectAt(0).description,
          AgeResponse.objectAt(0).description,
          'The property `values` first object is fetched correctly from dimension service'
        );

        mockModel.get('filters.firstObject').set('values', AgeResponse);

        let filterValues = mockModel.get('filters.firstObject.values');
        assert.equal(filterValues.length, 3, 'The property `values` was correctly updated');

        assert.deepEqual(
          filterValues.objectAt(2),
          {
            id: '3',
            description: '18-21'
          },
          'The property `values` has been updated'
        );

        assert.deepEqual(
          mockModel.get('filters.firstObject.rawValues'),
          ['1', '2', '3'],
          'The property `rawValues` has all the ids updated using setter'
        );
      });
    });
  });

  test('Validations', async function(assert) {
    assert.expect(13);

    await settled();
    let filter = run(function() {
      return Store.peekRecord('fragments-mock', 1)
        .get('filters')
        .objectAt(0);
    });

    filter.validate().then(({ validations }) => {
      assert.ok(validations.get('isValid'), 'Filter is valid');
      assert.equal(validations.get('messages').length, 0, 'There are no validation errors');
    });

    filter.set('dimension', undefined);
    filter.validate().then(({ validations }) => {
      assert.ok(!validations.get('isValid'), 'Filter is invalid');

      assert.equal(validations.get('messages').length, 1, 'There is one validation errors');

      assert.equal(
        validations.get('messages').objectAt(0),
        'The dimension field in the filter cannot be empty',
        'Dimension cannot be empty is a part of the error messages'
      );
    });

    filter.set('operator', undefined);
    filter.validate().then(({ validations }) => {
      assert.ok(!validations.get('isValid'), 'Filter is invalid');

      assert.equal(validations.get('messages').length, 2, 'There are two validation errors');

      assert.equal(
        validations.get('messages').objectAt(1),
        'The operator field in the filter cannot be empty',
        'Operator cannot be empty is a part of the error messages'
      );
    });

    filter.set('dimension', { longName: 'Age' });
    filter.set('rawValues', []);
    filter.validate().then(({ validations }) => {
      assert.ok(!validations.get('isValid'), 'Filter is invalid');

      assert.equal(validations.get('messages').length, 2, 'There are two validation errors');

      assert.equal(
        validations.get('messages').objectAt(1),
        'Age filter needs at least one value',
        'rawValues should have minimum length of 1'
      );
    });

    // no input is valid for a null operator
    filter.set('dimension', 'deviceType');
    filter.set('operator', 'notnull');
    filter.validate().then(({ validations }) => {
      assert.ok(!validations.get('isValid'), 'Filter with no values is invalid for notnull operator');

      assert.equal(validations.get('messages').length, 1, 'There are validation errors');
    });
  });
});
