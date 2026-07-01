export const FLAVORS = ['Sweet', 'Spicy', 'Savory', 'Tangy', 'Sour', 'Bitter', 'Smoky', 'Umami', 'Creamy', 'Cheesy'];
export const CUISINES = ['Indian', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Mexican', 'Mediterranean', 'Caribbean', 'Middle Eastern'];
export const DIETARY = ['No Restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Jain', 'Gluten-Free', 'Dairy-Free'];
export const FOOD_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Bakery', 'Catering', 'Meal Prep'];
export const AUDIENCE = ['Families', 'Students', 'Professionals', 'Foodies', 'Travelers', 'Health Conscious'];
export const CUSTOMER_MATCH = ['Food Explorers', 'Families', 'Professionals', 'Students', 'Travelers', 'Health Conscious Diners'];
export const BUSINESS_IDENTITY = ['Family Friendly', 'Hidden Gem', 'Fine Dining', 'Vegan Friendly', 'Halal', 'Local Favorite', 'Date Night', 'Late Night', 'Budget Friendly', 'Premium Experience'];
export const INTEGRATIONS = ['OpenTable', 'Website', 'Online Ordering'];

export const PATH_OPTS = [
  { v: 'A', e: '🍽️', d: 'Explore restaurants, dishes, reviews and food experiences.' },
  { v: 'B', e: '👨‍🍳', d: 'Share your culinary expertise, recipes, reviews and food content.' },
  { v: 'C', e: '🏪', d: 'Promote your food business and connect with food lovers.' }
];

export const A_TYPE_OPTS = [
  { v: 'Food Explorer', e: '🧭', d: 'Find new restaurants, dishes, and food experiences.' },
  { v: 'Food Reviewer', e: '✍️', d: 'Share honest takes on what you eat.' }
];

export const B_TYPE_OPTS = [
  { v: 'Food Blogger', e: '📝', d: 'Reviews, restaurant discovery, food photography.' },
  { v: 'Food Travel Blogger', e: '✈️', d: 'Local food, city guides, road trips.' },
  { v: 'Recipe Creator', e: '👩‍🍳', d: 'Home cooking, baking, healthy recipes.' },
  { v: 'Cooking Instructor', e: '🎓', d: 'Beginner and advanced classes.' },
  { v: 'Nutrition Coach', e: '🥗', d: 'Weight loss, sports nutrition, healthy eating.' },
  { v: 'Private Chef', e: '🍽️', d: 'Personal dining, event dining.' },
  { v: 'Catering Chef', e: '🎉', d: 'Weddings, corporate events, private functions.' }
];

export const C_TYPE_OPTS = [
  { v: 'Restaurant', e: '🍴', d: 'A full-service dine-in spot.' },
  { v: 'Cloud Kitchen', e: '☁️', d: 'Delivery-only kitchen, no storefront.' },
  { v: 'Café', e: '☕', d: 'Coffee, light bites, casual seating.' },
  { v: 'Bakery', e: '🥐', d: 'Baked goods and desserts.' },
  { v: 'Food Truck', e: '🚚', d: 'Mobile food service.' },
  { v: 'Catering Company', e: '🎊', d: 'Events and bulk orders.' },
  { v: 'Meal Prep Business', e: '🍱', d: 'Pre-made meals, subscriptions.' },
  { v: 'Specialty Food Business', e: '🌟', d: 'Niche or artisan food products.' }
];

export const SPECIALTY_MAP: Record<string, string[]> = {
  'Food Blogger': ['Reviews', 'Restaurant Discovery', 'Food Photography'],
  'Food Travel Blogger': ['Local Food', 'City Guides', 'Road Trips'],
  'Recipe Creator': ['Home Cooking', 'Baking', 'Healthy Recipes'],
  'Cooking Instructor': ['Beginner Classes', 'Advanced Classes'],
  'Nutrition Coach': ['Weight Loss', 'Sports Nutrition', 'Healthy Eating'],
  'Private Chef': ['Personal Dining', 'Event Dining'],
  'Catering Chef': ['Weddings', 'Corporate Events', 'Private Functions']
};

export const QUIZ_QUESTIONS = [
  { key: 'q1', q: 'What’s your go-to meal vibe?', opts: ['Comfort & indulgent', 'Bold & spicy', 'Healthy & balanced', 'Trendy & aesthetic'] },
  { key: 'q2', q: 'How do you choose where to eat?', opts: ['Reviews', 'Social media', 'Cravings', 'Healthy options'] },
  { key: 'q3', q: 'What excites you most?', opts: ['Familiar favorites', 'New cuisines', 'Balanced eating', 'Food experiences'] },
  { key: 'q4', q: 'Pick a weekend activity', opts: ['Comfort food at home', 'Explore new restaurants', 'Cook something new', 'Visit a healthy cafe'] },
  { key: 'q5', q: 'How adventurous are you with food?', opts: ['Not much', 'Sometimes', 'Often', "I'll try anything"] }
];

export const QUIZ_MAP: Record<string, Record<string, string>> = {
  q1: { 'Comfort & indulgent': 'comfort', 'Bold & spicy': 'explorer', 'Healthy & balanced': 'health', 'Trendy & aesthetic': 'trend' },
  q2: { 'Reviews': 'trend', 'Social media': 'trend', 'Cravings': 'comfort', 'Healthy options': 'health' },
  q3: { 'Familiar favorites': 'comfort', 'New cuisines': 'explorer', 'Balanced eating': 'health', 'Food experiences': 'trend' },
  q4: { 'Comfort food at home': 'comfort', 'Explore new restaurants': 'explorer', 'Cook something new': 'trend', 'Visit a healthy cafe': 'health' },
  q5: { 'Not much': 'comfort', 'Sometimes': 'health', 'Often': 'trend', "I'll try anything": 'explorer' }
};

export const PERSONALITY: Record<string, { emoji: string, title: string, desc: string }> = {
  explorer: { emoji: '🌶️', title: 'Flavor Explorer', desc: 'You chase bold, new flavors and rarely order the same dish twice.' },
  comfort: { emoji: '🍕', title: 'Comfort Craver', desc: 'Familiar, indulgent food is where your heart is.' },
  health: { emoji: '🥗', title: 'Health Hero', desc: 'Balanced, nourishing meals top your list every time.' },
  trend: { emoji: '🍣', title: 'Trend Hunter', desc: 'You eat with your eyes first and chase what’s buzzing.' }
};

export const FEATURES_LIST = [
  { k: 'reservations', label: 'Reservations' },
  { k: 'ordering', label: 'Ordering' },
  { k: 'catering', label: 'Catering Requests' },
  { k: 'events', label: 'Event Bookings' }
];
