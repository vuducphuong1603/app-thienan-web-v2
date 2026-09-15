# QA-REPORT — team search-fix

**Status: CLEAN** — 0 BLOCKER / 0 MAJOR open.
Final evidence (qa): `npx vitest run` → 16 files, 203 tests passed, 0 failed (incl. 22 qa tests in src/lib/__tests__/qr-attendance-qa.test.ts) · `npx tsc --noEmit -p .` rc=0 · eslint modal: only the pre-existing exhaustive-deps warning at line 152 (`schoolYear`), no disable added · `grep ilike QRScanAttendanceModal.tsx` → 0 lines (DoD #4) · `grep "useState<FilterStatus>('ACTIVE')"` → 1 line (DoD #5).

## Baseline (pre-tasking)
1. **BLOCKER** — `src/lib/__tests__/report-title.test.ts:2` — `@/` alias unresolved by Vitest (no vitest config), pre-existing from f94b2a7.
   Status: FIXED by lead (vitest.config.ts) — qa verified: 170 tests passed at that time.

## Part 1 — modal A2/A3, students B1, queries.ts, vitest.config.ts

2. **MAJOR** — `src/components/QRScanAttendanceModal.tsx:363-367` — cache load pages with `.order('full_name').range(from,to)` and NO secondary key.
   Postgres order on a non-unique column is not stable between separate range requests; with 1328 ACTIVE rows there is a page
   boundary at row 1000, and prod has 57 duplicate full_name groups (127 rows, checked via SQL). A duplicate name straddling the
   boundary can be dropped or duplicated in the cache → the exact "Danh bạ finds, QR search doesn't" symptom this mission fixes.
   The project already documents this pitfall at `src/lib/queries.ts:595` and uses `.order('full_name').order('id')`.
   Spec A2: "tải MỘT lần toàn bộ em ACTIVE bằng fetchAllRows" — must be complete. Fix: add `.order('id', { ascending: true })`.
   Status: FIXED by ui — qa verified `.order('full_name').order('id', { ascending: true })` at modal line 368-369.

3. **MINOR** — `src/components/QRScanAttendanceModal.tsx:384-388` — on fetch error the `.catch` marks `studentsLoaded=true` with an
   empty cache, so the UI shows "Không tìm thấy thiếu nhi nào" for every query instead of an error / retry hint. Misleading for
   the user (reproduces the original complaint on a flaky network). Suggest an error state text ("Không tải được danh sách, mở lại").
   Status: FIXED by ui — qa verified `studentsLoadError` state (line 88), set in catch (389), reset on open (352), rendered at 1040-1042; loading text now gated on `!studentsLoadError` (1044).

4. **MINOR** — `src/components/QRScanAttendanceModal.tsx:391` — new `eslint-disable-next-line react-hooks/exhaustive-deps` on the
   load effect. `runSearch` is a `useCallback([], …)` so adding it to deps is free; the disable is unnecessary. Spec only tolerated the
   pre-existing warning at ~146. Cosmetic.
   Status: FIXED by ui — qa verified deps are `[isOpen, runSearch]` (line 393), no disable comment; eslint shows only the pre-existing line-152 warning.

5. **MINOR (DoD #7)** — `git status` has 7 tracked modifications, not 4: also `src/lib/queries.ts` (export fetchAllRows, required by A2),
   `vitest.config.ts` (lead glue for #1), `.gitignore` (+.gitnexus, not from this team). Lead/orchestrator should acknowledge the
   extra 3 in DECISIONS.md so the commit scope is explicit.
   Status: CLOSED — lead recorded commit scope in DECISIONS.md (5 src files + vitest.config.ts + qa test; .gitignore left to orchestrator).

### Verified OK (Part 1)
- A2 read-once: `thieu_nhi` is read only in the `[isOpen]` effect (line 347-392); `runSearch` calls `filterManualStudents` on the
  ref cache and only queries `attendance_records` for marked-state (lines 314-329). No DB search per keystroke.
- A3: no `classes` ilike lookup; className comes from the `classes(name)` join, both object and array shapes handled (line 378).
- Loading state: "Đang tải danh sách…" gated on `!studentsLoaded` (line 1039); "Không tìm thấy" gated on `studentsLoaded` (1043).
- Typed-before-load: timer returns early while `!studentsLoadedRef` (line 311); load completion re-runs
  `runSearch(searchQueryRef.current, filterClassRef.current)` (line 382). `searchQueryRef` is refreshed every render (line 93).
- Close/reopen race: effect cleanup sets `cancelled`, reopen resets `studentsLoadedRef/allStudentsRef/studentsLoaded` before
  refetch (lines 349-352); stale resolve is discarded (line 371).
- History / toast / X / check paths (handleManualAttendance 405+, reset block 623-655) untouched by the diff.
- B1: only line 51 changed; dropdown still offers all / ACTIVE / INACTIVE (lines 312-333).
- queries.ts: export-only change; fetchAllRows body unchanged (callers useGLVClassTrend/useClassStats/useStudentsWithDetails unaffected).
- vitest.config.ts: alias + oxc jsx automatic; tsc/eslint unaffected.

## Part 2 — filterManualStudents (src/lib/qr-attendance.ts:164-195) — reviewed vs SPEC A1
Verified OK, no findings:
- normalizeSearchText on both query words and data (line 170, 178, 183) → không dấu / có dấu / NFD / đ-Đ all match (qa tests).
- (a) prefix on any name word except the first: `.slice(1)` + `startsWith` (181, 187). "tran" → [] confirmed.
- (b) whole query as name suffix with word boundary: `=== q || endsWith(' '+q)` (179). "an" no longer matches "Toan" (qa test).
- (c) saint/code/className `includes` (182-188); (d) phone only for all-digit words ≥3 via `/^\d{3,}$/` (189) — narrower than the spec wording ("chứa chuỗi số ≥3 số") but lead-approved; "091-234" and "0912abc" do not phone-match (documented in qa tests).
- classId filter incl. whitespace-only text → whole class (175-176); sort localeCompare 'vi' BEFORE slice so the limit keeps the alphabetically-first N (193-194); manualSearchLimit unchanged (200/20).
- Null saint/code/phone/className, empty full_name, regex metacharacters, emoji/CJK: no throw (qa tests). Input array not mutated.
- Old `matchesStudentSearch` / `studentSearchOrFilter` kept; their tests still green.
- Prod data check (SQL, read-only): 0 names with double spaces / untrimmed / single-word / empty / NFD, 0 non-digit parent_phone → the theoretical rule-(b) gap with double-spaced names is not reachable with current data; noted only.
Observation (INFO, no action): `qr-attendance.test.ts:373` was red mid-flight at Part 1 time; green after core's fix.

## QA test file
`src/lib/__tests__/qr-attendance-qa.test.ts` — 22 tests: đ/Đ (5 spellings), NFD data↔NFC query both directions, extra spaces/tab/newline, uppercase across name/saint/code/class, word-order independence, suffix word boundary, classId with whitespace text / unknown class / null class_id, single-word surname, null fields, empty name, phone digit rules, regex chars, no mutation, sort-before-limit (30 → first 20 by name), emoji/CJK.
