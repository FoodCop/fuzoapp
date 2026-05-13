/**
 * Supabase Edge Function: make-server-5976446e
 * 
 * Main backend API server for FuzoFoodCop
 * Handles all backend API calls including Google APIs, health checks, etc.
 * 
 * Setup:
 * 1. Set environment variables in Supabase:
 *    - GOOGLE_MAPS_API_KEY
 *    - OPENAI_API_KEY
 *    - SPOONACULAR_API_KEY
 * 2. Deploy: supabase functions deploy make-server-5976446e
 */

// @ts-expect-error - Deno imports work in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Declare Deno global for TypeScript (Edge Functions environment)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/make-server-5976446e', '')

    console.log('📍 Request:', req.method, path)

    // Health check endpoint
    if (path === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          openai_configured: !!Deno.env.get('OPENAI_API_KEY'),
          google_maps_configured: !!Deno.env.get('GOOGLE_MAPS_API_KEY'),
          supabase_configured: !!Deno.env.get('SUPABASE_URL'),
          spoonacular_configured: !!Deno.env.get('SPOONACULAR_API_KEY'),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Routes API v2 - Directions endpoint
    if (path === '/directions') {
      const requestBody = await req.json()
      
      const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'
      const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')

      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY not configured')
      }

      console.log('🗺️ Requesting directions from Google Routes API v2')

      const response = await fetch(GOOGLE_ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.viewport,routes.warnings'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      // Check if the API returned an error
      if (data.error || !response.ok) {
        console.error('❌ Google Routes API error:', data.error || data)
        return new Response(
          JSON.stringify({
            status: 'ERROR',
            error: data.error?.message || data.message || 'Unknown error from Google Routes API',
            details: data.error || data
          }),
          { 
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Transform Routes API v2 response to match frontend expectations
      const transformedResponse = {
        status: data.routes && data.routes.length > 0 ? 'OK' : 'ZERO_RESULTS',
        routes: data.routes || []
      }

      console.log('✅ Directions retrieved:', transformedResponse.routes.length, 'route(s)')
      if (transformedResponse.status === 'ZERO_RESULTS') {
        console.warn('⚠️ Google returned ZERO_RESULTS for this path.')
      }

      return new Response(
        JSON.stringify(transformedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Places Search Along Route (New Places API)
    if (path === '/places/search-along-route') {
      const requestBody = await req.json()
      const { query, polyline, origin, destination } = requestBody
      
      const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY not configured')
      }

      console.log('🛣️ Searching along route:', query)
      
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos'
        },
        body: JSON.stringify({
          textQuery: query,
          searchAlongRouteParameters: {
            polyline: {
              encodedPolyline: polyline
            }
          },
          ...(origin && destination ? {
            routingParameters: {
              origin: { location: { latitude: origin.lat, longitude: origin.lng } },
              destination: { location: { latitude: destination.lat, longitude: destination.lng } }
            }
          } : {})
        })
      })

      const data = await response.json()
      
      // Transform V2 response to match our ScoutPlace format
      const places = (data.places || []).map((p: any) => ({
        place_id: p.id,
        name: p.displayName?.text,
        formatted_address: p.formattedAddress,
        rating: p.rating,
        user_ratings_total: p.userRatingCount,
        types: p.types,
        photos: p.photos,
        geometry: {
          location: {
            lat: p.location?.latitude,
            lng: p.location?.longitude
          }
        }
      }))

      return new Response(
        JSON.stringify({ results: places, status: 'OK' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    // Google Places Nearby Search
    if (path === '/places/nearby') {
      const requestBody = await req.json()
      const { latitude, longitude, radius, type } = requestBody

      const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY not configured')
      }

      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`

      console.log('🔍 Searching nearby places:', { latitude, longitude, radius, type })
      console.log('📍 Google Places URL (without key):', placesUrl.replace(GOOGLE_API_KEY, 'HIDDEN'))

      const response = await fetch(placesUrl)
      const data = await response.json()

      console.log('📊 Google Places response status:', data.status)
      console.log('📊 Google Places results count:', data.results?.length || 0)
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('❌ Google Places API error:', data.status, data.error_message)
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Places Text Search
    if (path === '/places/textsearch') {
      const requestBody = await req.json()
      const { query, location, radius } = requestBody

      const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY not configured')
      }

      let placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
      
      if (location) {
        placesUrl += `&location=${location.lat},${location.lng}`
      }
      
      if (radius) {
        placesUrl += `&radius=${radius}`
      }

      console.log('🔍 Text searching places:', query)

      const response = await fetch(placesUrl)
      const data = await response.json()

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Places Details
    if (path === '/places/details') {
      const requestBody = await req.json()
      const { place_id } = requestBody

      const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_MAPS_API_KEY not configured')
      }

      // Request all the fields we need for the restaurant detail view
      const fields = [
        'name',
        'formatted_address',
        'formatted_phone_number',
        'international_phone_number',
        'opening_hours',
        'website',
        'rating',
        'reviews',
        'photos',
        'price_level',
        'geometry',
        'types',
        'vicinity'
      ].join(',')

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${GOOGLE_API_KEY}`

      console.log('📍 Fetching place details with photos, reviews, and hours')

      const response = await fetch(detailsUrl)
      const data = await response.json()

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Spoonacular Recipe Search
    if (path === '/spoonacular/recipes/search') {
      const requestBody = await req.json()
      const { query, diet, type, cuisine, maxReadyTime, number, offset } = requestBody

      const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')
      if (!SPOONACULAR_API_KEY) {
        throw new Error('SPOONACULAR_API_KEY not configured')
      }

      let searchUrl = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}`
      
      if (query) searchUrl += `&query=${encodeURIComponent(query)}`
      if (diet) searchUrl += `&diet=${encodeURIComponent(diet)}`
      if (type) searchUrl += `&type=${encodeURIComponent(type)}`
      if (cuisine) searchUrl += `&cuisine=${encodeURIComponent(cuisine)}`
      if (maxReadyTime) searchUrl += `&maxReadyTime=${maxReadyTime}`
      if (number) searchUrl += `&number=${number}`
      if (offset) searchUrl += `&offset=${offset}`
      
      // Add default parameters for better results
      searchUrl += '&addRecipeInformation=true&fillIngredients=true&instructionsRequired=true&sort=popularity'

      console.log('🍽️ Searching Spoonacular recipes:', { query, diet, type, cuisine })

      const response = await fetch(searchUrl)
      const data = await response.json()

      if (data.message) {
        console.error('❌ Spoonacular API error:', data.message)
      } else {
        console.log('✅ Spoonacular results:', data.results?.length || 0, 'recipes')
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Spoonacular Random Recipes
    if (path === '/spoonacular/recipes/random') {
      const requestBody = await req.json().catch(() => ({}))
      const { number = 10, tags } = requestBody

      const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')
      if (!SPOONACULAR_API_KEY) {
        throw new Error('SPOONACULAR_API_KEY not configured')
      }

      let randomUrl = `https://api.spoonacular.com/recipes/random?apiKey=${SPOONACULAR_API_KEY}&number=${number}`
      if (tags) randomUrl += `&tags=${encodeURIComponent(tags)}`

      console.log('🎲 Fetching random Spoonacular recipes:', { number, tags })

      const response = await fetch(randomUrl)
      const data = await response.json()

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Spoonacular Recipe Information (must come before similar to avoid path conflicts)
    if (path.startsWith('/spoonacular/recipes/') && !path.includes('/similar')) {
      const pathParts = path.replace('/spoonacular/recipes/', '').split('/')
      const recipeId = pathParts[0]
      
      if (!recipeId || isNaN(Number(recipeId))) {
        throw new Error('Invalid recipe ID')
      }

      const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')
      if (!SPOONACULAR_API_KEY) {
        throw new Error('SPOONACULAR_API_KEY not configured')
      }

      const requestBody = await req.json().catch(() => ({}))
      const includeNutrition = requestBody.includeNutrition !== false

      const infoUrl = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=${includeNutrition}`

      console.log('📖 Fetching Spoonacular recipe information:', recipeId)

      const response = await fetch(infoUrl)
      const data = await response.json()

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Spoonacular Similar Recipes
    if (path.startsWith('/spoonacular/recipes/') && path.includes('/similar')) {
      const pathParts = path.split('/')
      const recipeId = pathParts[pathParts.length - 2] // /spoonacular/recipes/{id}/similar
      
      if (!recipeId || isNaN(Number(recipeId))) {
        throw new Error('Invalid recipe ID')
      }

      const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')
      if (!SPOONACULAR_API_KEY) {
        throw new Error('SPOONACULAR_API_KEY not configured')
      }

      const requestBody = await req.json().catch(() => ({}))
      const number = requestBody.number || 4

      const similarUrl = `https://api.spoonacular.com/recipes/${recipeId}/similar?apiKey=${SPOONACULAR_API_KEY}&number=${number}`

      console.log('🔗 Fetching similar Spoonacular recipes:', recipeId)

      const response = await fetch(similarUrl)
      const data = await response.json()

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Endpoint not found
    return new Response(
      JSON.stringify({ 
        error: 'Endpoint not found',
        path: path,
        available_endpoints: [
          '/health', 
          '/directions', 
          '/places/nearby', 
          '/places/textsearch', 
          '/places/details',
          '/spoonacular/recipes/search',
          '/spoonacular/recipes/{id}',
          '/spoonacular/recipes/random',
          '/spoonacular/recipes/{id}/similar'
        ]
      }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
