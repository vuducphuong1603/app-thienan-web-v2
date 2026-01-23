-- Add compensatory attendance fields to attendance_records table
-- This allows students to make up their Thursday attendance on other days (Mon-Wed, Fri-Sat)
-- Each week, a student can only make up ONCE for the Thursday of that week

-- Add is_compensatory column to mark if this is a make-up attendance
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS is_compensatory BOOLEAN DEFAULT FALSE;

-- Add compensated_for_date to track which Thursday this attendance compensates for
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS compensated_for_date DATE;

-- Add index for faster queries on compensatory attendance
CREATE INDEX IF NOT EXISTS idx_attendance_records_compensatory
ON attendance_records(is_compensatory)
WHERE is_compensatory = TRUE;

CREATE INDEX IF NOT EXISTS idx_attendance_records_compensated_date
ON attendance_records(compensated_for_date)
WHERE compensated_for_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN attendance_records.is_compensatory IS 'TRUE if this is a make-up attendance for a missed Thursday';
COMMENT ON COLUMN attendance_records.compensated_for_date IS 'The Thursday date that this make-up attendance compensates for';

-- Update the trigger function to handle compensatory attendance
-- Compensatory attendance should count towards attendance_thu5
CREATE OR REPLACE FUNCTION update_thieu_nhi_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update attendance_thu5 count (includes both regular and compensatory attendance)
  UPDATE thieu_nhi
  SET
    attendance_thu5 = (
      SELECT COUNT(*) FROM attendance_records
      WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND (
        (day_type = 'thu5' AND (is_compensatory IS NULL OR is_compensatory = FALSE))
        OR (is_compensatory = TRUE)
      )
      AND status = 'present'
    ),
    attendance_cn = (
      SELECT COUNT(*) FROM attendance_records
      WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND day_type = 'cn'
      AND (is_compensatory IS NULL OR is_compensatory = FALSE)
      AND status = 'present'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.student_id, OLD.student_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, just updating the function is enough
