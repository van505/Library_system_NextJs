-- ==========================================
-- FEATURE S: STUDENT BORROWING LIMIT
-- ==========================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS borrow_limit int DEFAULT 3;

CREATE TABLE IF NOT EXISTS library_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key varchar(100) UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage settings" ON library_settings
    FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can read settings" ON library_settings
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

INSERT INTO library_settings (setting_key, setting_value, description)
VALUES ('default_borrow_limit', '3', 'Default maximum books a student can borrow at one time')
ON CONFLICT (setting_key) DO NOTHING;


-- ==========================================
-- FEATURE R: DUE DATE REMINDERS
-- ==========================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reminder_3day_sent boolean DEFAULT false;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reminder_1day_sent boolean DEFAULT false;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reminder_due_sent boolean DEFAULT false;


-- ==========================================
-- FEATURE T: BOOK TAGS SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(100) UNIQUE NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#6366f1',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read tags" ON tags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin/staff can manage tags" ON tags FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;


CREATE TABLE IF NOT EXISTS book_tags (
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

ALTER TABLE book_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read book_tags" ON book_tags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin/staff can manage book_tags" ON book_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Seed default tags
INSERT INTO tags (name, color) VALUES
  ('New Arrival', '#10b981'),
  ('Staff Pick', '#8b5cf6'),
  ('Exam Reference', '#f59e0b'),
  ('Award Winner', '#ef4444'),
  ('Bestseller', '#3b82f6'),
  ('Filipino Author', '#ec4899'),
  ('Donated', '#6b7280'),
  ('Featured', '#f97316')
ON CONFLICT (name) DO NOTHING;


-- ==========================================
-- FEATURE W: FEATURED / BOOK OF THE MONTH
-- ==========================================
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

ALTER TABLE books 
ADD COLUMN IF NOT EXISTS is_book_of_month boolean DEFAULT false;

ALTER TABLE books 
ADD COLUMN IF NOT EXISTS featured_note text;

-- Trigger to ensure only one book is "Book of the Month" at a time
CREATE OR REPLACE FUNCTION enforce_single_book_of_month()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.is_book_of_month = true THEN
    UPDATE books 
    SET is_book_of_month = false 
    WHERE id != NEW.id AND is_book_of_month = true;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_book_of_month ON books;
CREATE TRIGGER single_book_of_month
  BEFORE UPDATE ON books
  FOR EACH ROW
  WHEN (NEW.is_book_of_month = true)
  EXECUTE FUNCTION enforce_single_book_of_month();
