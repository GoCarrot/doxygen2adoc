'use strict';

import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

import CompoundRef from './lib/CompoundRef.js';

let self = {};

self.build = (inputPath, sourcePath, templates, output) => {
  // Parse tag values which contain order-dependent XML
  const tagValueParser = new XMLParser({
    ignoreAttributes : false,
    attributeNamePrefix : '$',
    textNodeName: '$text',
    preserveOrder: true
  });

  // XML Parser for general use
  const parser = new XMLParser({
    ignoreAttributes : false,
    attributeNamePrefix : '$',
    stopNodes: [
      'doxygen.compounddef.sectiondef.memberdef.type'
    ],
    tagValueProcessor: (tagName, tagValue, jPath, hasAttributes, isLeafNode) => {
      if (tagName === 'type') {
        const type = tagValueParser.parse(`<type>${tagValue}</type>`)[0].type;
        const combinedType = type.reduce((str, elem) => {
          // TODO: Here is where we turn the ref into a link to docs for that ref
          const typeText = elem.ref ?
            elem.ref[0].$text : elem.$text;

          return `${str} ${typeText}`;
        }, '');
        return combinedType;
      }
      return undefined;
    }
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
    }
  };

  const index = provider.xml('index');

  // Filter the compounds to remove any unwanted categories
  // TODO: Do I want to do this here?
  const filteredKinds = ['file', 'dir'];
  let filteredCompounds = index.doxygenindex.compound.filter(compound => {
    return !filteredKinds.includes(compound.$kind);
  });

  const compoundRefs = filteredCompounds.map(compound => {
    return new CompoundRef(compound, provider);
  });

  compoundRefs.forEach(compoundRef => {
    if (templates[compoundRef.kind]) {
      fs.writeFileSync(`${output}/${compoundRef.refId}.adoc`, templates[compoundRef.kind](compoundRef.compound));
      fs.writeFileSync(`${output}/${compoundRef.refId}.json`, JSON.stringify(compoundRef.compound, null, 2));
    } else {
      console.error(`Missing template for ${compoundRef.kind}`);
    }
  });
};

export default self;
