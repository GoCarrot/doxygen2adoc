'use strict';

import Compound from '../Compound.js';
import Documentation from '../helpers/Documentation.js';

/**
 * Describes an Enum
 */
export default class Enum extends Compound {
  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {String} language Programming language
   */
  constructor(xmlDef, language) {
    super(xmlDef, language);

    this.values = [];

    if (!xmlDef.enumvalue) return;

    xmlDef.enumvalue.forEach((enumValue) => {
      const docs = new Documentation(enumValue);

      this.values.push({
        name: enumValue.name,
        initializer: enumValue.initializer,
        brief: docs.brief,
        description: docs.description,
        refid: enumValue.$id,
      });
    });

    this.symbols = this.values.reduce((hsh, value) => {
      hsh[value.name] = value.refid;
      return hsh;
    }, {});
  }
}
