'use strict';

import Compound from '../Compound.js';
import Type from '../helpers/Type.js';

/**
 * Describes a Function
 */
export default class Function extends Compound {
  /**
   * @param {Object} xmlDef Doxygen xml object
   * @param {Object} provider An object that can read source code and xml
   * @param {Function} createFn Function which will create a Compound based on type
   * @param {String} language Programming language
   */
  constructor(xmlDef, provider, createFn, language) {
    super(xmlDef, provider, createFn, language);

    this.static = (xmlDef.$static === 'yes');
    this.name = this.formatName(xmlDef.name);

    const typesForFunction = Type.typesForFunction(xmlDef);

    this.return = typesForFunction.return;
    this.params = typesForFunction.parameterList.map((name) => {
      return typesForFunction.parameters[name];
    });

    // Format for display
    if (this.language == 'Objective-C') {
      this.declaration = this.#formatForObjC();
    } else {
      this.declaration = this.#formatForCLike();
    }
  }

  /**
   * Formats the declaration for ObjectiveC
   * @return {String} A declaration formatted for ObjectiveC.
   */
  #formatForObjC() {
    let parts = this.name.split(':').map((part, idx) => {
      const param = this.params[idx];
      if (param) {
        return `${part}:(${param.type})${param.name}`;
      }
      return part;
    });

    // Prefix the first part with type etc
    parts[0] = `${this.static ? '+' : '-'} (${this.return.type})${parts[0]}`;

    // Find longest part
    const longestPartIdx = parts.reduce((currMaxIdx, part, idx) => {
      if (part.indexOf(':') > parts[currMaxIdx].indexOf(':')) {
        return idx;
      }
      return currMaxIdx;
    }, 0);

    // Indent parts
    const colonPos = parts[longestPartIdx].indexOf(':'); // Hee hee
    if (colonPos > -1) {
      parts = parts.map((part, idx) => {
        let ret = part;
        if (idx != longestPartIdx) {
          const offset = part.indexOf(':') > 0 ? part.indexOf(':') : 0;
          ret = ' '.repeat(colonPos - offset).concat(ret);
        }
        return ret;
      });
    }

    return parts.join('\n').trim().concat(';');
  }

  /**
   * Formats the declaration for Java/C# or other C-like languages.
   * @return {String} A declaration formatted for C-like languages.
   */
  #formatForCLike() {
    const prefix = this._usedWithParameters() ?
      `${this.return.type} ${this.name}(` :
      `${this.return.type} ${this.name}`;

    const parts = this.params.reduce((arr, param, idx) => {
      const p = `${param.typeRaw} ${param.nameRaw}`;
      if (idx == 0) {
        arr.push(p.trim());
      } else {
        arr.push(' '.repeat(prefix.length).concat(p.trim()));
      }
      return arr;
    }, []);

    const formatted = prefix.concat(parts.join(',\n'));
    return (this._usedWithParameters() ? formatted.concat(')') : formatted ).concat(';');
  }

  /**
   * Used for sub-classing.
   * @return {bool} True if the compound represented takes parameters.
   */
  _usedWithParameters() {
    return true;
  }
};
