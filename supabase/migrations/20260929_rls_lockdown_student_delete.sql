ALTER TABLE public.staging_tn_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_backup_20260828 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_backup_20260927 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thieu_nhi_attcn_backup_20260927 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS thieu_nhi_delete_staff ON public.thieu_nhi;
CREATE POLICY thieu_nhi_delete_admin ON public.thieu_nhi FOR DELETE TO authenticated USING (public.is_admin());
