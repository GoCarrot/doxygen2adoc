'use strict';

import fs from 'fs';
import path from 'path';
import {strict as assert} from 'assert';
import {XMLParser} from 'fast-xml-parser';

import CompoundRef from './lib/CompoundRef.js';

const self = {};

const __dirname = new URL('.', import.meta.url).pathname;

const _ = (template) => {
  return path.join(__dirname, '/templates/', template);
};

// Defaults for templates
self.templates = {
  struct: _('struct.adoc'),
  class: _('struct.adoc'),
  enum: _('enum.adoc'),
  file: null,
  dir: null,
  index: null,
  nav: null,
  page: null,
  version: _('version.adoc'),
  changelog: _('changelog.adoc'),
};

// Built in partial templates
self.partials = {
  function: _('partial/function.adoc'),
  functionTitle: _('partial/functionTitle.adoc'),
  structTitle: _('partial/structTitle.adoc'),
  enumTitle: _('partial/enumTitle.adoc'),
};

// Built in partial output templates
self.parts = {
  methods: _('parts/method.adoc'),
  staticMethods: _('parts/method.adoc'),
};

// Antora configuration
self.antora = {
  module: null,
  name: null,
  version: null,
};

self.formatName = (name, language) => {
  return name.replace(/::/g, '.');
};

self.refMap = (inputPath) => {
  const refMapping = {};

  const firstPassXml = (name) => {
    // Undecorated parser
    const firstPass = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '$',
    });

    const file = path.join(inputPath, `${name}.xml`);
    console.log(`Reading file ${file}`); // TODO: Verbose
    return firstPass.parse(fs.readFileSync(file, 'utf8'));
  };

  firstPassXml('index').doxygenindex.compound.forEach((compound) => {
    if (compound.member) {
      const members = Array.isArray(compound.member) ? compound.member : [compound.member];
      members.forEach((member) => {
        refMapping[member.$refid] = compound.$refid;
      });
    }
  });

  return refMapping;
};

// Build command
self.build = (inputPath, sourcePath) => {
  const refMapping = self.refMap(inputPath);

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
            const version = 'latest' || self.antora.version; // Hax, not sure what to do about this
            const module = self.antora.module ? `/${self.antora.module}` : '';
            const refText = refSource ?
              `<a href="/${self.antora.name}/${version}${module}/${refSource}.html#${refId}">${text}</a>` :
              `<a href="/${self.antora.name}/${version}${module}/${refId}.html">${text}</a>`;

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
  };

  // Read the index, create compound refs and return them
  const index = provider.xml('index');
  return index.doxygenindex.compound.map((compound) => {
    return new CompoundRef(compound, provider);
  });
};

export default self;
