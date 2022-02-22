'use strict';

import {XMLParser} from 'fast-xml-parser';

const paraParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '$',
  textNodeName: '$text'
});

export default class Documentation {
  constructor(xmlDef) {

    this.description = [];
    this.parameterDocs = {};
    this.return = '';
    this.deprecated = false;
    this.deprecatedDocs = [];

    if (Array.isArray(xmlDef.detaileddescription.para)) {
      xmlDef.detaileddescription.para.forEach(para => {
        if (para.parameterlist) {
          // Description of a parameter

          // Make this an array if it's not
          const parameterItems = Array.isArray(para.parameterlist.parameteritem) ?
            para.parameterlist.parameteritem : [para.parameterlist.parameteritem];

          parameterItems.forEach(item => {
            this.parameterDocs[item.parameternamelist.parametername] = this.#formatPara(item.parameterdescription.para);
          });
        } else if(para.simplesect) {
          // Description of the return value
          if (para.simplesect.$kind !== 'return') {
            throw `Don't know what to do with simplesect.$kind ${para.simplesect.$kind}`;
          } else {
            this.return = this.#formatPara(para.simplesect.para);
          }
        } else if(para.xrefsect) {
          if (para.xrefsect.xreftitle === 'Deprecated') {
            this.deprecated = true;
            this.deprecatedDocs.push(this.#formatPara(para.xrefsect.xrefdescription));
          } else {
            throw `Don't know how to parse xrefsect: ${para}`
          }
        } else {
          // A paragraph of detailed description text
          this.description.push(this.#formatPara(para));
        }
      });
    }
  }

  #formatPara(para) {
    // const parsedPara = paraParser.parse(para);
    return para;
  }
}
