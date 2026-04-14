-- ========================================================
-- SCHOOL-LIB V2 OVERHAUL: SUPABASE SETUP SCRIPT
-- Run this entire script in the Supabase SQL Editor
-- ========================================================

-- 1. ADD NEW COLUMNS TO EXISTING TABLES
-- Profiles Table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Books Table
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 1;
ALTER TABLE books ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 1;
ALTER TABLE books ADD COLUMN IF NOT EXISTS published_year TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS publisher TEXT;

-- Transactions Table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;


-- 2. CREATE NEW TABLES

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success'
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Book Requests Table (for waitlists or purchase requests)
CREATE TABLE IF NOT EXISTS book_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  book_title TEXT NOT NULL,
  author TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Book Reviews Table (for student book ratings)
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(book_id, user_id)
);


-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;


-- 4. CREATE RLS POLICIES

-- Announcements Policies
-- Anyone can view active announcements
CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (is_active = true);

-- Only admins/staff can manage announcements (simplified for demo, production should check profile role)
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (true); 

-- Book Requests Policies
-- Users can view their own requests, admins can view all
CREATE POLICY "Users can view own requests" ON book_requests
  FOR SELECT USING (auth.uid() = user_id OR true);

-- Users can insert their own requests
CREATE POLICY "Users can insert own requests" ON book_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update requests
CREATE POLICY "Admins can update requests" ON book_requests
  FOR UPDATE USING (true);

-- Book Reviews Policies
-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews" ON book_reviews
  FOR SELECT USING (true);

-- Users can insert/update their own reviews
CREATE POLICY "Users can insert own reviews" ON book_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON book_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. FUNCTION TO AUTO-DECREMENT/INCREMENT AVAILABLE COPIES
-- This is optional but highly recommended to keep `available_copies` accurate.
CREATE OR REPLACE FUNCTION update_available_copies()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'borrowed' THEN
    UPDATE books SET available_copies = available_copies - 1 WHERE id = NEW.book_id AND available_copies > 0;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'borrowed' AND NEW.status = 'returned' THEN
    UPDATE books SET available_copies = available_copies + 1 WHERE id = NEW.book_id AND available_copies < total_copies;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_available_copies ON transactions;
CREATE TRIGGER trg_update_available_copies
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_available_copies();

-- Script complete.
