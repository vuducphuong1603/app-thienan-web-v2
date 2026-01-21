-- Create attendance_records table for detailed attendance tracking
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES thieu_nhi(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES school_years(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  day_type VARCHAR(10) NOT NULL CHECK (day_type IN ('thu5', 'cn')), -- thu5 = Thursday, cn = Sunday
  status VARCHAR(10) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  check_in_time TIME,
  check_in_method VARCHAR(20) DEFAULT 'manual', -- manual, qr_scan
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique attendance record per student per date per day_type
  UNIQUE(student_id, attendance_date, day_type)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_day_type ON attendance_records(day_type);
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_year_id ON attendance_records(school_year_id);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance_records
CREATE POLICY "Allow authenticated users to read attendance_records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert attendance_records"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update attendance_records"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete attendance_records"
  ON attendance_records FOR DELETE
  TO authenticated
  USING (true);

-- Function to update thieu_nhi attendance counts
CREATE OR REPLACE FUNCTION update_thieu_nhi_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update attendance_thu5 count
  UPDATE thieu_nhi
  SET
    attendance_thu5 = (
      SELECT COUNT(*) FROM attendance_records
      WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND day_type = 'thu5'
      AND status = 'present'
    ),
    attendance_cn = (
      SELECT COUNT(*) FROM attendance_records
      WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND day_type = 'cn'
      AND status = 'present'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.student_id, OLD.student_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update counts when attendance records change
DROP TRIGGER IF EXISTS trigger_update_attendance_counts ON attendance_records;
CREATE TRIGGER trigger_update_attendance_counts
AFTER INSERT OR UPDATE OR DELETE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION update_thieu_nhi_attendance_counts();

-- Add comment for documentation
COMMENT ON TABLE attendance_records IS 'Detailed attendance records for each student per session';
COMMENT ON COLUMN attendance_records.day_type IS 'thu5 = Thursday session, cn = Sunday session';
COMMENT ON COLUMN attendance_records.check_in_method IS 'manual = marked by teacher, qr_scan = scanned QR code';
