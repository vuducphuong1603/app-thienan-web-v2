-- Đăng ký làm lại thẻ thiếu nhi: lưu lịch sử trong app + trạng thái đồng bộ lên Google Sheet
-- (Sheet "Danh sách làm lại thẻ", tab "Làm Thẻ").

CREATE TABLE IF NOT EXISTS card_reissue_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES thieu_nhi(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  class_name text,
  school_year_id uuid REFERENCES school_years(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name text NOT NULL,
  note text,
  sheet_row integer,
  sheet_status text NOT NULL DEFAULT 'pending' CHECK (sheet_status IN ('pending', 'synced', 'failed')),
  sheet_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_reissue_requests_student_idx ON card_reissue_requests (student_id);
CREATE INDEX IF NOT EXISTS card_reissue_requests_class_year_idx ON card_reissue_requests (class_id, school_year_id);

ALTER TABLE card_reissue_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_reissue_select_authenticated" ON card_reissue_requests;
CREATE POLICY "card_reissue_select_authenticated" ON card_reissue_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "card_reissue_insert_authenticated" ON card_reissue_requests;
CREATE POLICY "card_reissue_insert_authenticated" ON card_reissue_requests
  FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS "card_reissue_update_own" ON card_reissue_requests;
CREATE POLICY "card_reissue_update_own" ON card_reissue_requests
  FOR UPDATE TO authenticated USING (requested_by = auth.uid()) WITH CHECK (requested_by = auth.uid());
