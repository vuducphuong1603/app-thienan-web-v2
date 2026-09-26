# QA-REPORT — mission priest-absent (2026-09-26, qa)

## Verdict: CLEAN — 0 BLOCKER, 0 MAJOR, 4 MINOR (non-blocking, lead decides)

Evidence (executed by qa):
- `npx vitest run` → 20 files, **280 passed** (248 before qa + 32 in `src/lib/__tests__/priest-report-qa.test.ts`)
- `npx tsc --noEmit -p .` → exit 0
- `npx eslint <4 spec files + qa test>` → 0 errors (10 warnings, all pre-existing: unused SchoolYear, `<img>`, hook deps)
- `git status src/` → only page.tsx, PriestReportTemplate.tsx (M) + priest-report.ts, 2 tests (new). No other src file touched.
- Prod DB (read-only count): 1342 ACTIVE thieu_nhi, 0 with null class, 0 in INACTIVE class, 0 with missing class.

## DoD walk-through
| # | Check | Result |
|---|---|---|
| 1 | npm test ≥ 240 | 280 pass ✅ |
| 2 | Coverage list | monthRange 9/2026 + Feb leap + Dec; previousMonth Jan→Dec; 1 buổi → không nghỉ; chỉ lễ CN → không nghỉ; vắng T1+T2 → cảnh báo; vắng T1 đi T2 / đi T1 vắng T2 → không; SĐT rỗng/trùng; sắp lớp rồi tên — all present in `priest-report.test.ts` ✅ |
| 3 | tsc | 0 ✅ |
| 4 | eslint | 0 errors ✅ |
| 5 | diff scope | page.tsx hunks only in import block, `generatePriestReport` (2043–2280), `handlePriestExportExcel` (2369–2384), preview JSX (4591, 4677–4727) ✅ |
| 6 | Semantics | Nghỉ = `absentByClass` per class (page.tsx:2228), branch/grand totals sum it (2246, 2268); Đi/rate unchanged: still `mergeSundayRecords` + present count (2165–2172); warning month-only (2192), in template image (Template.tsx:167), preview (page.tsx:4682), Excel sheet 2 'Canh bao' (2384) ✅ |

Spec items verified line by line:
- §1 monthRange local-date (priest-report.ts:57–63), previousMonth (65–70) — no `toISOString` anywhere in the new lib. Month mode uses it (page.tsx:2059). ✅
- §2 present = raw record `status==='present'` + type match by `student_id`, no class filter, no merge (priest-report.ts:81–93; page.tsx:2164). cn_le-only counts for 'cn' and 'all'. ✅
- §3 note line under table in template (Template.tsx:164) and preview (page.tsx:4679); stat card relabelled "Số em nghỉ cả kỳ" (4594). ✅
- §4 gating: current days>0 AND prev days>0 AND prev has ≥1 present (page.tsx:2203 — lead decision in DECISIONS.md). Empty list → template hides section (Template.tsx:167), preview shows "Không có em nào…" (4722), Excel writes the same line in sheet 2. ✅
- §5 `fetchAllRows` + `.order('id')` for students (2088–2095) and both attendance ranges (2141–2158). ✅
- 'Đi' regression: old `.in('class_id', classIds)` pre-filter replaced by post-merge `activeClassIds.has(record.class_id)` (2166) — same set for the counted rows. ✅

## Findings (all MINOR — no fix required for DoD)

1. **MINOR** (core) `src/app/admin/activities/page.tsx:2207` — `buildAbsentWarnings(students, …)` receives ALL ACTIVE students, not just those in ACTIVE classes. A student with `class_id = null` or in an INACTIVE class would appear in the warning list with an empty "Lớp" cell while not being counted in any row of the table (`countFullyAbsentByClass` skips null class; table iterates `allClasses` only). Prod today has 0 such rows (verified), so latent. Suggested: filter `students` by `activeClassIds` before building warnings, or accept as-is.
2. **MINOR** (core) `src/lib/priest-report.ts:138` — tie-break sorts by `full_name` (surname first, `localeCompare 'vi'`), whereas the rest of this page sorts students by given name (`compareByGivenName` in `src/lib/student-sort.ts`, imported in page.tsx:6). SPEC §1 only says "rồi tên"; if the user expects the app-wide given-name order, switch to `compareByGivenName`. Behaviour is deterministic and tested either way.
3. **MINOR** (ui) `src/app/admin/activities/page.tsx:2373` — Excel sheet "Canh bao" splits "Tên thánh" and "Họ tên" into two columns; SPEC §4 lists one column "Tên thánh + Họ tên" (template and preview follow the spec). Two columns are arguably more useful in Excel; flagging only as a spec deviation.
4. **MINOR** (core, perf) `src/app/admin/activities/page.tsx:2141–2158` — attendance queries dropped the `.in('class_id', classIds)` filter (needed so transferred students match by `student_id`), so present rows from INACTIVE classes are also downloaded, and month mode now downloads a second month. Rows are `status='present'` only (~1 page per 1000 present marks); acceptable, just noting the extra round trips.

Info (no action): preview warning is gated on the live `priestTimeFilterMode` state (page.tsx:4682); changing the mode selector after generating hides the section until "Tạo báo cáo" is pressed again. Image/Excel use `priestReportData` and are unaffected.

## QA tests added (`src/lib/__tests__/priest-report-qa.test.ts`, 32 tests, all green)
Non-leap Feb, year 2100, Jan→Dec chain, all 12 months no UTC shift, invalid month index throws; 'thu5' ignores cn/cn_le, 'cn' ignores thu5, status case-sensitive (PRESENT/late/excused), empty/unknown day_type; countFullyAbsentByClass empty/all-present/ghost id/null class/1500 students; warnings with null class, phones equal modulo whitespace, inner-space phones not merged (documented), whitespace-only phones, phone_2 only, null saint_name, cn_le-only previous month clears warning, null display_order ordering, Vietnamese diacritic order, input not mutated; countAttendanceDays all-Thursday holidays → 0, Thursday holiday doesn't affect cn, single-day range, Dec→Jan boundary, full school year 43/43, malformed/impossible dates throw.
