'use strict';

import Compound from '../Compound.js';
import Documentation from '../helpers/Documentation.js';

/**
 * Describes an Enum
 */
export default class Enum extends Compound {
  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   * @param {Function} createFn Function which will create a Compound based on type
   * @param {String} language Programming language
   */
  constructor(xmlDef, provider, createFn, language) {
    super(xmlDef, provider, createFn, language);

    this.values = [];

    xmlDef.enumvalue.forEach((enumValue) => {
      const docs = new Documentation(enumValue);

      this.values.push({
        name: enumValue.name,
        initializer: enumValue.initializer,
        brief: docs.brief,
        description: docs.description,
      });
    });
  }
}
