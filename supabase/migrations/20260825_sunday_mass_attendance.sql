-- Tách điểm danh Chủ nhật thành 2 buổi: học giáo lý ('cn') và đi lễ ('cn_le').
-- Điểm Chủ nhật: mỗi buổi = 0.5, đủ cả 2 = 1 buổi. attendance_cn = (số cn + số cn_le) / 2.

-- 1. Cho phép day_type = 'cn_le'
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_day_type_check;
ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_day_type_check
  CHECK (day_type IN ('thu5', 'cn', 'cn_le'));

-- 2. Cập nhật hàm đếm (hiện KHÔNG gắn trigger trên DB thật, chỉ giữ đồng bộ công thức)
CREATE OR REPLACE FUNCTION update_thieu_nhi_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
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
      SELECT COUNT(*)::numeric / 2 FROM attendance_records
      WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND day_type IN ('cn', 'cn_le')
      AND (is_compensatory IS NULL OR is_compensatory = FALSE)
      AND status = 'present'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.student_id, OLD.student_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill: mọi bản ghi Chủ nhật cũ (trước khi tách buổi) được coi là đi đủ cả 2
--    → nhân bản thêm bản ghi 'cn_le' để giữ nguyên điểm.
INSERT INTO attendance_records
  (student_id, class_id, school_year_id, attendance_date, day_type, status,
   check_in_time, check_in_method, notes, created_by, created_at, updated_at)
SELECT
  r.student_id, r.class_id, r.school_year_id, r.attendance_date, 'cn_le', r.status,
  r.check_in_time, r.check_in_method,
  'Tự động bổ sung khi tách buổi đi lễ (dữ liệu trước 2026-08-25)',
  r.created_by, r.created_at, r.updated_at
FROM attendance_records r
WHERE r.day_type = 'cn'
  AND r.attendance_date < '2026-08-23' -- chỉ dữ liệu trước ngày tách buổi
  AND NOT EXISTS (
    SELECT 1 FROM attendance_records x
    WHERE x.student_id = r.student_id
      AND x.attendance_date = r.attendance_date
      AND x.day_type = 'cn_le'
  );

-- 4. KHÔNG tính lại hàng loạt attendance_cn/attendance_thu5: trên DB thật trigger
--    trigger_update_attendance_counts chưa từng được bật, số buổi do client cập nhật
--    (src/lib/attendance-count.ts). Backfill ở bước 3 giữ nguyên giá trị (cn + cn_le)/2 = cn cũ.
