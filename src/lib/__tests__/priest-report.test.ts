import { describe, expect, it } from 'vitest'
import {
  buildAbsentWarnings,
  countAttendanceDays,
  countFullyAbsentByClass,
  matchesAttendanceType,
  monthRange,
  monthOverlapsSchoolYear,
  presentStudentIds,
  previousMonth,
  type PriestStudent,
} from '../priest-report'

const student = (overrides: Partial<PriestStudent> = {}): PriestStudent => ({
  id: 'student-1',
  saint_name: 'Phêrô',
  full_name: 'Nguyễn Văn An',
  class_id: 'class-1',
  parent_phone: '0901 111 222',
  parent_phone_2: null,
  ...overrides,
})

describe('monthRange', () => {
  it('returns September 2026 as local calendar dates', () => {
    expect(monthRange(2026, 8)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('returns leap day for February 2028', () => {
    expect(monthRange(2028, 1)).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('returns December 31 as the last date of December', () => {
    expect(monthRange(2026, 11)).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
})

describe('previousMonth', () => {
  it('moves January to December of the previous year', () => {
    expect(previousMonth(2026, 0)).toEqual({ year: 2025, monthIndex0: 11 })
  })

  it('moves an ordinary month back by one', () => {
    expect(previousMonth(2026, 8)).toEqual({ year: 2026, monthIndex0: 7 })
  })
})

describe('monthOverlapsSchoolYear', () => {
  const schoolYear = { start_date: '2026-09-13', end_date: '2027-05-16' }

  it('returns false for August before the school year starts', () => {
    expect(monthOverlapsSchoolYear(monthRange(2026, 7), schoolYear)).toBe(false)
  })

  it('returns true for September containing the school year start', () => {
    expect(monthOverlapsSchoolYear(monthRange(2026, 8), schoolYear)).toBe(true)
  })

  it('returns true for May containing the school year end', () => {
    expect(monthOverlapsSchoolYear(monthRange(2027, 4), schoolYear)).toBe(true)
  })

  it('returns false for June after the school year ends', () => {
    expect(monthOverlapsSchoolYear(monthRange(2027, 5), schoolYear)).toBe(false)
  })

  it('returns false when no school year is available', () => {
    expect(monthOverlapsSchoolYear(monthRange(2026, 8), null)).toBe(false)
  })
})

describe('attendance records', () => {
  it('matches all, Thursday, Sunday catechism, and Sunday mass types', () => {
    expect(matchesAttendanceType('thu5', 'all')).toBe(true)
    expect(matchesAttendanceType('cn', 'all')).toBe(true)
    expect(matchesAttendanceType('cn_le', 'all')).toBe(true)
    expect(matchesAttendanceType('thu5', 'thu5')).toBe(true)
    expect(matchesAttendanceType('cn', 'thu5')).toBe(false)
    expect(matchesAttendanceType('cn', 'cn')).toBe(true)
    expect(matchesAttendanceType('cn_le', 'cn')).toBe(true)
    expect(matchesAttendanceType('unknown', 'all')).toBe(false)
  })

  it('does not count a student as absent after one present record', () => {
    const present = presentStudentIds(
      [{ student_id: 'student-1', status: 'present', day_type: 'thu5' }],
      'all'
    )

    expect(present).toEqual(new Set(['student-1']))
    expect(countFullyAbsentByClass([student()], present)).toEqual(new Map([['class-1', 0]]))
  })

  it('counts a cn_le-only present record for the cn selection', () => {
    const present = presentStudentIds(
      [{ student_id: 'student-1', status: 'present', day_type: 'cn_le' }],
      'cn'
    )

    expect(present).toEqual(new Set(['student-1']))
  })

  it('ignores non-present and mismatched attendance records', () => {
    const present = presentStudentIds(
      [
        { student_id: 'student-1', status: 'absent', day_type: 'thu5' },
        { student_id: 'student-2', status: 'present', day_type: 'cn' },
      ],
      'thu5'
    )

    expect(present).toEqual(new Set())
  })

  it('counts fully absent students by their current class', () => {
    const students = [
      student({ id: 'student-1', class_id: 'class-1' }),
      student({ id: 'student-2', class_id: 'class-1' }),
      student({ id: 'student-3', class_id: 'class-2' }),
      student({ id: 'student-4', class_id: null }),
    ]

    expect(countFullyAbsentByClass(students, new Set(['student-2']))).toEqual(
      new Map([
        ['class-1', 1],
        ['class-2', 1],
      ])
    )
  })
})

describe('buildAbsentWarnings', () => {
  const classes = [
    { id: 'class-2', name: 'Thiếu 2A', display_order: 2 },
    { id: 'class-1', name: 'Ấu 1A', display_order: 1 },
  ]

  it('warns a student absent in both consecutive months', () => {
    const warnings = buildAbsentWarnings(
      [student({ id: 'student-1' })],
      classes,
      new Set(),
      new Set()
    )

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ studentId: 'student-1', className: 'Ấu 1A' })
  })

  it('does not warn when the previous month was present', () => {
    expect(
      buildAbsentWarnings([student()], classes, new Set(), new Set(['student-1']))
    ).toEqual([])
  })

  it('does not warn when the current month was present', () => {
    expect(
      buildAbsentWarnings([student()], classes, new Set(['student-1']), new Set())
    ).toEqual([])
  })

  it('trims, removes empty values, and de-duplicates parent phones', () => {
    const warnings = buildAbsentWarnings(
      [
        student({
          parent_phone: ' 0901 111 222 ',
          parent_phone_2: '0901 111 222',
        }),
      ],
      classes,
      new Set(),
      new Set()
    )

    expect(warnings[0]?.parentPhones).toEqual(['0901 111 222'])
  })

  it('sorts by class display order and then Vietnamese given name', () => {
    const warnings = buildAbsentWarnings(
      [
        student({ id: 'student-1', full_name: 'Trần Bảo', class_id: 'class-2' }),
        student({ id: 'student-2', full_name: 'Nguyễn Duy', class_id: 'class-1' }),
        student({ id: 'student-3', full_name: 'Nguyễn An', class_id: 'class-1' }),
      ],
      classes,
      new Set(),
      new Set()
    )

    expect(warnings.map((warning) => warning.studentId)).toEqual([
      'student-3',
      'student-2',
      'student-1',
    ])
  })

  it('sorts same-class students by given name rather than family name', () => {
    const warnings = buildAbsentWarnings(
      [
        student({ id: 'student-binh', full_name: 'Nguyễn Văn Bình' }),
        student({ id: 'student-an', full_name: 'Trần Thị An' }),
      ],
      classes,
      new Set(),
      new Set()
    )

    expect(warnings.map((warning) => warning.studentId)).toEqual(['student-an', 'student-binh'])
  })

  it('puts a student whose class is missing from the class list last', () => {
    const warnings = buildAbsentWarnings(
      [
        student({ id: 'student-1', full_name: 'Nguyễn A', class_id: 'missing' }),
        student({ id: 'student-2', full_name: 'Nguyễn B', class_id: 'class-1' }),
      ],
      classes,
      new Set(),
      new Set()
    )

    expect(warnings.map((warning) => warning.studentId)).toEqual(['student-2', 'student-1'])
  })
})

describe('countAttendanceDays', () => {
  it('counts Thursdays and Sundays for all, excluding holidays', () => {
    const holidays = new Set(['2026-09-02', '2026-09-06'])

    expect(countAttendanceDays('2026-09-01', '2026-09-30', 'all', holidays)).toBe(7)
  })

  it('counts only Thursdays for thu5', () => {
    expect(countAttendanceDays('2026-09-01', '2026-09-30', 'thu5', new Set())).toBe(4)
  })

  it('counts only Sundays for cn, including a Sunday holiday exclusion', () => {
    expect(
      countAttendanceDays('2026-09-01', '2026-09-30', 'cn', new Set(['2026-09-13']))
    ).toBe(3)
  })

  it('returns zero for an empty or reversed range', () => {
    expect(countAttendanceDays('2026-09-30', '2026-09-01', 'all', new Set())).toBe(0)
  })
})
