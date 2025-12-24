/**
 * Vue File Scanner
 * Uses glob to find all Vue files in the Pages directory
 */

import { globSync } from 'glob';
import { join, relative } from 'path';
import type { AuditConfig } from './types.js';

/**
 * Scan for Vue files in the Pages directory
 */
export function scanVueFiles(config: AuditConfig, projectRoot: string = process.cwd()): string[] {
  const pagesDir = join(projectRoot, config.pagesDir);

  // Build the glob pattern
  let pattern: string;

  if (config.includePartials) {
    pattern = join(pagesDir, '**/*.vue');
  } else {
    // Exclude Partials directories
    pattern = join(pagesDir, '**/*.vue');
  }

  try {
    let files = globSync(pattern, {
      ignore: config.excludePatterns,
      nodir: true,
      absolute: true,
    });

    // If not including partials, filter them out
    if (!config.includePartials) {
      files = files.filter(f => !f.includes('/Partials/'));
    }

    // Sort for consistent output
    files.sort();

    return files;
  } catch (error) {
    console.error(`Error scanning Vue files in ${pagesDir}:`, error);
    return [];
  }
}

/**
 * Get relative path from project root for display
 */
export function getRelativePath(filePath: string, projectRoot: string = process.cwd()): string {
  return relative(projectRoot, filePath);
}
