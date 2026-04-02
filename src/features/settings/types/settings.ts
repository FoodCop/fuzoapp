export interface SettingsProfile {
  name: string;
  username: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  diet: string;
  cuisine: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  pinterest: string;
  youtube: string;
  profileType: string;
  profileSubtype: string;
}


export interface UserSettingsRow {
  id: string;
  display_name: string | null;
  username: string | null;
  dietary_preferences: string[] | null;
  cuisine_preferences: string[] | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  pinterest_url: string | null;
  youtube_url: string | null;
  profile_type: string | null;
  profile_subtype: string | null;
}


export interface PublicUserProfile {
  id: string;
  name: string;
  username: string;
  bio: string;
  location: string;
  avatarUrl: string;
  pointsTotal: number;
  pointsLevel: number;
  instagram: string;
  facebook: string;
  tiktok: string;
  pinterest: string;
  youtube: string;
  profile_type: string;
}

export interface PublicUserRow {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  points_total: number | null;
  points_level: number | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  pinterest_url: string | null;
  youtube_url: string | null;
  profile_type: string | null;
}

export interface AuthContextUser {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}
