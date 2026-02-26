-- Drop old weekly_plans table if exists (had different schema)
DROP TABLE IF EXISTS weekly_plans CASCADE;

-- Create weekly_plans table
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES plan_categories(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  location TEXT,
  branch TEXT,
  class_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraint: end time must be after start time
  CONSTRAINT time_end_after_start CHECK (time_end > time_start)
);

-- Indexes for common queries
CREATE INDEX idx_weekly_plans_plan_date ON weekly_plans(plan_date);
CREATE INDEX idx_weekly_plans_category_id ON weekly_plans(category_id);
CREATE INDEX idx_weekly_plans_branch ON weekly_plans(branch);

-- Enable RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read weekly_plans"
  ON weekly_plans FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert weekly_plans"
  ON weekly_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "Authenticated users can update weekly_plans"
  ON weekly_plans FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete weekly_plans"
  ON weekly_plans FOR DELETE
  TO authenticated
  USING (true);
