-- This script forcibly removes the corrupted admin account at the database level

DO $$
DECLARE
  bad_user_id uuid;
BEGIN
  -- Find the corrupted user ID
  SELECT id INTO bad_user_id FROM auth.users WHERE email = 'admin@library.com';
  
  IF bad_user_id IS NOT NULL THEN
    -- 1. Delete from profiles
    DELETE FROM public.profiles WHERE id = bad_user_id;
    
    -- 2. Delete existing auth identities
    DELETE FROM auth.identities WHERE user_id = bad_user_id;

    -- 3. Delete any sessions, refresh tokens or factors if they somehow got created
    DELETE FROM auth.sessions WHERE user_id = bad_user_id;
    DELETE FROM auth.mfa_factors WHERE user_id = bad_user_id;
    
    -- 4. Finally forcefully delete from the users table
    DELETE FROM auth.users WHERE id = bad_user_id;
  END IF;
END $$;
