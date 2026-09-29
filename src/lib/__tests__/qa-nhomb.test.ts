// QA (team nhomb) — adversarial edge tests for the group B shared helpers.
// `it.fails` marks a CONFIRMED defect (see .agent-team/QA-REPORT.md); it turns red once the defect is fixed.
import { describe, expect, it } from 'vitest'
import {
  countReportCells,
  reportCellStatus,
  reportTotalAttendance,
  REPORT_CELL_SYMBOL,
} from '../report-cell'
import {
  attendanceScores,
  effectiveSessionDays,
  fmtScore,
  ketQua,
  round2,
  scoreSummary,
  tbHK,
  tbNam,
  xepLoai,
} from '../score-summary'
import {
  activeConditions,
  evaluateCondition,
  RULE_CONDITION_DEFS,
  validateRuleConditions,
  type RuleCondition,
  type RuleStudentData,
} from '../rule-conditions'
import { branchRecipientIds, chunk, NOTIFICATION_BATCH_SIZE } from '../notification-recipients'
import { sundayFullyPresentIds } from '../sunday-attendance'
import {
  buildAttendanceExcelColumns,
  buildAttendanceWorkbook,
  buildRowFormulas,
  buildScoreColumns,
  buildScoreReportWorkbook,
  mergeReportDates,
  type ScoreColumnSelection,
  type ScoreReportStudent,
} from '../score-report-excel'

const cell = (over: Partial<Parameters<typeof reportCellStatus>[0]> = {}) =>
  reportCellStatus({
    record: undefined,
    date: '2026-09-20',
    today: '2026-09-29',
    isHoliday: false,
    classHasAnyRecord: true,
    ...over,
  })

describe('QA B1/B2 report-cell', () => {
  it('holiday wins over every record value', () => {
    expect(cell({ isHoliday: true, record: 'present' })).toBe('holiday')
    expect(cell({ isHoliday: true, record: 'absent' })).toBe('holiday')
    expect(cell({ isHoliday: true, classHasAnyRecord: false })).toBe('holiday')
  })

  it('a recorded status is never downgraded to unmarked, even today/future', () => {
    expect(cell({ record: 'present', date: '2026-09-29' })).toBe('present')
    expect(cell({ record: 'absent', date: '2026-10-04' })).toBe('absent')
    expect(cell({ record: 'present', classHasAnyRecord: false })).toBe('present')
  })

  it('today itself counts as not-yet-marked, yesterday as absent', () => {
    expect(cell({ date: '2026-09-29' })).toBe('unmarked')
    expect(cell({ date: '2026-09-28' })).toBe('absent')
    expect(cell({ date: '2026-09-28', classHasAnyRecord: false })).toBe('unmarked')
  })

  it('compares dates across month/year boundaries as strings', () => {
    expect(cell({ date: '2025-12-31', today: '2026-01-01' })).toBe('absent')
    expect(cell({ date: '2026-01-01', today: '2025-12-31' })).toBe('unmarked')
    expect(cell({ date: '2026-10-01', today: '2026-09-30' })).toBe('unmarked')
  })

  it('non-present recorded statuses (late, excused, unknown) render as absent', () => {
    for (const record of ['late', 'excused', 'PRESENT', ' present', '']) {
      expect(cell({ record })).toBe('absent')
    }
  })

  it('null and undefined records behave the same', () => {
    expect(cell({ record: null })).toBe(cell({ record: undefined }))
    expect(cell({ record: null, classHasAnyRecord: false })).toBe('unmarked')
  })

  it('symbols: X / blank / dash and totals use half weight for one Sunday session', () => {
    expect(REPORT_CELL_SYMBOL).toEqual({ present: 'X', absent: '', unmarked: '-' })
    expect(reportTotalAttendance(0, 0, 0)).toBe(0)
    expect(reportTotalAttendance(3, 2, 1)).toBe(5.5)
    expect(reportTotalAttendance(0, 0, 3)).toBe(1.5)
  })

  it('counts an empty list and a mixed list', () => {
    expect(countReportCells([])).toEqual({ present: 0, absent: 0, unmarked: 0, holiday: 0 })
    expect(countReportCells(['present', 'present', 'absent', 'unmarked', 'holiday', 'unmarked']))
      .toEqual({ present: 2, absent: 1, unmarked: 2, holiday: 1 })
  })
})

describe('QA B5/B6 score-summary', () => {
  it('a real 0 is a score, not "no score"', () => {
    expect(tbHK(0, 0)).toBe(0)
    expect(tbNam(0, 0)).toBe(0)
    expect(xepLoai(0)).toBe('Yếu')
    expect(fmtScore(0)).toBe('0.00')
  })

  it('any missing part makes the average null (never 0, never NaN)', () => {
    expect(tbHK(null, 9)).toBeNull()
    expect(tbHK(9, undefined)).toBeNull()
    expect(tbNam(8, null)).toBeNull()
    const s = scoreSummary({
      score_45_hk1: null, score_exam_hk1: null, score_45_hk2: null, score_exam_hk2: null, t5: 10, cn: 10,
    })
    expect(s).toEqual({ tbHK1: null, tbHK2: null, tbNam: null, xepLoai: '-', ketQua: '-' })
    expect(fmtScore(s.tbNam)).toBe('-')
  })

  it('one semester only: TB HK shown, year/classification/result stay "-"', () => {
    const s = scoreSummary({
      score_45_hk1: 8, score_exam_hk1: 9, score_45_hk2: null, score_exam_hk2: null, t5: 10, cn: 10,
    })
    expect(s.tbHK1).toBe(8.67)
    expect(s.tbHK2).toBeNull()
    expect(s.tbNam).toBeNull()
    expect(s.xepLoai).toBe('-')
    expect(s.ketQua).toBe('-')
  })

  it('classification boundaries are inclusive', () => {
    expect(xepLoai(8)).toBe('Giỏi')
    expect(xepLoai(7.99)).toBe('Khá')
    expect(xepLoai(6.5)).toBe('Khá')
    expect(xepLoai(6.49)).toBe('Trung bình')
    expect(xepLoai(5)).toBe('Trung bình')
    expect(xepLoai(4.99)).toBe('Yếu')
    expect(xepLoai(10)).toBe('Giỏi')
  })

  it('ketQua boundaries: 2.5 passes, just below fails, total 5 passes', () => {
    expect(ketQua({ t5: 2.5, cn: 2.5, avgCat: 5 })).toBe('Đạt')
    expect(ketQua({ t5: 2.49, cn: 10, avgCat: 10 })).toBe('Ở lại')
    expect(ketQua({ t5: 10, cn: 2.49, avgCat: 10 })).toBe('Ở lại')
    expect(ketQua({ t5: 10, cn: 10, avgCat: 2.49 })).toBe('Ở lại')
    expect(ketQua({ t5: 2.5, cn: 2.5, avgCat: 4.99 })).toBe('Ở lại')
    expect(ketQua({ t5: 0, cn: 0, avgCat: null })).toBe('-')
    expect(ketQua({ t5: null, cn: 10, avgCat: 10 })).toBe('-')
  })

  it('rounding: displayed values keep 2 decimals', () => {
    expect(round2(1.005)).toBeCloseTo(1, 1)
    expect(tbHK(7, 8)).toBe(7.67)
    expect(fmtScore(7.666666)).toBe('7.67')
    expect(fmtScore(10)).toBe('10.00')
    expect(fmtScore(undefined)).toBe('-')
  })

  it('classification from rounded semester averages matches the exact formula on a 0.25 grid', () => {
    const cls = (n: number) => (n >= 8 ? 'Giỏi' : n >= 6.5 ? 'Khá' : n >= 5 ? 'Trung bình' : 'Yếu')
    const mismatches: string[] = []
    for (let a = 0; a <= 40; a += 2) for (let b = 0; b <= 40; b++) for (let c = 0; c <= 40; c += 2) for (let d = 0; d <= 40; d++) {
      const [A, B, C, D] = [a, b, c, d].map(x => x / 4)
      const exact = ((A + 2 * B) / 3 + (2 * (C + 2 * D)) / 3) / 3
      const helper = tbNam(tbHK(A, B), tbHK(C, D)) as number
      // Only flag cases where the exact value is clearly on one side of a boundary.
      if (cls(exact) !== xepLoai(helper) && Math.abs(exact - round2(exact)) > 1e-9 && mismatches.length < 3) {
        mismatches.push(JSON.stringify({ A, B, C, D, exact, helper }))
      }
    }
    expect(mismatches).toEqual([])
  })

  it('attendance scores: capped at 10, zero days gives 0, never NaN', () => {
    expect(attendanceScores({ thu5: 50, cn: 50, cnLe: 50 }, { thu5: 40, cn: 40 }))
      .toEqual({ diem_t5: 10, diem_gl: 10, diem_le_cn: 10, diem_tb: 10 })
    expect(attendanceScores({ thu5: 3, cn: 3, cnLe: 3 }, { thu5: 0, cn: 0 }))
      .toEqual({ diem_t5: 0, diem_gl: 0, diem_le_cn: 0, diem_tb: 0 })
    const s = attendanceScores({ thu5: 0, cn: 0, cnLe: 0 }, { thu5: 38, cn: 41 })
    expect(Object.values(s).every(v => v === 0)).toBe(true)
  })

  it('attendance TB weights: T5 0.4 + mean(GL, Lễ) 0.6', () => {
    const s = attendanceScores({ thu5: 20, cn: 40, cnLe: 0 }, { thu5: 40, cn: 40 })
    expect(s).toEqual({ diem_t5: 5, diem_gl: 10, diem_le_cn: 0, diem_tb: 5 })
  })

  it('effective session days: fallback 40, minimum 1, inclusive range, local dates', () => {
    expect(effectiveSessionDays(null)).toEqual({ thu5: 40, cn: 40 })
    expect(effectiveSessionDays(undefined, [{ day_type: 'both' }])).toEqual({ thu5: 40, cn: 40 })
    // 2026-09-03 is a Thursday, 2026-09-06 a Sunday.
    expect(effectiveSessionDays({ start_date: '2026-09-03', end_date: '2026-09-06' })).toEqual({ thu5: 1, cn: 1 })
    expect(effectiveSessionDays({ start_date: '2026-09-04', end_date: '2026-09-05' })).toEqual({ thu5: 1, cn: 1 })
    expect(effectiveSessionDays({ start_date: '2026-09-06', end_date: '2026-09-03' })).toEqual({ thu5: 1, cn: 1 })
    expect(effectiveSessionDays({ start_date: 'garbage', end_date: '' })).toEqual({ thu5: 1, cn: 1 })
  })

  it('effective session days: holidays subtract per type, unknown types ignored', () => {
    const year = { start_date: '2026-09-01', end_date: '2026-09-30' } // 4 Thursdays, 4 Sundays
    expect(effectiveSessionDays(year)).toEqual({ thu5: 4, cn: 4 })
    expect(effectiveSessionDays(year, [{ day_type: 'thu5' }, { day_type: 'both' }, { day_type: 'cn_le' }, { day_type: null }]))
      .toEqual({ thu5: 2, cn: 3 })
    expect(effectiveSessionDays(year, Array.from({ length: 10 }, () => ({ day_type: 'both' }))))
      .toEqual({ thu5: 1, cn: 1 })
  })

  // FINDING (MINOR): helpers are not NaN-safe — a NaN score is classified "Yếu" and printed "NaN".
  it('NaN score is treated as "no score"', () => {
    expect(xepLoai(Number.NaN)).toBe('-')
    expect(fmtScore(Number.NaN)).toBe('-')
  })
})

const student = (over: Partial<RuleStudentData> = {}): RuleStudentData => ({
  id: 's1',
  full_name: 'Nguyễn Văn Đức',
  attendance_thu5: 0,
  attendance_cn: 0,
  avg_catechism: null,
  total_avg: null,
  score_thu5: 0,
  score_cn: 0,
  ...over,
})

describe('QA B7 rule-conditions', () => {
  it('rules without usable conditions are skipped', () => {
    expect(activeConditions({ conditions: [] })).toEqual([])
    expect(activeConditions({ conditions: null, threshold: 80 })).toEqual([])
    expect(activeConditions({ threshold: 80 })).toEqual([])
    expect(activeConditions({ conditions: 'oops' as unknown as RuleCondition[] })).toEqual([])
    expect(activeConditions({ conditions: [{ key: 'attendance_rate_below', enabled: false, value: 80 }] })).toEqual([])
  })

  it('NULL scores never trigger score conditions (prod scores are mostly NULL)', () => {
    for (const key of ['study_score_below', 'total_score_below', 'individual_study_low', 'individual_total_low']) {
      expect(evaluateCondition({ key, enabled: true, value: 10 }, student())).toBe(false)
    }
  })

  it('a real 0 average does trigger score conditions', () => {
    expect(evaluateCondition({ key: 'study_score_below', enabled: true, value: 5 }, student({ avg_catechism: 0 }))).toBe(true)
  })

  it('threshold comparisons are strict / inclusive as documented', () => {
    const s = student({ attendance_thu5: 20, attendance_cn: 20 })
    expect(evaluateCondition({ key: 'attendance_rate_below', enabled: true, value: 50 }, s, undefined, 40, 40)).toBe(false)
    expect(evaluateCondition({ key: 'attendance_rate_below', enabled: true, value: 50.01 }, s, undefined, 40, 40)).toBe(true)
    expect(evaluateCondition({ key: 'sunday_lower_thursday', enabled: true, value: 0 }, s)).toBe(true)
    expect(evaluateCondition({ key: 'sunday_lower_thursday', enabled: true, value: 1 }, s)).toBe(false)
  })

  it('zero/missing effective days fall back to 40 instead of dividing by zero', () => {
    const s = student({ attendance_thu5: 40, attendance_cn: 40 })
    expect(evaluateCondition({ key: 'attendance_rate_below', enabled: true, value: 100 }, s, undefined, 0, 0)).toBe(false)
    expect(evaluateCondition({ key: 'attendance_rate_below', enabled: true, value: 100 }, s)).toBe(false)
  })

  it('class conditions need class data; empty class never divides by zero', () => {
    const cls = { id: 'c', name: 'Ấu 1', student_count: 0, teacher_count: 3 }
    expect(evaluateCondition({ key: 'class_size_below', enabled: true, value: 5 }, student())).toBe(false)
    expect(evaluateCondition({ key: 'class_size_below', enabled: true, value: 5 }, student(), cls)).toBe(true)
    expect(evaluateCondition({ key: 'teacher_ratio_above', enabled: true, value: 0 }, student(), cls)).toBe(false)
  })

  it('disabled, unknown and placeholder conditions never fire', () => {
    expect(evaluateCondition({ key: 'attendance_rate_below', enabled: false, value: 100 }, student())).toBe(false)
    expect(evaluateCondition({ key: 'does_not_exist', enabled: true, value: 1 }, student())).toBe(false)
    expect(evaluateCondition({ key: 'score_decline', enabled: true, value: 0 }, student())).toBe(false)
    expect(evaluateCondition({ key: 'missing_data_days', enabled: true, value: 0 }, student())).toBe(false)
  })

  it('every definition has a unique key and a {threshold} expression', () => {
    const keys = RULE_CONDITION_DEFS.map(d => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(RULE_CONDITION_DEFS.every(d => d.expression.includes('{threshold}') && d.label.length > 0)).toBe(true)
  })

  it('validation blocks zero enabled conditions', () => {
    expect(validateRuleConditions([])).toBe('Vui lòng chọn ít nhất 1 điều kiện')
    expect(validateRuleConditions([{ key: 'a', enabled: false, value: 1 }])).toBe('Vui lòng chọn ít nhất 1 điều kiện')
    expect(validateRuleConditions([{ key: 'a', enabled: true, value: 1 }])).toBeNull()
  })

  // FINDING (MINOR): an enabled condition without a value passes validation but can never fire.
  it('validation rejects an enabled condition that has no value', () => {
    expect(validateRuleConditions([{ key: 'attendance_rate_below', enabled: true }])).not.toBeNull()
  })

  // FINDING (MINOR): a corrupt conditions array (null entry) crashes the whole engine run.
  it('a null entry in conditions[] is ignored instead of throwing', () => {
    expect(activeConditions({ conditions: [null as unknown as RuleCondition] })).toEqual([])
  })
})

describe('QA B8 notification-recipients', () => {
  const classes = [
    { id: 'c-au', branch: 'Ấu Nhi', status: 'ACTIVE' },
    { id: 'c-thieu', branch: 'Thiếu Nhi', status: 'ACTIVE' },
    { id: 'c-old', branch: 'Ấu Nhi', status: 'INACTIVE' },
    { id: 'c-nobranch', branch: null, status: 'ACTIVE' },
  ]

  it('union of branch users and class users, deduped, ACTIVE only', () => {
    const users = [
      { id: 'branch-only', branch: 'Ấu Nhi', class_id: null, status: 'ACTIVE' },
      { id: 'class-only', branch: null, class_id: 'c-au', status: 'ACTIVE' },
      { id: 'both', branch: 'Ấu Nhi', class_id: 'c-au', status: 'ACTIVE' },
      { id: 'inactive', branch: 'Ấu Nhi', class_id: 'c-au', status: 'INACTIVE' },
      { id: 'other', branch: 'Thiếu Nhi', class_id: 'c-thieu', status: 'ACTIVE' },
      { id: 'old-class', branch: null, class_id: 'c-old', status: 'ACTIVE' },
      { id: 'both', branch: 'Ấu Nhi', class_id: 'c-au', status: 'ACTIVE' },
    ]
    expect(branchRecipientIds(users, classes, ['Ấu Nhi'])).toEqual(['branch-only', 'class-only', 'both'])
  })

  it('user in branch A teaching a class of branch B is reached by either branch', () => {
    const users = [{ id: 'u', branch: 'Thiếu Nhi', class_id: 'c-au', status: 'ACTIVE' }]
    expect(branchRecipientIds(users, classes, ['Ấu Nhi'])).toEqual(['u'])
    expect(branchRecipientIds(users, classes, ['Thiếu Nhi'])).toEqual(['u'])
    expect(branchRecipientIds(users, classes, ['Nghĩa Sĩ'])).toEqual([])
  })

  it('empty selections and missing data return nobody', () => {
    const users = [{ id: 'u', branch: null, class_id: 'c-nobranch', status: 'ACTIVE' }]
    expect(branchRecipientIds(users, classes, [])).toEqual([])
    expect(branchRecipientIds([], [], ['Ấu Nhi'])).toEqual([])
    expect(branchRecipientIds(users, classes, ['Ấu Nhi'])).toEqual([])
    expect(branchRecipientIds([{ id: 'x', branch: 'Ấu Nhi' }], classes, ['Ấu Nhi'])).toEqual([])
  })

  it('branch names match exactly (no trimming / case folding)', () => {
    const users = [
      { id: 'space', branch: 'Ấu Nhi ', status: 'ACTIVE' },
      { id: 'lower', branch: 'ấu nhi', status: 'ACTIVE' },
      { id: 'status-lower', branch: 'Ấu Nhi', status: 'active' },
    ]
    expect(branchRecipientIds(users, classes, ['Ấu Nhi'])).toEqual([])
  })

  it('chunk boundaries', () => {
    expect(NOTIFICATION_BATCH_SIZE).toBe(500)
    expect(chunk([])).toEqual([])
    const ids = Array.from({ length: 1001 }, (_, i) => i)
    expect(chunk(ids).map(c => c.length)).toEqual([500, 500, 1])
    expect(chunk(ids.slice(0, 500)).map(c => c.length)).toEqual([500])
    expect(chunk(ids.slice(0, 501)).map(c => c.length)).toEqual([500, 1])
    expect(chunk(ids).flat()).toEqual(ids)
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })

  it('chunk rejects sizes that would loop forever', () => {
    for (const size of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => chunk([1], size)).toThrow(RangeError)
    }
  })
})

async function sheetRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  const excelModule = await import('exceljs')
  const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const rows: unknown[][] = []
  workbook.worksheets[0].eachRow(row => {
    const values: unknown[] = []
    row.eachCell({ includeEmpty: true }, cell => values.push(cell.value))
    rows.push(values)
  })
  return rows
}

describe('QA B3 sundayFullyPresentIds (web dashboard)', () => {
  it('needs both sessions; duplicates and non-present rows do not count', () => {
    const ids = sundayFullyPresentIds([
      { student_id: 'a', day_type: 'cn' }, { student_id: 'a', day_type: 'cn_le' },
      { student_id: 'a', day_type: 'cn' },
      { student_id: 'b', day_type: 'cn' },
      { student_id: 'c', day_type: 'cn_le' },
      { student_id: 'd', day_type: 'cn' }, { student_id: 'd', day_type: 'cn_le', status: 'absent' },
      { student_id: 'e', day_type: 'thu5' }, { student_id: 'e', day_type: 'cn_le' },
    ])
    expect(Array.from(ids)).toEqual(['a'])
    expect(sundayFullyPresentIds([]).size).toBe(0)
  })
})

describe('QA B1/B2 attendance Excel (web)', () => {
  const today = '2026-09-29'
  // 2026-09-17 Thursday (marked), 2026-09-20 Sunday (GL marked, Lễ not marked by anyone),
  // 2026-09-24 Thursday holiday, 2026-10-01 Thursday in the future.
  const dates = ['2026-09-17', '2026-09-20', '2026-09-24', '2026-10-01']
  const holidayNames = new Map([['2026-09-24', 'Nghỉ lễ']])
  const classRecordKeys = new Set(['2026-09-17:thu5', '2026-09-20:cn'])

  it('Sunday splits into GL/Lễ unless it is a holiday', () => {
    expect(buildAttendanceExcelColumns(['2026-09-20'], new Map())).toEqual([
      { date: '2026-09-20', session: 'gl' }, { date: '2026-09-20', session: 'le' },
    ])
    expect(buildAttendanceExcelColumns(['2026-09-20'], new Map([['2026-09-20', 'Lễ']]))).toEqual([
      { date: '2026-09-20', session: 'single' },
    ])
  })

  it('writes X / blank / - / Nghỉ per student row', async () => {
    const buffer = await buildAttendanceWorkbook({
      className: 'Ấu Nhi 1',
      title: 'ĐIỂM DANH',
      dates,
      formatDate: d => d,
      holidayNames,
      classRecordKeys,
      today,
      students: [
        { full_name: 'Trần Thị Đào', attendance: { '2026-09-17': 'present', '2026-09-20': 'present' }, attendance_mass: {} },
        { full_name: 'Lê Văn Ân', attendance: { '2026-09-17': 'absent' }, attendance_mass: { '2026-09-20': 'present' } },
        { full_name: 'Phạm Ý', attendance: {}, attendance_mass: {} },
      ] as Parameters<typeof buildAttendanceWorkbook>[0]['students'],
    })
    const rows = await sheetRows(buffer)
    const rowOf = (given: string) => {
      const row = rows.find(r => r.includes(given))
      expect(row, `row for ${given}`).toBeDefined()
      return (row as unknown[]).slice(4).map(v => (v == null ? '' : v))
    }
    // columns: T5 17/9 | CN 20/9 GL | CN 20/9 Lễ | 24/9 holiday | 1/10 future
    expect(rowOf('Đào')).toEqual(['X', 'X', '-', 'Nghỉ', '-'])
    expect(rowOf('Ân')).toEqual(['', '', 'X', 'Nghỉ', '-'])
    expect(rowOf('Ý')).toEqual(['', '', '-', 'Nghỉ', '-'])
  })

  it('report dates: whole period plus stray record dates, sorted, deduped', () => {
    expect(mergeReportDates('2026-09-01', '2026-09-13', 'all', ['2026-09-08', '2026-09-03']))
      .toEqual(['2026-09-03', '2026-09-06', '2026-09-08', '2026-09-10', '2026-09-13'])
    expect(mergeReportDates(null, undefined, 'cn', ['2026-09-08'])).toEqual(['2026-09-08'])
    expect(mergeReportDates('2026-09-13', '2026-09-01', 'thu5', [])).toEqual([])
  })
})

describe('QA B5/B6 score Excel (web)', () => {
  const all: ScoreColumnSelection = {
    diLeT5: false, hocGL: false, diLeCN: false, diemTB: false,
    score45HK1: false, scoreExamHK1: false, score45HK2: false, scoreExamHK2: false,
    diemTong: false, xepLoai: false, ketQua: false,
  }
  const base: ScoreReportStudent = {
    full_name: 'Nguyễn Văn An',
    score_di_le_t5: null, score_hoc_gl: null,
    score_45_hk1: null, score_exam_hk1: null, score_45_hk2: null, score_exam_hk2: null,
    average_hk1: null, average_hk2: null, average_year: null,
    diem_t5: 0, diem_gl: 0, diem_le_cn: 0, diem_tb: 0,
  }

  it('ranking formula ignores "-" and blank TB Năm', () => {
    const cols = buildScoreColumns(all)
    const f = buildRowFormulas(cols, 10, 10, 12)
    expect(f.hang).toContain('="-"')
    expect(f.hang).toContain('RANK(')
    expect(Object.keys(f)).toEqual(['hang'])
  })

  it('NULL scores export as "-" (never 0, NaN or a formula) and stale stored averages are ignored', async () => {
    const buffer = await buildScoreReportWorkbook({
      className: 'Ấu Nhi 1',
      schoolYearName: '2026-2027',
      selection: all,
      students: [
        { ...base, average_hk1: 9, average_hk2: 9, average_year: 9 },
        { ...base, full_name: 'Trần Thị Bình', score_45_hk1: 8, score_exam_hk1: 8, score_45_hk2: 8, score_exam_hk2: 8, diem_t5: 10, diem_gl: 10, diem_le_cn: 10, diem_tb: 10 },
        { ...base, full_name: 'Lê Không', score_45_hk1: 0, score_exam_hk1: 0, score_45_hk2: 0, score_exam_hk2: 0 },
      ],
    })
    const rows = await sheetRows(buffer)
    const rowOf = (given: string) => rows.find(r => r.includes(given)) as unknown[]
    const plain = (row: unknown[]) => row.filter(v => typeof v !== 'object' || v === null)

    const nullRow = plain(rowOf('An'))
    expect(nullRow).not.toContain(9)
    expect(nullRow.filter(v => v === '-').length).toBeGreaterThanOrEqual(7) // 4 scores + TB Năm + Xếp loại + Kết quả
    expect(nullRow.some(v => typeof v === 'number' && Number.isNaN(v))).toBe(false)

    const goodRow = plain(rowOf('Bình'))
    expect(goodRow).toContain('Giỏi')
    expect(goodRow).toContain('Đạt')

    const zeroRow = plain(rowOf('Không'))
    expect(zeroRow).toContain('Yếu')
    expect(zeroRow).toContain('Ở lại')
  })
})
