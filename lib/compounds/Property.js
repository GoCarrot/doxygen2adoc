'use strict';

import Function from './Function.js';

/**
 * Describes a Property
 */
export default class Property extends Function {
  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   * @param {Function} createFn Function which will create a Compound based on type
   * @param {String} language Programming language
   */
  constructor(xmlDef, provider, createFn, language) {
    super(xmlDef, provider, createFn, language);

    this.settable = xmlDef.$settable === 'yes';
    this.gettable = xmlDef.$gettable === 'yes';
  }

  /**
   * Used for sub-classing.
   * @return {bool} True if the compound represented takes parameters.
   */
  _usedWithParameters() {
    return false;
  }
}
