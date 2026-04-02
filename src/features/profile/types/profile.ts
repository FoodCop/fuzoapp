export type PrimaryProfileType = 
  | 'Chef' 
  | 'Individual' 
  | 'Restaurant' 
  | 'Culinary Team' 
  | 'Private Chef';

export type ChefSubtype = 
  | 'Executive Chef'
  | 'Sous Chef'
  | 'Pastry Chef'
  | 'Private Chef'
  | 'Chef de Cuisine' 
  | 'Consultant Chef';

export type IndividualSubtype = 
  | 'Food Explorer'
  | 'Culinary Enthusiast'
  | 'Taste Maker'
  | 'Home Cook'
  | 'Dine-Out Pro';

export interface ProfileTypeConfig {
  primaryType: PrimaryProfileType;
  subtype?: string;
}

export type BadgeColor = 'yellow' | 'stone' | 'blue' | 'emerald' | 'indigo' | 'red';

export const PROFILE_TYPE_BADGES: Record<PrimaryProfileType, { color: BadgeColor }> = {
  Chef: { color: 'yellow' },
  Individual: { color: 'blue' },
  Restaurant: { color: 'emerald' },
  'Culinary Team': { color: 'indigo' },
  'Private Chef': { color: 'red' }
};
