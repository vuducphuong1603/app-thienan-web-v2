-- Create plan_categories table
CREATE TABLE IF NOT EXISTS plan_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- hex color e.g. #E8651A
  icon TEXT NOT NULL, -- lucide icon name e.g. 'church'
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO plan_categories (name, color, icon, is_default, display_order) VALUES
  ('Thánh lễ', '#E8651A', 'church', true, 1),
  ('Giáo lý', '#4285F4', 'book-open', true, 2),
  ('Sinh hoạt', '#34A853', 'users', true, 3),
  ('Họp', '#FBBC04', 'message-circle', true, 4),
  ('Sự kiện', '#9333EA', 'calendar-heart', true, 5);

-- Enable RLS
ALTER TABLE plan_categories ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read plan_categories"
  ON plan_categories FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert plan_categories"
  ON plan_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "Authenticated users can update plan_categories"
  ON plan_categories FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete plan_categories"
  ON plan_categories FOR DELETE
  TO authenticated
  USING (true);
