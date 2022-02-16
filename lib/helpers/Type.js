'use strict';

export default class Type {
  constructor(type, name, description) {
    this.type = type;
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
            console.error(`Don't know what to do with simplesect.$kind ${para.simplesect.$kind}`);
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
        // Add to ordered list of parameters
        functionTypes.parameterList.push(param.declname);

        functionTypes.parameters[param.declname] = new Type(
          param.type, param.declname, parameterDocs[param.declname]);
      });
    }

    // Return value
    functionTypes.return = new Type(xmlDef.type, '', returnDocs);

    return functionTypes;
  }
}
