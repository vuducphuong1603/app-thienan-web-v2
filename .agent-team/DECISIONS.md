- [lead] fetchAllRows in src/lib/queries.ts gets `export` (only change) so the modal can page >1000 ACTIVE rows as SPEC A2 requires → git status will show 5 src files, not 4 (DoD 7 intent kept: no behaviour change in queries.ts).
- [lead] filterManualStudents is generic <T extends SearchableStudent> and returns the input objects; ownership: core = qr-attendance.ts + test, ui = modal + students page + queries.ts export.
- [lead] Added vitest.config.ts (resolve.alias '@'→./src) — pre-existing npm test fail from f94b2a7 (report-title.test.ts + ReportExportTemplate use '@/'); 6th file in git status, glue only.
- [lead] Commit scope (QA #5): src = qr-attendance.ts + test, QRScanAttendanceModal.tsx, students/page.tsx, queries.ts (export), vitest.config.ts (glue), + qa's qr-attendance-qa.test.ts if added. .gitignore change is pre-existing (not this team) — orchestrator decides.

## Mission priest-absent (2026-09-26)
- [lead] absentCount/totalAbsent/grandTotalAbsent keep names, meaning becomes 'số em vắng trọn kỳ'; warning carried as PriestReportData.absentWarning (see INTERFACE.md).
- [lead] page.tsx edited sequentially: core (generatePriestReport) first, then ui (preview JSX + Excel).
- [lead] Warning also requires previous month to have >=1 present record of the selected type (guards summer/no-session months, e.g. Sep report vs Aug with no classes → otherwise everyone flagged). Holidays for previous month queried by date range only (may belong to prior school year).
- [lead] QA minors: #2 warning tie-break → compareByGivenName (app-wide given-name order, 'tên' = tên gọi); #1 warnings only for students in ACTIVE classes (filter in page). #3 Excel sheet 2 keeps separate Tên thánh / Họ tên columns (more useful in Excel). #4 extra rows accepted (needed for student_id matching).
- [lead] ORCH-REVIEW r1: warning also requires previous month to overlap the school year of the report month (monthOverlapsSchoolYear); SY chosen = schoolYears entry overlapping the current month range, fallback current schoolYear; none → no warning.
