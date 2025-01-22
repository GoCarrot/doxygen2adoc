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
  constructor(xmlDef, createFn, language) {
    super(xmlDef, language);

    this.attributes = [];
    this.methods = [];

    if (!xmlDef.sectiondef) return;

    const sectiondef = Array.isArray(xmlDef.sectiondef) ? xmlDef.sectiondef : [xmlDef.sectiondef];

    sectiondef.forEach((section) => {
      const compoundsForSection = () => {
        const def = Array.isArray(section.memberdef) ? section.memberdef : [section.memberdef];

        return def.map((def) => {
          // Create compound, assign parent
          const compound = createFn(def, this.language);
          compound.parent = this;
          return compound;
        });
      };

      switch (section.$kind) {
        case 'public-attrib':
          this.attributes = this.attributes.concat(compoundsForSection());
          break;
        default:
          if (section.$kind.startsWith('private') &&
              section.$kind.startsWith('package')) {
            console.log(`No handler for ${section.$kind}`);
            console.log(compoundsForSection());
          }
      }
    });

    const combineSymbols = (array, fn) => {
      this.symbols = array.reduce((hsh, value) => {
        const [name, id] = fn(value);
        if (hsh[name]) {
          throw new Error(`Duplicate symbol name: ${name}`);
        }
        hsh[name] = id;
        return hsh;
      }, this.symbols);
    };

    const symbols = this.attributes;
    combineSymbols(symbols, (value) => {
      return [`${this.symbolName}.${value.symbolName}`, value.id];
    });
  }
}
