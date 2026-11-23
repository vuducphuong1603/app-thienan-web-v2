-- Xét đi trễ Chủ nhật: CHỈ ADMIN được sửa tay Trễ ↔ Đúng giờ (2026-11-23).
--
-- Trước đây mọi tài khoản đang hoạt động (GLV, phân đoàn trưởng) đều UPDATE is_late được.
-- Nay trigger bỏ qua thay đổi is_late nếu người gọi đã đăng nhập mà không phải admin
-- (giữ giá trị cũ, không báo lỗi) → áp dụng cho mọi client, kể cả app mobile bản cũ.
-- Việc tự xét lúc ghi "có mặt" giữ nguyên như migration 20261123_sunday_late_attendance.

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
      IF NEW.is_late IS DISTINCT FROM OLD.is_late
         AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        -- Người dùng không phải admin: KHÔNG được sửa tay → giữ nguyên, không báo lỗi
        -- (client đọc lại is_late sẽ thấy giá trị không đổi; việc điểm danh không bị chặn).
        NEW.is_late := OLD.is_late;
        NEW.late_edited_by := OLD.late_edited_by;
        NEW.late_edited_at := OLD.late_edited_at;
      ELSIF NEW.is_late IS DISTINCT FROM OLD.is_late THEN
        -- Admin (hoặc thao tác hệ thống không có phiên đăng nhập) sửa tay Trễ ↔ Đúng giờ: ghi lại ai sửa, lúc nào
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
