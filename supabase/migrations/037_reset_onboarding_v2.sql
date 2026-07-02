-- Reset onboarding completion flags for all current users to force the V2 onboarding flow.
UPDATE auth.users
SET raw_user_meta_data =
  (
    (COALESCE(raw_user_meta_data, '{}'::jsonb) 
      - 'onboarding_completed' 
      - 'has_completed_onboarding'
      - 'onboarding_v2'
    )
    || jsonb_build_object(
      'onboarding_completed', false, 
      'has_completed_onboarding', false,
      'onboarding_v2', false
    )
  ),
  updated_at = NOW()
WHERE id IS NOT NULL;
