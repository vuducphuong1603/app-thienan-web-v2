-- Chuyển lớp thì điểm danh năm học hiện tại đi theo lớp mới.
-- Báo cáo / trang chủ / biểu đồ lọc attendance_records theo class_id, còn
-- class_id được ghi theo lớp của em tại lúc quét. Em đổi lớp giữa năm thì
-- các buổi đã đi bị "mất" khỏi báo cáo lớp mới (vd em chuyển 3B -> 3E).
-- Năm học cũ giữ nguyên lớp cũ.
CREATE OR REPLACE FUNCTION public.sync_attendance_class_on_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.attendance_records a
     SET class_id = NEW.class_id,
         updated_at = now()
    FROM public.school_years sy
   WHERE a.student_id = NEW.id
     AND a.school_year_id = sy.id
     AND sy.is_current
     AND a.class_id IS DISTINCT FROM NEW.class_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_class_on_transfer ON public.thieu_nhi;
CREATE TRIGGER trg_sync_attendance_class_on_transfer
  AFTER UPDATE OF class_id ON public.thieu_nhi
  FOR EACH ROW
  WHEN (NEW.class_id IS NOT NULL AND NEW.class_id IS DISTINCT FROM OLD.class_id)
  EXECUTE FUNCTION public.sync_attendance_class_on_transfer();

-- Chỉ dùng làm trigger, không mở qua /rest/v1/rpc
REVOKE EXECUTE ON FUNCTION public.sync_attendance_class_on_transfer() FROM PUBLIC, anon, authenticated;
