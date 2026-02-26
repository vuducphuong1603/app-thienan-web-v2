-- Create holidays table for managing school year holidays
CREATE TABLE holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  day_type VARCHAR(10) NOT NULL CHECK (day_type IN ('thu5', 'cn', 'both')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_year_id, holiday_date, day_type)
);

-- Index for faster lookups by school year
CREATE INDEX idx_holidays_school_year ON holidays(school_year_id);
CREATE INDEX idx_holidays_date ON holidays(holiday_date);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_holidays_updated_at();

-- RLS policies
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read holidays
CREATE POLICY "Authenticated users can read holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert holidays
CREATE POLICY "Admins can insert holidays"
  ON holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can update holidays
CREATE POLICY "Admins can update holidays"
  ON holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can delete holidays
CREATE POLICY "Admins can delete holidays"
  ON holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
