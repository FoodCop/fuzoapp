/**
 * Helper to ensure async operations only apply if their request sequence is still the latest,
 * preventing race conditions from multiple concurrent requests.
 */
export const shouldApplyLatestRequest = (
  mountedRef: { current: boolean },
  requestSeq: number,
  sequenceRef: { current: number }
) => {
  return mountedRef.current && requestSeq === sequenceRef.current;
};
