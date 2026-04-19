# Trims Localized Feed Plan (All Users, 48h Audit)

Date: 2026-03-09
Owner: FUZO app team
Scope: Replace static/fallback-first trims retrieval with localized, personalized YouTube feed for all active users.

## Decision Log

- Rollout: 100% of users immediately (expected 5-10 users).
- Monitoring window: 48 hours from deployment.
- Audit checkpoint: T+48h with cost, quality, and reliability metrics.

## Objectives

1. Serve localized trims using user location + preference signals.
2. Keep YouTube/API usage bounded with strict limits.
3. Preserve safe fallback behavior when live fetch is unavailable.
4. Collect enough telemetry to decide next scaling step after 48h.

## Current Baseline

- `TrimsView` currently uses a fixed query and maps YouTube response.
- `TRIMS_FALLBACK_VIDEOS` used when API fails or returns no items.
- No strong location-aware query generation.
- No request budget controls tied to per-user/per-time windows.

## Target Architecture

1. Frontend builds a trims request context:
- user location (city/region if available)
- preference signals (diet/cuisine/user metadata)
- optional activity tags from saved content

2. YouTube proxy accepts guarded request payload:
- up to 3 query variants per fetch
- strict max results per query
- dedupe + cap final list
- returns source metadata (`live`, `cache`, `fallback`)

3. Caching and throttling prevent excess API spend.

## Guardrails (Must-Have)

- `maxQueriesPerRefresh = 3`
- `maxResultsPerQuery = 8`
- `maxMergedResults = 20`
- `userRefreshCooldownMs = 10 * 60 * 1000`
- `cacheTtlLiveMs = 30 * 60 * 1000`
- `cacheTtlFallbackMs = 24 * 60 * 60 * 1000`

### Quota/Rate Protection

- Per-user cap: 6 trims fetches/hour
- Global cap: configurable daily request ceiling
- On cap hit: return cached payload; if no cache, return curated fallback

## Implementation Tasks

### A. Query Personalization

1. Add query builder utility for trims:
- Input: `location`, `dietaryPreferences`, `cuisinePreferences`
- Output: 2-3 focused search queries

2. Include location in query terms when available:
- Examples:
  - `{city} {cuisine} street food shorts`
  - `{city} {diet} recipes shorts`
  - `{cuisine} chef techniques shorts`

### B. Proxy Contract Upgrade

1. Extend youtube-proxy request shape:
- `queries: string[]`
- `maxResultsPerQuery: number`
- `regionCode?: string`
- `userHash: string`

2. Response shape:
- `items[]`
- `source: 'live' | 'cache' | 'fallback'`
- `cacheAgeMs`
- `queryCount`

3. Add dedupe by `videoId` in proxy.

### C. Caching + Throttle

1. Add cache key:
- `trims:{userHash}:{locationHash}:{profileHash}`

2. Enforce user cooldown in proxy and/or client.

3. Return stale-but-reasonable cache when live request blocked.

### D. Frontend Integration

1. Update `TrimsView` fetch pipeline:
- Build request context
- Call enhanced proxy
- Render source badge (`Live`, `Cached`, `Fallback`)

2. Keep current fallback list as final safety net.

### E. Telemetry

Record per request:
- timestamp
- userHash
- source (`live|cache|fallback`)
- queryCount
- resultCount
- latencyMs
- reason (`ok|rate_limited|quota_exceeded|upstream_error`)

## 48-Hour Audit Plan

Audit time: T+48h from deploy.

Metrics to review:

1. Cost / volume
- total trims fetches
- upstream YouTube calls
- calls per user per hour

2. Efficiency
- cache hit ratio
- fallback ratio
- average query count/fetch

3. Quality
- average videos returned
- duplicate rate after dedupe
- user-visible failures (empty trims feed)

4. Reliability
- proxy error rate
- median and p95 response latency

Audit thresholds (initial):

- cache hit ratio >= 40%
- fallback ratio <= 20%
- empty feed rate <= 5%
- p95 proxy latency <= 1500ms

## Go/No-Go After 48h

Go if all are true:
- no quota pressure trend
- fallback and empty-feed rates within thresholds
- no significant user-reported relevance issues

If not:
- tighten caps (results/query and per-user/hour)
- increase cache TTL
- reduce query variants from 3 to 2

## Rollback Safety

- Feature flag toggle in proxy/client to force fallback-only mode.
- Keep `TRIMS_FALLBACK_VIDEOS` path intact.

## Immediate Next Step

Implement A + B + C first, then wire D and start telemetry collection for the 48h monitoring window.
