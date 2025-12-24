/**
 * TypeScript Locale File Loader
 * Loads locale files from en/ directory and flattens to dot notation
 */

import { readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import type { LocaleEntry } from './types.js';

/**
 * Flatten a nested object to dot-notation keys
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = '',
  file: string = ''
): LocaleEntry[] {
  const entries: LocaleEntry[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flattenObject(value as Record<string, unknown>, fullKey, file));
    } else if (typeof value === 'string') {
      entries.push({
        key: fullKey,
        value,
        file,
        isEmpty: value.trim() === '',
      });
    }
  }

  return entries;
}

/**
 * Parse a TypeScript locale file and extract the default export object
 * Uses regex-based parsing to avoid runtime execution
 */
function parseLocaleFile(filePath: string): Record<string, unknown> {
  const content = readFileSync(filePath, 'utf-8');

  // Remove comments
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  // Find the default export object
  // Match: export default { ... }
  const exportMatch = withoutComments.match(/export\s+default\s*(\{[\s\S]*\})\s*;?\s*$/);

  if (!exportMatch) {
    console.warn(`Warning: Could not find default export in ${filePath}`);
    return {};
  }

  try {
    // Convert TypeScript object literal to JSON-compatible format
    let objString = exportMatch[1];

    // Handle trailing commas (allowed in TS, not in JSON)
    objString = objString.replace(/,(\s*[}\]])/g, '$1');

    // Convert single quotes to double quotes
    objString = objString.replace(/'/g, '"');

    // Handle unquoted keys
    objString = objString.replace(/(\s*)(\w+)(\s*):/g, '$1"$2"$3:');

    // Fix double-quoted keys that got double-quoted again
    objString = objString.replace(/""+/g, '"');

    return JSON.parse(objString);
  } catch (error) {
    // Fallback: Parse using regex for simple key-value pairs
    return parseLocaleFileRegex(content, filePath);
  }
}

/**
 * Fallback regex-based parsing for complex locale files
 */
function parseLocaleFileRegex(content: string, filePath: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Match simple key-value patterns: key: "value" or key: 'value'
  const kvPattern = /(\w+)\s*:\s*["'`]([^"'`]*)["'`]/g;

  // Match nested object starts: key: {
  const nestedPattern = /(\w+)\s*:\s*\{/g;

  let match;
  const stack: { obj: Record<string, unknown>; key: string }[] = [{ obj: result, key: '' }];

  // Simple line-by-line parsing
  const lines = content.split('\n');
  let currentObj = result;
  const objStack: Record<string, unknown>[] = [result];
  let currentKey = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed === '') {
      continue;
    }

    // Check for nested object start
    const nestedMatch = trimmed.match(/^(\w+)\s*:\s*\{/);
    if (nestedMatch) {
      const key = nestedMatch[1];
      const newObj: Record<string, unknown> = {};
      currentObj[key] = newObj;
      objStack.push(currentObj);
      currentObj = newObj;
      currentKey = key;
      continue;
    }

    // Check for object close
    if (trimmed.startsWith('}')) {
      if (objStack.length > 1) {
        currentObj = objStack.pop()!;
      }
      continue;
    }

    // Check for key-value pair
    const kvMatch = trimmed.match(/^(\w+)\s*:\s*["'`](.*)["'`],?\s*$/);
    if (kvMatch) {
      currentObj[kvMatch[1]] = kvMatch[2];
    }
  }

  return result;
}

/**
 * Load all locale entries from a locale directory
 * @param localesDir Path to the locale directory (e.g., resources/js/i18n/locales/en)
 */
export function loadLocaleEntries(localesDir: string): LocaleEntry[] {
  const entries: LocaleEntry[] = [];

  try {
    const files = readdirSync(localesDir).filter(f => f.endsWith('.ts'));

    for (const file of files) {
      const filePath = join(localesDir, file);
      const namespace = basename(file, '.ts');

      // Skip index.ts as it just re-exports
      if (namespace === 'index') {
        continue;
      }

      try {
        const localeObj = parseLocaleFile(filePath);
        const fileEntries = flattenObject(localeObj, namespace, filePath);
        entries.push(...fileEntries);
      } catch (error) {
        console.warn(`Warning: Failed to parse locale file ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error reading locale directory ${localesDir}:`, error);
  }

  return entries;
}

/**
 * Create a lookup map from locale entries for fast key validation
 */
export function createLocaleLookup(entries: LocaleEntry[]): Map<string, LocaleEntry> {
  const lookup = new Map<string, LocaleEntry>();

  for (const entry of entries) {
    lookup.set(entry.key, entry);
  }

  return lookup;
}
