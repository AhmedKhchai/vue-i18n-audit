/**
 * TypeScript interfaces for i18n Translation Audit
 * Based on data-model.md specification
 */

/**
 * Represents a translation key extracted from Vue components
 */
export interface TranslationKey {
  key: string;
  file: string;
  line: number;
  context: 'template' | 'script';
  isDynamic: boolean;
  rawPattern?: string;
}

/**
 * Represents a translation entry from locale files
 */
export interface LocaleEntry {
  key: string;
  value: string;
  file: string;
  isEmpty: boolean;
}

/**
 * Represents a potential hardcoded string detected in templates
 */
export interface HardcodedString {
  text: string;
  file: string;
  line: number;
  confidence: 'high' | 'medium' | 'low';
  context: string;
}

/**
 * Represents a detected problem in the audit
 */
export interface AuditIssue {
  type: 'missing_translation' | 'hardcoded_text' | 'empty_value' | 'dynamic_key';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  key?: string;
  text?: string;
  message: string;
}

/**
 * Summary statistics for the audit
 */
export interface AuditSummary {
  filesScanned: number;
  totalKeysFound: number;
  uniqueKeysFound: number;
  missingTranslations: number;
  hardcodedStrings: number;
  emptyValues: number;
  dynamicKeys: number;
  coveragePercentage: number;
}

/**
 * Result for a single file
 */
export interface FileResult {
  file: string;
  status: 'clean' | 'issues_found';
  keysFound: number;
  issueCount: number;
}

/**
 * The complete audit report
 */
export interface AuditReport {
  timestamp: string;
  config: AuditConfig;
  summary: AuditSummary;
  issues: AuditIssue[];
  fileResults: FileResult[];
}

/**
 * Configuration for the audit tool
 */
export interface AuditConfig {
  pagesDir: string;
  localesDir: string;
  includePartials: boolean;
  outputFile: string;
  verbose: boolean;
  excludePatterns: string[];
  hardcodedTextRules: HardcodedTextRules;
}

/**
 * Rules for hardcoded text detection
 */
export interface HardcodedTextRules {
  minLength: number;
  excludeAllCaps: boolean;
  excludePatterns: string[];
}

/**
 * Parsed Vue SFC structure
 */
export interface ParsedVueSFC {
  filePath: string;
  template: string | null;
  templateStartLine: number;
  script: string | null;
  scriptStartLine: number;
  scriptSetup: string | null;
  scriptSetupStartLine: number;
}
