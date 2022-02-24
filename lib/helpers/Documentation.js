'use strict';

// import {XMLParser} from 'fast-xml-parser';

// const paraParser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '$',
//   textNodeName: '$text',
// });

/**
 * Helper for extracting documentation from a Doxygen compound.
 */
export default class Documentation {
  /**
   * @param {Object} xmlDef Doxygen compound.
   */
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

  /**
   * Format a <para> element
   * @param {String} para Para element from Doxygen
   * @return {String} A formatted string
   */
  #formatPara(para) {
    // const parsedPara = paraParser.parse(para);
    return para;
  }

  /**
   * Build a detailed description
   * @param {Object} xmlDef Doxygen compound
   */
  #buildDetailedDescription(xmlDef) {
    const detailedDescription = Array.isArray(xmlDef.detaileddescription.para) ?
      xmlDef.detaileddescription.para : [xmlDef.detaileddescription.para];

    detailedDescription.forEach((para) => {
      if (para.parameterlist) {
        // Description of a parameter

        // Make this an array if it's not
        const parameterItems = Array.isArray(para.parameterlist.parameteritem) ?
          para.parameterlist.parameteritem : [para.parameterlist.parameteritem];

        parameterItems.forEach((item) => {
          this.parameterDocs[item.parameternamelist.parametername] =
            this.#formatPara(item.parameterdescription.para);
        });
      } else if (para.simplesect) {
        switch (para.simplesect.$kind) {
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
            throw new Error(`Don't know what to do with simplesect.$kind ${para.simplesect.$kind}`);
            break;
        }
      } else if (para.xrefsect) {
        if (para.xrefsect.xreftitle === 'Deprecated') {
          this.deprecated = true;
          this.deprecatedDocs.push(this.#formatPara(para.xrefsect.xrefdescription));
        } else {
          throw new Error(`Don't know how to parse xrefsect: ${para}`);
        }
      } else {
        // A paragraph of detailed description text
        this.description.push(this.#formatPara(para));
      }
    });
  }
}
