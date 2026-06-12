---
name: google-routes-api
description: Documentation and usage rules for the Google Routes API v2 (computeRoutes).
---

# Google Routes API v2 - Usage Guidelines

Use this skill when you need to understand how we interface with the Google Routes API v2 for computing directions and polylines.

## Compute Routes Endpoint

**Endpoint**: `https://routes.googleapis.com/directions/v2:computeRoutes`
**Method**: `POST`
**Use Case**: Fetch paths between coordinates or place IDs, returning polylines.

### Important Headers
- `X-Goog-Api-Key`: Must be set with the Google API Key.
- `X-Goog-FieldMask`: The required fields must be specified. We typically use:
  `routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.viewport,routes.warnings`

### Example Request Body
```json
{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 37.419734,
        "longitude": -122.0827784
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 37.417670,
        "longitude": -122.079595
      }
    }
  },
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE"
}
```

## Key Implementation Details

- **Proxy**: All routing requests must go through the Supabase Edge Function to protect the API key.
- **Polyline Handling**: The API returns an encoded polyline string (`routes.polyline.encodedPolyline`). This string is decoded on the client using `google.maps.geometry.encoding.decodePath(polylineString)`.
- **Search Along Route**: The encoded polyline can be fed directly into the Google Places API (New) `searchAlongRouteParameters`.
