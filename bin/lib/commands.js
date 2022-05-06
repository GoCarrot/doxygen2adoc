'use strict';

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import compareVersions from 'compare-versions';

import doxygen2adoc from '../../index.js';

const self = {};

self.changelog = (argv, compiledTemplates) => {
  // Build input
  const input = {};
  const inputDir = fs.readdirSync(argv.changelog.input);
  for (const file of inputDir) {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      const src = fs.readFileSync(path.join(argv.changelog.input, file), 'utf-8');
      input[path.parse(file).name] = YAML.parse(src);
    }
  }

  // Sorted version list
  const inputVersions = Object.keys(input).sort(compareVersions).reverse();

  // Write out
  inputVersions.forEach((version) => {
    const src = {...input[version], ...{
      version: version,
      ios: input[version].ios === null ? version : input[version].ios,
      android: input[version].android === null ? version : input[version].android,
    }};

    fs.writeFileSync(path.join(argv.changelog.output, `${version}.adoc`),
        compiledTemplates.version(src));
  });

  if (argv.changelog && argv.changelog.index && compiledTemplates['changelog']) {
    fs.writeFileSync(argv.changelog.index, compiledTemplates['changelog']({versions: inputVersions}));
  }
};

self.symbolMap = (argv, compounds, partMap) => {
  const symbolMap = compounds.reduce((hsh, compound) => {
    // Add the compound itself
    hsh[compound.symbolName] = {
      source: compound.id,
      target: null,
    };

    // Add the symbols in the compound
    for (const [key, value] of Object.entries(compound.symbols)) {
      if (hsh[key]) {
        throw new Error(`Duplicate symbol name ${key}`);
      }

      hsh[key] = {
        source: compound.id,
        target: value,
        part: partMap[value],
        language: compound.language,
      };
    }
    return hsh;
  }, {});

  const mapFileContents = {
    antora: doxygen2adoc.antora,
    symbols: symbolMap,
  };
  fs.writeFileSync(argv.symbolMap, JSON.stringify(mapFileContents));
};

export default self;