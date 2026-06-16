/**
 * ============================================================================
 * SHARED IDEMPOTENCY SERVICE — Persistence Safety Layer
 * ============================================================================
 * 
 * This service ensures that critical write operations (like saving to Plate 
 * or posting to Feed) are only executed once, even if the client retries 
 * due to network instability.
 * 
 * Core Capabilities:
 * 1. Deterministic Keying: Generates unique hashes based on operation 
 *    parameters so retries result in the same key.
 * 2. Guarded Execution: Checks for existing results before executing 
 *    the provided operation closure.
 * 3. Temporal Expiry: Automatically expires cached results after a 
 *    configurable TTL (default 24h).
 */

import { supabase } from './supabaseClient';

export class IdempotencyService {
  private static readonly APP_TENANT_ID = '00000000-0000-4000-8000-000000000001';
  private static readonly DEFAULT_TTL_HOURS = 24;

  /**
   * SECTION: Key Derivation Logic
   * Logic: Generates a deterministic hash for a given operation and set of 
   * parameters. Ensures that the same operation with same data yields the 
   * same 'key' regardless of retry count.
   */
  static generateKey(operation: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort((left, right) => left.localeCompare(right))
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, unknown>);

    const dataString = JSON.stringify({ operation, params: sortedParams });
    let hash = 0;
    for (let index = 0; index < dataString.length; index += 1) {
      const charCode = dataString.codePointAt(index) ?? 0;
      hash = ((hash << 5) - hash) + charCode;
      hash &= hash;
    }

    return `${operation}_${Math.abs(hash).toString(36)}`;
  }

  /**
   * SECTION: Lifecycle Orchestration
   * The primary entry point for guarding an async operation.
   * Logic: 
   * 1. Check if the key already exists in 'idempotency_keys'.
   * 2. If exists, return cached result immediately.
   * 3. If not, execute the operation and store the successful result.
   */
  static async executeWithIdempotency<T>(
    key: string,
    operation: () => Promise<T>,
    ttlHours: number = this.DEFAULT_TTL_HOURS,
  ): Promise<T> {
    const cached = await this.getCachedResult<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await operation();
    await this.storeResult(key, result, ttlHours);
    return result;
  }

  /**
   * SUB-SECTION: Save-Operation Bridge
   * Specialized helper for persistence tasks.
   */
  static async executeSaveOperation<T>(
    operation: string,
    itemId: string,
    itemType: string,
    saveFunction: () => Promise<T>,
    ttlHours?: number,
  ): Promise<T> {
    const key = this.generateKey(operation, { itemId, itemType });
    return this.executeWithIdempotency(key, saveFunction, ttlHours);
  }

  /**
   * SECTION: Persistence Handlers
   * Private methods for interacting with the `idempotency_keys` table.
   */
  private static async getCachedResult<T>(key: string): Promise<T | null> {
    if (!supabase) {
      return null;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('result')
      .eq('key', key)
      .eq('user_id', user.id)
      .eq('tenant_id', this.APP_TENANT_ID)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return (data.result as T) || null;
  }

  private static async storeResult<T>(key: string, result: T, ttlHours: number): Promise<void> {
    if (!supabase) {
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    await supabase
      .from('idempotency_keys')
      .upsert({
        key,
        user_id: user.id,
        tenant_id: this.APP_TENANT_ID,
        result: result as Record<string, unknown>,
        expires_at: expiresAt.toISOString(),
      });
  }
}
