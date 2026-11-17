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
const fixture = path.join(here, 'fixtures', 'para-break', 'xml');

// Runs `build` over the fixture and returns the generated class page.
const buildClassPage = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doxygen2adoc-para-'));
  const output = path.join(root, 'out');
  fs.mkdirSync(output);
  const config = {
    input: fixture,
    output,
    antora: {module: 'api', name: 'ios', version: '1.0.0'},
    nav: path.join(output, 'nav.adoc'),
    symbolMap: path.join(root, 'symbolMap.json'),
    exclude: ['file', 'dir', 'namespace', 'page'],
  };
  const configPath = path.join(root, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  execFileSync('node', [cli, '--config', configPath, 'build', '--clean'], {stdio: 'pipe'});
  return fs.readFileSync(path.join(output, 'interface_teak.adoc'), 'utf-8');
};

test('consecutive paragraphs are separated by a blank line', () => {
  const page = buildClassPage();

  assert.match(page, /signed JWS\.\n\nCall it from any thread/);
  assert.doesNotMatch(page, /JWS\.Call/);
});

test('paragraphs that only hold parameters or a return add no extra blank lines', () => {
  const page = buildClassPage();

  assert.match(page, /First paragraph\.\n\nSecond paragraph\.\n{6}==== Parameters/);
});

test('a single paragraph renders unchanged', () => {
  const page = buildClassPage();

  assert.match(page, /Only one paragraph here\. /);
});
