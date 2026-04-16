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

export interface AppItem {
	id?: string;
	itemType?: string;
	itemId?: string;
	type?: string;
	name?: string;
	title?: string;
	cat?: string;
	img?: string;
	image?: string;
	imageUrl?: string;
	thumbnailUrl?: string;
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
	timings?: AppItemTimingMap;
	menu?: AppItemMenuSection[];
	userReviews?: AppItemUserReview[];
	nutrition?: AppItemNutrition;
	metadata?: Record<string, unknown>;
}
