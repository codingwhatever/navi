/**
 * Copyright 2020, Yahoo Holdings Inc.
 * Licensed under the terms of the MIT license. See accompanying LICENSE.md file for terms.
 */
import EmberObject from '@ember/object';
import { assign } from '@ember/polyfills';
import { getOwner } from '@ember/application';

const timeGrainSorting = {
  millisecond: 1,
  second: 2,
  minute: 3,
  hour: 4,
  day: 5,
  week: 6,
  month: 7,
  quarter: 8,
  year: 9,
  all: 10
};
let Model = EmberObject.extend({
  /**
   * @property {String} name
   */
  name: undefined,

  /**
   * @property {String} longName
   */
  longName: undefined,

  /**
   * @property {String} description
   */
  description: undefined,

  /**
   * @property {String} category
   */
  category: undefined,

  /**
   * @property {Array} timeGrains - array of timeGrain models
   */
  timeGrains: undefined,

  /**
   * @property {String} source - the datasource this metadata is from.
   */
  source: undefined,

  /**
   * @method init
   * Converts timeGrains to timeGrain fragment objects
   */
  init() {
    let timeGrains = this.get('timeGrains');
    if (timeGrains) {
      this.set(
        'timeGrains',
        timeGrains.map(timeGrain => {
          let timeGrainPayload = assign({}, timeGrain, { source: this.source }),
            owner = getOwner(this);
          return owner.factoryFor('model:metadata/time-grain').create(timeGrainPayload);
        })
        .sort((l, r) => {
          return (timeGrainSorting[l.name] || Infinity) - (timeGrainSorting[r.name] || Infinity);
        })
      );
    }
  }
});

//factory level properties
export default Model.reopenClass({
  /**
   * @property {String} identifierField - used by the keg as identifierField
   */
  identifierField: 'name'
});
