# Tomorrow Plan — Trims AI + YouTube Taste + Profile Social Links

Date: 2026-03-05
Owner: FUZO app team

## Objectives

1. Activate `Trims` AI using the same production-safe pattern already used for `Bites` AI.
2. Start serving `Trims` content based on each user’s YouTube taste signals.
3. Transplant social media link support from `public/UPDATE/` into the live profile/settings flow.

---

## Scope (Tomorrow)

### A) Trims AI parity with Bites AI

- Wire `Trims` AI generation to `GeminiService` (proxy-only).
- Match `Bites` behavior for:
  - structured prompt handling,
  - loading/error states,
  - save/share card payload completeness,
  - metadata persistence fields needed by feed/profile surfaces.
- Ensure cards generated from Trims can be saved and shared consistently.

### B) YouTube taste-driven Trims ranking

- Define a minimal taste profile model from available user YouTube signals.
- Build a first-pass scoring function to rank Trims by user taste.
- Integrate into Trims fetch/render path with safe fallback when no taste profile exists.
- Add guardrails:
  - no hard failure if YouTube signal fetch fails,
  - deterministic default ordering fallback.

### C) Social media links transplant from UPDATE

- Inspect `public/UPDATE/` profile-related implementation.
- Port only required fields/UI/actions to live app profile/settings paths.
- Add validation for supported social URLs/usernames.
- Ensure saved links appear in profile display components.

---

## Execution Sequence

1. **Code archaeology (30–45 min)**
   - Compare `Bites` AI implementation and current `Trims` paths.
   - Locate `public/UPDATE/` social link source of truth.

2. **Implement Trims AI parity (60–90 min)**
   - Reuse stable prompt/response parsing and save/share payload conventions.
   - Verify with one text-only and one image-context generation test.

3. **Implement YouTube taste ranking (60–90 min)**
   - Add mapping from user signal -> taste vectors/tags.
   - Rank trims list, keep backward-compatible fallback behavior.

4. **Transplant social links (45–75 min)**
   - Add profile/settings edit fields and persistence integration.
   - Render social links in profile UI with defensive formatting.

5. **Validation + deploy prep (30–45 min)**
   - Run `npm run lint`.
   - Manual flow checks: Trims generate/save/share, taste ranking fallback, profile social links save/render.
   - Push and deploy after sanity checks.

---

## Acceptance Criteria

### Trims AI
- `Trims` AI generation works in local and production with proxy-only Gemini.
- Generated Trims cards can be saved and shared without missing required fields.
- Error and empty-state UX does not block user continuation.

### YouTube taste ranking
- Users with signals see visibly personalized Trims ordering.
- Users without signals still get functional default feed ordering.
- No runtime errors if YouTube data is unavailable.

### Social links
- User can add/edit/remove social links in profile/settings.
- Links persist and re-render on refresh.
- Invalid link formats are blocked with clear validation feedback.

---

## Risks / Notes

- Keep this as an MVP pass: no additional recommendation UI beyond required ranking behavior.
- Avoid schema churn unless required for persistence; prefer additive optional fields.
- Maintain existing design system and avoid introducing new visual patterns unless already in UPDATE transplant.

---

## Deliverables by End of Tomorrow

- Merged code for Trims AI parity.
- First-pass YouTube taste ranking for Trims.
- Profile social-link transplant from UPDATE.
- README updated with completion notes and any known follow-up items.
