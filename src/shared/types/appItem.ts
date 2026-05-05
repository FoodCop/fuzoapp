/**
 * ============================================================================
 * SHARED DOMAIN ENTITY MODEL — The "God Interface"
 * ============================================================================
 * 
 * This model defines the universal data structure for all content within 
 * FUZO V2. It is designed to be polymorphic, supporting manual Snaps, 
 * AI-generated Recipes, and Google Places data.
 * 
 * Core Design Pattern:
 * 1. Flattened Properties: Many fields are aliased (e.g., 'title' vs 'name') 
 *     to support diverse upstream API formats (Gemini, Spoonacular, Maps).
 * 2. Polymorphic Identity: The 'itemType' determines which UI card 
 *     implementation is used for rendering.
 */

/**
 * SECTION: Specialized Sub-models
 * Granular structures for complex culinary metadata.
 */
type AppItemNutrition = {
	calories?: number;
	protein?: number;
	fat?: number;
	carbs?: number;
};

type AppItemTimingMap = Record<string, string>;

type AppItemMenuSection = {
	section: string;
	items: string[];
};

type AppItemUserReview = {
	user: string;
	rating: number;
	text: string;
};

/**
 * SECTION: Primary AppItem Interface
 */
export interface AppItem {
	// --- Identity & Type ---
	id?: string;
	itemType?: string; // e.g., 'recipe', 'spot', 'hack'
	itemId?: string;
	type?: string;

	// --- Visuals & Branding ---
	name?: string;
	title?: string;
	cat?: string; // Category/Cuisine
	img?: string;
	image?: string;
	imageUrl?: string;
	thumbnailUrl?: string;

	// --- Authorship & Social ---
	author?: string;
	authorAvatar?: string;
	authorUserId?: string;
	authorType?: string;
	caption?: string;
	description?: string;
	likes?: string;
	brandName?: string;
	headline?: string;
	question?: string;

	// --- Geospatial & Location Context ---
	placeId?: string;
	lat?: number;
	lng?: number;
	address?: string;
	rating?: number;
	reviews?: number;
	phone?: string;
	website?: string;
	vibe?: string[];
	photos?: string[];

	// --- Deep Culinary Context ---
	timings?: AppItemTimingMap;
	menu?: AppItemMenuSection[];
	userReviews?: AppItemUserReview[];
	nutrition?: AppItemNutrition;

	// --- Event Context ---
	eventDate?: string;
	eventTime?: string;
	eventLocation?: string;
	rsvpCount?: number;

	// --- Raw Pipeline Metadata ---
	metadata?: Record<string, unknown>;
}
