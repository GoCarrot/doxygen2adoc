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

    const createTypedCompound = (xmlDef, fn) => {
      return new Compound(xmlDef, provider, fn);
    };

    this._createCompound = () => {
      const compoundXml = provider.xml(this.refId).doxygen.compounddef;

      return createTypedCompound(compoundXml, (xmlDef) => {
        createTypedCompound(xmlDef, createTypedCompound);
      });
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
