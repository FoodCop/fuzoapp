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

export type OnboardingV2Step = 
  | OnboardingV2ChoiceStep 
  | OnboardingV2MultiChoiceStep 
  | OnboardingV2PhoneStep 
  | OnboardingV2LocationStep 
  | OnboardingV2QuizStep
  | OnboardingV2FormStep
  | OnboardingV2MediaStep;

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

export const AUTH_ONBOARDING_V2_DATA: OnboardingV2Step[] = [
  ...INDIVIDUAL_PATH,
  ...CHEF_PATH,
  ...RESTAURANT_PATH,
  ...TEAM_PATH
];

