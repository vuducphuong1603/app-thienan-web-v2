// QA edge tests — mission priest-absent (owner: qa). Không sửa file này từ phía core/ui.
import { describe, expect, it } from 'vitest'
import {
  buildAbsentWarnings,
  countAttendanceDays,
  countFullyAbsentByClass,
  matchesAttendanceType,
  monthRange,
  presentStudentIds,
  previousMonth,
  type PriestStudent,
} from '../priest-report'

const student = (overrides: Partial<PriestStudent> = {}): PriestStudent => ({
  id: 'sv-1',
  saint_name: 'Maria',
  full_name: 'Nguyễn Thị Hoa',
  class_id: 'c1',
  parent_phone: '0901000001',
  parent_phone_2: null,
  ...overrides,
})

const classes = [
  { id: 'c1', name: 'Ấu 1A', display_order: 1 },
  { id: 'c2', name: 'Ấu 1B', display_order: 2 },
  { id: 'cNull', name: 'Không thứ tự', display_order: null },
]

describe('QA monthRange / previousMonth', () => {
  it('February in a non-leap year ends on the 28th', () => {
    expect(monthRange(2027, 1)).toEqual({ from: '2027-02-01', to: '2027-02-28' })
  })

  it('century year 2100 is NOT a leap year', () => {
    expect(monthRange(2100, 1).to).toBe('2100-02-28')
  })

  it('January range and its previous month chain to December of prior year', () => {
    expect(monthRange(2027, 0)).toEqual({ from: '2027-01-01', to: '2027-01-31' })
    const prev = previousMonth(2027, 0)
    expect(monthRange(prev.year, prev.monthIndex0)).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  it('every month of 2026 starts on 01 and never leaks a UTC-shifted day', () => {
    for (let m = 0; m < 12; m++) {
      const { from, to } = monthRange(2026, m)
      expect(from).toBe(`2026-${String(m + 1).padStart(2, '0')}-01`)
      expect(to.startsWith(`2026-${String(m + 1).padStart(2, '0')}-`)).toBe(true)
      expect(from < to).toBe(true)
    }
  })

  it('rejects out-of-range month index', () => {
    expect(() => monthRange(2026, 12)).toThrow(RangeError)
    expect(() => monthRange(2026, -1)).toThrow(RangeError)
    expect(() => previousMonth(2026, 1.5)).toThrow(RangeError)
  })
})

describe('QA presentStudentIds / matchesAttendanceType', () => {
  it("'thu5' selection ignores cn and cn_le present records", () => {
    const ids = presentStudentIds(
      [
        { student_id: 'a', status: 'present', day_type: 'cn' },
        { student_id: 'a', status: 'present', day_type: 'cn_le' },
        { student_id: 'b', status: 'present', day_type: 'thu5' },
      ],
      'thu5'
    )
    expect(ids).toEqual(new Set(['b']))
  })

  it("'cn' selection ignores thu5 records", () => {
    expect(presentStudentIds([{ student_id: 'a', status: 'present', day_type: 'thu5' }], 'cn').size).toBe(0)
  })

  it('status is case-sensitive: PRESENT / late / excused do not count as present', () => {
    const ids = presentStudentIds(
      [
        { student_id: 'a', status: 'PRESENT', day_type: 'thu5' },
        { student_id: 'b', status: 'late', day_type: 'thu5' },
        { student_id: 'c', status: 'excused', day_type: 'cn' },
      ],
      'all'
    )
    expect(ids.size).toBe(0)
  })

  it('empty record list yields empty set', () => {
    expect(presentStudentIds([], 'all').size).toBe(0)
  })

  it('unknown day_type never matches any selection', () => {
    for (const type of ['all', 'thu5', 'cn'] as const) {
      expect(matchesAttendanceType('', type)).toBe(false)
      expect(matchesAttendanceType('CN', type)).toBe(false)
    }
  })
})

describe('QA countFullyAbsentByClass', () => {
  it('returns an empty map for no students', () => {
    expect(countFullyAbsentByClass([], new Set(['x'])).size).toBe(0)
  })

  it('a class where everyone attended still appears with 0 (not missing)', () => {
    const map = countFullyAbsentByClass([student({ id: 'a' })], new Set(['a']))
    expect(map.get('c1')).toBe(0)
  })

  it('a present id that belongs to no listed student does not reduce any count', () => {
    const map = countFullyAbsentByClass([student({ id: 'a' })], new Set(['ghost']))
    expect(map.get('c1')).toBe(1)
  })

  it('students with null class are skipped, not counted anywhere', () => {
    const map = countFullyAbsentByClass([student({ id: 'a', class_id: null })], new Set())
    expect(map.size).toBe(0)
  })

  it('1000+ students: count equals students minus distinct present ids', () => {
    const students = Array.from({ length: 1500 }, (_, i) => student({ id: `s${i}`, class_id: i % 2 ? 'c1' : 'c2' }))
    const present = new Set(Array.from({ length: 700 }, (_, i) => `s${i}`))
    const map = countFullyAbsentByClass(students, present)
    expect((map.get('c1') ?? 0) + (map.get('c2') ?? 0)).toBe(800)
  })
})

describe('QA buildAbsentWarnings', () => {
  it('student with null class_id is listed with empty className, after known classes', () => {
    const w = buildAbsentWarnings(
      [student({ id: 'a', class_id: null, full_name: 'Nguyễn A' }), student({ id: 'b', full_name: 'Nguyễn B' })],
      classes,
      new Set(),
      new Set()
    )
    expect(w.map((x) => x.studentId)).toEqual(['b', 'a'])
    expect(w[1]?.className).toBe('')
  })

  it('both phones equal except surrounding whitespace collapse to one', () => {
    const w = buildAbsentWarnings(
      [student({ parent_phone: '0901000001', parent_phone_2: '  0901000001  ' })],
      classes,
      new Set(),
      new Set()
    )
    expect(w[0]?.parentPhones).toEqual(['0901000001'])
  })

  it('phones differing only by inner spaces are NOT merged (documented behaviour)', () => {
    const w = buildAbsentWarnings(
      [student({ parent_phone: '0901 000 001', parent_phone_2: '0901000001' })],
      classes,
      new Set(),
      new Set()
    )
    expect(w[0]?.parentPhones).toHaveLength(2)
  })

  it('whitespace-only and null phones give an empty parentPhones array', () => {
    const w = buildAbsentWarnings([student({ parent_phone: '   ', parent_phone_2: null })], classes, new Set(), new Set())
    expect(w[0]?.parentPhones).toEqual([])
  })

  it('only parent_phone_2 set → still listed', () => {
    const w = buildAbsentWarnings([student({ parent_phone: null, parent_phone_2: '0909' })], classes, new Set(), new Set())
    expect(w[0]?.parentPhones).toEqual(['0909'])
  })

  it('null saint_name becomes empty string, not "null"', () => {
    const w = buildAbsentWarnings([student({ saint_name: null })], classes, new Set(), new Set())
    expect(w[0]?.saintName).toBe('')
  })

  it('present in previous month only via cn_le still clears the warning (raw records, no merge)', () => {
    const prev = presentStudentIds([{ student_id: 'sv-1', status: 'present', day_type: 'cn_le' }], 'all')
    expect(buildAbsentWarnings([student()], classes, new Set(), prev)).toEqual([])
  })

  it('class with null display_order sorts after numbered classes but before unknown classes', () => {
    const w = buildAbsentWarnings(
      [
        student({ id: 'u', class_id: 'unknown', full_name: 'A' }),
        student({ id: 'n', class_id: 'cNull', full_name: 'A' }),
        student({ id: 'k', class_id: 'c2', full_name: 'A' }),
      ],
      classes,
      new Set(),
      new Set()
    )
    expect(w.map((x) => x.studentId)).toEqual(['k', 'n', 'u'])
  })

  it('Vietnamese diacritics sort: "Nguyễn Ân" after "Nguyễn An" (vi locale)', () => {
    const w = buildAbsentWarnings(
      [student({ id: '2', full_name: 'Nguyễn Ân' }), student({ id: '1', full_name: 'Nguyễn An' })],
      classes,
      new Set(),
      new Set()
    )
    expect(w.map((x) => x.studentId)).toEqual(['1', '2'])
  })

  it('does not mutate the input arrays', () => {
    const input = [student({ id: 'b', full_name: 'B' }), student({ id: 'a', full_name: 'A' })]
    const snapshot = input.map((s) => s.id)
    buildAbsentWarnings(input, classes, new Set(), new Set())
    expect(input.map((s) => s.id)).toEqual(snapshot)
  })

  it('empty students → empty warnings; all present in both → empty warnings', () => {
    expect(buildAbsentWarnings([], classes, new Set(), new Set())).toEqual([])
    expect(buildAbsentWarnings([student()], classes, new Set(['sv-1']), new Set(['sv-1']))).toEqual([])
  })
})

describe('QA countAttendanceDays', () => {
  it('holiday on all Thursdays of Sep 2026 → thu5 count 0', () => {
    const holidays = new Set(['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24'])
    expect(countAttendanceDays('2026-09-01', '2026-09-30', 'thu5', holidays)).toBe(0)
  })

  it('a Thursday holiday does not affect the cn count', () => {
    expect(countAttendanceDays('2026-09-01', '2026-09-30', 'cn', new Set(['2026-09-03']))).toBe(4)
  })

  it('single-day range that is a Sunday counts 1 for cn and all, 0 for thu5', () => {
    expect(countAttendanceDays('2026-09-06', '2026-09-06', 'cn', new Set())).toBe(1)
    expect(countAttendanceDays('2026-09-06', '2026-09-06', 'all', new Set())).toBe(1)
    expect(countAttendanceDays('2026-09-06', '2026-09-06', 'thu5', new Set())).toBe(0)
  })

  it('crosses a DST-free year boundary (Dec 2026 → Jan 2027) without skipping days', () => {
    // 2026-12-28 (Mon) .. 2027-01-03 (Sun): Thu 31/12 + Sun 3/1
    expect(countAttendanceDays('2026-12-28', '2027-01-03', 'all', new Set())).toBe(2)
  })

  it('full school year range (Sep→Jun) counts every Thursday and Sunday', () => {
    // 2026-09-01 .. 2027-06-30 = 303 days; Thursdays 43, Sundays 43
    expect(countAttendanceDays('2026-09-01', '2027-06-30', 'thu5', new Set())).toBe(43)
    expect(countAttendanceDays('2026-09-01', '2027-06-30', 'cn', new Set())).toBe(43)
  })

  it('rejects non-ISO or impossible dates instead of silently looping', () => {
    expect(() => countAttendanceDays('2026-9-1', '2026-09-30', 'all', new Set())).toThrow(RangeError)
    expect(() => countAttendanceDays('2026-02-30', '2026-03-01', 'all', new Set())).toThrow(RangeError)
    expect(() => countAttendanceDays('2026-09-01T00:00:00Z', '2026-09-30', 'all', new Set())).toThrow(RangeError)
  })
})
