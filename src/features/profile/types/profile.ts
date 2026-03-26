export type PrimaryProfileType = 'Chef' | 'Individual' | 'Restaurant';

export type ChefSubtype = 
  | 'Chef de Cuisine' 
  | 'Private Chef' 
  | 'Guest Chef' 
  | 'Catering Chef' 
  | 'Event Chef';

export interface ProfileTypeConfig {
  primaryType: PrimaryProfileType;
  chefSubtype?: ChefSubtype;
}

export const PROFILE_TYPE_BADGES: Record<PrimaryProfileType, { color: 'blue' | 'yellow' | 'emerald' }> = {
  Chef: { color: 'yellow' },
  Individual: { color: 'blue' },
  Restaurant: { color: 'emerald' }
};
