'use strict';

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
   * @param {Object} provider An object that can read source code and xml
   * @param {Function} createFn Function which will create a Compound based on type
   * @param {String} language Programming language
   */
  constructor(xmlDef, provider, createFn, language) {
    this.language = xmlDef.$language || language;
    this.kind = xmlDef.$kind;
    this.id = xmlDef.$id;
    this.access = xmlDef.$prot;
    this.name = this.formatName(xmlDef.compoundname || xmlDef.name);

    // Insert into reference map
    if (Compound.refs[this.id]) {
      throw new Error (`Duplicate ref for ${this.id}`)
    }
    Compound.refs[this.id] = this;

    // Documentation
    const docs = new Documentation(xmlDef);
    this.deprecated = docs.deprecated;
    this.deprecatedDocs = docs.deprecatedDocs.join('');
    this.note = docs.note;
    this.warning = docs.warning;
    this.brief = docs.brief;
    this.description = docs.description;

    // Code location
    this.codeFile = xmlDef.location.$bodyfile;
    this.codeLineStart = xmlDef.location.$bodystart;
    this.codeLineEnd = (xmlDef.location.$bodyend > xmlDef.location.$bodystart) ?
      xmlDef.location.$bodyend : xmlDef.location.$bodystart;

    // Source code for this entity
    this.#readSource = () => {
      return provider.file(xmlDef.location.$bodyfile)
          .split(/\r?\n/)
          .slice(this.codeLineStart - 1, this.codeLineEnd)
          .join('\n');
    };
  }

  /**
   * Format a compound name based on the language.
   *
   * @param {String} name Name to format
   * @return {String} Name formatted appropriately for the language.
   */
  formatName(name) {
    switch (this.language) {
      case 'C#':
      case 'Java':
        return name.replace(/::/g, '.');
    }
    return name;
  }

  /**
   * Read and return the source code for this entity
   */
  get source() {
    if (this.#source) return this.#source;

    this.#source = this.#readSource();
    return this.#source;
  }
};
