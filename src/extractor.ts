/**
 * Translation Key Extractor
 * Extracts t() and $t() translation key usages from Vue templates and scripts
 */

import type { TranslationKey, ParsedVueSFC } from './types.js';
import { calculateSourceLine } from './parser.js';

/**
 * Extract translation keys from a parsed Vue SFC
 */
export function extractTranslationKeys(parsed: ParsedVueSFC): TranslationKey[] {
  const keys: TranslationKey[] = [];

  // Extract from template
  if (parsed.template) {
    keys.push(...extractFromTemplate(parsed.template, parsed.filePath, parsed.templateStartLine));
  }

  // Extract from script setup (more common in Vue 3)
  if (parsed.scriptSetup) {
    keys.push(...extractFromScript(parsed.scriptSetup, parsed.filePath, parsed.scriptSetupStartLine));
  }

  // Extract from regular script
  if (parsed.script) {
    keys.push(...extractFromScript(parsed.script, parsed.filePath, parsed.scriptStartLine));
  }

  return keys;
}

/**
 * Extract translation keys from template section
 */
function extractFromTemplate(template: string, filePath: string, startLine: number): TranslationKey[] {
  const keys: TranslationKey[] = [];
  const lines = template.split('\n');

  // Patterns to match in templates:
  // {{ t('key') }}, {{ $t('key') }}, :attr="t('key')", :attr="$t('key')"
  // Also handle parameters: t('key', { count: 5 })

  // Pattern for interpolation: {{ t('key') }} or {{ $t('key') }}
  const interpolationPattern = /\{\{\s*\$?t\s*\(\s*(['"`])([^'"`]+)\1/g;

  // Pattern for bound attributes: :attr="t('key')" or :attr="$t('key')"
  const boundAttrPattern = /:\w+(?:-\w+)*=["']\s*\$?t\s*\(\s*(['"`])([^'"`]+)\1/g;

  // Pattern for template literals (dynamic keys): t(`key.${var}`)
  const templateLiteralPattern = /\$?t\s*\(\s*`([^`]+)`/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = calculateSourceLine(i + 1, startLine);

    // Match interpolation patterns
    let match;
    const interpolationRegex = new RegExp(interpolationPattern.source, 'g');
    while ((match = interpolationRegex.exec(line)) !== null) {
      keys.push({
        key: match[2],
        file: filePath,
        line: lineNumber,
        context: 'template',
        isDynamic: false,
      });
    }

    // Match bound attribute patterns
    const boundRegex = new RegExp(boundAttrPattern.source, 'g');
    while ((match = boundRegex.exec(line)) !== null) {
      keys.push({
        key: match[2],
        file: filePath,
        line: lineNumber,
        context: 'template',
        isDynamic: false,
      });
    }

    // Match template literal patterns (dynamic keys)
    const templateLiteralRegex = new RegExp(templateLiteralPattern.source, 'g');
    while ((match = templateLiteralRegex.exec(line)) !== null) {
      const rawPattern = match[1];
      // Check if it contains interpolation
      if (rawPattern.includes('${')) {
        keys.push({
          key: '',
          file: filePath,
          line: lineNumber,
          context: 'template',
          isDynamic: true,
          rawPattern: `\`${rawPattern}\``,
        });
      } else {
        // Template literal without interpolation, treat as regular key
        keys.push({
          key: rawPattern,
          file: filePath,
          line: lineNumber,
          context: 'template',
          isDynamic: false,
        });
      }
    }
  }

  return keys;
}

/**
 * Extract translation keys from script section
 */
function extractFromScript(script: string, filePath: string, startLine: number): TranslationKey[] {
  const keys: TranslationKey[] = [];
  const lines = script.split('\n');

  // Check if this script uses useI18n
  const usesI18n = /useI18n\s*\(/.test(script) || /const\s*\{\s*t\s*[,}]/.test(script);

  if (!usesI18n) {
    return keys;
  }

  // Patterns for script:
  // t('key'), t('key', { ... }), t('key', count)

  // Pattern for simple t() calls
  const simplePattern = /\bt\s*\(\s*(['"`])([^'"`]+)\1/g;

  // Pattern for template literals (dynamic keys)
  const templateLiteralPattern = /\bt\s*\(\s*`([^`]+)`/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = calculateSourceLine(i + 1, startLine);

    // Skip import statements and type definitions
    if (line.trim().startsWith('import ') || line.trim().startsWith('type ')) {
      continue;
    }

    // Match simple t() calls
    let match;
    const simpleRegex = new RegExp(simplePattern.source, 'g');
    while ((match = simpleRegex.exec(line)) !== null) {
      keys.push({
        key: match[2],
        file: filePath,
        line: lineNumber,
        context: 'script',
        isDynamic: false,
      });
    }

    // Match template literal patterns (dynamic keys)
    const templateLiteralRegex = new RegExp(templateLiteralPattern.source, 'g');
    while ((match = templateLiteralRegex.exec(line)) !== null) {
      const rawPattern = match[1];
      if (rawPattern.includes('${')) {
        keys.push({
          key: '',
          file: filePath,
          line: lineNumber,
          context: 'script',
          isDynamic: true,
          rawPattern: `\`${rawPattern}\``,
        });
      } else {
        keys.push({
          key: rawPattern,
          file: filePath,
          line: lineNumber,
          context: 'script',
          isDynamic: false,
        });
      }
    }
  }

  return keys;
}

/**
 * Get unique keys from a list of translation keys
 */
export function getUniqueKeys(keys: TranslationKey[]): string[] {
  const uniqueSet = new Set<string>();

  for (const key of keys) {
    if (!key.isDynamic && key.key) {
      uniqueSet.add(key.key);
    }
  }

  return Array.from(uniqueSet).sort();
}

/**
 * Filter out dynamic keys for separate handling
 */
export function getDynamicKeys(keys: TranslationKey[]): TranslationKey[] {
  return keys.filter(k => k.isDynamic);
}

/**
 * Filter to get only static keys
 */
export function getStaticKeys(keys: TranslationKey[]): TranslationKey[] {
  return keys.filter(k => !k.isDynamic && k.key);
}
