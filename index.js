'use strict';

import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

import CompoundRef from './lib/CompoundRef.js';

let self = {};

self.build = (inputPath, sourcePath, templates, output) => {
  // Construct XML Parser with options
  const parser = new XMLParser({
    ignoreAttributes : false,
    attributeNamePrefix : "$"
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
  // TODO
  // Do I want to do this here?
  let filteredCompounds = index.doxygenindex.compound;

  // filteredCompounds = filteredCompounds.slice(0, 1); // HAX

  const compoundRefs = filteredCompounds.map(compound => {
    return new CompoundRef(compound, provider);
  });

  // HAX
  // console.log(compoundRefs[0].compound);
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
