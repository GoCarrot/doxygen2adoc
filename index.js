'use strict';

import fs from 'fs';
import path from 'path';
import {strict as assert} from 'assert';
import {XMLParser} from 'fast-xml-parser';

import CompoundRef from './lib/CompoundRef.js';

const self = {};

const __dirname = new URL('.', import.meta.url).pathname;

// Defaults for templates
self.templates = {
  struct: path.join(__dirname, '/templates/struct.adoc'),
  class: path.join(__dirname, '/templates/struct.adoc'),
  file: null,
  dir: null,
  index: null,
  nav: null,
  page: null,
};

self.partials = {
  function: path.join(__dirname, '/templates/partial/function.adoc'),
  functionTitle: path.join(__dirname, '/templates/partial/functionTitle.adoc'),
  structTitle: path.join(__dirname, '/templates/partial/structTitle.adoc'),
};

self.build = (inputPath, sourcePath) => {
  const refMapping = {};

  // Parse tag values which contain order-dependent XML
  const tagValueParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '$',
    textNodeName: '$text',
    preserveOrder: true,
  });

  // Undecorated parser
  const firstPass = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '$',
  });

  // XML Parser for general use
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '$',
    stopNodes: ['*.type', '*.briefdescription', '*.detaileddescription'],
    tagValueProcessor: (tagName, tagValue, jPath, hasAttributes, isLeafNode) => {
      if (tagName === 'type') {
        // Sanity check
        if (jPath !== 'doxygen.compounddef.sectiondef.memberdef.type' &&
            jPath !== 'doxygen.compounddef.sectiondef.memberdef.param.type') {
          throw new Error(`Unexpected <type> found at ${jPath}`);
        }

        const type = tagValueParser.parse(`<type>${tagValue}</type>`)[0].type;
        const combinedType = type.reduce((str, elem) => {
          // Strip out Doxygen including spaces in template types
          let text = elem.ref ? elem.ref[0].$text : elem.$text;
          text = text.replaceAll('< ', '<')
              .replaceAll(' >', '>')
              .replaceAll('>', '&gt;')
              .replaceAll('<', '&lt;');

          if (elem.ref) {
            assert.strictEqual(elem.ref.length, 1, 'More than one ref during type parsing');

            // This is only used inside 'type' tags, and the end result is
            // that it's only showing up in the 'declaration' on rendered pages.
            //
            // The 'declaration' is rendered in a source block, so putting adoc
            // markup inside that block is not useful. Instead we have to directly
            // render it as HTML.

            // TODO: This is hard-coded formatting, it would be better to have some
            //       kind of partial-template, but right now the CLI is the only
            //       thing that knows about anything template related.
            const refId = elem[':@'].$refid;
            const refSource = refMapping[refId];
            const refText = refSource ?
              `<a href="${refSource}.html#${refId}">${text}</a>` :
              `<a href="${refId}.html">${text}</a>`;

            return `${str}${text.endsWith('&gt;') || str.endsWith('&lt;') ? '' : ' '}${refText}`.trim();
          } else {
            return `${str}${text.endsWith('&gt;') || str.endsWith('&lt;') ? '' : ' '}${text}`.trim();
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

    firstPassXml: (name) => {
      const file = path.join(inputPath, `${name}.xml`);
      console.log(`Reading file ${file}`); // TODO: Verbose
      return firstPass.parse(fs.readFileSync(file, 'utf8'));
    },
  };

  // Do a first-pass parse and build reference mapping as needed
  provider.firstPassXml('index').doxygenindex.compound.forEach((compound) => {
    if (compound.member) {
      const members = Array.isArray(compound.member) ? compound.member : [compound.member];
      members.forEach((member) => {
        refMapping[member.$refid] = compound.$refid;
      });
    }
  });

  // Read the index, create compound refs and return them
  const index = provider.xml('index');
  return index.doxygenindex.compound.map((compound) => {
    return new CompoundRef(compound, provider);
  });
};

export default self;
