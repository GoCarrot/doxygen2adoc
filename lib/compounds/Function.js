'use strict';

import Compound from '../Compound.js';

export default class Function extends Compound {
  constructor(xmlDef, provider, createFn) {
    super(xmlDef, provider, createFn);

    this.type = xmlDef.type;
    this.static = (xmlDef.$static === 'yes');
    this.argString = xmlDef.argsstring;
    this.name = this.formatName(xmlDef.name);

    this.return = {
      type: this.type
    };

    // Pull detailed description and parameter docs
    const parameterDocs = {};
    if (Array.isArray(xmlDef.detaileddescription.para)) {
      this.description = [];

      xmlDef.detaileddescription.para.forEach(para => {
        if (para.parameterlist) {
          // Make this an array
          const parameterItems = Array.isArray(para.parameterlist.parameteritem) ?
            para.parameterlist.parameteritem : [para.parameterlist.parameteritem];
          parameterItems.forEach(item => {
            parameterDocs[item.parameternamelist.parametername] = item.parameterdescription.para;
          });
        } else if(para.simplesect) {
          if (para.simplesect.$kind !== 'return') {
            console.error(`Don't know what to do with simplesect.$kind ${para.simplesect.$kind}`);
          } else {
            // Description of the return value
            // TODO: Handle arrays here?
            this.return.description = para.simplesect.para;
          }
        } else {
          // A paragraph of detailed description text
          this.description.push(para);
        }
      });

      this.description = this.description.join('\n'); // Hax?
    }

    if (xmlDef.param) {
      if (!Array.isArray(xmlDef.param)) xmlDef.param = [xmlDef.param];

      this.params = [];
      xmlDef.param.forEach((param, idx) => {
        this.params.push({
          type: param.type,
          name: param.declname,
          description: parameterDocs[param.declname]
        });
      });

      // if(xmlDef.detaileddescription.para)console.log(this.description);
    }
  }
};
