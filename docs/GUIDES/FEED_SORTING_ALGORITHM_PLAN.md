# Feed Sorting Implementation Plan: The "Hotness" Algorithm

**Objective Data**: 
Currently, the Fuzo feed uses an AI-based "Relevance Score" which unintentionally buries newer posts under older, highly-relevant ones. To fix this at scale (supporting 30+ posts/month per user), we must implement a Time-Decay "Hotness" algorithm that balances chronological freshness with AI personalization.

When you start the next coding session, provide this document to the AI assistant and instruct it to execute the steps below.

---

## Technical Context
- **Target File**: `src/features/feed/services/feedService.ts`
- **Target Method**: `FeedService.generateFeed(params)`
- **Current Query**: Limits DB fetch to `12` items and sorts *only* those 12 by `relevanceScore` (DESC).

---

## Step-by-Step Execution Plan

### Step 1: Increase the Supabase Query Pool
In `feedService.ts`, locate the Supabase query inside `generateFeed`.
- **Change**: Increase the `.limit()` from `params.pageSize || 12` to a larger pool multiplier, e.g., `(params.pageSize || 12) * 5` (which makes it 60).
- **Reason**: We need a large enough sample of recent chronological posts to allow the local decay algorithm to sort them accurately before slicing them to the requested `pageSize`.

### Step 2: Calculate the `hotnessScore`
Inside the `.map(row => { ... })` function where `relevanceScore` is currently calculated:
- **Change**: Define a new formula for Time-Decay.
```typescript
// 1. Establish the Base Score (Start at 1000 so positive/negative math works well)
let baseScore = 1000;
// Note: Apply existing AI logic (Cuisine +100, Dietary -500/-1000, Organic +200) to baseScore

// 2. Calculate Item Age in Hours
const itemDate = new Date(row.created_at).getTime();
const now = Date.now();
const ageInHours = Math.max(0, (now - itemDate) / (1000 * 60 * 60));

// 3. Apply HackerNews style Gravity Decay
// baseScore / (AgeHours + 2)^Gravity
const gravity = 1.5;
const hotnessScore = baseScore / Math.pow(ageInHours + 2, gravity);
```

### Step 3: Local Sorting & Slicing
At the end of the `generateFeed` function:
- **Change**: Replace the existing `b.relevanceScore - a.relevanceScore` sort with the new scalar.
```typescript
// Sort by calculated decay score
items.sort((a, b) => b.hotnessScore - a.hotnessScore);

// Return ONLY the requested page size to the UI to keep rendering fast
return items.slice(0, params.pageSize || 12) as FeedCard[];
```

### Step 4: Verification
1. Run `npm run dev`.
2. Login and navigate to the feed.
3. Observe the ordering: Brand new posts (even with mediocre relevance) should sit at the very top. Highly relevant older posts should appear immediately beneath them, successfully pushing down irrelevant older posts.
