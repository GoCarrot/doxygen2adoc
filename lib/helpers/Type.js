'use strict';

export default class Type {
  constructor(type, name, description) {
    this.typeRaw = type;
    this.nameRaw = name;

    // TODO: Another entry point for type references here
    if (type.ref) {
      type = type.ref['#text'];
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
      for (const [index, el] of find.entries()) {
        const foundAt = arr.indexOf(el);
        if (foundAt > -1) return foundAt;
      }
      return -1;
    }

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

    this.type = typeParts.join(' ');
    this.name = name;
    this.description = description;
  }

  static typesForFunction(xmlDef) {
    // Pull out docs for parameters and return value
    let returnDocs = '';
    const parameterDocs = {};
    if (Array.isArray(xmlDef.detaileddescription.para)) {
      xmlDef.detaileddescription.para.forEach(para => {
        if (para.parameterlist) {
          // Description of a parameter

          // Make this an array if it's not
          const parameterItems = Array.isArray(para.parameterlist.parameteritem) ?
            para.parameterlist.parameteritem : [para.parameterlist.parameteritem];

          // 
          parameterItems.forEach(item => {
            parameterDocs[item.parameternamelist.parametername] = item.parameterdescription.para;
          });
        } else if(para.simplesect) {
          // Description of the return value
          if (para.simplesect.$kind !== 'return') {
            throw `Don't know what to do with simplesect.$kind ${para.simplesect.$kind}`;
          } else {
            returnDocs = para.simplesect.para;
          }
        }
      });
    }

    // Return struct
    const functionTypes = {
      return: null,
      parameterList: [],
      parameters: {}
    };

    // Collect parameter list
    if (xmlDef.param) {
      if (!Array.isArray(xmlDef.param)) xmlDef.param = [xmlDef.param];
      xmlDef.param.forEach((param, idx) => {
        // Doxygen parses deprecated as a parameter
        if (param.declname === '__deprecated') {
          throw 'Found __deprecated as a parameter declname, check Doxygen config.'
        } else {
          const type = new Type(param.type, param.declname, parameterDocs[param.declname]);
          functionTypes.parameterList.push(type.name);
          functionTypes.parameters[type.name] = type;
        }
      });
    }

    // Return value
    functionTypes.return = new Type(xmlDef.type, '', returnDocs);

    return functionTypes;
  }
}
