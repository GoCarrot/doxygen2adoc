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

    // C# style properties report gettable/settable, Objective-C reports readable/writable.
    this.settable = xmlDef.$settable === 'yes' || xmlDef.$writable === 'yes';
    this.gettable = xmlDef.$gettable === 'yes' || xmlDef.$readable === 'yes';

    if (this.language === 'Objective-C') {
      this.declaration = this.#formatForObjCProperty(xmlDef);
    }
  }

  /**
   * Formats the declaration for an Objective-C property.
   * @param {Object} xmlDef Doxygen xml object
   * @return {String} A declaration formatted as an `@property`.
   */
  #formatForObjCProperty(xmlDef) {
    const attributes = [xmlDef.$accessor];
    if (xmlDef.$writable === 'no') attributes.push('readonly');

    const type = this.return.type;
    const separator = type.endsWith('*') ? '' : ' ';
    const attributeList = attributes.filter(Boolean).join(', ');

    const prefix = attributeList ? `@property (${attributeList}) ` : '@property ';

    return `${prefix}${type}${separator}${this.name};`;
  }

  /**
   * Used for sub-classing.
   * @return {bool} True if the compound represented takes parameters.
   */
  _usedWithParameters() {
    return false;
  }
}
