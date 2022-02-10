'use strict';

import Compound from '../Compound.js';

export default class Class extends Compound {
  constructor(xmlDef, provider, createFn) {
    super(xmlDef, provider, createFn);

    // Construct recursively as needed
    if (Array.isArray(xmlDef.sectiondef)) {
      xmlDef.sectiondef.forEach((section) => {
        const compoundsForSection = () => {
          const def = Array.isArray(section.memberdef) ? section.memberdef : [section.memberdef];
          return def.map((def) => {
            const compound = createFn(def);
            compound.language = this.language;
            return compound;
          });
        };

        switch (section.$kind) {
          case 'public-attrib':
            this.attributes = compoundsForSection();
            break;
          case 'public-func':
            this.methods = compoundsForSection();
            break;
        }
      });
    }

    console.log(xmlDef.briefdescription);
  }
};
