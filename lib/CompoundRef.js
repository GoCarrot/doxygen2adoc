'use strict';

const Compound = require('./Compound.js');

module.exports = class {
  /**
   * Construct a CompoundRef from a Doxygen compound XML object
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   */
  constructor(xmlDef, provider) {
    this.name = xmlDef.name;
    this.kind = xmlDef.$kind;
    this.refId = xmlDef.$refid;

    this._createCompound = () => {
      return new Compound(
          provider.xmlFile(this.refId).doxygen.compounddef,
          provider,
      );
    };
  }

  /**
   * Construct and return a compound for this reference
   */
  get compound() {
    if (this._compound) return this._compound;

    this._compound = this._createCompound();
    return this._compound;
  }
};
