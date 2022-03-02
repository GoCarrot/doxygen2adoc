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
    stopNodes: ['*.type', '*.briefdescription', '*.detaileddescription'],
    tagValueProcessor: (tagName, tagValue, jPath, hasAttributes, isLeafNode) => {
      if (tagName === 'type') {
        if (jPath !== 'doxygen.compounddef.sectiondef.memberdef.type' &&
            jPath !== 'doxygen.compounddef.sectiondef.memberdef.param.type') {
          throw new Error(`Unexpected <type> found at ${jPath}`);
        }

        const type = tagValueParser.parse(`<type>${tagValue}</type>`)[0].type;
        const combinedType = type.reduce((str, elem) => {
          if (elem.ref) {
            return `${str} ${elem.ref[0].$text}`;

            // TODO: This is only used inside 'type' tags, and the end result is
            // that it's only showing up in the 'declaration' on rendered pages.
            //
            // The 'declaration' is rendered in a source block, so putting adoc
            // markup inside that block is not useful.
            // return `${str} xref:${elem[':@'].$refid}.adoc[${elem.ref[0].$text}]`
          } else {
            return `${str} ${elem.$text}`;
          }
        }, '');
        return combinedType;
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
