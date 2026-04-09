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

export type OnboardingV2Step = 
  | OnboardingV2ChoiceStep 
  | OnboardingV2MultiChoiceStep 
  | OnboardingV2PhoneStep 
  | OnboardingV2LocationStep 
  | OnboardingV2QuizStep;

export const ONBOARDING_USER_TYPES = [
  { id: 'individual', label: 'Individual', icon: 'Utensils', desc: 'Personal food exploration & reviews' },
  { id: 'chef', label: 'Chef', icon: 'ChefHat', desc: 'Professional chefs & culinary artists' },
  { id: 'restaurant', label: 'Restaurant', icon: 'Utensils', desc: 'Physical dining establishments' },
  { id: 'culinary_team', label: 'Culinary Team', icon: 'Users', desc: 'Cloud kitchens & home businesses' },
];

export const INDIVIDUAL_PATH: OnboardingV2Step[] = [
  {
    id: 'individual_role',
    type: 'choice',
    title: 'Your Role',
    desc: 'What describes you best?',
    options: ['Food Explorer', 'Food Reviewer'],
  },
  {
    id: 'flavors',
    type: 'multichoice',
    title: 'Flavor Profile',
    desc: 'What excites your palate? (Select all that apply)',
    options: ['Sweet 🍬', 'Spicy 🌶', 'Tangy 🍋', 'Salty 🧂', 'Bitter 🍫', 'Umami 🍄'],
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
];

export const FOOD_PERSONALITY_QUIZ: OnboardingV2QuizStep = {
  id: 'personality_quiz',
  type: 'quiz',
  title: 'Food Personality',
  desc: 'Let\'s decode your culinary DNA.',
  questions: [
    {
      id: 'vibe',
      question: 'What\'s your go-to meal vibe?',
      options: [
        { label: '🍕 Comfort & indulgent', value: 'explorer' },
        { label: '🌮 Bold & spicy', value: 'adventurer' },
        { label: '🥗 Clean & healthy', value: 'zen' },
        { label: '🍣 Trendy & aesthetic', value: 'socialite' }
      ]
    },
    {
      id: 'choice',
      question: 'How do you choose where to eat?',
      options: [
        { label: '⭐ Ratings', value: 'data' },
        { label: '📸 Social media', value: 'socialite' },
        { label: '👃 Cravings', value: 'explorer' },
        { label: '🧠 Health', value: 'zen' }
      ]
    },
    {
      id: 'excitement',
      question: 'What excites you most about food?',
      options: [
        { label: '🍽 Familiar', value: 'comfort' },
        { label: '🌍 New cuisines', value: 'adventurer' },
        { label: '🧘 Balanced', value: 'zen' },
        { label: '📸 Experience', value: 'socialite' }
      ]
    },
    {
      id: 'weekend',
      question: 'Pick a weekend plan:',
      options: [
        { label: '🛋 Comfort food', value: 'comfort' },
        { label: '🚶 Explore spots', value: 'explorer' },
        { label: '👨‍🍳 Cook', value: 'chef' },
        { label: '🥗 Healthy café', value: 'zen' }
      ]
    },
    {
      id: 'adventure',
      question: 'How adventurous are you?',
      options: [
        { label: '❌ Safe', value: 'comfort' },
        { label: '🙂 Occasional', value: 'explorer' },
        { label: '😎 Adventurous', value: 'adventurer' },
        { label: '🔥 Extreme', value: 'wild' }
      ]
    }
  ]
};

export const CHEF_PATH: OnboardingV2Step[] = [
  {
    id: 'chef_type',
    type: 'choice',
    title: 'Chef Portfolio',
    desc: 'What type of chef are you?',
    options: ['Private Chef', 'Catering Chef'],
  },
  {
    id: 'chef_identity',
    type: 'choice',
    title: 'Culinary Identity',
    desc: 'Your area of expertise?',
    options: ['High-Tech Fusion', 'Sustainable Organic', 'Traditional Heritage', 'Experimental Labs'],
  },
];

export const RESTAURANT_PATH: OnboardingV2Step[] = [
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
];

export const TEAM_PATH: OnboardingV2Step[] = [
  {
    id: 'team_type',
    type: 'choice',
    title: 'Business Model',
    desc: 'Which best describes your unit?',
    options: ['Cloud Kitchen', 'Home-Based Catering', 'Meal Prep Service'],
  },
  {
    id: 'pricing_model',
    type: 'choice',
    title: 'Pricing Range',
    desc: 'Typical cost per plate?',
    options: ['Budget', 'Mid-Range', 'Premium'],
  },
];

export const AUTH_ONBOARDING_V2_DATA: OnboardingV2Step[] = [
  ...INDIVIDUAL_PATH,
  ...CHEF_PATH,
  ...RESTAURANT_PATH,
  ...TEAM_PATH
];

