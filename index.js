'use strict';

const fs = require('fs');
const path = require('path');
const {XMLParser, XMLBuilder, XMLValidator} = require('fast-xml-parser');

const CompoundRef = require('./lib/CompoundRef.js');

const self = module.exports;

self.build = (inputPath, sourcePath) => {
  const parser = new XMLParser({
    ignoreAttributes : false,
    attributeNamePrefix : "$"
  });

  const provider = {
    sourceFile: (name) => {
      if (!sourcePath) return null;

      let file = path.join(sourcePath, name);
      console.log(`Reading file ${file}`); // TODO: Verbose
      return fs.readFileSync(file, 'utf8');
    },

    xmlFile: (name) => {
      let file = path.join(inputPath, `${name}.xml`);
      console.log(`Reading file ${file}`); // TODO: Verbose
      return parser.parse(fs.readFileSync(file, 'utf8'));
    }
  };

  const index = provider.xmlFile('index');

  // Compounds come from index.xml and enumerates all of the:
  // - classes
  // - files
  // - enums
  // - namespaces

  // Filter the compounds to remove any unwanted categories
  // TODO
  // Do I want to do this here?
  const filteredCompounds = index.doxygenindex.compound;

  const compoundRefs = filteredCompounds.map(compound => {
    return new CompoundRef(compound, provider);
  });

  console.log(compoundRefs[0].compound);
};
