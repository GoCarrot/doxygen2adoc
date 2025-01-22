'use strict';

import Compound from '../Compound.js';

/**
 * Describe a Class
 */
export default class Class extends Compound {
  static nameToRef = {};

  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {Function} createFn Function which will create a Compound based on type
   * @param {String} language Programming language
   */
  constructor(xmlDef, createFn, language) {
    super(xmlDef, language);

    this.attributes = [];
    this.staticAttributes = [];
    this.methods = [];
    this.staticMethods = [];
    this.events = [];
    this.properties = [];
    this.enums = [];
    this.inheritsFrom = [];

    if (Class.nameToRef[this.name]) {
      throw new Error(`Duplicate ref for ${this.id}`);
    }
    Class.nameToRef[this.name] = this.id;

    // Superclasses
    if (xmlDef.basecompoundref) {
      const basecompoundref = Array.isArray(xmlDef.basecompoundref) ?
        xmlDef.basecompoundref : [xmlDef.basecompoundref];

      this.inheritsFrom = basecompoundref.reduce((arr, basecompoundref) => {
        if (basecompoundref.$prot === 'private') return arr;

        // Filter ignored base classes
        const name = basecompoundref['#text'];
        // TODO: Don't hard code this...
        const filterBaseClasses = [
          'NSObject',
          'MonoBehaviour', 'ScriptableObject',
          'Unobfuscable', 'BroadcastReceiver',
        ];
        if (filterBaseClasses.includes(name)) return arr;

        if (!Class.nameToRef[name]) {
          console.log(`Missing ref to ${name}`);
          return arr;
        }

        // TODO: This is hard-coded asciidoc formatting
        return arr.concat([`xref:${Class.nameToRef[name]}.adoc[${name}]`]);
      }, []);
    }

    // Construct recursively as needed
    if (xmlDef.sectiondef) {
      const sectiondef = Array.isArray(xmlDef.sectiondef) ?
        xmlDef.sectiondef : [xmlDef.sectiondef];
      sectiondef.forEach((section) => {
        const compoundsForSection = () => {
          const def = Array.isArray(section.memberdef) ?
            section.memberdef : [section.memberdef];

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
          case 'public-static-attrib':
            this.staticAttributes = this.staticAttributes.concat(compoundsForSection());
            break;
          case 'public-func':
            this.methods = this.methods.concat(compoundsForSection());
            break;
          case 'public-static-func':
            this.staticMethods = this.staticMethods.concat(compoundsForSection());
            break;
          case 'event':
            this.events = this.events.concat(compoundsForSection());
            break;
          case 'property':
            this.properties = this.properties.concat(compoundsForSection());
            break;
          case 'public-type':
            this.enums = this.enums.concat(compoundsForSection());
            break;
          default:
            if (section.$kind.startsWith('private') &&
                section.$kind.startsWith('package')) {
              console.log(`No handler for ${section.$kind}`);
              console.log(compoundsForSection());
            }
        }
      });
    }

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

    // Combine all the symbols
    if (this.language == 'Objective-C') {
      const methodLike = this.methods
          .concat(this.staticMethods);

      const symbols = this.properties
          .concat(this.events)
          .concat(this.attributes)
          .concat(this.staticAttributes)
          .concat(this.enums);

      // Do function-like in the '[Class method:params:]' format
      combineSymbols(methodLike, (value) => {
        return [`[${this.symbolName} ${value.symbolName}]`, value.id];
      });

      // Also support function-like just 'method:params:'
      combineSymbols(methodLike, (value) => {
        return [`${value.symbolName}`, value.id];
      });

      // I don't know if this is the best way to do this
      combineSymbols(symbols, (value) => {
        return [`[${this.symbolName} ${value.symbolName}]`, value.id];
      });
    } else {
      const symbols = this.methods
          .concat(this.staticMethods)
          .concat(this.properties)
          .concat(this.events)
          .concat(this.attributes)
          .concat(this.staticAttributes)
          .concat(this.enums);

      combineSymbols(symbols, (value) => {
        return [`${this.symbolName}.${value.symbolName}`, value.id];
      });
    }
  }
};
