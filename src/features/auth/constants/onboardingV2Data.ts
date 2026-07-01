/**
 * ============================================================================
 * ONBOARDING V2 DATA SCHEMA & REGISTRY
 * ============================================================================
 * 
 * This file defines the structural taxonomy for the multi-path onboarding system.
 * It uses a 'Step' based architecture to allow for dynamic branching depending 
 * on the user's selected identity (Individual vs. Professional).
 */

/**
 * SECTION: Types & Definitions
 * Base schemas for onboarding interaction steps (Choice, MultiChoice, Phone, etc.).
 */
export type OnboardingV2BaseStep = {
  id: string;
  title: string;
  desc: string;
};

export type OnboardingV2ChoiceStep = OnboardingV2BaseStep & {
  type: 'choice';
  options: string[];
};

export type OnboardingV2MultiChoiceStep = OnboardingV2BaseStep & {
  type: 'multichoice';
  options: string[];
};

export type OnboardingV2PhoneStep = OnboardingV2BaseStep & {
  type: 'phone';
};

export type OnboardingV2LocationStep = OnboardingV2BaseStep & {
  type: 'location';
};

export type OnboardingV2QuizStep = OnboardingV2BaseStep & {
  type: 'quiz';
  questions: {
    id: string;
    question: string;
    options: { label: string; value: string }[];
  }[];
};

export type OnboardingV2Field = {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'tel' | 'number';
};

export type OnboardingV2FormStep = OnboardingV2BaseStep & {
  type: 'form';
  fields: OnboardingV2Field[];
};

export type OnboardingV2MediaStep = OnboardingV2BaseStep & {
  type: 'media';
  accept: 'image' | 'pdf' | 'all';
};

export type OnboardingV2SocialStep = OnboardingV2BaseStep & {
  type: 'social';
  providers: ('instagram' | 'facebook' | 'tiktok')[];
};

export type OnboardingV2Step = 
  | OnboardingV2ChoiceStep 
  | OnboardingV2MultiChoiceStep 
  | OnboardingV2PhoneStep 
  | OnboardingV2LocationStep 
  | OnboardingV2QuizStep
  | OnboardingV2FormStep
  | OnboardingV2MediaStep
  | OnboardingV2SocialStep;

/**
 * SECTION: Identity Registry
 * The entry point for the branching logic.
 */
export const ONBOARDING_USER_TYPES = [
  { id: 'individual', label: 'Individuals (Food Explorer)', icon: 'Utensils', desc: 'Personal food exploration, levels & reviews' },
  { id: 'chef', label: 'Chef', icon: 'ChefHat', desc: 'Professional chefs & culinary artists' },
  { id: 'private_chef', label: 'Private Chef', icon: 'ChefHat', desc: 'Personal chefs for exclusive dining' },
  { id: 'restaurant', label: 'Restaurant', icon: 'Utensils', desc: 'Physical dining establishments' },
  { id: 'culinary_team', label: 'Culinary Team', icon: 'Users', desc: 'Cloud kitchens & home businesses' },
];

/**
 * SECTION: Individual Path (Visual Heritage)
 * Consumer-focused questions for personal preference mapping.
 */
export const INDIVIDUAL_PATH: OnboardingV2Step[] = [
  {
    id: 'individual_role',
    type: 'choice',
    title: 'Your Role',
    desc: 'What describes you best?',
    options: ['Food Explorer', 'Food Reviewer'],
  },
  {
    id: 'experience_level',
    type: 'choice',
    title: 'Food Expertise',
    desc: 'How would you rate your culinary level?',
    options: ['Novice (Learning)', 'Foodie (Enthusiast)', 'Connoisseur (Expert)', 'Pro Critic'],
  },
  {
    id: 'flavors',
    type: 'multichoice',
    title: 'Flavor Profile',
    desc: 'What excites your palate? (Select all that apply)',
    options: ['Sweet 🍬', 'Spicy 🌶', 'Tangy 🍋', 'Salty 🧂', 'Bitter 巧克力', 'Umami 🍄'],
  },
  {
    id: 'cuisines',
    type: 'multichoice',
    title: 'Cuisine Favorites',
    desc: 'Which cuisines do you love?',
    options: ['Indian', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'Mediterranean', 'American', 'French'],
  },
  {
    id: 'dietary',
    type: 'choice',
    title: 'Dietary Mapping',
    desc: 'Any specific requirements?',
    options: ['None', 'Vegetarian', 'Vegan', 'Non-veg', 'Eggetarian'],
  },
  {
    id: 'social_sync',
    type: 'social',
    title: 'Social Sync',
    desc: 'Automatically enrich your profile from Instagram or Facebook.',
    providers: ['instagram', 'facebook'],
  },
];

/**
 * SECTION: Taste Profile Modules
 * Replaces the Culinary DNA Quiz with a 5-module Taste Profile Hub.
 */
import type { TasteProfileModule } from '../types/onboarding';

export const TASTE_PROFILE_MODULES: TasteProfileModule[] = [
  {
    id: 1, key: 'dining', emoji: '🍽', title: 'Dining Habits', blurb: 'Helps tailor when, where, and how you eat.',
    questions: [
      { id: 'q1', type: 'single', text: 'How often do you eat out?', options: ['Daily', '3–5 times a week', '1–2 times a week', 'Few times a month', 'Rarely'] },
      { id: 'q2', type: 'single', text: 'When do you usually discover new food?', options: ['Breakfast', 'Lunch', 'Dinner', 'Late Night', 'Anytime'] },
      { id: 'q3', type: 'single', text: 'Who do you usually dine with?', options: ['Alone', 'Partner', 'Friends', 'Family', 'Colleagues'] },
      { id: 'q4', type: 'single', text: 'What type of dining do you prefer?', options: ['Takeout', 'Delivery', 'Casual Dining', 'Fine Dining', 'Mix of everything'] },
      { id: 'q5', type: 'single', text: 'How far would you travel for great food?', options: ['Under 5 km', '5-10 km', '10-25 km', '25-50 km', 'Anywhere'] }
    ]
  },
  {
    id: 2, key: 'discovery', emoji: '🌍', title: 'Discovery & Exploration', blurb: 'Feeds your Adventure Score and Exploration Score.',
    questions: [
      { id: 'q1', type: 'single', text: 'How often do you try new cuisines?', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
      { id: 'q2', type: 'multi', max: 3, requireExact: true, text: 'When choosing a restaurant, what matters most?', helper: 'Pick your top 3', options: ['Reviews', 'Food Photos', 'Price', 'Distance', 'Recommendations', 'Ambience', 'Trendiness'] },
      { id: 'q3', type: 'single', text: 'Which best describes you?', options: ['I stick to favorites', 'I occasionally explore', 'I actively seek new experiences'] },
      { id: 'q4', type: 'scale', text: 'How likely are you to visit a newly opened restaurant?', helper: '1 = not likely, 5 = very likely' },
      { id: 'q5', type: 'single', text: 'What excites you most?', options: ['Authentic food', 'Hidden gems', 'Trending spots', 'Premium experiences', 'Local favorites'] }
    ]
  },
  {
    id: 3, key: 'mood', emoji: '😊', title: 'Mood & Cravings', blurb: 'Powers mood-based food insights.',
    questions: [
      { id: 'q1', type: 'multi', max: 3, requireExact: false, text: 'When you’re stressed, what do you crave?', helper: 'Select up to 3', options: ['Pizza', 'Burgers', 'Ice Cream', 'Pasta', 'Fried Food', 'Desserts', 'Soup', 'Noodles'] },
      { id: 'q2', type: 'single', text: 'When celebrating, you usually choose:', options: ['Steakhouse', 'Sushi', 'Fine Dining', 'BBQ', 'Seafood', 'Family Feast'] },
      { id: 'q3', type: 'single', text: 'On a rainy day you prefer:', options: ['Comfort food', 'Hot drinks', 'Soup', 'Street food', 'Desserts'] },
      { id: 'q4', type: 'single', text: 'Your ideal weekend food adventure:', options: ['Food truck', 'Hidden cafe', 'Fine dining', 'Ethnic cuisine', 'Local market'] },
      { id: 'q5', type: 'single', text: 'If you could eat one category forever:', options: ['Pizza', 'Burgers', 'Asian', 'Indian', 'Mediterranean', 'Desserts'] }
    ]
  },
  {
    id: 4, key: 'budget', emoji: '💸', title: 'Budget & Experience', blurb: 'Feeds your Luxury Score and Value Score.',
    questions: [
      { id: 'q1', type: 'single', text: 'Typical spend per meal?', options: ['Under $15', '$15–30', '$30–50', '$50–100', '$100+'] },
      { id: 'q2', type: 'single', text: 'What’s more important?', options: ['Price', 'Food Quality', 'Ambience', 'Service'] },
      { id: 'q3', type: 'single', text: 'How often do you visit premium restaurants?', options: ['Never', 'Rarely', 'Sometimes', 'Often'] },
      { id: 'q4', type: 'single', text: 'Which dining experience appeals most?', options: ['Quick bites', 'Casual', 'Trendy spots', 'Fine dining', 'Chef experiences'] },
      { id: 'q5', type: 'single', text: 'What would you spend extra on?', options: ['Better ingredients', 'Better ambience', 'Better service', 'Exclusive dishes'] }
    ]
  },
  {
    id: 5, key: 'social', emoji: '👥', title: 'Social Food Profile', blurb: 'Feeds your Social Score.',
    questions: [
      { id: 'q1', type: 'single', text: 'Eating food is primarily:', options: ['Necessity', 'Hobby', 'Social activity', 'Passion'] },
      { id: 'q2', type: 'single', text: 'How often do you share food photos?', options: ['Never', 'Occasionally', 'Often', 'Always'] },
      { id: 'q3', type: 'single', text: 'Do you enjoy recommending food to others?', options: ['No', 'Sometimes', 'Often', 'Absolutely'] },
      { id: 'q4', type: 'single', text: 'What best describes you?', options: ['Quiet eater', 'Food enthusiast', 'Local guide', 'Food influencer'] },
      { id: 'q5', type: 'single', text: 'Do you like organizing food outings?', options: ['Never', 'Rarely', 'Sometimes', 'Often'] }
    ]
  }
];

/**
 * SECTION: Chef Path
 * Professional identity and specialty mapping for culinary experts.
 */
export const CHEF_PATH: OnboardingV2Step[] = [
  {
    id: 'chef_type',
    type: 'choice',
    title: 'Chef Type',
    desc: 'What type of chef are you?',
    options: ['Private Chef', 'Catering Chef'],
  },
  {
    id: 'chef_profile',
    type: 'form',
    title: 'Profile Setup',
    desc: 'Let\'s build your professional identity.',
    fields: [
      { id: 'specialty', label: 'Cuisine Specialty', placeholder: 'e.g. Modern Indian, French Pastry', type: 'text' },
      { id: 'experience', label: 'Years of Experience', placeholder: 'e.g. 8 years', type: 'text' },
    ]
  },
  {
    id: 'chef_services',
    type: 'multichoice',
    title: 'Services Offered',
    desc: 'Which services do you provide?',
    options: ['Home Dining', 'Events', 'Meal Prep', 'Consulting'],
  },
  {
    id: 'chef_identity',
    type: 'choice',
    title: 'Culinary Identity',
    desc: 'Your area of expertise?',
    options: ['High-Tech Fusion', 'Sustainable Organic', 'Traditional Heritage', 'Experimental Labs'],
  },
  {
    id: 'chef_portfolio',
    type: 'media',
    title: 'Portfolio Upload',
    desc: 'Showcase your signature dishes and menus.',
    accept: 'all',
  },
];

/**
 * SECTION: Private Chef Path
 * Focuses on exclusive home dining and luxury experiences.
 */
export const PRIVATE_CHEF_PATH: OnboardingV2Step[] = [
  {
    id: 'private_chef_specialty',
    type: 'choice',
    title: 'Specialty',
    desc: 'What is your primary culinary focus?',
    options: ['Luxury Fine Dining', 'Healthy Meal Prep', 'Celebration Events', 'Family Style'],
  },
  {
    id: 'private_chef_profile',
    type: 'form',
    title: 'Service Profile',
    desc: 'Details for your private service.',
    fields: [
      { id: 'experience', label: 'Years of Experience', placeholder: 'e.g. 10 years', type: 'text' },
      { id: 'rate_range', label: 'Typical Rate Range', placeholder: 'e.g. $100-$300/person', type: 'text' },
    ]
  },
  {
    id: 'private_chef_portfolio',
    type: 'media',
    title: 'Visual Portfolio',
    desc: 'Upload photos of your best table setups and plated dishes.',
    accept: 'all',
  },
];

/**
 * SECTION: Restaurant Path
 * Business identification and venue characterization.
 */
export const RESTAURANT_PATH: OnboardingV2Step[] = [
  {
    id: 'restaurant_identity',
    type: 'form',
    title: 'Business Details',
    desc: 'Tell us about your establishment.',
    fields: [
      { id: 'business_name', label: 'Restaurant Name', placeholder: 'Full legal name', type: 'text' },
      { id: 'address', label: 'Primary Address', placeholder: 'Street, City, State', type: 'text' },
      { id: 'contact', label: 'Business Contact', placeholder: 'Email or phone for bookings', type: 'text' },
    ]
  },
  {
    id: 'restaurant_details',
    type: 'choice',
    title: 'Dining Style',
    desc: 'What best describes your venue?',
    options: ['Casual', 'Fine dining', 'Takeout', 'Cafe'],
  },
  {
    id: 'cuisine_types',
    type: 'multichoice',
    title: 'Cuisine Grid',
    desc: 'Which types of food do you serve?',
    options: ['Indian', 'Italian', 'Asian', 'Mexican', 'Continental'],
  },
  {
    id: 'restaurant_media',
    type: 'media',
    title: 'Menu & Media',
    desc: 'Upload your menu and high-fidelity photos.',
    accept: 'all',
  },
];

/**
 * SECTION: Culinary Team Path (Cloud Kitchens)
 * B2B and logistics-focused onboarding for delivery-centric units.
 */
export const TEAM_PATH: OnboardingV2Step[] = [
  {
    id: 'team_type',
    type: 'choice',
    title: 'Business Model',
    desc: 'Which best describes your unit?',
    options: ['Cloud Kitchen', 'Home-Based Catering', 'Meal Prep Service'],
  },
  {
    id: 'team_profile',
    type: 'form',
    title: 'Business Profile',
    desc: 'Professional details for your kitchen.',
    fields: [
      { id: 'business_name', label: 'Business Name', placeholder: 'Legal business name', type: 'text' },
      { id: 'owner_name', label: 'Owner Name', placeholder: 'Full name', type: 'text' },
      { id: 'contact', label: 'Contact Details', placeholder: 'Business phone or email', type: 'text' },
    ]
  },
  {
    id: 'team_cuisines',
    type: 'multichoice',
    title: 'Cuisine Mastery',
    desc: 'Which cuisines does your team specialize in?',
    options: ['Indian', 'Chinese', 'Healthy-Bowls', 'Continental', 'Desserts'],
  },
  {
    id: 'team_categories',
    type: 'multichoice',
    title: 'Food Categories',
    desc: 'What type of orders do you handle?',
    options: ['Daily Meals', 'Bulk Orders', 'Catering', 'Specialty Dishes'],
  },
  {
    id: 'team_media',
    type: 'media',
    title: 'Menu & Media',
    desc: 'Showcase your kitchen and highlight bestsellers.',
    accept: 'all',
  },
  {
    id: 'order_model',
    type: 'choice',
    title: 'Order Model',
    desc: 'How do customers order?',
    options: ['Made-to-order', 'Pre-order only', 'Same-day availability'],
  },
  {
    id: 'pricing_model',
    type: 'choice',
    title: 'Pricing Range',
    desc: 'Typical cost per plate?',
    options: ['Budget', 'Mid-Range', 'Premium'],
  },
];

/**
 * SECTION: Master Registry
 * Unified export for type-safe step validation.
 */
export const AUTH_ONBOARDING_V2_DATA: OnboardingV2Step[] = [
  ...INDIVIDUAL_PATH,
  ...CHEF_PATH,
  ...PRIVATE_CHEF_PATH,
  ...RESTAURANT_PATH,
  ...TEAM_PATH
];

