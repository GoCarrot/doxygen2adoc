'use strict';

import Function from './Function.js';

export default class Property extends Function {
  constructor(xmlDef, provider, createFn, language) {
    super(xmlDef, provider, createFn, language);

    this.settable = xmlDef.$settable === 'yes';
    this.gettable = xmlDef.$gettable === 'yes';
  }

  _usedWithParameters() {
    return false;
  }
}
