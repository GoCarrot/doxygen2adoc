'use strict';

export default class Compound {
  #readSource;
  #source;

  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   * @param {Function} function which will create a Compound based on type
   * @param {String} programming language
   */
  constructor(xmlDef, provider, createFn, language) {
    this.language = xmlDef.$language || language;
    this.kind = xmlDef.$kind;
    this.id = xmlDef.$id;
    this.access = xmlDef.$prot;
    this.name = this.formatName(xmlDef.compoundname || xmlDef.name);

    // Documentation
    this.brief = xmlDef.briefdescription.para;
    this.description = xmlDef.detaileddescription.para;

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
   * @param {String} Name to format
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
