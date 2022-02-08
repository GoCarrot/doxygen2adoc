'use strict';

export default class Compound {
  /**
   * Construct a CompoundRef from a Doxygen compound XML object
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   */
  constructor(xmlDef, provider, createFn) {
    this.kind = xmlDef.$kind;
    this.type = xmlDef.type || xmlDef.$kind;
    this.id = xmlDef.$id;
    this.access = xmlDef.$prot;

    // Documentation
    this.brief = xmlDef.briefdescription.para;
    this.description = xmlDef.detaileddescription.para;

    // Code location
    this.codeFile = xmlDef.location.$bodyfile;
    this.codeLineStart = xmlDef.location.$bodystart;
    this.codeLineEnd = (xmlDef.location.$bodyend > xmlDef.location.$bodystart) ?
      xmlDef.location.$bodyend : xmlDef.location.$bodystart;

    // Source code for this entity
    this._readSource = () => {
      return provider.file(xmlDef.location.$bodyfile)
          .split(/\r?\n/)
          .slice(this.codeLineStart - 1, this.codeLineEnd)
          .join('\n');
    };

    // Depending on language, adjust name
    switch (xmlDef.$language) {
      case 'C#':
        this.name = xmlDef.compoundname.replace(/::/g, '.');
        break;

      default:
        this.name = xmlDef.compoundname || xmlDef.name;
        break;
    }

    // Construct recursively as needed
    if (Array.isArray(xmlDef.sectiondef)) {
      xmlDef.sectiondef.forEach((section) => {
        const compoundsForSection = () => {
          const def = Array.isArray(section.memberdef) ? section.memberdef : [section.memberdef];
          return def.map((def) => {
            return createFn(def);
          });
        };

        switch (section.$kind) {
          case 'public-attrib':
            this.attributes = compoundsForSection();
            break;
          case 'public-func':
            this.methods = compoundsForSection();
            break;
        }
      });
    }
  }

  /**
   * Read and return the source code for this entity
   */
  get source() {
    if (this._source) return this._source;

    this._source = this._readSource();
    return this._source;
  }
};
