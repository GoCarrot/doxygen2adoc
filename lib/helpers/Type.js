'use strict';

import {XMLParser} from 'fast-xml-parser';

import Documentation from '../helpers/Documentation.js';

// Type-strip parser
const tagValueParser = new XMLParser({
  ignoreAttributes: true,
  textNodeName: '$text',
});

/**
 * Helper for extracting type information and documentation
 */
export default class Type {
  /**
   * @param {String} type The raw type name from Doxygen.
   * @param {String} name The raw compound name from Doxygen.
   * @param {String} description Description docs for this compound.
   */
  constructor(type, name, description) {
    this.typeRaw = type;
    this.nameRaw = name;

    if (type.ref) {
      throw new Error(`type.ref found in Type, this shouldn't happen.`);
      // type = type.ref['#text'];
    }

    let typeParts = type.trim().split(' ');

    // Attach pointer type to previous element, if needed
    typeParts = typeParts.reduce((arr, part) => {
      if (part.startsWith('*')) {
        arr[arr.length - 1] = `${arr[arr.length - 1]} *`;
        part = part.slice(1);
      }

      if (part.length) arr.push(part);
      return arr;
    }, []);

    const indexOfAny = (arr, ...find) => {
      for (const [, el] of find.entries()) {
        const foundAt = arr.indexOf(el);
        if (foundAt > -1) return foundAt;
      }
      return -1;
    };

    // Check for nonnull, @NonNull, _Nonnull
    const nonnull = indexOfAny(typeParts, 'nonnull', '@NonNull', '_Nonnull');
    if (nonnull > -1) {
      this.nonnull = true;
      typeParts.splice(nonnull, 1);
    }

    // Check for nullable, @Nullable, _Nullable
    const nullable = indexOfAny(typeParts, 'nullable', '@Nullable', '_Nullable');
    if (nullable > -1) {
      this.nullable = true;
      typeParts.splice(nullable, 1);
    }

    // Join parts for type
    this.type = typeParts.join(' ');

    // Strip more things out of parts
    const toRemove = ['final'];
    this.strippedType = typeParts.filter((elem) => !toRemove.includes(elem)).join(' ');
    try {
      const thing = tagValueParser.parse(this.strippedType);
      if (thing && thing.a) {
        this.strippedType = thing.a;
      }
    } catch (ignored) {}
    this.strippedType = this.strippedType
        .replaceAll('&lt;', '(')
        .replaceAll('&gt;', ')')
        .replaceAll(' ', '')
        .replaceAll(',', '_');

    this.name = name;
    this.description = description;
  }

  /**
   * Constructs the types for a Doxygen compound definition.
   *
   * @param {Object} xmlDef The Doxygen compound definition.
   * @return {Object} Object containing the return type, and parameter types for this compound.
   */
  static typesForFunction(xmlDef) {
    const docs = new Documentation(xmlDef);

    // Return struct
    const functionTypes = {
      return: null,
      parameterList: [],
      parameters: {},
    };

    // Collect parameter list
    if (xmlDef.param) {
      if (!Array.isArray(xmlDef.param)) xmlDef.param = [xmlDef.param];
      xmlDef.param.forEach((param, idx) => {
        // Doxygen parses deprecated as a parameter
        if (param.declname === '__deprecated') {
          throw new Error('Found __deprecated as a parameter declname, check Doxygen config.');
        } else {
          const type = new Type(param.type, param.declname, docs.parameterDocs[param.declname]);
          functionTypes.parameterList.push(type.name);
          functionTypes.parameters[type.name] = type;
        }
      });
    }

    // Return value
    functionTypes.return = new Type(xmlDef.type, '', docs.return);

    return functionTypes;
  }
}
