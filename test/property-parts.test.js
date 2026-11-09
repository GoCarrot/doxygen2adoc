'use strict';

import {test} from 'node:test';
import {strict as assert} from 'assert';
import {execFileSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {fileURLToPath} from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'bin', 'doxygen2adoc.js');
const fixture = path.join(here, 'fixtures', 'property-parts', 'xml');

// Runs `build` over the fixture with the given `parts` config and returns the output dir.
const build = (parts) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doxygen2adoc-parts-'));
  const output = path.join(root, 'out');
  fs.mkdirSync(output);
  const config = {
    input: fixture,
    output,
    antora: {module: 'api', name: 'ios', version: '1.0.0'},
    nav: path.join(output, 'nav.adoc'),
    symbolMap: path.join(root, 'symbolMap.json'),
    parts,
    exclude: ['file', 'dir', 'namespace', 'page'],
  };
  const configPath = path.join(root, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  execFileSync('node', [cli, '--config', configPath, 'build', '--clean'], {stdio: 'pipe'});
  return {output, symbolMap: JSON.parse(fs.readFileSync(config.symbolMap, 'utf-8'))};
};

const read = (output, name) => fs.readFileSync(path.join(output, name), 'utf-8');

test('properties parts are written per property and mapped in the symbol map', () => {
  const {output, symbolMap} = build({properties: '~'});

  for (const name of ['email', 'optOutFacebook', 'isConfigured']) {
    assert.ok(fs.existsSync(path.join(output, `TeakUserConfiguration_${name}.adoc`)), name);
  }
  assert.equal(symbolMap.symbols['[TeakUserConfiguration email]'].part,
      'TeakUserConfiguration_email.adoc');
});

test('ObjC property part declares a @property, not a method', () => {
  const part = read(build({properties: '~'}).output, 'TeakUserConfiguration_email.adoc');

  assert.match(part, /@property \(copy\) NSString \*email;/);
  assert.doesNotMatch(part, /- \(/);
  assert.match(part, /The email address for the current user\./);
});

test('readonly ObjC property declares readonly', () => {
  const part = read(build({properties: '~'}).output, 'TeakUserConfiguration_isConfigured.adoc');

  assert.match(part, /@property \(assign, readonly\) BOOL isConfigured;/);
});

test('deprecated property part carries the deprecation text in part_deprecated', () => {
  const part = read(build({properties: '~'}).output, 'TeakUserConfiguration_optOutFacebook.adoc');

  assert.match(part, /ifdef::part_deprecated\[\]\n\[CAUTION\]\n====\nHas no effect unless/);
});

test('class page Access column reflects writable ObjC properties', () => {
  const {output} = build({});
  const page = read(output, 'interface_teak_user_configuration.adoc');

  assert.match(page, /``email``[\s\S]*?\|Get\/Set\n/);
  assert.match(page, /``isConfigured``[\s\S]*?\|Get\n/);
});
