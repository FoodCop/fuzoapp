/**
 * ============================================================================
 * SHARED SERVICE RESULT TYPE
 * ============================================================================
 *
 * Unified result type for all service layer operations.
 * Replaces 6+ duplicate variants across the codebase.
 */

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}
