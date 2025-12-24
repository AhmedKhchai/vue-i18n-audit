/**
 * Configuration loader for i18n Audit
 * Loads defaults and optionally merges with .i18n-audit.config.json
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { AuditConfig, HardcodedTextRules } from './src/types.js';

const DEFAULT_HARDCODED_RULES: HardcodedTextRules = {
  minLength: 3,
  excludeAllCaps: true,
  excludePatterns: ['^v-', '^@', '^:', '^#'],
};

const DEFAULT_CONFIG: AuditConfig = {
  pagesDir: 'resources/js/Pages',
  localesDir: 'resources/js/i18n/locales/en',
  includePartials: true,
  outputFile: 'i18n-audit-report.md',
  verbose: false,
  excludePatterns: ['**/node_modules/**', '**/*.test.vue'],
  hardcodedTextRules: DEFAULT_HARDCODED_RULES,
};

const CONFIG_FILE_NAME = '.i18n-audit.config.json';

/**
 * Load configuration from file if it exists, merge with defaults
 */
export function loadConfig(projectRoot: string = process.cwd()): AuditConfig {
  const configPath = resolve(projectRoot, CONFIG_FILE_NAME);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const fileContent = readFileSync(configPath, 'utf-8');
    const fileConfig = JSON.parse(fileContent) as Partial<AuditConfig>;

    return {
      ...DEFAULT_CONFIG,
      ...fileConfig,
      hardcodedTextRules: {
        ...DEFAULT_HARDCODED_RULES,
        ...(fileConfig.hardcodedTextRules || {}),
      },
    };
  } catch (error) {
    console.warn(`Warning: Failed to parse ${CONFIG_FILE_NAME}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Create config with CLI option overrides
 */
export function createConfig(options: {
  pagesDir?: string;
  localesDir?: string;
  output?: string;
  includePartials?: boolean;
  verbose?: boolean;
}): AuditConfig {
  const baseConfig = loadConfig();

  return {
    ...baseConfig,
    pagesDir: options.pagesDir || baseConfig.pagesDir,
    localesDir: options.localesDir || baseConfig.localesDir,
    outputFile: options.output || baseConfig.outputFile,
    includePartials: options.includePartials ?? baseConfig.includePartials,
    verbose: options.verbose ?? baseConfig.verbose,
  };
}

export { DEFAULT_CONFIG, DEFAULT_HARDCODED_RULES };
