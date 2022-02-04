'use strict';

module.exports = class {
  /**
   * Construct a CompoundRef from a Doxygen compound XML object
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   */
  constructor(xmlDef, provider) {
    this.kind = xmlDef.$kind;
    this.id = xmlDef.$id;
    this.access = xmlDef.$prot;

    // Documentation
    this.brief = xmlDef.briefdescription;
    this.description = xmlDef.detaileddescription;

    // Create a GitHub path for the sourcefile, with the line(s) highlighted
    if (xmlDef.location.$bodyend > xmlDef.location.$bodystart) {
      this.github = `${xmlDef.location.$bodyfile}#L${xmlDef.location.$bodystart - 1}-L${xmlDef.location.$bodyend}`;
    } else {
      this.github = `${xmlDef.location.$bodyfile}#L${xmlDef.location.$bodystart - 1}`;
    }

    // Source code for this entity
    this._readSource = () => {
      return provider.sourceFile(xmlDef.location.$bodyfile)
          .split(/\r?\n/)
          .slice(xmlDef.location.$bodystart - 1, xmlDef.location.$bodyend)
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
    if (xmlDef.sectiondef) {
      xmlDef.sectiondef.forEach((section) => {
        const compoundsForSection = () => {
          const def = Array.isArray(section.memberdef) ? section.memberdef : [section.memberdef];
          return def.map((def) => {
            return new module.exports(def, provider);
            // return def;
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
