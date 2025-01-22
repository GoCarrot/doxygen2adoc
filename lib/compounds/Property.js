'use strict';

import Function from './Function.js';

/**
 * Describes a Property
 */
export default class Property extends Function {
  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {String} language Programming language
   */
  constructor(xmlDef, language) {
    super(xmlDef, language);

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
