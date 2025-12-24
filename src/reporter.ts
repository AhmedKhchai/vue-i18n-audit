/**
 * Report Generator
 * Generates markdown and JSON reports from audit results
 */

import { writeFileSync } from 'fs';
import type { AuditReport, AuditIssue, FileResult } from './types.js';
import { getIssuesByType, getFilesWithIssues, getCleanFiles } from './audit.js';

/**
 * Generate markdown report from audit results
 */
export function generateMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# i18n Translation Audit Report');
  lines.push('');
  lines.push(`**Generated**: ${report.timestamp}`);
  lines.push(`**Pages Directory**: ${report.config.pagesDir}`);
  lines.push(`**Locales Directory**: ${report.config.localesDir}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Files Scanned | ${report.summary.filesScanned} |`);
  lines.push(`| Total Keys Found | ${report.summary.totalKeysFound.toLocaleString()} |`);
  lines.push(`| Unique Keys | ${report.summary.uniqueKeysFound} |`);
  lines.push(`| Missing Translations | ${report.summary.missingTranslations} |`);
  lines.push(`| Hardcoded Strings | ${report.summary.hardcodedStrings} |`);
  lines.push(`| Empty Values | ${report.summary.emptyValues} |`);
  lines.push(`| Dynamic Keys (manual review) | ${report.summary.dynamicKeys} |`);
  lines.push(`| **Coverage** | **${report.summary.coveragePercentage}%** |`);
  lines.push('');

  // Missing Translations
  const missingIssues = getIssuesByType(report.issues, 'missing_translation');
  if (missingIssues.length > 0) {
    lines.push('## Missing Translations');
    lines.push('');
    lines.push('| File | Line | Key |');
    lines.push('|------|------|-----|');
    for (const issue of missingIssues) {
      lines.push(`| ${issue.file} | ${issue.line} | ${issue.key} |`);
    }
    lines.push('');
  }

  // Hardcoded Strings
  const hardcodedIssues = getIssuesByType(report.issues, 'hardcoded_text');
  if (hardcodedIssues.length > 0) {
    lines.push('## Hardcoded Strings');
    lines.push('');
    lines.push('| File | Line | Text | Confidence |');
    lines.push('|------|------|------|------------|');
    for (const issue of hardcodedIssues) {
      // Escape pipe characters in text
      const escapedText = (issue.text || '').replace(/\|/g, '\\|');
      // Extract confidence from message
      const confidenceMatch = issue.message.match(/confidence: (\w+)/);
      const confidence = confidenceMatch ? confidenceMatch[1] : 'unknown';
      lines.push(`| ${issue.file} | ${issue.line} | "${escapedText}" | ${confidence} |`);
    }
    lines.push('');
  }

  // Empty Values
  const emptyIssues = getIssuesByType(report.issues, 'empty_value');
  if (emptyIssues.length > 0) {
    lines.push('## Empty Translation Values');
    lines.push('');
    lines.push('| File | Line | Key |');
    lines.push('|------|------|-----|');
    for (const issue of emptyIssues) {
      lines.push(`| ${issue.file} | ${issue.line} | ${issue.key} |`);
    }
    lines.push('');
  }

  // Dynamic Keys
  const dynamicIssues = getIssuesByType(report.issues, 'dynamic_key');
  if (dynamicIssues.length > 0) {
    lines.push('## Dynamic Keys (Manual Review Required)');
    lines.push('');
    lines.push('| File | Line | Pattern |');
    lines.push('|------|------|---------|');
    for (const issue of dynamicIssues) {
      lines.push(`| ${issue.file} | ${issue.line} | ${issue.key} |`);
    }
    lines.push('');
  }

  // Files with Issues
  const filesWithIssues = getFilesWithIssues(report.fileResults);
  if (filesWithIssues.length > 0) {
    lines.push('## Files with Issues');
    lines.push('');
    lines.push('| File | Issues |');
    lines.push('|------|--------|');
    for (const file of filesWithIssues) {
      lines.push(`| ${file.file} | ${file.issueCount} |`);
    }
    lines.push('');
  }

  // Clean Files
  const cleanFiles = getCleanFiles(report.fileResults);
  if (cleanFiles.length > 0) {
    lines.push('## Clean Files');
    lines.push('');
    // Show first 20, then summarize
    const displayFiles = cleanFiles.slice(0, 20);
    for (const file of displayFiles) {
      lines.push(`- ${file.file}`);
    }
    if (cleanFiles.length > 20) {
      lines.push(`- ... (${cleanFiles.length - 20} more clean files)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate JSON report from audit results
 */
export function generateJsonReport(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Write report to file
 */
export function writeReport(
  report: AuditReport,
  outputPath: string,
  format: 'markdown' | 'json' = 'markdown'
): void {
  const content = format === 'json'
    ? generateJsonReport(report)
    : generateMarkdownReport(report);

  writeFileSync(outputPath, content, 'utf-8');
}

/**
 * Print report summary to console
 */
export function printSummary(report: AuditReport): void {
  console.log('\n=== i18n Audit Summary ===\n');
  console.log(`Files Scanned:        ${report.summary.filesScanned}`);
  console.log(`Total Keys Found:     ${report.summary.totalKeysFound}`);
  console.log(`Unique Keys:          ${report.summary.uniqueKeysFound}`);
  console.log(`Missing Translations: ${report.summary.missingTranslations}`);
  console.log(`Hardcoded Strings:    ${report.summary.hardcodedStrings}`);
  console.log(`Empty Values:         ${report.summary.emptyValues}`);
  console.log(`Dynamic Keys:         ${report.summary.dynamicKeys}`);
  console.log(`Coverage:             ${report.summary.coveragePercentage}%`);
  console.log('');
}

/**
 * Count total issues excluding info severity
 */
export function countActionableIssues(report: AuditReport): number {
  return report.issues.filter(i => i.severity !== 'info').length;
}
