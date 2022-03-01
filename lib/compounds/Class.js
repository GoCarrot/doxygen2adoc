'use strict';

import Compound from '../Compound.js';

/**
 * Describe a Class
 */
export default class Class extends Compound {
  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   * @param {Function} createFn Function which will create a Compound based on type
   * @param {String} language Programming language
   */
  constructor(xmlDef, provider, createFn, language) {
    super(xmlDef, provider, createFn, language);

    this.attributes = [];
    this.staticAttributes = [];
    this.methods = [];
    this.staticMethods = [];
    this.events = [];
    this.properties = [];
    this.enums = [];

    // Construct recursively as needed
    if (xmlDef.sectiondef) {
      const sectiondef = Array.isArray(xmlDef.sectiondef) ?
        xmlDef.sectiondef : [xmlDef.sectiondef];
      sectiondef.forEach((section) => {
        const compoundsForSection = () => {
          const def = Array.isArray(section.memberdef) ?
            section.memberdef : [section.memberdef];

          return def.map((def) => {
            const compound = createFn(def, this.language);
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
        }
      });
    }
  }
};
