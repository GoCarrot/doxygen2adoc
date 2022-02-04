#!/usr/bin/env node
'use strict';

const yargs = require('yargs/yargs');
const doxygen2adoc = require('../index.js');

yargs(process.argv.slice(2))
    .command('build <input> [sourcePath]', 'build the docs from the provided input source', (yargs) => {
      return yargs
          .positional('input', {
            describe: 'location of the Doxygen XML output, expects \'index.xml\' to exist at this path',
            normalize: true,
          })
          .positional('sourcePath', {
            describe: 'path to search for source files referenced in Doxygen XML',
            normalize: true,
            default: null,
          });
    }, cmdBuild)
    // TODO: quiet option?
    .demandCommand(1, 'Specify at least one command')
    .parse();

function cmdBuild(argv) {
  doxygen2adoc.build(argv.input, argv.sourcePath);
}
