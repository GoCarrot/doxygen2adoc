'use strict';

import Compound from '../Compound.js';
import Type from '../helpers/Type.js';

export default class Function extends Compound {
  constructor(xmlDef, provider, createFn) {
    super(xmlDef, provider, createFn);

    this.static = (xmlDef.$static === 'yes');
    this.argString = xmlDef.argsstring;
    this.name = this.formatName(xmlDef.name);

    // Pull detailed description
    if (Array.isArray(xmlDef.detaileddescription.para)) {
      this.description = [];

      xmlDef.detaileddescription.para.forEach(para => {
        if (!para.parameterlist && !para.simplesect) {
          // A paragraph of detailed description text
          this.description.push(para);
        }
      });

      this.description = this.description.join('\n'); // Hax?
    }

    const typesForFunction = Type.typesForFunction(xmlDef);

    this.return = typesForFunction.return;

    this.params = typesForFunction.parameterList.map(name => {
      return typesForFunction.parameters[name];
    });
  }
};
