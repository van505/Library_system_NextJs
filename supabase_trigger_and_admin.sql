-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR (Full Setup + Trigger)
-- ============================================================

-- 1. Make sure the profiles table has all v2 columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Auto-create user profiles on signup (backup trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 3. Elevate admin@library.com to admin role
UPDATE public.profiles
SET role = 'admin', full_name = 'Administrator'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@library.com');

-- 4. If the profile row doesn't exist yet for admin (edge case), insert it
INSERT INTO public.profiles (id, full_name, role, is_active)
SELECT id, 'Administrator', 'admin', true
FROM auth.users
WHERE email = 'admin@library.com'
ON CONFLICT (id) DO UPDATE
  SET role = 'admin', full_name = 'Administrator';
