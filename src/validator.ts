/**
 * Translation Key Validator
 * Validates extracted keys against loaded locale entries
 */

import type { TranslationKey, LocaleEntry, AuditIssue } from './types.js';
import { getRelativePath } from './scanner.js';

/**
 * Validate translation keys against locale entries
 */
export function validateKeys(
  keys: TranslationKey[],
  localeLookup: Map<string, LocaleEntry>,
  projectRoot: string = process.cwd()
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const key of keys) {
    // Skip dynamic keys - they're handled separately
    if (key.isDynamic) {
      issues.push({
        type: 'dynamic_key',
        severity: 'info',
        file: getRelativePath(key.file, projectRoot),
        line: key.line,
        key: key.rawPattern,
        message: `Dynamic translation key detected: ${key.rawPattern}. Manual review required.`,
      });
      continue;
    }

    // Check if key exists in locale
    const localeEntry = localeLookup.get(key.key);

    if (!localeEntry) {
      issues.push({
        type: 'missing_translation',
        severity: 'error',
        file: getRelativePath(key.file, projectRoot),
        line: key.line,
        key: key.key,
        message: `Translation key '${key.key}' not found in English locale`,
      });
    } else if (localeEntry.isEmpty) {
      issues.push({
        type: 'empty_value',
        severity: 'warning',
        file: getRelativePath(key.file, projectRoot),
        line: key.line,
        key: key.key,
        message: `Translation key '${key.key}' has an empty value`,
      });
    }
  }

  return issues;
}

/**
 * Find empty values in locale entries (report from locale file perspective)
 */
export function findEmptyLocaleValues(
  entries: LocaleEntry[],
  projectRoot: string = process.cwd()
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const entry of entries) {
    if (entry.isEmpty) {
      issues.push({
        type: 'empty_value',
        severity: 'warning',
        file: getRelativePath(entry.file, projectRoot),
        line: 0, // Line number not available from locale parsing
        key: entry.key,
        message: `Translation key '${entry.key}' has an empty value in locale file`,
      });
    }
  }

  return issues;
}

/**
 * Count issues by type
 */
export function countIssuesByType(issues: AuditIssue[]): {
  missingTranslations: number;
  emptyValues: number;
  dynamicKeys: number;
} {
  let missingTranslations = 0;
  let emptyValues = 0;
  let dynamicKeys = 0;

  for (const issue of issues) {
    switch (issue.type) {
      case 'missing_translation':
        missingTranslations++;
        break;
      case 'empty_value':
        emptyValues++;
        break;
      case 'dynamic_key':
        dynamicKeys++;
        break;
    }
  }

  return { missingTranslations, emptyValues, dynamicKeys };
}
