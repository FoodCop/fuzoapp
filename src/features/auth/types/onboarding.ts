export type OnboardingLocation = {
  country: string;
  state: string;
  city: string;
  detected: boolean;
  lat?: number;
  lng?: number;
};

export type UserType = 'individual' | 'chef' | 'private_chef' | 'restaurant' | 'culinary_team';

export type TasteProfileQuestion = 
  | { id: string; type: 'single'; text: string; options: string[] }
  | { id: string; type: 'multi'; text: string; options: string[]; max: number; requireExact?: boolean; helper?: string }
  | { id: string; type: 'scale'; text: string; helper?: string };

export type TasteProfileModule = {
  id: number;
  key: keyof TasteProfileAnswers;
  emoji: string;
  title: string;
  blurb: string;
  questions: TasteProfileQuestion[];
};

export type TasteProfileAnswers = {
  dining?: Record<string, any>;
  discovery?: Record<string, any>;
  mood?: Record<string, any>;
  budget?: Record<string, any>;
  social?: Record<string, any>;
};

export type OnboardingV2Payload = {
  userType: UserType;
  answers: Record<string, any>;
  phone?: string;
  location?: OnboardingLocation;
  locationLabel?: string;
  quizResult?: string;
  tasteProfile?: TasteProfileAnswers;
};

