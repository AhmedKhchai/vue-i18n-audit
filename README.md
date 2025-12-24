# vue-i18n-audit

[![npm version](https://img.shields.io/npm/v/vue-i18n-audit.svg)](https://www.npmjs.com/package/vue-i18n-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for auditing Vue.js applications for i18n translation completeness. Detects missing translations and hardcoded user-visible text that should be internationalized.

## Features

- **Translation Key Coverage** - Verifies every `t('key')` and `$t('key')` call has a corresponding translation
- **Hardcoded Text Detection** - Identifies user-visible text in templates that should use i18n
- **Dynamic Key Flagging** - Flags template literals like `` t(`status.${value}`) `` for manual review
- **Confidence Scoring** - Rates hardcoded text detection (high/medium/low) to reduce false positives
- **Multiple Output Formats** - Markdown reports for humans, JSON for CI integration
- **CI/CD Ready** - Exit codes and threshold options for pipeline integration

## Installation

```bash
# npm
npm install -D vue-i18n-audit

# pnpm
pnpm add -D vue-i18n-audit

# yarn
yarn add -D vue-i18n-audit
```

### Peer Dependencies

This package requires the following peer dependencies (usually already in Vue 3 projects):

```bash
npm install -D @babel/parser @vue/compiler-sfc
```

## Usage

### Run Full Audit

```bash
# Generate markdown report
npx vue-i18n-audit audit

# With options
npx vue-i18n-audit audit \
  --pages-dir src/pages \
  --locales-dir src/locales/en \
  --output i18n-audit-report.md \
  --verbose

# JSON output
npx vue-i18n-audit audit --json
```

### CI Check Mode

```bash
# Fail if more than 0 missing translations
npx vue-i18n-audit check

# Allow up to 10 issues
npx vue-i18n-audit check --threshold 10

# Also fail on hardcoded text
npx vue-i18n-audit check --fail-on-hardcoded
```

### List Translation Keys

```bash
# List all unique keys used in Vue files
npx vue-i18n-audit list-keys

# Output as JSON
npx vue-i18n-audit list-keys --format json

# Show all occurrences (not just unique)
npx vue-i18n-audit list-keys --no-unique
```

## npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "i18n:audit": "vue-i18n-audit audit",
    "i18n:check": "vue-i18n-audit check",
    "i18n:keys": "vue-i18n-audit list-keys"
  }
}
```

## Configuration

Create `.i18n-audit.config.json` in your project root:

```json
{
  "pagesDir": "resources/js/Pages",
  "localesDir": "resources/js/i18n/locales/en",
  "includePartials": true,
  "outputFile": "i18n-audit-report.md",
  "excludePatterns": ["**/node_modules/**", "**/*.test.vue"],
  "hardcodedTextRules": {
    "minLength": 3,
    "excludeAllCaps": true,
    "excludePatterns": ["^v-", "^@", "^:", "^#"]
  }
}
```

## CLI Options

### `audit` command

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output <path>` | `i18n-audit-report.md` | Output file path |
| `-p, --pages-dir <path>` | `resources/js/Pages` | Vue pages directory |
| `-l, --locales-dir <path>` | `resources/js/i18n/locales/en` | English locale directory |
| `--include-partials` | `true` | Include Partials/ subdirectories |
| `--json` | `false` | Output JSON instead of markdown |
| `-v, --verbose` | `false` | Show detailed output |

### `check` command

| Option | Default | Description |
|--------|---------|-------------|
| `-t, --threshold <n>` | `0` | Max allowed issues before failure |
| `--fail-on-missing` | `true` | Exit with error on missing translations |
| `--fail-on-hardcoded` | `false` | Exit with error on hardcoded text |

### `list-keys` command

| Option | Default | Description |
|--------|---------|-------------|
| `-f, --format <fmt>` | `text` | Output format: text, json, csv |
| `-u, --unique` | `true` | Only show unique keys |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (no issues or within threshold) |
| 1 | Issues found exceeding threshold |
| 2 | Invalid arguments |
| 3 | File/parsing error |

## How It Works

### Translation Key Detection

The tool detects translation keys in:

**Templates:**
```vue
<template>
  {{ t('common.save') }}
  {{ $t('common.cancel') }}
  <span :title="t('tooltip.help')">Help</span>
</template>
```

**Scripts:**
```vue
<script setup>
const { t } = useI18n()
const message = t('notifications.success')
</script>
```

### Hardcoded Text Detection

Identifies text content between HTML tags:

```vue
<!-- Flagged as hardcoded (high confidence) -->
<h1>Welcome to Dashboard</h1>
<button>Save Changes</button>

<!-- Not flagged (technical content) -->
<div class="flex-container">
<Icon name="check" />
```

### Locale File Format

Supports TypeScript locale files with nested objects:

```typescript
// locales/en/common.ts
export default {
  save: 'Save',
  cancel: 'Cancel',
  actions: {
    edit: 'Edit',
    delete: 'Delete'
  }
}
```

Keys are flattened to dot notation: `common.save`, `common.actions.edit`

## Sample Report

```markdown
# i18n Translation Audit Report

## Summary

| Metric | Count |
|--------|-------|
| Files Scanned | 138 |
| Unique Keys | 764 |
| Missing Translations | 12 |
| Hardcoded Strings | 45 |
| Coverage | 98.4% |

## Missing Translations

| File | Line | Key |
|------|------|-----|
| Pages/Dashboard.vue | 42 | dashboard.welcome |
| Pages/Settings.vue | 18 | settings.title |
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
