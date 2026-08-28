import { describe, it, expect } from 'vitest'
import {
  buildScoreColumns,
  colLetter,
  buildRowFormulas,
  listAttendanceDates,
  splitFullName,
  attendanceScores,
  type ScoreColumnSelection,
} from '../score-report-excel'

const noneSelected: ScoreColumnSelection = {
  diLeT5: false, hocGL: false, diLeCN: false, diemTB: false,
  score45HK1: false, scoreExamHK1: false, score45HK2: false, scoreExamHK2: false,
  diemTong: false, ketQua: false,
}

describe('buildScoreColumns', () => {
  it('shows all score columns (plus Hạng, minus Kết quả) when nothing is selected', () => {
    const cols = buildScoreColumns(noneSelected)
    const keys = cols.map(c => c.key)
    expect(keys).toEqual([
      'stt', 'saintName', 'hoDem', 'ten',
      'diLeT5', 'hocGL', 'diLeCN', 'diemTB',
      's45HK1', 'examHK1', 's45HK2', 'examHK2', 'tbHK2',
      'tbNam', 'hang',
    ])
  })

  it('includes Kết quả only when explicitly selected', () => {
    const cols = buildScoreColumns({ ...noneSelected, ketQua: true })
    expect(cols.map(c => c.key)).toContain('ketQua')
  })

  it('never adds TB HK1 (tạm ẩn tới khi sơ kết HKI)', () => {
    const cols = buildScoreColumns({ ...noneSelected, score45HK1: true, scoreExamHK1: true })
    const keys = cols.map(c => c.key)
    expect(keys).toContain('s45HK1')
    expect(keys).toContain('examHK1')
    expect(keys).not.toContain('tbHK1')
    expect(keys).not.toContain('tbHK2')
    expect(keys).not.toContain('hang')
  })

  it('splits full name into Họ (đệm) and Tên columns', () => {
    const cols = buildScoreColumns(noneSelected)
    expect(cols.find(c => c.key === 'hoDem')?.label).toBe('Họ')
    expect(cols.find(c => c.key === 'ten')?.label).toBe('Tên')
    expect(splitFullName('Cao Phương Chính')).toEqual({ hoDem: 'Cao Phương', ten: 'Chính' })
    expect(splitFullName('Linh')).toEqual({ hoDem: '', ten: 'Linh' })
    expect(splitFullName('  Nguyễn   Văn  An ')).toEqual({ hoDem: 'Nguyễn Văn', ten: 'An' })
  })

  it('adds Điểm TB only when selected, in the diemdanh group', () => {
    const cols = buildScoreColumns({ ...noneSelected, diemTB: true })
    const keys = cols.map(c => c.key)
    expect(keys).toContain('diemTB')
    expect(keys).not.toContain('diLeCN')
    expect(keys).not.toContain('tbHK2')
    expect(keys).not.toContain('hang')
  })

  it('adds Hạng together with TB Năm', () => {
    const cols = buildScoreColumns({ ...noneSelected, diemTong: true })
    const keys = cols.map(c => c.key)
    expect(keys).toContain('tbNam')
    expect(keys).toContain('hang')
  })

  it('groups columns into the template color blocks', () => {
    const cols = buildScoreColumns(noneSelected)
    const byKey = Object.fromEntries(cols.map(c => [c.key, c.group]))
    expect(byKey.stt).toBe('info')
    expect(byKey.diLeT5).toBe('diemdanh')
    expect(byKey.diLeCN).toBe('diemdanh')
    expect(byKey.diemTB).toBe('diemdanh')
    expect(byKey.s45HK1).toBe('giaoly')
    expect(byKey.tbHK2).toBe('giaoly')
    expect(byKey.tbNam).toBe('tongket')
    expect(byKey.hang).toBe('tongket')
  })
})

describe('colLetter', () => {
  it('converts 0-based column index to Excel letters', () => {
    expect(colLetter(0)).toBe('A')
    expect(colLetter(25)).toBe('Z')
    expect(colLetter(26)).toBe('AA')
    expect(colLetter(27)).toBe('AB')
  })
})

describe('buildRowFormulas', () => {
  it('builds TB and Kết quả formulas from actual column positions', () => {
    const allSelected = Object.fromEntries(
      Object.keys(noneSelected).map(k => [k, true])
    ) as unknown as ScoreColumnSelection
    const cols = buildScoreColumns(allSelected)
    // Data starts at Excel row 10; first student is row 10
    const f = buildRowFormulas(cols, 10, 10, 12)
    // Layout: A stt, B saint, C họ, D tên, E diLeT5, F hocGL, G diLeCN, H diemTB,
    //         I 45HK1, J thiHK1, K 45HK2, L thiHK2, M tbHK2, N tbNam, O hang, P ketQua
    expect(f.diemTB).toBe('(E10*0.4)+(((F10+G10)/2)*0.6)')
    expect(f.tbHK1).toBeUndefined()
    expect(f.tbHK2).toBe('(K10+L10*2)/3')
    // TB Năm vẫn tính được dù cột TB HKI bị ẩn: TB HKI được nội suy từ 45' và Thi HKI
    expect(f.tbNam).toBe('((I10+J10*2)/3+M10*2)/3')
    expect(f.hang).toBe('IF(N10="","",RANK(N10,$N$10:$N$12,0))')
    expect(f.ketQua).toContain('E10<2.5')
    expect(f.ketQua).toContain('"Ở Lại"')
  })

  it('omits formulas whose source columns are hidden', () => {
    const cols = buildScoreColumns({ ...noneSelected, score45HK1: true })
    const f = buildRowFormulas(cols, 10, 10, 12)
    expect(f.tbHK1).toBeUndefined() // Thi HK1 hidden → no formula
    expect(f.tbNam).toBeUndefined()
    expect(f.ketQua).toBeUndefined()
  })

  it('omits Điểm TB formula when a source attendance column is hidden', () => {
    const cols = buildScoreColumns({ ...noneSelected, diemTB: true, diLeT5: true })
    const f = buildRowFormulas(cols, 10, 10, 12)
    expect(f.diemTB).toBeUndefined()
  })
})

describe('attendanceScores', () => {
  it('scales counts to 10 and rounds to 2 decimals; Điểm TB = T5*0.4 + avg(GL, Lễ CN)*0.6', () => {
    const r = attendanceScores({ thu5: 28, cn: 24, cnLe: 26 }, { thu5: 40, cn: 40 })
    expect(r).toEqual({ diem_t5: 7, diem_gl: 6, diem_le_cn: 6.5, diem_tb: 6.55 })
  })
  it('guards against zero effective days', () => {
    const r = attendanceScores({ thu5: 3, cn: 0, cnLe: 0 }, { thu5: 0, cn: 0 })
    expect(r).toEqual({ diem_t5: 0, diem_gl: 0, diem_le_cn: 0, diem_tb: 0 })
  })
})

describe('listAttendanceDates', () => {
  // Tháng 9/2026: các ngày Thứ 5 là 3, 10, 17, 24; Chúa nhật là 6, 13, 20, 27
  it('lists every Thursday in the range for thu5', () => {
    expect(listAttendanceDates('2026-09-01', '2026-09-30', 'thu5')).toEqual([
      '2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24',
    ])
  })

  it('lists every Sunday in the range for cn', () => {
    expect(listAttendanceDates('2026-09-01', '2026-09-30', 'cn')).toEqual([
      '2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27',
    ])
  })

  it('lists both weekdays sorted for all', () => {
    const dates = listAttendanceDates('2026-09-01', '2026-09-13', 'all')
    expect(dates).toEqual(['2026-09-03', '2026-09-06', '2026-09-10', '2026-09-13'])
  })

  it('includes boundary dates and handles range not starting on the weekday', () => {
    // 2026-09-03 là Thứ 5
    expect(listAttendanceDates('2026-09-03', '2026-09-03', 'thu5')).toEqual(['2026-09-03'])
    expect(listAttendanceDates('2026-09-04', '2026-09-09', 'thu5')).toEqual([])
  })
})

import { buildAttendanceExcelColumns } from '../score-report-excel'

describe('buildAttendanceExcelColumns', () => {
  it('Chủ nhật tách GL | Lễ, Thứ 5 và CN nghỉ lễ giữ 1 cột', () => {
    const cols = buildAttendanceExcelColumns(
      ['2026-08-20', '2026-08-23', '2026-08-30'],
      new Map([['2026-08-30', 'Nghỉ']]),
    )
    expect(cols).toEqual([
      { date: '2026-08-20', session: 'single' },
      { date: '2026-08-23', session: 'gl' },
      { date: '2026-08-23', session: 'le' },
      { date: '2026-08-30', session: 'single' },
    ])
  })
})
