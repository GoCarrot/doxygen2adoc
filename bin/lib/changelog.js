'use strict';

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import compareVersions from 'compare-versions';

const self = {};

// Categories the built-in version template renders, in render order. A key outside this list (or
// the native version keys below) is silently dropped from the docs, so `check` rejects it.
self.categories = [
  'breaking',
  'new',
  'upgrade_note',
  'deprecation',
  'enhancement',
  'bug',
  'known_issue',
];

// Native SDK version includes. Set by whoever rolls a release, never by a fragment.
self.nativeKeys = ['ios', 'android'];

const yamlFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
      .filter((file) => !file.startsWith('.') &&
        (file.endsWith('.yml') || file.endsWith('.yaml')))
      .sort();
};

const validateItem = (item, where, errors) => {
  if (typeof item === 'string') return;
  if (Array.isArray(item)) {
    item.forEach((child, i) => validateItem(child, `${where}[${i}]`, errors));
  } else if (item !== null && typeof item === 'object') {
    for (const [key, child] of Object.entries(item)) {
      validateItem(child, `${where}.${key}`, errors);
    }
  } else {
    errors.push(`${where}: expected text, got ${item === null ? 'nothing' : typeof item}`);
  }
};

// Returns a list of problems with one parsed changelog file; empty means it's fine.
self.validate = (data, {fragment}) => {
  const errors = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return ['expected a map of category to list of entries'];
  }

  for (const [key, value] of Object.entries(data)) {
    if (self.nativeKeys.includes(key)) {
      if (fragment) {
        errors.push(`${key}: native versions are set at release time, not in a fragment`);
      } else if (value !== null && typeof value !== 'string') {
        errors.push(`${key}: expected a version or ~`);
      }
    } else if (!self.categories.includes(key)) {
      errors.push(`${key}: unknown category (expected one of ${self.categories.join(', ')})`);
    } else if (!Array.isArray(value) || value.length === 0) {
      errors.push(`${key}: expected a non-empty list of entries`);
    } else {
      value.forEach((item, i) => validateItem(item, `${key}[${i}]`, errors));
    }
  }
  return errors;
};

const parseFile = (file) => {
  const doc = YAML.parseDocument(fs.readFileSync(file, 'utf-8'));
  return {doc, errors: doc.errors.map((e) => e.message.split('\n')[0].replace(/:$/, ''))};
};

// Validates every version file and fragment. Returns a list of "file: problem" strings.
self.check = ({versions, unreleased}) => {
  const problems = [];

  for (const file of yamlFiles(versions)) {
    const name = path.parse(file).name;
    const full = path.join(versions, file);
    if (!compareVersions.validate(name)) {
      problems.push(`${full}: file name must be a version (fragments go in ${unreleased})`);
    }
    const {doc, errors} = parseFile(full);
    const found = errors.length ? errors : self.validate(doc.toJS(), {fragment: false});
    found.forEach((e) => problems.push(`${full}: ${e}`));
  }

  for (const file of yamlFiles(unreleased)) {
    const full = path.join(unreleased, file);
    const {doc, errors} = parseFile(full);
    const found = errors.length ? errors : self.validate(doc.toJS(), {fragment: true});
    found.forEach((e) => problems.push(`${full}: ${e}`));
  }

  return problems;
};

// Merges every fragment into versions/<version>.yaml (creating it if needed), then deletes the
// fragments. Within a category, entries keep their existing order and fragments append in file
// name order. Returns {target, fragments}; throws without writing anything if any file is invalid.
self.roll = ({versions, unreleased, version}) => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`${version} is not a release version (expected MAJOR.MINOR.PATCH)`);
  }

  const problems = self.check({versions, unreleased});
  if (problems.length) {
    throw new Error(`Fix these before rolling:\n${problems.join('\n')}`);
  }

  const fragments = yamlFiles(unreleased).map((file) => path.join(unreleased, file));
  const target = path.join(versions, `${version}.yaml`);
  if (fragments.length === 0) return {target, fragments};

  const doc = fs.existsSync(target) ?
    YAML.parseDocument(fs.readFileSync(target, 'utf-8')) :
    new YAML.Document({});
  const fragmentDocs = fragments.map((file) => parseFile(file).doc);

  for (const category of self.categories) {
    for (const fragmentDoc of fragmentDocs) {
      const entries = fragmentDoc.get(category, true);
      if (!entries) continue;

      const existing = doc.get(category, true);
      if (existing) {
        existing.items.push(...entries.items);
      } else {
        doc.set(category, entries);
      }
    }
  }

  fs.writeFileSync(target, doc.toString({lineWidth: 0}));
  fragments.forEach((file) => fs.unlinkSync(file));
  return {target, fragments};
};

export default self;
