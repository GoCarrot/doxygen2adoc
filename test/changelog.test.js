'use strict';

import {test} from 'node:test';
import {strict as assert} from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import changelog from '../bin/lib/changelog.js';

const setup = (files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doxygen2adoc-changelog-'));
  const dirs = {versions: path.join(root, 'versions'), unreleased: path.join(root, 'unreleased')};
  fs.mkdirSync(dirs.versions);
  fs.mkdirSync(dirs.unreleased);
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, name), contents);
  }
  return dirs;
};

const read = (dirs, version) => {
  return fs.readFileSync(path.join(dirs.versions, `${version}.yaml`), 'utf-8');
};

test('roll creates the version file in category order, fragments in name order', () => {
  const dirs = setup({
    'unreleased/c-2.yaml': 'bug:\n  - "Fixed ``B``"\nnew:\n  - Added B\n',
    'unreleased/c-1.yaml': 'bug:\n  - Fixed A\n',
    'unreleased/README.md': 'not a fragment',
  });

  const {fragments} = changelog.roll({...dirs, version: '4.4.0'});

  assert.equal(fragments.length, 2);
  assert.equal(read(dirs, '4.4.0'), 'new:\n  - Added B\nbug:\n  - Fixed A\n  - "Fixed ``B``"\n');
  assert.deepEqual(fs.readdirSync(dirs.unreleased), ['README.md']);
});

test('roll appends to an existing version file without touching its entries', () => {
  const existing = 'bug:\n  - "Already ``shipped`` in beta0"\nios: 4.4.0\n';
  const dirs = setup({
    'versions/4.4.0.yaml': existing,
    'unreleased/c-3.yaml': 'bug:\n  - Fixed C\nenhancement:\n  - Faster C\n',
  });

  changelog.roll({...dirs, version: '4.4.0'});

  assert.equal(read(dirs, '4.4.0'),
      'bug:\n  - "Already ``shipped`` in beta0"\n  - Fixed C\nios: 4.4.0\n' +
      'enhancement:\n  - Faster C\n');
});

test('roll keeps nested entries and long lines intact', () => {
  const long = 'Fixed a long thing '.repeat(12).trim();
  const dirs = setup({
    'unreleased/c-4.yaml': `new:\n  - ${long}\n  - Parent:\n      - Child one\n      - Child two\n`,
  });

  changelog.roll({...dirs, version: '4.4.0'});

  assert.equal(read(dirs, '4.4.0'),
      `new:\n  - ${long}\n  - Parent:\n      - Child one\n      - Child two\n`);
});

test('roll with no fragments writes nothing', () => {
  const dirs = setup({});
  const {fragments} = changelog.roll({...dirs, version: '4.4.0'});
  assert.equal(fragments.length, 0);
  assert.deepEqual(fs.readdirSync(dirs.versions), []);
});

test('roll refuses invalid fragments and leaves everything in place', () => {
  const dirs = setup({
    'unreleased/c-5.yaml': 'bug:\n  - Fixed E\n',
    'unreleased/c-6.yaml': 'bugs:\n  - Typo category\n',
  });

  assert.throws(() => changelog.roll({...dirs, version: '4.4.0'}), /bugs: unknown category/);
  assert.deepEqual(fs.readdirSync(dirs.versions), []);
  assert.deepEqual(fs.readdirSync(dirs.unreleased), ['c-5.yaml', 'c-6.yaml']);
});

test('roll refuses a version that is not a version', () => {
  const dirs = setup({'unreleased/c-7.yaml': 'bug:\n  - Fixed G\n'});
  assert.throws(() => changelog.roll({...dirs, version: 'unreleased'}), /not a release version/);
  assert.throws(() => changelog.roll({...dirs, version: '4.4'}), /not a release version/);
  assert.deepEqual(fs.readdirSync(dirs.versions), []);
});

test('check passes clean files', () => {
  const dirs = setup({
    'versions/4.3.17.yaml': 'bug:\n  - Fixed\nandroid: ~\n',
    'unreleased/c-8.yaml': 'deprecation:\n  - Old thing\n',
  });
  assert.deepEqual(changelog.check(dirs), []);
});

test('check reports each class of problem', () => {
  const dirs = setup({
    'versions/unreleased.yaml': 'bug:\n  - Misplaced\n',
    'versions/4.3.16.yaml': 'new:\n  - This line ends in a colon, so it becomes a map:\n',
    'unreleased/c-9.yaml': 'ios: 4.4.0\nbug:\n',
    'unreleased/c-10.yaml': 'bug:\n  - One\nbug:\n  - Two\n',
  });

  const problems = changelog.check(dirs).map((p) => p.replace(path.dirname(dirs.versions), ''));
  assert.deepEqual(problems, [
    '/versions/4.3.16.yaml: new[0].This line ends in a colon, so it becomes a map: ' +
      'expected text, got nothing',
    '/versions/unreleased.yaml: file name must be a version (fragments go in ' +
      `${dirs.unreleased})`,
    '/unreleased/c-10.yaml: Map keys must be unique at line 3, column 1',
    '/unreleased/c-9.yaml: ios: native versions are set at release time, not in a fragment',
    '/unreleased/c-9.yaml: bug: expected a non-empty list of entries',
  ]);
});
