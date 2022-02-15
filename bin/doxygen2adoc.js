#!/usr/bin/env node
'use strict';

import fs from 'fs';
import YAML from 'yaml';
import yargs from 'yargs';
import Handlebars from 'handlebars';
import doxygen2adoc from '../index.js';

const templateNames = [
  'struct', 'class', 'file', 'dir', 'index', 'nav'
];

const templates = templateNames.reduce((hsh, name) => {
  hsh[`template.${name}`] = {
    normalize: true,
  };
  return hsh;
}, {});

const cmdBuild = (argv) => {
  // Register partial templates
  Object.keys(argv.partial).forEach((key) => {
    Handlebars.registerPartial(key, fs.readFileSync(argv.partial[key], 'utf-8'));
  });

  // Compile the templates
  const compiledTemplates = templateNames.reduce((hsh, name) => {
    if (!argv.template[name]) return hsh;

    hsh[name] = Handlebars.compile(fs.readFileSync(argv.template[name], 'utf-8'));
    return hsh;
  }, {});

  const compoundRefs = doxygen2adoc.build(argv.input, argv.source);

  compoundRefs.forEach((compoundRef) => {
    if (compiledTemplates[compoundRef.kind]) {
      fs.writeFileSync(`${argv.output}/${compoundRef.refId}.adoc`,
          compiledTemplates[compoundRef.kind](compoundRef.compound));
    } else {
      console.error(`Missing template for ${compoundRef.kind}`);
    }
  });

  // Write out index and nav
  const compounds = compoundRefs.reduce((arr, ref) => {
    return arr.concat(ref.compound);
  }, []);

  if (compiledTemplates['index']) {
    fs.writeFileSync(`${argv.output}/index.adoc`, compiledTemplates['index']({items: compounds}));
  }

  if (compiledTemplates['nav']) {
    fs.writeFileSync(argv.nav, compiledTemplates['nav']({items: compounds}));
  }
};

yargs(process.argv.slice(2))
    .config('config', 'Configuration JSON or YAML file', function(configPath) {
      if (configPath.endsWith('yml') || configPath.endsWith('yaml')) {
        return YAML.parse(fs.readFileSync(configPath, 'utf-8'));
      } else {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    })
    .command('build', 'Build the docs', (yargs) => {
      return yargs;
    }, cmdBuild)
    .options(Object.assign(templates, {
      'input': {
        alias: 'i',
        describe: 'Location of the Doxygen XML output, expects \'index.xml\' to exist at this path',
        normalize: true,
        demandOption: true,
      },
      'source': {
        describe: 'Path to search for source files referenced in Doxygen XML',
        normalize: true,
        default: '.',
      },
      'output': {
        alias: 'o',
        describe: 'Destination path for generated files',
        normalize: true,
        demandOption: true,
      },
      'partial': {
        describe: 'Partial templates that should be registered with Handlebars',
        default: {},
      },
      'nav': {
        describe: 'Generate navigation file at the provided path',
        normalize: true
      }
    }))
    // TODO: quiet option?
    .demandCommand(1, 'Specify at least one command')
    .parse();
