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
    this.note = [];
    this.warning = [];

    if (xmlDef.detaileddescription.para) {
      this.#buildDetailedDescription(xmlDef);
    }
  }

  #formatPara(para) {
    // const parsedPara = paraParser.parse(para);
    return para;
  }

  #buildDetailedDescription(xmlDef) {
    const detailedDescription = Array.isArray(xmlDef.detaileddescription.para) ?
      xmlDef.detaileddescription.para : [xmlDef.detaileddescription.para];

    detailedDescription.forEach(para => {
      if (para.parameterlist) {
        // Description of a parameter

        // Make this an array if it's not
        const parameterItems = Array.isArray(para.parameterlist.parameteritem) ?
          para.parameterlist.parameteritem : [para.parameterlist.parameteritem];

        parameterItems.forEach(item => {
          this.parameterDocs[item.parameternamelist.parametername] = this.#formatPara(item.parameterdescription.para);
        });
      } else if(para.simplesect) {
        switch(para.simplesect.$kind) {
          case 'return':
            this.return = this.#formatPara(para.simplesect.para);
            break;
          case 'note':
            this.note.push(this.#formatPara(para.simplesect.para));
            break;
          case 'warning':
            this.warning.push(this.#formatPara(para.simplesect.para));
            break;

          default:
            throw `Don't know what to do with simplesect.$kind ${para.simplesect.$kind}`;
            break;
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
