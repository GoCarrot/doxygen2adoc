'use strict';

import Compound from './Compound.js';
import Function from './compounds/Function.js';

export default class CompoundRef {
  /**
   * Construct a CompoundRef from a Doxygen compound XML object
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   */
  constructor(xmlDef, provider) {
    this.name = xmlDef.name;
    this.kind = xmlDef.$kind;
    this.refId = xmlDef.$refid;

    const createTypedCompound = (refId, fn) => {
      const compoundXml = provider.xml(refId).doxygen.compounddef;
      return new Compound(compoundXml, provider, fn);
    };

    this._createCompound = () => {
      return createTypedCompound(this.refId, createTypedCompound);
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
