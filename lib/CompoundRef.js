'use strict';

import Compound from './Compound.js';
import Class from './compounds/Class.js';
import Function from './compounds/Function.js';
import Enum from './compounds/Enum.js';

export default class CompoundRef {
  #compound;
  #createCompound;

  /**
   * Construct a CompoundRef from a Doxygen compound XML object
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   */
  constructor(xmlDef, provider) {
    this.name = xmlDef.name;
    this.kind = xmlDef.$kind;
    this.refId = xmlDef.$refid;

    const createTypedCompound = (xmlDef, fn, language) => {
      if (!xmlDef.$kind) return xmlDef;

      switch (xmlDef.$kind) {
        case 'function':
        case 'event':
        case 'property':
        case 'variable':
          return new Function(xmlDef, provider, fn, language);
        case 'class':
        case 'struct':
          return new Class(xmlDef, provider, fn, language);
        case 'enum':
          return new Enum(xmlDef, provider, fn, language);
        default: {
          console.log(`Defaulting ${xmlDef.$kind} to Compound`);
          console.log(xmlDef);
          return new Compound(xmlDef, provider, fn, language);
        }
      }
    };

    this.#createCompound = () => {
      const compoundXml = provider.xml(this.refId).doxygen.compounddef;

      return createTypedCompound(compoundXml, (xmlDef, language) => {
        return createTypedCompound(xmlDef, createTypedCompound, language);
      });
    };
  }

  /**
   * Construct and return a compound for this reference
   */
  get compound() {
    if (this.#compound) return this.#compound;

    this.#compound = this.#createCompound();
    return this.#compound;
  }
};
