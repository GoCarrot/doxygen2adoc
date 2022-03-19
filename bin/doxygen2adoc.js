#!/usr/bin/env node
'use strict';

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import yargs from 'yargs';
import Handlebars from 'handlebars';
import doxygen2adoc from '../index.js';

// Auto-build the template config options
const templates = Object.keys(doxygen2adoc.templates).reduce((hsh, name) => {
  hsh[`template.${name}`] = {
    normalize: true,
    default: doxygen2adoc.templates[name],
  };
  return hsh;
}, {});

// Some helpers
Handlebars.registerHelper('cut', function(string, remove) {
  if (!string) return string;

  return string.replace(remove, '');
});

//
// build
//
const cmdBuild = (argv) => {
  // Merge antora configuration
  if (argv.antora) {
    const antoraYml = YAML.parse(fs.readFileSync(argv.antora, 'utf-8'));
    doxygen2adoc.antora = {...doxygen2adoc.antora, ...antoraYml};
  }

  // Register partial templates
  const partials = {...doxygen2adoc.partials, ...argv.partial};
  Object.keys(partials).forEach((key) => {
    Handlebars.registerPartial(key, fs.readFileSync(partials[key], 'utf-8'));
  });

  // Compile the templates
  const header = argv.header ? fs.readFileSync(argv.header, 'utf-8') : null;
  const footer = argv.footer ? fs.readFileSync(argv.footer, 'utf-8') : null;

  // Compile output templates
  const compiledTemplates = Object.keys(doxygen2adoc.templates).reduce((hsh, name) => {
    if (!argv.template[name]) return hsh;

    hsh[name] = (data) => {
      // Add header/footer if applicable
      const template = fs.readFileSync(argv.template[name], 'utf-8');
      const templateContents = [];
      if (header) templateContents.push(header);
      templateContents.push(template);
      if (footer) templateContents.push(footer);

      // Add globals to the template evaluation
      return Handlebars.compile(
          templateContents.join('\n'),
      )({...argv.global, ...{antora: doxygen2adoc.antora}, ...data});
    };
    return hsh;
  }, {});

  // Compile part templates
  const compiledPartTemplates = Object.keys(argv.parts).reduce((hsh, name) => {
    hsh[name] = (data) => {
      const fileName = (!argv.parts[name] || argv.parts[name] === '~') ?
        doxygen2adoc.parts[name] : argv.parts[name];
      const template = fs.readFileSync(fileName, 'utf-8');

      // Add globals to the template evaluation
      return Handlebars.compile(template)({...argv.global, ...{antora: doxygen2adoc.antora}, ...data});
    };
    return hsh;
  }, {});

  const compoundRefs = doxygen2adoc.build(argv.input, argv.source);

  // Exclude unwanted compounds from the write
  const filteredRefs = compoundRefs.filter((compound) => {
    return !argv.exclude.includes(compound.kind);
  });

  // Clean output directory
  if (argv.clean) {
    const files = fs.readdirSync(argv.output);
    for (const file of files) {
      if (file.endsWith('.adoc')) {
        fs.unlinkSync(path.join(argv.output, file));
      }
    }
  }

  // Write out componds
  filteredRefs.forEach((compoundRef) => {
    if (compiledTemplates[compoundRef.kind]) {
      fs.writeFileSync(path.join(argv.output, `${compoundRef.refId}.adoc`),
          compiledTemplates[compoundRef.kind](compoundRef.compound));
    } else {
      console.error(`Missing template for ${compoundRef.kind}`);
    }

    // Write out parts for each Compound
    for (const part in argv.parts) {
      if (compoundRef.compound[part]) {
        const srcPart = Array.isArray(compoundRef.compound[part]) ?
          compoundRef.compound[part] : [compoundRef.compound[part]];

        srcPart.forEach((src) => {
          fs.writeFileSync(path.join(argv.output, `${compoundRef.compound.name}_${src.partName}.adoc`),
              compiledPartTemplates[part](src));
        });
      }
    }
  });

  // Write out index and nav
  const compounds = filteredRefs.reduce((arr, ref) => {
    return arr.concat(ref.compound);
  }, []);

  if (compiledTemplates['index']) {
    fs.writeFileSync(path.join(argv.output, 'index.adoc'), compiledTemplates['index']({items: compounds}));
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
        normalize: true,
      },
      'exclude': {
        describe: 'Exclude these kinds of compounds',
        array: true,
        default: ['file', 'dir'],
      },
      'clean': {
        describe: 'Delete contents of output before writing new files.',
        boolean: true,
        default: false,
      },
      'global': {
        describe: 'Global variables provided to Handlebars templates',
        default: {},
      },
      'header': {
        describe: 'Header which will be prepended to all Handlebars templates',
        normalize: true,
      },
      'footer': {
        describe: 'Footer which will be prepended to all Handlebars templates',
        normalize: true,
      },
      'parts': {
        describe: 'Write out partial templates for the specified Compound parts',
        default: {},
      },
      'antora': {
        describe: 'Path to antora.yml',
        normalize: true,
      },
    }))
    // TODO: quiet option?
    .demandCommand(1, 'Specify at least one command')
    .parse();
