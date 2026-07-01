import type { XpAction, OtherAction, ManualFlag, Role, Achievement } from '../types/gamification';

export const XP_ACTIONS: XpAction[] = [
  { key: 'visitRestaurant', label: 'Visit restaurant', xp: 20, effect: { restaurantsVisited: 1 } },
  { key: 'saveRestaurant', label: 'Save place', xp: 5, effect: { placesSaved: 1 } },
  { key: 'writeReview', label: 'Write review', xp: 30, effect: { reviewsWritten: 1 } },
  { key: 'uploadPhoto', label: 'Upload photo', xp: 15, effect: { photosUploaded: 1 } },
  { key: 'uploadVideo', label: 'Upload video', xp: 25, effect: { videosUploaded: 1 } },
  { key: 'uploadRecipe', label: 'Upload recipe', xp: 40, effect: { recipesUploaded: 1 } },
  { key: 'pinLocation', label: 'Pin location', xp: 10, effect: { locationsPinned: 1 } },
  { key: 'receiveLike', label: 'Receive like', xp: 2, effect: { likesReceived: 1 } },
  { key: 'receiveBookmark', label: 'Receive bookmark', xp: 5, effect: { bookmarksReceived: 1 } },
  { key: 'followCreator', label: 'Follow creator', xp: 2, effect: { followsGiven: 1 } },
  { key: 'receiveFollower', label: 'Receive follower', xp: 5, effect: { followers: 1 } }
];

export const OTHER_ACTIONS: OtherAction[] = [
  { key: 'exploreCuisine', label: 'Explore new cuisine', effect: { cuisinesExplored: 1 } },
  { key: 'exploreNeighborhood', label: 'Explore neighborhood', effect: { neighborhoodsExplored: 1 } },
  { key: 'visitHiddenGem', label: 'Visit hidden gem', effect: { hiddenGemsVisited: 1 } },
  { key: 'travelKm', label: 'Travel 10km for food', effect: { kmTraveled: 10 } },
  { key: 'exploreCity', label: 'Explore new city', effect: { citiesExplored: 1 } },
  { key: 'visitCountry', label: 'Visit new country', effect: { countriesVisited: 1 } },
  { key: 'passMonth', label: '+1 month active', effect: { monthsActive: 1 } },
  { key: 'publishPost', label: 'Publish blog post', effect: { posts: 1 } },
  { key: 'gainProfileVisit', label: '+10 profile visits', effect: { profileVisits: 10 } },
  { key: 'gainPostLikes', label: '+50 likes on posts', effect: { likesOnPosts: 50 } },
  { key: 'gainHelpfulVote', label: 'Receive helpful vote', effect: { helpfulVotes: 1 } },
  { key: 'bumpReviewLength', label: 'Write longer review', effect: { reviewAvgLength: 20 } },
  { key: 'postTravelStory', label: 'Post travel story', effect: { travelStoriesPosted: 1 } },
  { key: 'publishTutorial', label: 'Publish tutorial', effect: { tutorialsPublished: 1 } },
  { key: 'visitCafe', label: 'Visit a cafe', effect: { cafesVisited: 1 } },
  { key: 'tryPizza', label: 'Try a pizza place', effect: { pizzaPlaces: 1 } },
  { key: 'eatSushi', label: 'Eat sushi', effect: { sushiTimes: 1 } },
  { key: 'visitBurger', label: 'Visit burger spot', effect: { burgerVisits: 1 } },
  { key: 'reviewSpicy', label: 'Review spicy dish', effect: { spicyReviews: 1 } },
  { key: 'shareDessert', label: 'Share dessert', effect: { dessertsShared: 1 } },
  { key: 'visitVegan', label: 'Visit vegan spot', effect: { veganVisits: 1 } },
  { key: 'streetFoodCheckin', label: 'Street food check-in', effect: { streetFoodCheckins: 1 } }
];

export const MANUAL_FLAGS: ManualFlag[] = [
  { key: 'tasteProfileComplete', label: 'Mark Taste Profile complete' },
  { key: 'topReviewerInCity', label: 'Mark "Top reviewer in city"' },
  { key: 'invitationOrQualityBlogger', label: 'Mark FUZO invite / quality (Blogger)' },
  { key: 'communityRecognitionTravel', label: 'Mark community recognition (Travel)' },
  { key: 'highEngagementRecipe', label: 'Mark high engagement (Recipe)' },
  { key: 'invitationOrQualityInstructor', label: 'Mark FUZO invite / quality (Instructor)' }
];

export const ROLES: Role[] = [
  {
    key: 'explorer', label: 'Food Explorer', rankName: 'Explorer Rank', accent: '#FF8C69', accentDark: '#F06B45',
    badges: [
      {
        emoji: '🍽', title: 'Curious Bite', reward: 'Explorer Badge I', reqs: [
          { label: 'Visit 5 restaurants', stat: 'restaurantsVisited', target: 5 },
          { label: 'Save 5 places', stat: 'placesSaved', target: 5 }
        ]
      },
      {
        emoji: '🧭', title: 'Local Explorer', reward: 'New badge color unlocked', reqs: [
          { label: 'Visit 10 restaurants', stat: 'restaurantsVisited', target: 10 },
          { label: 'Pin 3 locations', stat: 'locationsPinned', target: 3 },
          { label: 'Explore 5 cuisines', stat: 'cuisinesExplored', target: 5 }
        ]
      },
      {
        emoji: '🌎', title: 'Taste Explorer', reward: 'Exclusive profile frame', reqs: [
          { label: 'Visit 20 restaurants', stat: 'restaurantsVisited', target: 20 },
          { label: 'Explore 10 cuisines', stat: 'cuisinesExplored', target: 10 },
          { label: 'Save 20 places', stat: 'placesSaved', target: 20 }
        ]
      },
      {
        emoji: '🏆', title: 'City Food Hunter', reward: 'Map pin style unlock', reqs: [
          { label: 'Visit 35 restaurants', stat: 'restaurantsVisited', target: 35 },
          { label: 'Explore 5 neighborhoods', stat: 'neighborhoodsExplored', target: 5 },
          { label: 'Visit 3 hidden gems', stat: 'hiddenGemsVisited', target: 3 }
        ]
      },
      {
        emoji: '🌍', title: 'Culinary Adventurer', reward: '+100 XP bonus', reqs: [
          { label: 'Visit 50 restaurants', stat: 'restaurantsVisited', target: 50 },
          { label: 'Explore 15 cuisines', stat: 'cuisinesExplored', target: 15 },
          { label: 'Travel 30km+ for food', stat: 'kmTraveled', target: 30 }
        ]
      },
      {
        emoji: '👑', title: 'FUZO Food Explorer', reward: 'Exclusive profile theme', reqs: [
          { label: 'Visit 100 restaurants', stat: 'restaurantsVisited', target: 100 },
          { label: 'Explore 25 cuisines', stat: 'cuisinesExplored', target: 25 },
          { label: 'Complete Taste Profile', stat: 'tasteProfileComplete', target: true },
          { label: 'Active 3+ months', stat: 'monthsActive', target: 3 }
        ]
      }
    ]
  },
  {
    key: 'reviewer', label: 'Food Reviewer', rankName: 'Critic Rank', accent: '#3FB6A1', accentDark: '#2E9483',
    badges: [
      {
        emoji: '✍', title: 'First Impression', reward: 'New achievement card', reqs: [
          { label: 'Write 3 reviews', stat: 'reviewsWritten', target: 3 }
        ]
      },
      {
        emoji: '⭐', title: 'Trusted Reviewer', reward: 'New badge color unlocked', reqs: [
          { label: 'Write 10 reviews', stat: 'reviewsWritten', target: 10 },
          { label: 'Receive 20 helpful votes', stat: 'helpfulVotes', target: 20 }
        ]
      },
      {
        emoji: '🍴', title: 'Local Critic', reward: 'Exclusive profile frame', reqs: [
          { label: 'Review 25 restaurants', stat: 'reviewsWritten', target: 25 },
          { label: 'Avg review length > 100 chars', stat: 'reviewAvgLength', target: 100 }
        ]
      },
      {
        emoji: '🏅', title: 'Community Reviewer', reward: '+100 XP bonus', reqs: [
          { label: '50 reviews', stat: 'reviewsWritten', target: 50 },
          { label: '100 helpful votes', stat: 'helpfulVotes', target: 100 }
        ]
      },
      {
        emoji: '🏆', title: 'Master Critic', reward: 'Exclusive profile theme', reqs: [
          { label: '100 reviews', stat: 'reviewsWritten', target: 100 },
          { label: '250 helpful votes', stat: 'helpfulVotes', target: 250 }
        ]
      },
      {
        emoji: '👑', title: 'FUZO Elite Critic', reward: 'Featured in local discovery', reqs: [
          { label: '200 reviews', stat: 'reviewsWritten', target: 200 },
          { label: 'Top reviewer in city', stat: 'topReviewerInCity', target: true }
        ]
      }
    ]
  },
  {
    key: 'blogger', label: 'Food Blogger', rankName: 'Blogger Rank', accent: '#F2B23E', accentDark: '#D9961E',
    badges: [
      {
        emoji: '📷', title: 'First Post', reward: 'New achievement card', reqs: [
          { label: 'Publish 3 posts', stat: 'posts', target: 3 }
        ]
      },
      {
        emoji: '📝', title: 'Storyteller', reward: 'New badge color unlocked', reqs: [
          { label: '10 posts', stat: 'posts', target: 10 },
          { label: '100 profile visits', stat: 'profileVisits', target: 100 }
        ]
      },
      {
        emoji: '🌟', title: 'Rising Blogger', reward: 'Exclusive profile frame', reqs: [
          { label: '25 posts', stat: 'posts', target: 25 },
          { label: '500 likes', stat: 'likesOnPosts', target: 500 }
        ]
      },
      {
        emoji: '🔥', title: 'Community Voice', reward: '+100 XP bonus', reqs: [
          { label: '50 posts', stat: 'posts', target: 50 },
          { label: '1,500 likes', stat: 'likesOnPosts', target: 1500 }
        ]
      },
      {
        emoji: '🏆', title: 'Influencer', reward: 'Exclusive profile theme', reqs: [
          { label: '100 posts', stat: 'posts', target: 100 },
          { label: '5,000 likes', stat: 'likesOnPosts', target: 5000 }
        ]
      },
      {
        emoji: '👑', title: 'FUZO Featured Creator', reward: 'Featured in local discovery', reqs: [
          { label: 'FUZO invitation or quality threshold', stat: 'invitationOrQualityBlogger', target: true }
        ]
      }
    ]
  },
  {
    key: 'travel', label: 'Food Travel Blogger', rankName: 'Travel Rank', accent: '#5E8FE0', accentDark: '#4570C4',
    badges: [
      {
        emoji: '🚗', title: 'Local Food Traveler', reward: 'New achievement card', reqs: [
          { label: 'Visit 5 neighborhoods', stat: 'neighborhoodsExplored', target: 5 }
        ]
      },
      {
        emoji: '🗺', title: 'City Explorer', reward: 'New badge color unlocked', reqs: [
          { label: 'Explore 10 neighborhoods', stat: 'neighborhoodsExplored', target: 10 },
          { label: 'Post 10 travel stories', stat: 'travelStoriesPosted', target: 10 }
        ]
      },
      {
        emoji: '✈', title: 'Regional Explorer', reward: 'Exclusive profile frame', reqs: [
          { label: 'Explore 5 cities', stat: 'citiesExplored', target: 5 }
        ]
      },
      {
        emoji: '🌎', title: 'Country Explorer', reward: '+100 XP bonus', reqs: [
          { label: 'Explore 10 cities', stat: 'citiesExplored', target: 10 }
        ]
      },
      {
        emoji: '🏅', title: 'International Food Traveler', reward: 'Exclusive profile theme', reqs: [
          { label: 'Visit restaurants in 3 countries', stat: 'countriesVisited', target: 3 }
        ]
      },
      {
        emoji: '👑', title: 'FUZO Travel Ambassador', reward: 'Featured in local discovery', reqs: [
          { label: 'Community recognition', stat: 'communityRecognitionTravel', target: true }
        ]
      }
    ]
  },
  {
    key: 'recipe', label: 'Recipe Creator', rankName: 'Recipe Rank', accent: '#B07FD4', accentDark: '#9560BC',
    badges: [
      {
        emoji: '🥄', title: 'Home Cook', reward: 'New achievement card', reqs: [
          { label: 'Upload 3 recipes', stat: 'recipesUploaded', target: 3 }
        ]
      },
      {
        emoji: '📖', title: 'Recipe Builder', reward: 'New badge color unlocked', reqs: [
          { label: '10 recipes', stat: 'recipesUploaded', target: 10 }
        ]
      },
      {
        emoji: '👨‍🍳', title: 'Kitchen Expert', reward: 'Exclusive profile frame', reqs: [
          { label: '25 recipes', stat: 'recipesUploaded', target: 25 }
        ]
      },
      {
        emoji: '🔥', title: 'Signature Creator', reward: '+100 XP bonus', reqs: [
          { label: '50 recipes', stat: 'recipesUploaded', target: 50 }
        ]
      },
      {
        emoji: '🏆', title: 'Culinary Creator', reward: 'Exclusive profile theme', reqs: [
          { label: '100 recipes', stat: 'recipesUploaded', target: 100 }
        ]
      },
      {
        emoji: '👑', title: 'FUZO Master Chef', reward: 'Featured in local discovery', reqs: [
          { label: '200 recipes', stat: 'recipesUploaded', target: 200 },
          { label: 'High engagement', stat: 'highEngagementRecipe', target: true }
        ]
      }
    ]
  },
  {
    key: 'instructor', label: 'Cooking Instructor', rankName: 'Instructor Rank', accent: '#F0739B', accentDark: '#D8537E',
    badges: [
      {
        emoji: '🎓', title: 'Mentor', reward: 'New achievement card', reqs: [
          { label: 'Publish 3 tutorials', stat: 'tutorialsPublished', target: 3 }
        ]
      },
      {
        emoji: '🍳', title: 'Teacher', reward: 'New badge color unlocked', reqs: [
          { label: '10 tutorials', stat: 'tutorialsPublished', target: 10 }
        ]
      },
      {
        emoji: '🏫', title: 'Instructor', reward: 'Exclusive profile frame', reqs: [
          { label: '25 tutorials', stat: 'tutorialsPublished', target: 25 }
        ]
      },
      {
        emoji: '👨‍🍳', title: 'Culinary Coach', reward: '+100 XP bonus', reqs: [
          { label: '50 tutorials', stat: 'tutorialsPublished', target: 50 }
        ]
      },
      {
        emoji: '🏆', title: 'Master Instructor', reward: 'Exclusive profile theme', reqs: [
          { label: '100 tutorials', stat: 'tutorialsPublished', target: 100 }
        ]
      },
      {
        emoji: '👑', title: 'FUZO Academy Mentor', reward: 'Featured in local discovery', reqs: [
          { label: 'FUZO invitation or quality threshold', stat: 'invitationOrQualityInstructor', target: true }
        ]
      }
    ]
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  { emoji: '☕', title: 'Coffee Lover', stat: 'cafesVisited', target: 10 },
  { emoji: '🍕', title: 'Pizza Fan', stat: 'pizzaPlaces', target: 10 },
  { emoji: '🍣', title: 'Sushi Scout', stat: 'sushiTimes', target: 10 },
  { emoji: '🍔', title: 'Burger Buff', stat: 'burgerVisits', target: 15 },
  { emoji: '🌶', title: 'Spice Warrior', stat: 'spicyReviews', target: 10 },
  { emoji: '🍰', title: 'Dessert Lover', stat: 'dessertsShared', target: 20 },
  { emoji: '🌱', title: 'Plant Powered', stat: 'veganVisits', target: 10 },
  { emoji: '🌮', title: 'Street Food Hunter', stat: 'streetFoodCheckins', target: 15 },
  { emoji: '🌍', title: 'World Explorer', stat: 'cuisinesExplored', target: 20 },
  { emoji: '💎', title: 'Hidden Gem Hunter', stat: 'hiddenGemsVisited', target: 15 },
  { emoji: '📸', title: 'Food Photographer', stat: 'photosUploaded', target: 100 },
  { emoji: '🎥', title: 'Video Creator', stat: 'videosUploaded', target: 50 },
  { emoji: '❤️', title: 'Community Favorite', stat: 'likesReceived', target: 1000 },
  { emoji: '🤝', title: 'Food Companion', stat: null, target: null, future: true }
];
