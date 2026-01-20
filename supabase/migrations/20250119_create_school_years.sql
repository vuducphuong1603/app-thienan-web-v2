-- Create school_years table
CREATE TABLE IF NOT EXISTS school_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(20) NOT NULL, -- e.g., "2025 - 2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  parish_name VARCHAR(255) DEFAULT 'Giáo xứ Thiên Ân',
  total_weeks INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_school_years_is_current ON school_years(is_current);
CREATE INDEX IF NOT EXISTS idx_school_years_status ON school_years(status);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_school_years_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_school_years_updated_at
  BEFORE UPDATE ON school_years
  FOR EACH ROW
  EXECUTE FUNCTION update_school_years_updated_at();

-- Ensure only one school year can be current at a time
CREATE OR REPLACE FUNCTION ensure_single_current_school_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE school_years SET is_current = FALSE WHERE id != NEW.id AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_school_year
  BEFORE INSERT OR UPDATE ON school_years
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_school_year();

-- Function to calculate total weeks between two dates
CREATE OR REPLACE FUNCTION calculate_total_weeks(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL((end_date - start_date) / 7.0)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate total_weeks
CREATE OR REPLACE FUNCTION auto_calculate_total_weeks()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_weeks = calculate_total_weeks(NEW.start_date, NEW.end_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_total_weeks
  BEFORE INSERT OR UPDATE ON school_years
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_total_weeks();

-- Insert default school year (2025-2026)
INSERT INTO school_years (name, start_date, end_date, is_current, parish_name)
VALUES ('2025 - 2026', '2025-09-14', '2026-05-31', TRUE, 'Giáo xứ Thiên Ân')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON school_years
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for admin users" ON school_years
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
