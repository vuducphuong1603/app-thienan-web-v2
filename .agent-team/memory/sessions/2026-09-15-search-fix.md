# 2026-09-15 — search-fix

## Mission & result
User complaint: "Danh bạ finds a thiếu nhi but the manual search in Quét QR điểm danh doesn't". Causes: QR modal searched the
DB with accented `ilike` + `.limit(50)` BEFORE a client "last-name only" filter (common names lost, unaccented input → 0, compound
given names like "Quỳnh Anh" not found); Danh bạ defaulted to "Tất cả trạng thái" so 132 INACTIVE kids looked active.
Result: DONE — vitest 16 files / 203 tests pass, `tsc --noEmit -p .` 0, eslint 0 errors, no `ilike` left in the modal. Not committed
(orchestrator commits).

## Changes (what + why)
- `src/lib/qr-attendance.ts`: new pure `filterManualStudents<T extends SearchableStudent>(students, text, classId?)` — whole manual
  search runs client-side. Old `matchesStudentSearch` / `studentSearchOrFilter` kept (tests still use them; modal no longer does).
- `src/components/QRScanAttendanceModal.tsx`: on open, loads ALL ACTIVE thieu_nhi once via `fetchAllRows` (paged 1000,
  `.order('full_name').order('id')`) into `allStudentsRef`; `runSearch` only filters the cache + queries `attendance_records` for the
  marked state. States: "Đang tải danh sách…" / "Không tải được danh sách, đóng và mở lại" / "Không tìm thấy…". Search typed before
  load re-runs when load finishes.
- `src/app/admin/management/students/page.tsx`: `filterStatus` default `'ACTIVE'`.
- `src/lib/queries.ts`: `fetchAllRows` now exported (no other change).
- `vitest.config.ts` (new): alias `@`→`./src` + `oxc.jsx.runtime: 'automatic'` — `npm test` was already red on HEAD (commit f94b2a7,
  report-title.test.ts imports a `.tsx` component via `@/`; Next's tsconfig `jsx: preserve` breaks Vite 8's transform).
- Tests: `src/lib/__tests__/qr-attendance.test.ts` (+core cases), `src/lib/__tests__/qr-attendance-qa.test.ts` (22 qa edge cases).

## Key decisions
- Match rules: every query word must hit (a) prefix of a name word except the first (surname), (c) saint_name / student_code /
  className contains, or (d) parent_phone contains the word — only when the word is all digits and ≥3 long; OR (b) the whole query
  is the trailing WORDS of the full name (`=== q || endsWith(' ' + q)`). Char-level suffix was rejected ("an" matched "Lan", "Toàn").
- Sorted by `full_name` localeCompare 'vi' before slicing to `manualSearchLimit` (200 with class / 20 without).
- Paging on a non-unique column must add `.order('id')` — prod has 57 duplicate-name groups; a 1000-row page boundary could drop kids.

## Defects found & fixed
- ui mapped `classes(name)` as an array (`classes?.[0]?.name`); PostgREST returns a many-to-one join as an OBJECT → class-name search
  silently empty. Now handles both shapes.
- Unstable paging order (qa MAJOR), silent "Không tìm thấy" on load error, needless eslint-disable — all fixed.
- Pre-existing red `npm test` (alias/JSX) — fixed with vitest.config.ts.

## Notes for the next session
- The mobile app (TN Thiên Ân) has its own manual search — not touched here.
- `.gitignore` had an uncommitted `+.gitnexus` line before this mission; not ours.
- The cache holds ~1330 rows per open and is NOT branch-scoped (same as the old DB search). Scope it if PĐT should only see their branch.
