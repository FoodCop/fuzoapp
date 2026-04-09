export type OnboardingLocation = {
  country: string;
  state: string;
  city: string;
  detected: boolean;
  lat?: number;
  lng?: number;
};

export type UserType = 'individual' | 'chef' | 'restaurant' | 'culinary_team';

export type OnboardingV2Payload = {
  userType: UserType;
  answers: Record<string, any>;
  phone?: string;
  location?: OnboardingLocation;
  locationLabel?: string;
  quizResult?: string;
};

