---
name: google-places-api
description: Documentation and usage rules for the Google Places API (New) endpoints such as textSearch, nearbySearch, and details.
---

# Google Places API (New) - Usage Guidelines

Use this skill when you need to understand how we interface with the Google Places API (New).

## Endpoints

### 1. Text Search (New)
**Endpoint**: `https://places.googleapis.com/v1/places:searchText`
**Method**: `POST`
**Use case**: Find places by query string, optionally biased to an area or route.

**Example Body (Search Along Route):**
```json
{
  "textQuery": "Vegetarian Restaurant",
  "searchAlongRouteParameters": {
    "polyline": {
      "encodedPolyline": "{ENCODED_POLYLINE_STRING}"
    }
  }
}
```

### 2. Nearby Search (Legacy / New)
For backward compatibility or specific use-cases, we also use the nearby search.
**Legacy URL**: `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
**Parameters**: `location=lat,lng`, `radius=meters`, `type=restaurant`

### 3. Place Details
**Legacy URL**: `https://maps.googleapis.com/maps/api/place/details/json`
Fetches in-depth information about a specific place ID (reviews, opening hours, formatted phone number).

## Key Implementation Details

- **Security**: The raw API keys must never be exposed to the client. All Google API calls are proxied through the Supabase Edge Function (`/supabase/functions/make-server-5976446e`).
- **Field Masks**: Google Places API (New) requires a field mask. Our Edge Function typically specifies:
  `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos`
- **Result Mapping**: The response from Places API (New) is mapped to our internal `ScoutPlace` interface defined in `src/services/placesService.ts`.
