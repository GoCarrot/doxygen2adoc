'use strict';

import doxygen2adoc from '../index.js';
import Documentation from './helpers/Documentation.js';

/**
 * Base Compound class
 */
export default class Compound {
  #readSource;
  #source;

  /**
   * Reference map.
   */
  static refs = {};

  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {String} language Programming language
   */
  constructor(xmlDef, language) {
    this.language = xmlDef.$language || language;
    this.kind = xmlDef.$kind;
    this.id = xmlDef.$id;
    this.access = xmlDef.$prot;
    this.name = this.formatName(xmlDef.compoundname || xmlDef.name);
    this.partName = this.name;

    // Insert into reference map
    if (Compound.refs[this.id]) {
      throw new Error(`Duplicate ref for ${this.id}`);
    }
    Compound.refs[this.id] = this;

    // Documentation
    const docs = new Documentation(xmlDef);
    this.deprecated = docs.deprecated;
    this.deprecatedDocs = docs.deprecatedDocs;
    this.note = docs.note;
    this.warning = docs.warning;
    this.brief = docs.brief;
    this.description = docs.description;

    this.symbols = {};
    this.symbolName = this.name;
  }

  /**
   * Format a compound name based on the language.
   *
   * @param {String} name Name to format
   * @return {String} Name formatted appropriately for the language.
   */
  formatName(name) {
    return doxygen2adoc.formatName(name, this.language);
  }

  finalize() {

  }
};
