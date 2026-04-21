# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`doxygen2adoc` is a CLI that reads Doxygen XML output and emits AsciiDoc via Handlebars templates. It is used to generate multi-language SDK docs (Objective-C, Java, C#) for Antora sites. See `README.adoc` for downstream consumers.

ESM-only (`"type": "module"`). Target runtime is Node LTS (`.nvmrc` = `lts/*`).

## Commands

- Install: `yarn install`
- Lint: `yarn lint` (ESLint — Google config, `max-len` 100)
- Run the CLI during development: `./bin/doxygen2adoc.js build -i <doxygen-xml-dir> -o <out-dir>`
- No test suite is configured (`yarn test` intentionally errors).

The CLI takes most input via a `--config <file>.{yml,json}` rather than flags; every CLI option is also a config key. The two subcommands are `build` and `changelog`.

## Architecture

### Pipeline (three stages)

1. **`doxygen2adoc.build()` in `index.js`** — reads `index.xml`, wraps each entry in a `CompoundRef`, and configures two `fast-xml-parser` instances. One parser has `stopNodes` on `type`/`briefdescription`/`detaileddescription` so those stay as raw strings; a custom `tagValueProcessor` then re-parses `<type>` elements in order-preserving mode so it can rewrite `<ref>` children into HTML `<a>` tags pointing into the Antora output tree. This rewrite depends on `refMap()` (built from `index.xml` member → compound refids) because per-compound XML doesn't say which file a member's refid lives in.
2. **CLI orchestration in `bin/doxygen2adoc.js`** — compiles Handlebars templates/partials/parts, then does a deliberate two-pass walk over `CompoundRef`s:
   - Pass 1: touch `.compound` on every ref so all `Compound` instances get constructed and self-register into `Compound.refs` and `Class.nameToRef`.
   - Pass 2: call `.finalize()` on each. Finalize resolves cross-compound references (e.g. base-class `xref:` links by name) that can only be built once every compound exists. Fix/5dd8531 made this split necessary when a subclass appears alphabetically before its superclass.
3. **Rendering** — each compound is written as `<refId>.adoc` using the template matching its `kind`. Optional outputs: per-member "parts" files, `index.adoc`, a nav file, and a `symbolMap` JSON.

### Compound type hierarchy (`lib/`)

- `Compound` — base. Constructor inserts `this` into the static `Compound.refs` map (duplicate IDs throw). Owns documentation extraction via `helpers/Documentation`.
- `CompoundRef` — lazy wrapper. Dispatches on `$kind` to the right subclass: `function` → `Function`, `event`/`property`/`variable` → `Property`, `class`/`struct` → `Class`, `enum` → `Enum`. Unknown kinds fall back to `Compound` with a log line.
- `Class` — also indexes itself in `Class.nameToRef` (duplicates throw). Parses `sectiondef` children into `methods` / `staticMethods` / `attributes` / `staticAttributes` / `events` / `properties` / `enums`. Builds a `symbols` map used for the symbol JSON; the format is language-aware (Objective-C uses `[Class method:]` and bare `method:` keys, others use `Class.method(type,type)`). `finalize()` resolves `basecompoundref` entries to `xref:` links, skipping a hard-coded list of base classes (`NSObject`, `MonoBehaviour`, etc.).
- `Function` — language-aware declaration formatter. `#formatForObjC` aligns on the longest colon position to produce the Objective-C multi-line style; `#formatForCLike` handles Java/C#/C++. `symbolName` and `partName` are computed differently per language.
- `Property` extends `Function` but overrides `_usedWithParameters()` so the declaration renders without `()`.
- `Enum` — simpler sectiondef parser; only reads `public-attrib` for enum values.

### Docs extraction (`lib/helpers/Documentation.js`)

Converts Doxygen `<briefdescription>` / `<detaileddescription>` trees (parsed in `preserveOrder` mode) into AsciiDoc strings. Pulls sidecar sections out of the description: `<simplesect kind="return|note|warning">`, `<xrefsect>` for deprecation, and `<parameterlist>` into `parameterDocs`. **AsciiDoc formatting is hardcoded inline** (`` `` ``, `**`, `\n[source]\n----\n`, `<<refid,text>>`, `\n* ` for lists) — several `// TODO: This is hard-coded asciidoc formatting` comments flag the ones that should eventually move into templates.

### Templating

Handlebars is used everywhere output is produced. `index.js` exports three template maps — `templates` (full-file outputs like `struct`/`class`/`enum`/`version`/`changelog`/`index`/`nav`/`page`/`file`/`dir`), `partials` (registered under their key name for `{{> name}}` use), and `parts` (per-member split files, currently `methods` and `staticMethods`). Any of them can be overridden per-invocation via the config (`template.<kind>`, `partial.<name>`, `parts.<name>`). Built-in templates live under `templates/` and `templates/partial/` / `templates/parts/`.

### Known hack worth knowing about

`index.js` has `const version = 'latest' || self.antora.version;` in the type-link rewriter. This short-circuits `antora.version` and always emits `latest` URLs. The surrounding comment labels it "Hax"; don't "fix" it without understanding which downstream site depends on it.

## Branching conventions

`fix/`, `feat/`, `maint/` prefixes; keep branches single-purpose.

## Commit message format

Every commit must append a Human-Claude Interaction Log to the commit message, using this exact shape:

```
<normal commit subject and body>

## Human-Claude Interaction Log

### Human prompts (VERBATIM - include typos, informal language, COMPLETE text):
**Include EVERY prompt since last commit - even short ones, corrections, clarifications**
1. "[Copy-paste ENTIRE first prompt since last commit]"
   → Claude: [What Claude did in response]

2. "[Copy-paste ENTIRE second prompt - including [Request interrupted] if present]"
   → Claude: [How Claude adjusted]

[Continue numbering ALL prompts - don't skip any or judge importance]

### Key decisions made:
- Human guided: [specific guidance provided]
- Claude discovered: [patterns found]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

