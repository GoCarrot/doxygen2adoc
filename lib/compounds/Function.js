'use strict';

import Compound from '../Compound.js';
import Type from '../helpers/Type.js';

import {XMLParser} from 'fast-xml-parser';
import {strict as assert} from 'assert';

const formattingPartParser = new XMLParser({
  textNodeName: '$text',
  preserveOrder: true,
  trimValues: false,
});

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
    this.qualifiedName = this.formatName(xmlDef.qualifiedname || xmlDef.name);

    const typesForFunction = Type.typesForFunction(xmlDef);

    this.return = typesForFunction.return;
    this.params = typesForFunction.parameterList.map((name) => {
      return typesForFunction.parameters[name];
    });

    // Language-dependent formatting
    if (this.language == 'Objective-C') {
      this.declaration = this.#formatForObjC();
      this.partName = this.name.replaceAll(':', '');
      this.symbolName = this.name;
    } else {
      this.declaration = this.#formatForCLike();

      this.partName = [this.name].concat(this.params.reduce((arr, param) => {
        return arr.concat(param.strippedType);
      }, [])).join('_');

      if (this.kind === 'function') {
        const paramSymbols = this.params.reduce((arr, param) => {
          return arr.concat(param.symbolName);
        }, []);
        this.symbolName = `${this.name}(${paramSymbols.join(',')})`;
      } else {
        this.symbolName = this.name;
      }
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
    const partMax = parts.reduce((max, part, idx) => {
      // Strip out HTML
      const parsedPart = formattingPartParser.parse(`<part>${part}</part>`)[0].part;
      part = parsedPart.reduce((arr, part) => {
        if (part.$text) {
          return arr.concat([part.$text]);
        } else if (part.a) {
          assert.strictEqual(part.a.length, 1);
          return arr.concat([part.a[0].$text]);
        }
      }, []).join('');

      const colonPos = part.indexOf(':');
      if (colonPos > max.pos) {
        return {
          idx: idx,
          pos: colonPos,
        };
      }
      return max;
    }, {idx: 0, pos: 0});

    // Indent parts
    if (partMax.pos > -1) {
      parts = parts.map((part, idx) => {
        let ret = part;

        // Strip out HTML
        const parsedPart = formattingPartParser.parse(`<part>${part}</part>`)[0].part;
        part = parsedPart.reduce((arr, part) => {
          if (part.$text) {
            return arr.concat([part.$text]);
          } else if (part.a) {
            assert.strictEqual(part.a.length, 1);
            return arr.concat([part.a[0].$text]);
          }
        }, []).join('');

        if (idx != partMax.idx) {
          const offset = part.indexOf(':') > 0 ? part.indexOf(':') : 0;
          ret = ' '.repeat(partMax.pos - offset).concat(ret);
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
    const functionName = this.static ? this.qualifiedName : this.name;
    const prefix = this._usedWithParameters() ?
      `${this.return.type} ${functionName}(` :
      `${this.return.type} ${functionName}`;

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
