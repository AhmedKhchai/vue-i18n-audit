/**
 * Vue SFC Parser
 * Uses @vue/compiler-sfc to parse .vue files and extract template/script sections
 */

import { parse as vueParse } from 'vue/compiler-sfc';
import { readFileSync } from 'fs';
import type { ParsedVueSFC } from './types.js';

/**
 * Parse a Vue SFC file and extract template and script sections
 */
export function parseVueSFC(filePath: string): ParsedVueSFC {
  const content = readFileSync(filePath, 'utf-8');
  const { descriptor, errors } = vueParse(content, {
    filename: filePath,
  });

  if (errors.length > 0) {
    console.warn(`Warning: Errors parsing ${filePath}:`, errors.map(e => e.message).join(', '));
  }

  // Calculate line offsets for each section
  const lines = content.split('\n');

  let templateStartLine = 1;
  let scriptStartLine = 1;
  let scriptSetupStartLine = 1;

  // Find template start line
  if (descriptor.template) {
    const templateMatch = content.indexOf('<template');
    if (templateMatch !== -1) {
      templateStartLine = content.substring(0, templateMatch).split('\n').length;
    }
  }

  // Find script start line
  if (descriptor.script) {
    const scriptMatch = content.match(/<script(?![^>]*setup)[^>]*>/);
    if (scriptMatch && scriptMatch.index !== undefined) {
      scriptStartLine = content.substring(0, scriptMatch.index).split('\n').length;
    }
  }

  // Find script setup start line
  if (descriptor.scriptSetup) {
    const scriptSetupMatch = content.match(/<script[^>]*setup[^>]*>/);
    if (scriptSetupMatch && scriptSetupMatch.index !== undefined) {
      scriptSetupStartLine = content.substring(0, scriptSetupMatch.index).split('\n').length;
    }
  }

  return {
    filePath,
    template: descriptor.template?.content || null,
    templateStartLine,
    script: descriptor.script?.content || null,
    scriptStartLine,
    scriptSetup: descriptor.scriptSetup?.content || null,
    scriptSetupStartLine,
  };
}

/**
 * Calculate the actual line number in the source file
 * given a line number within a section and the section's start line
 */
export function calculateSourceLine(sectionLine: number, sectionStartLine: number): number {
  return sectionStartLine + sectionLine;
}
