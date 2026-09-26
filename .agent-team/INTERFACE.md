# INTERFACE — priest-absent (Báo cáo cho Cha: Nghỉ = số em vắng trọn kỳ + cảnh báo 2 tháng)

## A. `src/lib/priest-report.ts` (owner: core) — pure, no Supabase/React imports
```ts
export type PriestAttendanceType = 'all' | 'thu5' | 'cn'

export function monthRange(year: number, monthIndex0: number): { from: string; to: string }   // local YYYY-MM-DD, no toISOString
export function previousMonth(year: number, monthIndex0: number): { year: number; monthIndex0: number }

// true if record's day_type belongs to the selected type ('all' = thu5/cn/cn_le; 'cn' = cn|cn_le)
export function matchesAttendanceType(dayType: string, type: PriestAttendanceType): boolean

// Set of student_id having >= 1 record with status==='present' AND matching type (raw records, NO mergeSundayRecords)
export function presentStudentIds(
  records: { student_id: string; status: string; day_type: string }[],
  type: PriestAttendanceType
): Set<string>

export interface PriestStudent {
  id: string; saint_name: string | null; full_name: string; class_id: string | null
  parent_phone: string | null; parent_phone_2: string | null
}

// Map class_id -> number of students (from list) whose id NOT in presentIds
export function countFullyAbsentByClass(students: PriestStudent[], presentIds: Set<string>): Map<string, number>

export interface PriestAbsentWarning {
  studentId: string; saintName: string; fullName: string; className: string; parentPhones: string[]
}
// Students absent from BOTH presentCurrent and presentPrevious. parentPhones: trimmed, empty/dup removed.
// Sorted by class display_order (classes list), then full_name (vi locale compare). Students whose class not in classes → last.
export function buildAbsentWarnings(
  students: PriestStudent[],
  classes: { id: string; name: string; display_order: number | null }[],
  presentCurrent: Set<string>,
  presentPrevious: Set<string>
): PriestAbsentWarning[]

// Count valid attendance days (Thursdays/Sundays per type) in [from,to] excluding holidayDates; local-date safe.
export function countAttendanceDays(from: string, to: string, type: PriestAttendanceType, holidayDates: Set<string>): number
```

## B. Types in `src/components/PriestReportTemplate.tsx` (owner: ui)
Existing `PriestReportClassData.absentCount` / `PriestReportBranchData.totalAbsent` / `PriestReportData.grandTotalAbsent`
KEEP their names but now mean "số em vắng trọn kỳ". Add to `PriestReportData`:
```ts
  absentWarning?: {
    prevLabel: string        // e.g. "Tháng 8/2026"
    currentLabel: string     // e.g. "Tháng 9/2026"
    students: PriestAbsentWarning[]   // import type from '@/lib/priest-report'
  } | null                   // null/undefined = not month mode or a month had 0 valid days → section hidden
```

## C. page.tsx ownership (sequential, never concurrent)
1. core: `generatePriestReport` only (fills absentCount/totalAbsent/grandTotalAbsent + absentWarning).
2. ui (after core lands): Priest Report Result Section JSX + `handlePriestExportExcel` (sheet 2 "Canh bao").
