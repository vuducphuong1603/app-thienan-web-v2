-- Điểm danh Chủ nhật: xét ĐI TRỄ theo khung giờ "đúng giờ" do admin cài đặt (2026-11-23).
--
-- Quy tắc (chỉ buổi Chủ nhật: 'cn' = học giáo lý, 'cn_le' = đi lễ):
--   * Admin cài bao nhiêu khung giờ tuỳ ý cho mỗi buổi (bảng attendance_time_windows).
--   * Lượt "có mặt" có giờ điểm danh (check_in_time, so theo PHÚT, tính cả 2 đầu mút) nằm trong
--     MỘT khung giờ bất kỳ của buổi đó → đúng giờ (is_late = false); ngoài mọi khung → trễ (true).
--   * Không xét (is_late = NULL): buổi chưa cài khung giờ nào; nhập bù cho ngày khác hôm nay
--     (giờ bấm không phải giờ em đến); bản ghi vắng; Thứ 5; điểm danh bù.
--   * Chỉ xét MỘT lần, lúc em được ghi "có mặt". Ghi đè "có mặt" lần nữa không xét lại, nên đổi
--     khung giờ về sau không làm thay đổi lịch sử.
--   * GLV/admin sửa tay được Trễ ↔ Đúng giờ (UPDATE is_late); DB tự ghi ai sửa, lúc nào.
-- Xét ở DB (trigger) nên áp dụng cho mọi client: web, app mobile kể cả bản cũ chưa cập nhật.

-- 1. Khung giờ "đúng giờ" theo buổi
CREATE TABLE IF NOT EXISTS public.attendance_time_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type varchar(10) NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_time_windows_session_check CHECK (session_type IN ('cn', 'cn_le')),
  CONSTRAINT attendance_time_windows_range_check CHECK (end_time > start_time),
  CONSTRAINT attendance_time_windows_unique UNIQUE (session_type, start_time, end_time)
);

COMMENT ON TABLE public.attendance_time_windows IS
  'Khung giờ điểm danh ĐÚNG GIỜ ngày Chủ nhật. session_type: cn = học giáo lý, cn_le = đi lễ. Ngoài mọi khung của buổi = trễ.';

ALTER TABLE public.attendance_time_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_time_windows FROM anon;

DROP POLICY IF EXISTS attendance_time_windows_select_active_member ON public.attendance_time_windows;
CREATE POLICY attendance_time_windows_select_active_member
  ON public.attendance_time_windows FOR SELECT TO authenticated
  USING (public.is_active_member());

DROP POLICY IF EXISTS attendance_time_windows_insert_admin ON public.attendance_time_windows;
CREATE POLICY attendance_time_windows_insert_admin
  ON public.attendance_time_windows FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS attendance_time_windows_update_admin ON public.attendance_time_windows;
CREATE POLICY attendance_time_windows_update_admin
  ON public.attendance_time_windows FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS attendance_time_windows_delete_admin ON public.attendance_time_windows;
CREATE POLICY attendance_time_windows_delete_admin
  ON public.attendance_time_windows FOR DELETE TO authenticated
  USING (public.is_admin());

DROP TRIGGER IF EXISTS trg_attendance_time_windows_updated_at ON public.attendance_time_windows;
CREATE TRIGGER trg_attendance_time_windows_updated_at
  BEFORE UPDATE ON public.attendance_time_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Kết quả xét trễ trên bản ghi điểm danh (NULL = không xét)
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS is_late boolean,
  ADD COLUMN IF NOT EXISTS late_edited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS late_edited_at timestamptz;

COMMENT ON COLUMN public.attendance_records.is_late IS
  'Chủ nhật: true = đi trễ, false = đúng giờ, NULL = không xét. Trigger trg_set_attendance_lateness tự tính lúc ghi có mặt; GLV/admin sửa tay được.';
COMMENT ON COLUMN public.attendance_records.late_edited_by IS 'Người sửa tay is_late lần gần nhất (trigger tự ghi).';
COMMENT ON COLUMN public.attendance_records.late_edited_at IS 'Thời điểm sửa tay is_late lần gần nhất (trigger tự ghi).';

-- 3. Hàm xét trễ thuần: giờ p_time của buổi p_session có nằm ngoài mọi khung giờ không
--    NULL khi buổi chưa cài khung giờ nào (hoặc thiếu giờ).
CREATE OR REPLACE FUNCTION public.attendance_is_late(p_session text, p_time time)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_time IS NULL OR count(*) = 0 THEN NULL
    ELSE NOT bool_or(
      floor(extract(epoch FROM p_time) / 60)
        BETWEEN floor(extract(epoch FROM w.start_time) / 60)
            AND floor(extract(epoch FROM w.end_time) / 60)
    )
  END
  FROM public.attendance_time_windows w
  WHERE w.session_type = p_session;
$$;

REVOKE EXECUTE ON FUNCTION public.attendance_is_late(text, time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_is_late(text, time) TO authenticated, service_role;

-- 4. Trigger tự xét trễ khi ghi điểm danh
CREATE OR REPLACE FUNCTION public.set_attendance_lateness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_now_vn timestamp := now() AT TIME ZONE 'Asia/Ho_Chi_Minh';
BEGIN
  BEGIN
    -- Chỉ xét buổi Chủ nhật, bản ghi "có mặt", không phải điểm danh bù
    IF NEW.day_type NOT IN ('cn', 'cn_le')
       OR NEW.status IS DISTINCT FROM 'present'
       OR COALESCE(NEW.is_compensatory, false) THEN
      NEW.is_late := NULL;
      NEW.late_edited_by := NULL;
      NEW.late_edited_at := NULL;
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'present' THEN
      -- Em đã có mặt từ trước: KHÔNG tự xét lại (giữ kết quả lần đầu / kết quả sửa tay).
      IF NEW.is_late IS DISTINCT FROM OLD.is_late THEN
        -- Sửa tay Trễ ↔ Đúng giờ: ghi lại ai sửa, lúc nào
        NEW.late_edited_by := (SELECT u.id FROM public.users u WHERE u.id = auth.uid());
        NEW.late_edited_at := now();
      ELSE
        NEW.late_edited_by := OLD.late_edited_by;
        NEW.late_edited_at := OLD.late_edited_at;
      END IF;
      RETURN NEW;
    END IF;

    -- Lượt "có mặt" mới (INSERT, hoặc vắng → có mặt): tự xét theo giờ bấm
    NEW.late_edited_by := NULL;
    NEW.late_edited_at := NULL;
    IF NEW.attendance_date IS DISTINCT FROM v_now_vn::date THEN
      NEW.is_late := NULL; -- nhập bù cho ngày khác: giờ bấm không phải giờ em đến
    ELSE
      NEW.is_late := public.attendance_is_late(
        NEW.day_type,
        COALESCE(NEW.check_in_time, v_now_vn::time)
      );
    END IF;
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Không bao giờ chặn việc điểm danh vì lỗi xét trễ
    RETURN NEW;
  END;
END;
$$;

-- Tên trigger xếp SAU trg_normalize_attendance_date (chạy theo thứ tự tên) → xét trên ngày đã chuẩn hoá.
DROP TRIGGER IF EXISTS trg_set_attendance_lateness ON public.attendance_records;
CREATE TRIGGER trg_set_attendance_lateness
  BEFORE INSERT OR UPDATE OF status, day_type, is_compensatory, is_late, late_edited_by, late_edited_at
  ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_attendance_lateness();

NOTIFY pgrst, 'reload schema';
