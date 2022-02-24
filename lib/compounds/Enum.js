'use strict';

import Compound from '../Compound.js';

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

    this.name = this.formatName(xmlDef.name);
    this.values = [];

    xmlDef.enumvalue.forEach((enumValue) => {
      this.values.push({
        name: enumValue.name,
        initializer: enumValue.initializer,
        brief: enumValue.briefdescription.para,
        description: enumValue.detaileddescription.para,
      });
    });
  }
}
