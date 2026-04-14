import type { AuthContextUser, SettingsProfile, UserSettingsRow } from '../types/settings';

const toTitleCase = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getMetadataString = (metadata: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
};

export const buildDefaultSettingsProfile = (authUser: AuthContextUser | null | undefined): SettingsProfile => {
  const metadata = authUser?.user_metadata || {};
  const email = authUser?.email || '';
  const emailName = email.includes('@') ? email.split('@')[0] : 'chef_studio_lab';

  return {
    name: getMetadataString(metadata, 'full_name', 'name') || 'Chef Studio',
    username: getMetadataString(metadata, 'username', 'user_name') || emailName,
    bio: getMetadataString(metadata, 'bio') || 'Discovery engine architect. Exploring the world of fine dining and culinary hacks.',
    email: email || 'chef@fuzo.studio',
    phone: getMetadataString(metadata, 'phone') || '+1 (555) 0123-4567',
    location: getMetadataString(metadata, 'location') || '',
    diet: 'None',
    cuisine: '',
    instagram: getMetadataString(metadata, 'instagram_url', 'instagram', 'ig'),
    facebook: getMetadataString(metadata, 'facebook_url', 'facebook', 'fb'),
    tiktok: getMetadataString(metadata, 'tiktok_url', 'tiktok'),
    pinterest: getMetadataString(metadata, 'pinterest_url', 'pinterest'),
    youtube: getMetadataString(metadata, 'youtube_url', 'youtube'),
    profileType: getMetadataString(metadata, 'profile_type', 'type') || 'Individual',
    profileSubtype: getMetadataString(metadata, 'profile_subtype', 'chef_subtype', 'subtype') || 'Food Explorer',
    avatarUrl: getMetadataString(metadata, 'avatar_url', 'avatar'),
    coverUrl: getMetadataString(metadata, 'cover_photo_url', 'cover_url'),
  };
}
;


export const mergeSettingsFromRow = (base: SettingsProfile, row: UserSettingsRow | null | undefined): SettingsProfile => {
  if (!row) {
    return base;
  }

  const dietary = row.dietary_preferences || [];
  const cuisines = row.cuisine_preferences || [];

  return {
    ...base,
    name: row.display_name || base.name,
    username: row.username || base.username,
    bio: row.bio || base.bio,
    phone: row.phone || base.phone,
    location: row.location || base.location,
    diet: dietary.length > 0 ? toTitleCase(dietary[0]) : base.diet,
    cuisine: cuisines.length > 0 ? cuisines.map(toTitleCase).join(', ') : base.cuisine,
    instagram: row.instagram_url || base.instagram,
    facebook: row.facebook_url || base.facebook,
    tiktok: row.tiktok_url || base.tiktok,
    pinterest: row.pinterest_url || base.pinterest,
    youtube: row.youtube_url || base.youtube,
    profileType: row.profile_type || base.profileType,
    profileSubtype: row.profile_subtype || base.profileSubtype,
    avatarUrl: row.avatar_url || base.avatarUrl,
    coverUrl: row.cover_photo_url || base.coverUrl,
  };
}
;


export const mapProfileToSettingsUpdate = (profile: SettingsProfile) => {
  const cuisinePreferences = profile.cuisine
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);

  const dietaryPreferences = profile.diet && profile.diet.toLowerCase() !== 'none'
    ? [profile.diet.trim().toLowerCase()]
    : [];

  return {
    display_name: profile.name.trim() || null,
    username: profile.username.trim() || null,
    bio: profile.bio.trim() || null,
    phone: profile.phone.trim() || null,
    location: profile.location.trim() || null,
    dietary_preferences: dietaryPreferences,
    cuisine_preferences: cuisinePreferences,
    instagram_url: profile.instagram.trim() || null,
    facebook_url: profile.facebook.trim() || null,
    tiktok_url: profile.tiktok.trim() || null,
    pinterest_url: profile.pinterest.trim() || null,
    youtube_url: profile.youtube.trim() || null,
    profile_type: profile.profileType || 'Individual',
    profile_subtype: profile.profileSubtype || null,
    avatar_url: profile.avatarUrl || null,
    cover_photo_url: profile.coverUrl || null,
  };
}
;

