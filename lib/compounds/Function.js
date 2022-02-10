'use strict';

import Compound from '../Compound.js';

export default class Function extends Compound {
  constructor(xmlDef, provider, createFn) {
    super(xmlDef, provider, createFn);

    this.type = xmlDef.type;
    this.static = (xmlDef.$static === 'yes');
    this.argString = xmlDef.argsstring;
    this.name = this.formatName(xmlDef.name);

    // console.log(this);
  }
};
