/**
 * Hardcoded Text Detection
 * Identifies user-visible hardcoded strings in Vue templates
 */

import type { HardcodedString, ParsedVueSFC, HardcodedTextRules } from './types.js';
import { calculateSourceLine } from './parser.js';
import { getRelativePath } from './scanner.js';

/**
 * Default exclusion patterns for technical content
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  // Vue directives and bindings
  /^v-/,
  /^@/,
  /^:/,
  /^#/,
  // Route patterns
  /^route\(/,
  /^router\./,
  // URLs and emails
  /^https?:\/\//,
  /^mailto:/,
  /^\//,
  // Technical identifiers
  /^[a-z]+(-[a-z]+)+$/, // kebab-case (likely CSS classes or component names)
  /^[a-z]+_[a-z]+/i, // snake_case (likely variable names)
  // Common technical values
  /^\d+$/,  // Numbers only
  /^#[0-9a-f]{3,8}$/i, // Color codes
  /^\$\{/,  // Template literal interpolation
];

/**
 * Check if text matches any exclusion pattern
 */
function matchesExclusionPattern(text: string, patterns: (RegExp | string)[]): boolean {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      if (text.startsWith(pattern)) return true;
    } else if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if text is likely a component name (PascalCase)
 */
function isComponentName(text: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(text);
}

/**
 * Check if text is likely a technical identifier
 */
function isTechnicalIdentifier(text: string): boolean {
  // All uppercase with underscores (constants)
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) return true;

  // camelCase (variables)
  if (/^[a-z][a-zA-Z0-9]*$/.test(text) && text.length < 20) return true;

  // File extensions
  if (/^\.\w+$/.test(text)) return true;

  return false;
}

/**
 * Calculate confidence score for hardcoded text
 */
function calculateConfidence(text: string): 'high' | 'medium' | 'low' {
  const trimmed = text.trim();

  // High confidence: Multi-word text starting with capital letter
  // This is very likely user-facing text
  if (/^[A-Z][a-z]/.test(trimmed) && trimmed.includes(' ')) {
    return 'high';
  }

  // High confidence: Ends with punctuation (sentences)
  if (/[.!?:,]$/.test(trimmed) && trimmed.length > 5) {
    return 'high';
  }

  // Medium confidence: Single capitalized word
  if (/^[A-Z][a-z]+$/.test(trimmed)) {
    return 'medium';
  }

  // Medium confidence: Contains multiple words
  if (trimmed.includes(' ') && trimmed.length > 10) {
    return 'medium';
  }

  // Low confidence: Everything else
  return 'low';
}

/**
 * Extract text content from template, excluding interpolations
 */
function extractTextNodes(template: string): Array<{ text: string; line: number; context: string }> {
  const results: Array<{ text: string; line: number; context: string }> = [];
  const lines = template.split('\n');

  // Pattern to match text between HTML tags
  // This is a simplified approach - captures text content
  const textPattern = />([^<{]+)</g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    const regex = new RegExp(textPattern.source, 'g');

    while ((match = regex.exec(line)) !== null) {
      const text = match[1].trim();

      // Skip empty or whitespace-only
      if (!text || /^\s*$/.test(text)) continue;

      // Skip if it looks like an interpolation was partially captured
      if (text.includes('{{') || text.includes('}}')) continue;

      // Get surrounding context (truncated)
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(line.length, match.index + match[0].length + 20);
      const context = line.substring(contextStart, contextEnd);

      results.push({
        text,
        line: i + 1,
        context,
      });
    }
  }

  return results;
}

/**
 * Detect hardcoded strings in a parsed Vue SFC
 */
export function detectHardcodedStrings(
  parsed: ParsedVueSFC,
  rules: HardcodedTextRules,
  projectRoot: string = process.cwd()
): HardcodedString[] {
  const results: HardcodedString[] = [];

  if (!parsed.template) {
    return results;
  }

  const textNodes = extractTextNodes(parsed.template);

  // Convert string patterns to RegExp
  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...rules.excludePatterns.map(p => new RegExp(p)),
  ];

  for (const node of textNodes) {
    const text = node.text;

    // Apply minimum length filter
    if (text.length < rules.minLength) continue;

    // Apply all-caps exclusion if enabled
    if (rules.excludeAllCaps && text === text.toUpperCase() && text.length > 2) continue;

    // Check exclusion patterns
    if (matchesExclusionPattern(text, excludePatterns)) continue;

    // Check if it's a component name
    if (isComponentName(text)) continue;

    // Check if it's a technical identifier
    if (isTechnicalIdentifier(text)) continue;

    // Calculate confidence
    const confidence = calculateConfidence(text);

    const sourceLine = calculateSourceLine(node.line, parsed.templateStartLine);

    results.push({
      text,
      file: getRelativePath(parsed.filePath, projectRoot),
      line: sourceLine,
      confidence,
      context: node.context,
    });
  }

  return results;
}

/**
 * Filter hardcoded strings by confidence level
 */
export function filterByConfidence(
  strings: HardcodedString[],
  minConfidence: 'high' | 'medium' | 'low'
): HardcodedString[] {
  const confidenceLevels = { high: 3, medium: 2, low: 1 };
  const minLevel = confidenceLevels[minConfidence];

  return strings.filter(s => confidenceLevels[s.confidence] >= minLevel);
}
