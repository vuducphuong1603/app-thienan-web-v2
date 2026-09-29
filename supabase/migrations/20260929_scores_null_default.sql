-- B6: blank score = NULL ("chưa có điểm"). Backup first.
CREATE TABLE IF NOT EXISTS public.thieu_nhi_scores_backup_20260929 AS
  SELECT id, score_45_hk1, score_exam_hk1, score_45_hk2, score_exam_hk2, now() AS backed_up_at
  FROM public.thieu_nhi;
ALTER TABLE public.thieu_nhi_scores_backup_20260929 ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.thieu_nhi
  ALTER COLUMN score_45_hk1   SET DEFAULT NULL,
  ALTER COLUMN score_exam_hk1 SET DEFAULT NULL,
  ALTER COLUMN score_45_hk2   SET DEFAULT NULL,
  ALTER COLUMN score_exam_hk2 SET DEFAULT NULL;

UPDATE public.thieu_nhi SET score_45_hk1   = NULL WHERE score_45_hk1   = 0;
UPDATE public.thieu_nhi SET score_exam_hk1 = NULL WHERE score_exam_hk1 = 0;
UPDATE public.thieu_nhi SET score_45_hk2   = NULL WHERE score_45_hk2   = 0;
UPDATE public.thieu_nhi SET score_exam_hk2 = NULL WHERE score_exam_hk2 = 0;
