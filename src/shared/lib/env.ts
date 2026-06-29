/**
 * ============================================================================
 * SHARED ENVIRONMENT UTILITIES
 * ============================================================================
 *
 * Single-source sanitization for environment variables.
 * All services import from here instead of re-implementing.
 */

/**
 * Strips accidental quotes and whitespace from environment variable values.
 * Handles both single and double quotes that may be introduced by
 * copy-paste or shell configuration.
 */
export const cleanEnv = (value: string | undefined): string => {
  if (!value) return '';
  return value.trim().replace(/^["']|["']$/g, '');
};
