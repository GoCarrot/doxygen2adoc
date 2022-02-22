'use strict';

import fs from 'fs';
import path from 'path';
import {XMLParser} from 'fast-xml-parser';

import CompoundRef from './lib/CompoundRef.js';

const self = {};

self.build = (inputPath, sourcePath) => {
  // Parse tag values which contain order-dependent XML
  const tagValueParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '$',
    textNodeName: '$text',
    preserveOrder: true,
  });

  // XML Parser for general use
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '$',
    stopNodes: ['*.type', '*.xrefdescription'],
    tagValueProcessor: (tagName, tagValue, jPath, hasAttributes, isLeafNode) => {
      if (tagName === 'type') {
        // console.log(`TYPE: ${tagValue}`);
        const type = tagValueParser.parse(`<type>${tagValue}</type>`)[0].type;
        const combinedType = type.reduce((str, elem) => {
          // TODO: Here is where we turn the ref into a link to docs for that ref
          const typeText = elem.ref ?
            elem.ref[0].$text : elem.$text;

          return `${str} ${typeText}`;
        }, '');
        return combinedType;
      } else if (tagName === 'xrefdescription') {
        const xrefdescription = tagValueParser.parse(`<xrefdescription>${tagValue}</xrefdescription>`)[0].xrefdescription[0];
        const combined = xrefdescription.para.reduce((str, elem) => {
          elem = elem.computeroutput ? elem.computeroutput[0] : elem;
          const text = elem.ref ? elem.ref[0].$text : elem.$text;

          return `${str} ${text}`;
        }, '');
        return combined;
      }
      return undefined;
    },
  });

  // Provider reads files
  const provider = {
    file: (name) => {
      if (!sourcePath) return null;

      const file = path.join(sourcePath, name);
      console.log(`Reading file ${file}`); // TODO: Verbose
      return fs.readFileSync(file, 'utf8');
    },

    xml: (name) => {
      const file = path.join(inputPath, `${name}.xml`);
      console.log(`Reading file ${file}`); // TODO: Verbose
      return parser.parse(fs.readFileSync(file, 'utf8'));
    },
  };

  // Read the index, create compound refs and return them
  const index = provider.xml('index');
  return index.doxygenindex.compound.map((compound) => {
    return new CompoundRef(compound, provider);
  });
};

export default self;
