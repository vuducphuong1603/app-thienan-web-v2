import { describe, expect, it } from 'vitest'
import {
  PUNCTUALITY_REPORT_TITLE,
  buildPunctualityReport,
  defaultWeekAnchor,
  formatPunctualityRate,
  punctualityCellRate,
  punctualityColumns,
  punctualityFileBase,
  sundaySessionForBranch,
  weekRangeOf,
  type PunctualityRecord,
  type PunctualityReportData,
  type PunctualityReportInput,
  type PunctualityRow,
} from '../punctuality-report'

// ───────────────────────── Fixture G1 (SPEC §4.1) ─────────────────────────

const BRANCHES = ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ']

const CLASSES = [
  { id: 'c-au', name: 'Ấu 1', branch: 'Ấu Nhi', display_order: 10 },
  { id: 'c-thieu', name: 'Thiếu 1', branch: 'Thiếu Nhi', display_order: 20 },
  { id: 'c-demo', name: 'Lớp Demo (App Review)', branch: 'Chiên Con', display_order: 999 },
]

const STUDENTS = [
  ...['a1', 'a2', 'a3', 'a4'].map((id) => ({ id, class_id: 'c-au' })),
  ...['t1', 't2', 't3', 't4', 't5'].map((id) => ({ id, class_id: 'c-thieu' })),
  { id: 'd1', class_id: 'c-demo' },
]

function rec(
  student_id: string,
  day_type: string,
  attendance_date: string,
  is_late: boolean | null = null,
  status = 'present'
): PunctualityRecord {
  return { student_id, status, day_type, attendance_date, is_late }
}

function thu(date: string, ids: string[]): PunctualityRecord[] {
  return ids.map((id) => rec(id, 'thu5', date))
}

const G1_RECORDS: PunctualityRecord[] = [
  ...thu('2026-11-26', ['a1', 'a2', 'a3', 't1', 't2', 'd1']),
  ...thu('2026-12-03', ['a1', 't1', 't2', 't3', 't4']),
  rec('a1', 'cn_le', '2026-11-29', false),
  rec('a2', 'cn_le', '2026-11-29', false),
  rec('a3', 'cn_le', '2026-11-29', true),
  rec('a4', 'cn_le', '2026-11-29', null),
  rec('t1', 'cn_le', '2026-11-29', true), // sai buổi với ngành Thiếu → bỏ qua
  rec('t1', 'cn', '2026-11-29', false),
  rec('t2', 'cn', '2026-11-29', true),
  rec('t3', 'cn', '2026-11-29', false),
  rec('a1', 'cn', '2026-11-29', false), // sai buổi với ngành Ấu → bỏ qua
  ...['a1', 'a2', 'a3', 'a4'].map((id) => rec(id, 'cn_le', '2026-12-06', false)),
  rec('t1', 'cn', '2026-12-06', null),
  rec('t2', 'cn', '2026-12-06', null),
  // nhiễu không được tính
  rec('t5', 'thu5', '2026-11-26', null, 'absent'),
  rec('t5', 'thu5', '2026-11-27'),
]

function g1Input(overrides: Partial<PunctualityReportInput> = {}): PunctualityReportInput {
  return {
    mode: 'custom',
    fromDate: '2026-11-23',
    toDate: '2026-12-06',
    classes: CLASSES,
    branchOrder: BRANCHES,
    students: STUDENTS,
    sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: ['2026-11-29', '2026-12-06'] },
    records: G1_RECORDS,
    ...overrides,
  }
}

function rowOf(table: PunctualityReportData, className: string): PunctualityRow {
  const row = table.branches.flatMap((branch) => branch.classes).find((item) => item.className === className)
  if (!row) throw new Error(`Không thấy lớp ${className}`)
  return row
}

const FOOTNOTE_1 = 'Thứ 5: tỉ lệ = số em có mặt / sỉ số lớp (không xét giờ).'
const FOOTNOTE_2 =
  'Chủ nhật: ngành Thiếu, Nghĩa tính đúng giờ buổi học giáo lý; ngành Chiên, Ấu tính đúng giờ buổi đi lễ. Tỉ lệ = số em đúng giờ / sỉ số lớp.'
const FOOTNOTE_3 =
  'TB: trung bình các buổi trong kỳ; buổi Chủ nhật chưa xét giờ (—) không tính vào trung bình.'

function expectRates(actual: (number | null)[], expected: (number | null)[]): void {
  expect(actual).toHaveLength(expected.length)
  expected.forEach((value, position) => {
    if (value === null) expect(actual[position]).toBeNull()
    else expect(actual[position]).toBeCloseTo(value, 10)
  })
}

function expectRate(actual: number | null, expected: number | null): void {
  if (expected === null) expect(actual).toBeNull()
  else expect(actual).toBeCloseTo(expected, 10)
}

// ───────────────────────── sundaySessionForBranch ─────────────────────────

describe('sundaySessionForBranch', () => {
  it('Chiên Con và Ấu Nhi đi lễ (cn_le)', () => {
    expect(sundaySessionForBranch('Chiên Con')).toBe('cn_le')
    expect(sundaySessionForBranch('Ấu Nhi')).toBe('cn_le')
  })

  it('Thiếu Nhi, Nghĩa Sĩ và ngành lạ học giáo lý (cn)', () => {
    expect(sundaySessionForBranch('Thiếu Nhi')).toBe('cn')
    expect(sundaySessionForBranch('Nghĩa Sĩ')).toBe('cn')
    expect(sundaySessionForBranch('Ngành lạ')).toBe('cn')
    expect(sundaySessionForBranch('')).toBe('cn')
  })
})

// ───────────────────────── weekRangeOf / defaultWeekAnchor ─────────────────────────

describe('weekRangeOf', () => {
  it('ngày giữa tuần → Thứ 2..Chủ nhật', () => {
    expect(weekRangeOf('2026-11-26')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
  })

  it('Thứ 2 chính nó là đầu tuần', () => {
    expect(weekRangeOf('2026-11-23')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
  })

  it('Chủ nhật thuộc tuần kết thúc bởi nó (không nhảy sang tuần sau)', () => {
    expect(weekRangeOf('2026-11-29')).toEqual({ from: '2026-11-23', to: '2026-11-29' })
  })

  it('qua ranh giới tháng', () => {
    expect(weekRangeOf('2026-12-02')).toEqual({ from: '2026-11-30', to: '2026-12-06' })
  })

  it('qua ranh giới năm', () => {
    expect(weekRangeOf('2026-12-31')).toEqual({ from: '2026-12-28', to: '2027-01-03' })
    expect(weekRangeOf('2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-03' })
  })

  it('năm nhuận 29/02', () => {
    expect(weekRangeOf('2028-02-29')).toEqual({ from: '2028-02-28', to: '2028-03-05' })
  })

  it('ngày sai định dạng / không tồn tại → ném lỗi', () => {
    expect(() => weekRangeOf('29/11/2026')).toThrow()
    expect(() => weekRangeOf('2026-02-30')).toThrow()
  })
})

describe('defaultWeekAnchor', () => {
  it('Thứ 2/3/4 → Chủ nhật tuần trước', () => {
    expect(defaultWeekAnchor('2026-11-23')).toBe('2026-11-22') // Thứ 2
    expect(defaultWeekAnchor('2026-11-24')).toBe('2026-11-22') // Thứ 3
    expect(defaultWeekAnchor('2026-11-25')).toBe('2026-11-22') // Thứ 4
  })

  it('Thứ 5..Chủ nhật → chính hôm nay', () => {
    expect(defaultWeekAnchor('2026-11-26')).toBe('2026-11-26') // Thứ 5
    expect(defaultWeekAnchor('2026-11-27')).toBe('2026-11-27') // Thứ 6
    expect(defaultWeekAnchor('2026-11-28')).toBe('2026-11-28') // Thứ 7
    expect(defaultWeekAnchor('2026-11-29')).toBe('2026-11-29') // Chủ nhật
  })

  it('qua ranh giới tháng và năm', () => {
    expect(defaultWeekAnchor('2026-12-01')).toBe('2026-11-29') // Thứ 3
    expect(defaultWeekAnchor('2027-01-04')).toBe('2027-01-03') // Thứ 2
  })
})

// ───────────────────────── G1 ─────────────────────────

describe('buildPunctualityReport — G1 (custom, 2 T5 + 2 CN)', () => {
  const data = buildPunctualityReport(g1Input())

  it('metadata: sheetName, from/to, timeLabel, ngày buổi', () => {
    expect(data.sheetName).toBe('Thong ke dung gio')
    expect(data.fromDate).toBe('2026-11-23')
    expect(data.toDate).toBe('2026-12-06')
    expect(data.timeLabel).toBe('Từ 23/11/2026 đến 06/12/2026')
    expect(data.thu5Dates).toEqual(['2026-11-26', '2026-12-03'])
    expect(data.cnDates).toEqual(['2026-11-29', '2026-12-06'])
  })

  it('phân đoàn ẤU, THIẾU theo branchOrder; lớp Demo bị loại', () => {
    expect(data.branches.map((branch) => branch.label)).toEqual(['ẤU', 'THIẾU'])
    expect(data.branches.map((branch) => branch.branch)).toEqual(['Ấu Nhi', 'Thiếu Nhi'])
    expect(data.branches.map((branch) => branch.sundaySession)).toEqual(['cn_le', 'cn'])
    expect(data.branches.flatMap((branch) => branch.classes.map((item) => item.className))).toEqual(['Ấu 1', 'Thiếu 1'])
  })

  it('Ấu 1', () => {
    const row = rowOf(data, 'Ấu 1')
    expect(row.classId).toBe('c-au')
    expect(row.studentCount).toBe(4)
    expectRates(row.thu5Rates, [0.75, 0.25])
    expectRate(row.thu5Average, 0.5)
    expectRates(row.sundayRates, [0.5, 1])
    expectRate(row.sundayAverage, 0.75)
    expect(row.late).toBe(1)
    expect(row.unknown).toBe(1)
    expect(row.note).toBe('Trễ: 1 lượt · Chưa xét: 1 lượt')
  })

  it('Thiếu 1: CN 06/12 toàn Chưa xét → null, không vào trung bình', () => {
    const row = rowOf(data, 'Thiếu 1')
    expect(row.studentCount).toBe(5)
    expectRates(row.thu5Rates, [0.4, 0.8])
    expectRate(row.thu5Average, 0.6)
    expectRates(row.sundayRates, [0.4, null])
    expectRate(row.sundayAverage, 0.4)
    expect(row.late).toBe(1)
    expect(row.unknown).toBe(0)
    expect(row.note).toBe('Trễ: 1 lượt · 1 buổi CN chưa xét giờ')
  })

  it('tổng', () => {
    expect(data.total.studentCount).toBe(9)
    expectRates(data.total.thu5Rates, [5 / 9, 5 / 9])
    expectRate(data.total.thu5Average, 10 / 18)
    expectRates(data.total.sundayRates, [4 / 9, 1])
    expectRate(data.total.sundayAverage, 8 / 13)
  })

  it('subtitle', () => {
    expect(data.subtitleLines).toEqual([
      'Tỉ lệ thiếu nhi có mặt đúng giờ: (từ 23/11/2026 đến 06/12/2026)',
      '*T5 ngày 26/11 và 3/12  ;  *CN ngày 29/11 và 6/12',
    ])
  })

  it('3 ghi chú cuối bảng (có dòng TB)', () => {
    expect(data.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2, FOOTNOTE_3])
  })

  it('punctualityColumns: T5, TB T5, CN, TB CN theo thứ tự', () => {
    const columns = punctualityColumns(data)
    expect(columns.map((column) => column.label)).toEqual([
      'T5 26/11', 'T5 03/12', 'TB T5', 'CN 29/11', 'CN 06/12', 'TB CN',
    ])
    expect(columns.map((column) => column.kind)).toEqual(['thu5', 'thu5', 'thu5-avg', 'cn', 'cn', 'cn-avg'])
    expect(columns.map((column) => column.index)).toEqual([0, 1, undefined, 0, 1, undefined])
  })

  it('punctualityCellRate khớp từng cột cho hàng và tổng', () => {
    const columns = punctualityColumns(data)
    const thieu = rowOf(data, 'Thiếu 1')
    expectRates(columns.map((column) => punctualityCellRate(thieu, column)), [0.4, 0.8, 0.6, 0.4, null, 0.4])
    expectRates(
      columns.map((column) => punctualityCellRate(data.total, column)),
      [5 / 9, 5 / 9, 10 / 18, 4 / 9, 1, 8 / 13]
    )
  })

  it('tên sheet ≤ 31 ký tự, PUNCTUALITY_REPORT_TITLE, punctualityFileBase', () => {
    expect(data.sheetName.length).toBeLessThanOrEqual(31)
    expect(PUNCTUALITY_REPORT_TITLE).toBe('THỐNG KÊ TỈ LỆ CÓ MẶT ĐÚNG GIỜ')
    expect(punctualityFileBase('2026-11-23', '2026-12-06')).toBe('thong_ke_dung_gio_2026-11-23_2026-12-06')
  })

  it('không còn khái niệm bảng tuần / tổng hợp trong dữ liệu', () => {
    expect(Object.keys(data).sort()).toEqual([
      'branches', 'cnDates', 'footnotes', 'fromDate', 'sheetName', 'subtitleLines',
      'thu5Dates', 'timeLabel', 'toDate', 'total',
    ])
  })
})

// ───────────────────────── G2 ─────────────────────────

describe('buildPunctualityReport — G2 (mode day, Chủ nhật 29/11)', () => {
  const data = buildPunctualityReport(
    g1Input({
      mode: 'day',
      fromDate: '2026-11-29',
      toDate: '2026-11-29',
      sessions: { thu5: [], cn: ['2026-11-29'] },
    })
  )

  it('không có T5; cột duy nhất CN 29/11, không có TB', () => {
    expect(data.thu5Dates).toEqual([])
    expect(data.cnDates).toEqual(['2026-11-29'])
    expect(punctualityColumns(data).map((column) => column.label)).toEqual(['CN 29/11'])
  })

  it('Ấu 1, Thiếu 1, tổng', () => {
    const au = rowOf(data, 'Ấu 1')
    const thieu = rowOf(data, 'Thiếu 1')
    expect(au.thu5Rates).toEqual([])
    expect(au.thu5Average).toBeNull()
    expectRates(au.sundayRates, [0.5])
    expect(au.note).toBe('Trễ: 1 lượt · Chưa xét: 1 lượt')
    expectRates(thieu.sundayRates, [0.4])
    expect(thieu.note).toBe('Trễ: 1 lượt')
    expectRates(data.total.sundayRates, [4 / 9])
    expect(data.total.thu5Rates).toEqual([])
    expect(data.total.thu5Average).toBeNull()
  })

  it('2 ghi chú (không có dòng TB), subtitle và timeLabel mode day', () => {
    expect(data.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2])
    expect(data.subtitleLines).toEqual([
      'Tỉ lệ thiếu nhi có mặt đúng giờ: (ngày 29/11/2026)',
      '*T5 ngày không có buổi  ;  *CN ngày 29/11',
    ])
    expect(data.timeLabel).toBe('Ngày 29/11/2026')
  })

  it('mode day trên Thứ 5: chỉ cột T5, không xét giờ', () => {
    const thursday = buildPunctualityReport(
      g1Input({
        mode: 'day',
        fromDate: '2026-11-26',
        toDate: '2026-11-26',
        sessions: { thu5: ['2026-11-26'], cn: [] },
      })
    )
    expect(punctualityColumns(thursday).map((column) => column.label)).toEqual(['T5 26/11'])
    expectRates(rowOf(thursday, 'Ấu 1').thu5Rates, [0.75])
    expect(rowOf(thursday, 'Ấu 1').sundayRates).toEqual([])
    expect(rowOf(thursday, 'Ấu 1').note).toBe('')
    expect(thursday.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2])
    expect(thursday.total.sundayAverage).toBeNull()
  })
})

// ───────────────────────── G3 ─────────────────────────

describe('buildPunctualityReport — G3 (26/11 là ngày lễ)', () => {
  const data = buildPunctualityReport(
    g1Input({ sessions: { thu5: ['2026-12-03'], cn: ['2026-11-29', '2026-12-06'] } })
  )

  it('cột: T5 03/12, CN 29/11, CN 06/12, TB CN (không TB T5)', () => {
    expect(punctualityColumns(data).map((column) => column.label)).toEqual([
      'T5 03/12', 'CN 29/11', 'CN 06/12', 'TB CN',
    ])
  })

  it('T5: Ấu 1 [0.25], Thiếu 1 [0.8], tổng [5/9]', () => {
    expectRates(rowOf(data, 'Ấu 1').thu5Rates, [0.25])
    expectRates(rowOf(data, 'Thiếu 1').thu5Rates, [0.8])
    expectRates(data.total.thu5Rates, [5 / 9])
    expectRate(rowOf(data, 'Ấu 1').thu5Average, 0.25)
  })

  it('subtitle và 3 ghi chú (TB vì CN có 2 buổi)', () => {
    expect(data.subtitleLines[1]).toBe('*T5 ngày 3/12  ;  *CN ngày 29/11 và 6/12')
    expect(data.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2, FOOTNOTE_3])
  })
})

// ───────────────────────── Quy tắc & biên ─────────────────────────

describe('buildPunctualityReport — quy tắc', () => {
  const single = (overrides: Partial<PunctualityReportInput> = {}) =>
    buildPunctualityReport(
      g1Input({
        mode: 'week',
        fromDate: '2026-11-23',
        toDate: '2026-11-29',
        sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] },
        ...overrides,
      })
    )

  it('mode week: timeLabel và subtitle kiểu tuần; 1 T5 + 1 CN → không có cột TB', () => {
    const data = single()
    expect(data.timeLabel).toBe('Tuần: 23/11/2026 - 29/11/2026')
    expect(data.subtitleLines[0]).toBe('Tỉ lệ thiếu nhi có mặt đúng giờ: (tuần từ 23/11/2026 đến 29/11/2026)')
    expect(punctualityColumns(data).map((column) => column.label)).toEqual(['T5 26/11', 'CN 29/11'])
    expect(data.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2])
  })

  it('cột TB xuất hiện riêng cho từng nhóm khi nhóm đó ≥ 2 buổi', () => {
    const onlyThu = single({ sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: ['2026-11-29'] } })
    expect(punctualityColumns(onlyThu).map((column) => column.label)).toEqual(['T5 26/11', 'T5 03/12', 'TB T5', 'CN 29/11'])
    expect(onlyThu.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2, FOOTNOTE_3])
    const onlyCn = single({ sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29', '2026-12-06'] } })
    expect(punctualityColumns(onlyCn).map((column) => column.label)).toEqual(['T5 26/11', 'CN 29/11', 'CN 06/12', 'TB CN'])
  })

  it('không có buổi nào → không cột, mọi trung bình null, tổng null', () => {
    const data = single({ sessions: { thu5: [], cn: [] } })
    expect(punctualityColumns(data)).toEqual([])
    expect(data.total.thu5Rates).toEqual([])
    expect(data.total.thu5Average).toBeNull()
    expect(data.total.sundayAverage).toBeNull()
    expect(rowOf(data, 'Ấu 1').thu5Average).toBeNull()
    expect(rowOf(data, 'Ấu 1').note).toBe('')
    expect(data.footnotes).toEqual([FOOTNOTE_1, FOOTNOTE_2])
  })

  it('mode month: timeLabel và subtitle', () => {
    const data = buildPunctualityReport(
      g1Input({
        mode: 'month',
        fromDate: '2026-11-01',
        toDate: '2026-11-30',
        sessions: { thu5: ['2026-11-05', '2026-11-12'], cn: ['2026-11-08', '2026-11-15'] },
        records: [],
      })
    )
    expect(data.timeLabel).toBe('Tháng 11/2026')
    expect(data.subtitleLines[0]).toBe('Tỉ lệ thiếu nhi có mặt đúng giờ: (tháng 11/2026)')
    expect(data.subtitleLines[1]).toBe('*T5 ngày 5,12/11  ;  *CN ngày 8,15/11')
  })

  it('ngày buổi được sắp tăng dần và khử trùng', () => {
    const data = single({ sessions: { thu5: ['2026-12-03', '2026-11-26', '2026-11-26'], cn: [] } })
    expect(data.thu5Dates).toEqual(['2026-11-26', '2026-12-03'])
  })

  it('bản ghi trùng (student, date, day_type): có false → đúng giờ, else có true → trễ, else chưa xét', () => {
    const records: PunctualityRecord[] = [
      rec('a1', 'cn_le', '2026-11-29', true),
      rec('a1', 'cn_le', '2026-11-29', false),
      rec('a2', 'cn_le', '2026-11-29', null),
      rec('a2', 'cn_le', '2026-11-29', true),
      rec('a3', 'cn_le', '2026-11-29', null),
      rec('a3', 'cn_le', '2026-11-29', null),
      ...thu('2026-11-26', ['a1', 'a1']),
    ]
    const row = rowOf(single({ records }), 'Ấu 1')
    expectRates(row.sundayRates, [0.25])
    expect(row.late).toBe(1)
    expect(row.unknown).toBe(1)
    expectRates(row.thu5Rates, [0.25])
    expect(row.note).toBe('Trễ: 1 lượt · Chưa xét: 1 lượt')
  })

  it('xét giờ tính theo BẤT KỲ học sinh nào (kể cả lớp ngoài báo cáo)', () => {
    const records: PunctualityRecord[] = [
      rec('a1', 'cn_le', '2026-11-29', null),
      rec('d1', 'cn_le', '2026-11-29', false), // lớp Demo đã xét → buổi được coi là đã xét
    ]
    const row = rowOf(single({ records }), 'Ấu 1')
    expectRates(row.sundayRates, [0])
    expectRate(row.sundayAverage, 0)
    expect(row.unknown).toBe(1)
    expect(row.note).toBe('Chưa xét: 1 lượt')
  })

  it('bản ghi absent đã xét giờ không làm buổi thành "đã xét"', () => {
    const records: PunctualityRecord[] = [
      rec('a1', 'cn_le', '2026-11-29', null),
      rec('a2', 'cn_le', '2026-11-29', false, 'absent'),
    ]
    const row = rowOf(single({ records }), 'Ấu 1')
    expect(row.sundayRates).toEqual([null])
    expect(row.sundayAverage).toBeNull()
    expect(row.note).toBe('1 buổi CN chưa xét giờ')
  })

  it('bản ghi có mặt KHÔNG có thuộc tính is_late → buổi chưa xét', () => {
    const noField = { student_id: 't1', status: 'present', day_type: 'cn', attendance_date: '2026-11-29' }
    const row = rowOf(single({ records: [noField as unknown as PunctualityRecord] }), 'Thiếu 1')
    expect(row.sundayRates).toEqual([null])
    expect(row.sundayAverage).toBeNull()
    expect(row.note).toBe('1 buổi CN chưa xét giờ')
  })

  it('lớp trống: studentCount 0 → mọi tỉ lệ null (và không NaN)', () => {
    const data = single({ students: STUDENTS.filter((student) => student.class_id !== 'c-au') })
    const row = rowOf(data, 'Ấu 1')
    expect(row.studentCount).toBe(0)
    expect(row.thu5Rates).toEqual([null])
    expect(row.thu5Average).toBeNull()
    expect(row.sundayRates).toEqual([null])
    expect(row.sundayAverage).toBeNull()
    expect(data.total.studentCount).toBe(5)
    expectRates(data.total.thu5Rates, [0.4])
  })

  it('toàn bộ lớp trống → tổng toàn null', () => {
    const data = single({ students: [] })
    expect(data.total.studentCount).toBe(0)
    expect(data.total.thu5Rates).toEqual([null])
    expect(data.total.thu5Average).toBeNull()
    expect(data.total.sundayRates).toEqual([null])
    expect(data.total.sundayAverage).toBeNull()
  })

  it('học sinh không có lớp (class_id null) bị bỏ qua', () => {
    const data = single({ students: [...STUDENTS, { id: 'x1', class_id: null }] })
    expect(data.total.studentCount).toBe(9)
  })

  it('ngành không có lớp bị bỏ; thứ tự lớp theo display_order (null cuối) rồi tên', () => {
    const classes = [
      { id: 'c-b', name: 'Ấu B', branch: 'Ấu Nhi', display_order: null },
      { id: 'c-a2', name: 'Ấu 2', branch: 'Ấu Nhi', display_order: 5 },
      { id: 'c-a1', name: 'Ấu 1', branch: 'Ấu Nhi', display_order: 5 },
      { id: 'c-a', name: 'Ấu A', branch: 'Ấu Nhi', display_order: null },
    ]
    const data = single({ classes, students: [] })
    expect(data.branches).toHaveLength(1)
    expect(data.branches[0].classes.map((item) => item.className)).toEqual(['Ấu 1', 'Ấu 2', 'Ấu A', 'Ấu B'])
  })

  it('branchOrder quyết định thứ tự ngành', () => {
    const data = single({ branchOrder: ['Thiếu Nhi', 'Ấu Nhi'] })
    expect(data.branches.map((branch) => branch.label)).toEqual(['THIẾU', 'ẤU'])
  })

  it('tổng CN chỉ chia cho các lớp đã xét buổi đó', () => {
    // Ấu xét giờ cả 2 CN; Thiếu chỉ xét CN đầu → CN 2: chỉ Ấu (4/4); trung bình tổng = (2+4+2) / (4*2 + 5*1)
    const data = buildPunctualityReport(g1Input())
    expect(data.total.sundayRates[1]).toBeCloseTo(1, 10)
    expect(data.total.sundayAverage).toBeCloseTo(8 / 13, 10)
  })

  it('không có Thứ 5: thu5Rates rỗng, thu5Average null, CN vẫn tính', () => {
    const data = single({ sessions: { thu5: [], cn: ['2026-11-29'] } })
    expect(data.total.thu5Rates).toEqual([])
    expect(rowOf(data, 'Thiếu 1').thu5Average).toBeNull()
    expectRates(rowOf(data, 'Thiếu 1').sundayRates, [0.4])
  })

  it('Chiên Con dùng cn_le, Nghĩa Sĩ dùng cn', () => {
    const classes = [
      { id: 'c-chien', name: 'Chiên 1', branch: 'Chiên Con', display_order: 1 },
      { id: 'c-nghia', name: 'Nghĩa 1', branch: 'Nghĩa Sĩ', display_order: 1 },
    ]
    const students = [
      { id: 'k1', class_id: 'c-chien' },
      { id: 'n1', class_id: 'c-nghia' },
    ]
    const records = [
      rec('k1', 'cn_le', '2026-11-29', false),
      rec('k1', 'cn', '2026-11-29', true),
      rec('n1', 'cn', '2026-11-29', false),
      rec('n1', 'cn_le', '2026-11-29', true),
    ]
    const data = single({ classes, students, records })
    expect(data.branches.map((branch) => branch.label)).toEqual(['CHIÊN CON', 'NGHĨA'])
    expectRates(rowOf(data, 'Chiên 1').sundayRates, [1])
    expect(rowOf(data, 'Chiên 1').late).toBe(0)
    expectRates(rowOf(data, 'Nghĩa 1').sundayRates, [1])
    expect(rowOf(data, 'Nghĩa 1').late).toBe(0)
  })

  it('không đọc bản ghi ngoài ngày buổi (không lệch UTC)', () => {
    const records = [rec('a1', 'cn_le', '2026-11-28', false), rec('a1', 'thu5', '2026-11-25')]
    const row = rowOf(single({ records }), 'Ấu 1')
    expectRates(row.thu5Rates, [0])
    expect(row.sundayRates).toEqual([null])
  })

  it('không đột biến input', () => {
    const input = g1Input()
    const snapshot = JSON.stringify(input)
    buildPunctualityReport(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})

// ───────────────────────── Định dạng ─────────────────────────

describe('formatPunctualityRate', () => {
  it('null → —', () => {
    expect(formatPunctualityRate(null)).toBe('—')
  })

  it('làm tròn phần trăm', () => {
    expect(formatPunctualityRate(0)).toBe('0%')
    expect(formatPunctualityRate(0.75)).toBe('75%')
    expect(formatPunctualityRate(1)).toBe('100%')
    expect(formatPunctualityRate(5 / 9)).toBe('56%')
    expect(formatPunctualityRate(8 / 13)).toBe('62%')
  })
})

describe('punctualityCellRate — biên', () => {
  it('chỉ số vượt mảng → null', () => {
    const data = buildPunctualityReport(g1Input())
    const row: PunctualityRow = rowOf(data, 'Ấu 1')
    expect(punctualityCellRate(row, { kind: 'thu5', label: 'x', index: 9 })).toBeNull()
    expect(punctualityCellRate(row, { kind: 'cn', label: 'x', index: 9 })).toBeNull()
  })
})
