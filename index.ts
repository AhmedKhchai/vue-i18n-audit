#!/usr/bin/env npx tsx

/**
 * i18n Translation Audit CLI
 * Main entry point for the audit tool
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { createConfig } from './config.js';
import { runAudit } from './src/audit.js';
import { writeReport, printSummary, countActionableIssues, generateMarkdownReport, generateJsonReport } from './src/reporter.js';
import { scanVueFiles } from './src/scanner.js';
import { parseVueSFC } from './src/parser.js';
import { extractTranslationKeys, getUniqueKeys } from './src/extractor.js';

const program = new Command();

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_ISSUES_FOUND = 1;
const EXIT_INVALID_ARGS = 2;
const EXIT_FILE_ERROR = 3;

program
  .name('i18n-audit')
  .description('Audit Vue page components for i18n translation completeness')
  .version('1.0.0');

// Default audit command
program
  .command('audit', { isDefault: true })
  .description('Run the full translation audit and generate report')
  .option('-o, --output <path>', 'Output file path', 'i18n-audit-report.md')
  .option('-p, --pages-dir <path>', 'Vue pages directory', 'resources/js/Pages')
  .option('-l, --locales-dir <path>', 'English locale directory', 'resources/js/i18n/locales/en')
  .option('--include-partials', 'Include Partials/ subdirectories', true)
  .option('--no-include-partials', 'Exclude Partials/ subdirectories')
  .option('-v, --verbose', 'Show detailed output', false)
  .option('--json', 'Output JSON instead of markdown', false)
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const config = createConfig({
        pagesDir: options.pagesDir,
        localesDir: options.localesDir,
        output: options.output,
        includePartials: options.includePartials,
        verbose: options.verbose,
      });

      const report = await runAudit(config, projectRoot);

      // Write report
      const outputPath = resolve(projectRoot, options.output);
      const format = options.json ? 'json' : 'markdown';

      if (options.json) {
        // For JSON, change extension if needed
        const jsonPath = outputPath.replace(/\.md$/, '.json');
        writeReport(report, jsonPath, 'json');
        console.log(`JSON report written to: ${jsonPath}`);
      } else {
        writeReport(report, outputPath, 'markdown');
        console.log(`Markdown report written to: ${outputPath}`);
      }

      // Print summary to console
      printSummary(report);

      // Exit with appropriate code
      const actionableIssues = countActionableIssues(report);
      process.exit(actionableIssues > 0 ? EXIT_ISSUES_FOUND : EXIT_SUCCESS);
    } catch (error) {
      console.error('Error running audit:', error);
      process.exit(EXIT_FILE_ERROR);
    }
  });

// Check command (CI mode)
program
  .command('check')
  .description('Validate translations without generating report (CI mode)')
  .option('-p, --pages-dir <path>', 'Vue pages directory', 'resources/js/Pages')
  .option('-l, --locales-dir <path>', 'English locale directory', 'resources/js/i18n/locales/en')
  .option('--include-partials', 'Include Partials/ subdirectories', true)
  .option('--no-include-partials', 'Exclude Partials/ subdirectories')
  .option('--fail-on-missing', 'Exit with error if missing translations', true)
  .option('--no-fail-on-missing', 'Do not exit with error if missing translations')
  .option('--fail-on-hardcoded', 'Exit with error if hardcoded text found', false)
  .option('-t, --threshold <number>', 'Maximum allowed issues before failure', '0')
  .option('-v, --verbose', 'Show detailed output', false)
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const config = createConfig({
        pagesDir: options.pagesDir,
        localesDir: options.localesDir,
        includePartials: options.includePartials,
        verbose: options.verbose,
      });

      const report = await runAudit(config, projectRoot);

      // Print summary
      printSummary(report);

      // Calculate issues to consider for failure
      let issueCount = 0;

      if (options.failOnMissing) {
        issueCount += report.summary.missingTranslations;
      }

      if (options.failOnHardcoded) {
        issueCount += report.summary.hardcodedStrings;
      }

      const threshold = parseInt(options.threshold, 10);

      if (issueCount > threshold) {
        console.log(`\n❌ Check failed: ${issueCount} issues found (threshold: ${threshold})`);
        process.exit(EXIT_ISSUES_FOUND);
      } else {
        console.log(`\n✓ Check passed: ${issueCount} issues within threshold (${threshold})`);
        process.exit(EXIT_SUCCESS);
      }
    } catch (error) {
      console.error('Error running check:', error);
      process.exit(EXIT_FILE_ERROR);
    }
  });

// List keys command
program
  .command('list-keys')
  .description('List all translation keys used in Vue files')
  .option('-p, --pages-dir <path>', 'Vue pages directory', 'resources/js/Pages')
  .option('--include-partials', 'Include Partials/ subdirectories', true)
  .option('--no-include-partials', 'Exclude Partials/ subdirectories')
  .option('-f, --format <format>', 'Output format: text, json, csv', 'text')
  .option('-u, --unique', 'Only show unique keys', true)
  .option('--no-unique', 'Show all key occurrences')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const config = createConfig({
        pagesDir: options.pagesDir,
        includePartials: options.includePartials,
      });

      // Scan and extract keys
      const vueFiles = scanVueFiles(config, projectRoot);
      const allKeys: Array<{ key: string; file: string; line: number }> = [];

      for (const filePath of vueFiles) {
        const parsed = parseVueSFC(filePath);
        const keys = extractTranslationKeys(parsed);

        for (const k of keys) {
          if (!k.isDynamic && k.key) {
            allKeys.push({
              key: k.key,
              file: k.file.replace(projectRoot + '/', ''),
              line: k.line,
            });
          }
        }
      }

      // Get unique or all keys based on option
      if (options.unique) {
        const uniqueKeys = getUniqueKeys(allKeys.map(k => ({ ...k, context: 'template' as const, isDynamic: false })));

        switch (options.format) {
          case 'json':
            console.log(JSON.stringify(uniqueKeys, null, 2));
            break;
          case 'csv':
            console.log('key');
            uniqueKeys.forEach(k => console.log(k));
            break;
          default:
            uniqueKeys.forEach(k => console.log(k));
        }
      } else {
        switch (options.format) {
          case 'json':
            console.log(JSON.stringify(allKeys, null, 2));
            break;
          case 'csv':
            console.log('key,file,line');
            allKeys.forEach(k => console.log(`${k.key},${k.file},${k.line}`));
            break;
          default:
            allKeys.forEach(k => console.log(`${k.key} (${k.file}:${k.line})`));
        }
      }

      process.exit(EXIT_SUCCESS);
    } catch (error) {
      console.error('Error listing keys:', error);
      process.exit(EXIT_FILE_ERROR);
    }
  });

program.parse();
