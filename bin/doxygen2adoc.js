#!/usr/bin/env node
'use strict';

import fs from 'fs';
import YAML from 'yaml';
import yargs from 'yargs';
import Handlebars from 'handlebars';
import doxygen2adoc from '../index.js';

const templateNames = [
  'struct', 'class', 'file', 'dir',
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

  doxygen2adoc.build(argv.input, argv.source, compiledTemplates, argv.output);
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
    }))
    // TODO: quiet option?
    .demandCommand(1, 'Specify at least one command')
    .parse();
