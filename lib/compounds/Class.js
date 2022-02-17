'use strict';

import Compound from '../Compound.js';

export default class Class extends Compound {
  constructor(xmlDef, provider, createFn, language) {
    super(xmlDef, provider, createFn, language);

    this.attributes = [];
    this.staticAttributes = [];
    this.methods = [];
    this.staticMethods = [];
    this.events = [];
    this.properties = [];

    // Construct recursively as needed
    if (Array.isArray(xmlDef.sectiondef)) {
      xmlDef.sectiondef.forEach((section) => {
        const compoundsForSection = () => {
          const def = Array.isArray(section.memberdef) ? section.memberdef : [section.memberdef];
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
        }
      });
    }
  }
};
