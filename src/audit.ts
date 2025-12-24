/**
 * Main Audit Orchestrator
 * Chains: scan files → parse → extract keys → load locales → validate → return issues
 */

import type {
  AuditConfig,
  AuditReport,
  AuditSummary,
  AuditIssue,
  FileResult,
  TranslationKey,
  HardcodedString,
} from './types.js';
import { scanVueFiles, getRelativePath } from './scanner.js';
import { parseVueSFC } from './parser.js';
import { extractTranslationKeys, getUniqueKeys } from './extractor.js';
import { loadLocaleEntries, createLocaleLookup } from './locales.js';
import { validateKeys, countIssuesByType } from './validator.js';
import { detectHardcodedStrings } from './hardcoded.js';

/**
 * Run the full audit and return the report
 */
export async function runAudit(
  config: AuditConfig,
  projectRoot: string = process.cwd()
): Promise<AuditReport> {
  const timestamp = new Date().toISOString();
  const allIssues: AuditIssue[] = [];
  const allKeys: TranslationKey[] = [];
  const fileResults: FileResult[] = [];

  if (config.verbose) {
    console.log('Starting i18n audit...');
    console.log(`Pages directory: ${config.pagesDir}`);
    console.log(`Locales directory: ${config.localesDir}`);
  }

  // Step 1: Load locale entries
  if (config.verbose) {
    console.log('\nLoading locale files...');
  }

  const localeEntries = loadLocaleEntries(`${projectRoot}/${config.localesDir}`);
  const localeLookup = createLocaleLookup(localeEntries);

  if (config.verbose) {
    console.log(`Loaded ${localeEntries.length} locale entries`);
  }

  // Step 2: Scan Vue files
  if (config.verbose) {
    console.log('\nScanning Vue files...');
  }

  const vueFiles = scanVueFiles(config, projectRoot);

  if (config.verbose) {
    console.log(`Found ${vueFiles.length} Vue files`);
  }

  // Step 3: Process each Vue file
  for (const filePath of vueFiles) {
    const relPath = getRelativePath(filePath, projectRoot);

    if (config.verbose) {
      console.log(`Processing: ${relPath}`);
    }

    try {
      // Parse the Vue file
      const parsed = parseVueSFC(filePath);

      // Extract translation keys
      const keys = extractTranslationKeys(parsed);
      allKeys.push(...keys);

      // Validate keys against locale
      const keyIssues = validateKeys(keys, localeLookup, projectRoot);

      // Detect hardcoded strings (will be empty until hardcoded.ts is implemented)
      let hardcodedIssues: AuditIssue[] = [];
      try {
        const hardcodedStrings = detectHardcodedStrings(parsed, config.hardcodedTextRules, projectRoot);
        hardcodedIssues = hardcodedStrings.map(h => ({
          type: 'hardcoded_text' as const,
          severity: 'warning' as const,
          file: h.file,
          line: h.line,
          text: h.text,
          message: `Potential hardcoded text: "${h.text}" (confidence: ${h.confidence})`,
        }));
      } catch {
        // Hardcoded detection not yet implemented
      }

      const fileIssues = [...keyIssues, ...hardcodedIssues];
      allIssues.push(...fileIssues);

      // Record file result
      fileResults.push({
        file: relPath,
        status: fileIssues.length > 0 ? 'issues_found' : 'clean',
        keysFound: keys.length,
        issueCount: fileIssues.length,
      });
    } catch (error) {
      console.error(`Error processing ${relPath}:`, error);
      fileResults.push({
        file: relPath,
        status: 'issues_found',
        keysFound: 0,
        issueCount: 1,
      });
    }
  }

  // Step 4: Calculate summary
  const uniqueKeys = getUniqueKeys(allKeys);
  const issueCounts = countIssuesByType(allIssues);
  const hardcodedCount = allIssues.filter(i => i.type === 'hardcoded_text').length;

  // Calculate coverage percentage
  const totalUniqueKeys = uniqueKeys.length;
  const missingKeys = issueCounts.missingTranslations;
  const coveragePercentage = totalUniqueKeys > 0
    ? Math.round(((totalUniqueKeys - missingKeys) / totalUniqueKeys) * 1000) / 10
    : 100;

  const summary: AuditSummary = {
    filesScanned: vueFiles.length,
    totalKeysFound: allKeys.length,
    uniqueKeysFound: uniqueKeys.length,
    missingTranslations: issueCounts.missingTranslations,
    hardcodedStrings: hardcodedCount,
    emptyValues: issueCounts.emptyValues,
    dynamicKeys: issueCounts.dynamicKeys,
    coveragePercentage,
  };

  if (config.verbose) {
    console.log('\nAudit complete!');
    console.log(`Files scanned: ${summary.filesScanned}`);
    console.log(`Unique keys: ${summary.uniqueKeysFound}`);
    console.log(`Missing translations: ${summary.missingTranslations}`);
    console.log(`Coverage: ${summary.coveragePercentage}%`);
  }

  return {
    timestamp,
    config,
    summary,
    issues: allIssues,
    fileResults,
  };
}

/**
 * Get issues filtered by type
 */
export function getIssuesByType(
  issues: AuditIssue[],
  type: AuditIssue['type']
): AuditIssue[] {
  return issues.filter(i => i.type === type);
}

/**
 * Get files with issues
 */
export function getFilesWithIssues(fileResults: FileResult[]): FileResult[] {
  return fileResults.filter(f => f.status === 'issues_found');
}

/**
 * Get clean files
 */
export function getCleanFiles(fileResults: FileResult[]): FileResult[] {
  return fileResults.filter(f => f.status === 'clean');
}
