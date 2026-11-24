import { describe, expect, it } from 'vitest'
import {
  buildPunctualityReport,
  defaultWeekAnchor,
  formatPunctualityRate,
  punctualityCellRate,
  punctualityColumns,
  weekRangeOf,
  type PunctualityRecord,
  type PunctualityReportData,
  type PunctualityReportInput,
} from '../punctuality-report'

const BRANCHES = ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ']
const CLASSES = [
  { id: 'c-au', name: 'Ấu 1', branch: 'Ấu Nhi', display_order: 10 },
  { id: 'c-thieu', name: 'Thiếu 1', branch: 'Thiếu Nhi', display_order: 20 },
]
const STUDENTS = [
  ...['a1', 'a2', 'a3', 'a4'].map((id) => ({ id, class_id: 'c-au' })),
  ...['t1', 't2', 't3'].map((id) => ({ id, class_id: 'c-thieu' })),
]
function rec(student_id: string, day_type: string, attendance_date: string, is_late: boolean | null = null, status = 'present'): PunctualityRecord {
  return { student_id, status, day_type, attendance_date, is_late }
}
function input(over: Partial<PunctualityReportInput>): PunctualityReportInput {
  return {
    mode: 'custom', fromDate: '2026-11-23', toDate: '2026-11-29', classes: CLASSES, branchOrder: BRANCHES,
    students: STUDENTS, sessions: { thu5: [], cn: ['2026-11-29'] }, records: [], ...over,
  }
}
const rowOf = (d: PunctualityReportData, id: string) => d.branches.flatMap((b) => b.classes).find((c) => c.classId === id)!

describe('QA v2: roster, duplicates, evaluated()', () => {
  it('duplicates: false beats true beats null; counted once per student', () => {
    const d = '2026-11-29'
    const r = buildPunctualityReport(input({ records: [
      rec('a1', 'cn_le', d, true), rec('a1', 'cn_le', d, false),
      rec('a2', 'cn_le', d, null), rec('a2', 'cn_le', d, true),
      rec('a3', 'cn_le', d, null), rec('a3', 'cn_le', d, null),
    ] }))
    const row = rowOf(r, 'c-au')
    expect(row.sundayRates).toEqual([0.25])
    expect(row.late).toBe(1)
    expect(row.unknown).toBe(1)
    expect(row.note).toBe('Trễ: 1 lượt · Chưa xét: 1 lượt')
  })

  it('duplicate thu5 rows count a student once', () => {
    const r = buildPunctualityReport(input({ sessions: { thu5: ['2026-11-26'], cn: [] },
      records: [rec('a1', 'thu5', '2026-11-26'), rec('a1', 'thu5', '2026-11-26'), rec('a1', 'thu5', '2026-11-26')] }))
    expect(rowOf(r, 'c-au').thu5Rates).toEqual([0.25])
  })

  it('records of students not on the roster / null class are ignored', () => {
    const r = buildPunctualityReport(input({
      students: [...STUDENTS, { id: 'x', class_id: null }],
      records: [rec('ghost', 'cn_le', '2026-11-29', false), rec('x', 'cn_le', '2026-11-29', false), rec('a1', 'cn_le', '2026-11-29', false)],
    }))
    expect(rowOf(r, 'c-au').sundayRates).toEqual([0.25])
    expect(r.total.studentCount).toBe(7)
  })

  it('evaluated() is global: a boolean record of ANY student (even non-roster) evaluates the session for every class', () => {
    const r = buildPunctualityReport(input({ records: [rec('ghost', 'cn', '2026-11-29', false), rec('t1', 'cn', '2026-11-29', null)] }))
    expect(rowOf(r, 'c-thieu').sundayRates).toEqual([0])
    expect(rowOf(r, 'c-thieu').unknown).toBe(1)
    // Ấu uses cn_le: nobody there → not evaluated
    expect(rowOf(r, 'c-au').sundayRates).toEqual([null])
    expect(rowOf(r, 'c-au').note).toBe('1 buổi CN chưa xét giờ')
  })

  it('all-null Sunday is NOT evaluated; undefined / missing is_late is NOT evaluated', () => {
    const d = '2026-11-29'
    const r = buildPunctualityReport(input({ records: [
      rec('a1', 'cn_le', d, null),
      { student_id: 't1', status: 'present', day_type: 'cn', attendance_date: d } as unknown as PunctualityRecord,
    ] }))
    expect(rowOf(r, 'c-au').sundayRates).toEqual([null])
    expect(rowOf(r, 'c-thieu').sundayRates).toEqual([null])
    expect(r.total.sundayRates).toEqual([null])
    expect(r.total.sundayAverage).toBeNull()
  })

  it('absent status / non-session date / wrong day_type never count', () => {
    const r = buildPunctualityReport(input({ sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] }, records: [
      rec('a1', 'thu5', '2026-11-26', null, 'absent'), rec('a2', 'thu5', '2026-11-27'),
      rec('a3', 'cn', '2026-11-29', false), // Ấu session is cn_le, a3 on cn must not count for Ấu
      rec('t1', 'cn_le', '2026-11-29', false), // Thiếu session is cn
    ] }))
    expect(rowOf(r, 'c-au').thu5Rates).toEqual([0])
    expect(rowOf(r, 'c-au').sundayRates).toEqual([0]) // cn_le evaluated by t1 (global) but nobody of Ấu on time
    expect(rowOf(r, 'c-thieu').sundayRates).toEqual([0])
  })
})

describe('QA v2: zero-student rows, totals', () => {
  it('studentCount 0 → all rates null (no NaN/Infinity), totals still finite', () => {
    const r = buildPunctualityReport(input({
      classes: [...CLASSES, { id: 'c-empty', name: 'Rỗng', branch: 'Thiếu Nhi', display_order: 30 }],
      sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: ['2026-11-29'] }, toDate: '2026-12-06',
      records: [rec('t1', 'cn', '2026-11-29', false), rec('t1', 'thu5', '2026-11-26')],
    }))
    const e = rowOf(r, 'c-empty')
    expect(e.studentCount).toBe(0)
    expect(e.thu5Rates).toEqual([null, null])
    expect(e.thu5Average).toBeNull()
    expect(e.sundayRates).toEqual([null])
    expect(e.sundayAverage).toBeNull()
    const nums = [...r.total.thu5Rates, ...r.total.sundayRates, r.total.thu5Average, r.total.sundayAverage]
    for (const v of nums) expect(v === null || Number.isFinite(v)).toBe(true)
    expect(r.total.studentCount).toBe(7)
    expect(r.total.sundayRates[0]).toBeCloseTo(1 / 3, 10) // only Thiếu (3) + empty (0) evaluated
  })

  it('no classes at all → empty branches, total 0, rates null', () => {
    const r = buildPunctualityReport(input({ classes: [], students: [], sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] } }))
    expect(r.branches).toEqual([])
    expect(r.total.studentCount).toBe(0)
    expect(r.total.thu5Rates).toEqual([null])
    expect(r.total.sundayRates).toEqual([null])
    expect(r.total.thu5Average).toBeNull()
  })

  it('total Sunday rate counts only the rows evaluated on that date (denominator excludes unevaluated branch)', () => {
    // Ấu (4 students) evaluated: 2 on time. Thiếu (3) not evaluated → total = 2/4, not 2/7
    const r = buildPunctualityReport(input({ records: [rec('a1', 'cn_le', '2026-11-29', false), rec('a2', 'cn_le', '2026-11-29', false)] }))
    expect(r.total.sundayRates).toEqual([0.5])
    expect(r.total.sundayAverage).toBe(0.5)
  })

  it('total sundayAverage weights by rows×evaluated Sundays', () => {
    const records = [
      rec('a1', 'cn_le', '2026-11-29', false), rec('a2', 'cn_le', '2026-11-29', false),
      rec('a1', 'cn_le', '2026-12-06', false),
      rec('t1', 'cn', '2026-12-06', false), rec('t2', 'cn', '2026-12-06', false), rec('t3', 'cn', '2026-12-06', false),
    ]
    const r = buildPunctualityReport(input({ toDate: '2026-12-06', sessions: { thu5: [], cn: ['2026-11-29', '2026-12-06'] }, records }))
    // Ấu: 3 on time / (4*2); Thiếu: evaluated only 12-06: 3 / (3*1) → 6 / 11
    expect(r.total.sundayAverage).toBeCloseTo(6 / 11, 10)
    expect(r.total.sundayRates[0]).toBe(0.5)
    expect(r.total.sundayRates[1]).toBeCloseTo(4 / 7, 10)
    expect(rowOf(r, 'c-thieu').note).toBe('1 buổi CN chưa xét giờ')
    expect(rowOf(r, 'c-thieu').sundayAverage).toBe(1)
  })

  it('late/unknown only accumulate over evaluated Sundays', () => {
    const r = buildPunctualityReport(input({ toDate: '2026-12-06', sessions: { thu5: [], cn: ['2026-11-29', '2026-12-06'] },
      records: [rec('a1', 'cn_le', '2026-11-29', true), rec('a2', 'cn_le', '2026-11-29', null), rec('a3', 'cn_le', '2026-12-06', null)] }))
    const row = rowOf(r, 'c-au')
    expect(row.late).toBe(1)
    expect(row.unknown).toBe(1) // a3's null on the unevaluated 06/12 is not counted
    expect(row.note).toBe('Trễ: 1 lượt · Chưa xét: 1 lượt · 1 buổi CN chưa xét giờ')
  })
})

describe('QA v2: columns by number of dates', () => {
  const cols = (thu5: string[], cn: string[]) => punctualityColumns({ thu5Dates: thu5, cnDates: cn }).map((c) => c.label)
  it('0 / 1 / 2+ dates per group', () => {
    expect(cols([], [])).toEqual([])
    expect(cols(['2026-11-26'], [])).toEqual(['T5 26/11'])
    expect(cols([], ['2026-11-29'])).toEqual(['CN 29/11'])
    expect(cols(['2026-11-26'], ['2026-11-29'])).toEqual(['T5 26/11', 'CN 29/11'])
    expect(cols(['2026-11-26', '2026-12-03'], ['2026-11-29'])).toEqual(['T5 26/11', 'T5 03/12', 'TB T5', 'CN 29/11'])
    expect(cols(['2026-11-26'], ['2026-11-29', '2026-12-06'])).toEqual(['T5 26/11', 'CN 29/11', 'CN 06/12', 'TB CN'])
  })
  it('column indexes align with rates; punctualityCellRate reads them', () => {
    const r = buildPunctualityReport(input({ toDate: '2026-12-06', sessions: { thu5: ['2026-12-03', '2026-11-26'], cn: ['2026-12-06', '2026-11-29'] },
      records: [rec('a1', 'thu5', '2026-11-26'), rec('a1', 'cn_le', '2026-12-06', false)] }))
    expect(r.thu5Dates).toEqual(['2026-11-26', '2026-12-03']) // sorted even if input unsorted
    expect(r.cnDates).toEqual(['2026-11-29', '2026-12-06'])
    const row = rowOf(r, 'c-au')
    const columns = punctualityColumns(r)
    const vals = columns.map((c) => punctualityCellRate(row, c))
    expect(vals).toEqual([0.25, 0, 0.125, null, 0.25, 0.25])
  })
  it('duplicate session dates are collapsed', () => {
    const r = buildPunctualityReport(input({ sessions: { thu5: ['2026-11-26', '2026-11-26'], cn: [] } }))
    expect(r.thu5Dates).toEqual(['2026-11-26'])
    expect(punctualityColumns(r).map((c) => c.label)).toEqual(['T5 26/11']) // no TB for 1 date
  })
  it('no sessions at all → no columns, no crash, no TB footnote', () => {
    const r = buildPunctualityReport(input({ sessions: { thu5: [], cn: [] } }))
    expect(punctualityColumns(r)).toEqual([])
    expect(r.footnotes).toHaveLength(2)
  })
  it('TB footnote only when a TB column exists', () => {
    expect(buildPunctualityReport(input({ sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] } })).footnotes).toHaveLength(2)
    expect(buildPunctualityReport(input({ sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: [] } })).footnotes).toHaveLength(3)
  })
})

describe('QA v2: year boundary, ordering, labels', () => {
  it('period crossing Dec→Jan: sorted dates, labels, subtitle', () => {
    const sessions = { thu5: ['2027-01-07', '2026-12-31', '2026-12-24'], cn: ['2027-01-03', '2026-12-27'] }
    const r = buildPunctualityReport(input({ mode: 'custom', fromDate: '2026-12-21', toDate: '2027-01-10', sessions,
      records: [rec('a1', 'thu5', '2026-12-31'), rec('a1', 'cn_le', '2027-01-03', false)] }))
    expect(r.thu5Dates).toEqual(['2026-12-24', '2026-12-31', '2027-01-07'])
    expect(punctualityColumns(r).map((c) => c.label)).toEqual(['T5 24/12', 'T5 31/12', 'T5 07/01', 'TB T5', 'CN 27/12', 'CN 03/01', 'TB CN'])
    expect(r.timeLabel).toBe('Từ 21/12/2026 đến 10/01/2027')
    expect(r.subtitleLines[0]).toBe('Tỉ lệ thiếu nhi có mặt đúng giờ: (từ 21/12/2026 đến 10/01/2027)')
    expect(rowOf(r, 'c-au').thu5Rates).toEqual([0, 0.25, 0])
    expect(rowOf(r, 'c-au').sundayRates).toEqual([null, 0.25])
  })
  it('month label uses unpadded month; day / week modes', () => {
    expect(buildPunctualityReport(input({ mode: 'month', fromDate: '2027-01-01', toDate: '2027-01-31' })).timeLabel).toBe('Tháng 1/2027')
    expect(buildPunctualityReport(input({ mode: 'day', fromDate: '2026-11-29', toDate: '2026-11-29' })).subtitleLines[0]).toContain('(ngày 29/11/2026)')
    expect(buildPunctualityReport(input({ mode: 'week' })).timeLabel).toBe('Tuần: 23/11/2026 - 29/11/2026')
  })
  it('classes: null display_order last, demo dropped, unknown branch omitted, empty branch omitted', () => {
    const r = buildPunctualityReport(input({
      classes: [
        { id: 'n', name: 'A-null', branch: 'Thiếu Nhi', display_order: null },
        { id: 'o', name: 'Z-ord', branch: 'Thiếu Nhi', display_order: 5 },
        { id: 'demo', name: 'Lớp Demo (App Review)', branch: 'Thiếu Nhi', display_order: 999 },
        { id: 'x', name: 'Lạ', branch: 'Ngành Lạ', display_order: 1 },
      ],
    }))
    expect(r.branches.flatMap((b) => b.classes.map((c) => c.classId))).toEqual(['o', 'n'])
    expect(r.branches.map((b) => b.label)).toEqual(['THIẾU'])
  })
  it('Unicode class names preserved', () => {
    const r = buildPunctualityReport(input({ classes: [{ id: 'u', name: 'Ấu «Đặng» 🕊', branch: 'Ấu Nhi', display_order: 1 }], students: [{ id: 's', class_id: 'u' }] }))
    expect(r.branches[0].classes[0].className).toBe('Ấu «Đặng» 🕊')
  })
  it('sheetName is constant', () => {
    expect(buildPunctualityReport(input({})).sheetName).toBe('Thong ke dung gio')
  })
})

describe('QA v2: date helpers & formatter', () => {
  it('weekRangeOf across year / leap day', () => {
    expect(weekRangeOf('2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-03' })
    expect(weekRangeOf('2028-02-29')).toEqual({ from: '2028-02-28', to: '2028-03-05' })
    expect(weekRangeOf('2026-11-29')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
  })
  it('defaultWeekAnchor', () => {
    expect(defaultWeekAnchor('2026-11-23')).toBe('2026-11-22')
    expect(defaultWeekAnchor('2026-11-25')).toBe('2026-11-22')
    expect(defaultWeekAnchor('2026-11-26')).toBe('2026-11-26')
    expect(defaultWeekAnchor('2026-11-29')).toBe('2026-11-29')
    expect(defaultWeekAnchor('2027-01-04')).toBe('2027-01-03')
  })
  it('formatPunctualityRate', () => {
    expect(formatPunctualityRate(null)).toBe('—')
    expect(formatPunctualityRate(0)).toBe('0%')
    expect(formatPunctualityRate(1)).toBe('100%')
    expect(formatPunctualityRate(0.005)).toBe('1%')
    expect(formatPunctualityRate(0.4949)).toBe('49%')
  })
  it('invalid date throws', () => {
    expect(() => weekRangeOf('2026-02-30')).toThrow()
    expect(() => buildPunctualityReport(input({ fromDate: 'bad' }))).toThrow()
  })
})

describe('QA v2: scale', () => {
  it('3000 students / 20k records builds fast', () => {
    const classes = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, name: `L${i}`, branch: BRANCHES[i % 4], display_order: i }))
    const students = Array.from({ length: 3000 }, (_, i) => ({ id: `s${i}`, class_id: `c${i % 30}` }))
    const records: PunctualityRecord[] = []
    for (let i = 0; i < 20000; i += 1) records.push(rec(`s${i % 3000}`, i % 2 ? 'thu5' : 'cn', i % 2 ? '2026-11-26' : '2026-11-29', i % 3 === 0 ? false : null))
    const t = Date.now()
    const r = buildPunctualityReport(input({ classes, students, records, sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] } }))
    expect(Date.now() - t).toBeLessThan(1500)
    expect(r.total.studentCount).toBe(3000)
  })
})
