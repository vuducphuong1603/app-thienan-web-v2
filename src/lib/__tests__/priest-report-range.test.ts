import { describe, expect, it } from 'vitest'
import { attendanceRateByStudents, countWeekdays } from '../priest-report'

describe('countWeekdays', () => {
  it('counts 5 Thursdays and 4 Sundays in October 2026', () => {
    expect(countWeekdays('2026-10-01', '2026-10-31')).toEqual({ thu5: 5, cn: 4 })
  })

  it('counts weekdays across a month boundary, including both endpoints', () => {
    expect(countWeekdays('2026-09-30', '2026-10-08')).toEqual({ thu5: 2, cn: 1 })
  })

  it('counts a single Thursday date', () => {
    expect(countWeekdays('2026-10-01', '2026-10-01')).toEqual({ thu5: 1, cn: 0 })
  })

  it('counts a single Sunday date', () => {
    expect(countWeekdays('2026-10-04', '2026-10-04')).toEqual({ thu5: 0, cn: 1 })
  })

  it('returns zero counts for a single date that is neither Thursday nor Sunday', () => {
    expect(countWeekdays('2026-10-02', '2026-10-02')).toEqual({ thu5: 0, cn: 0 })
  })

  it('returns zero counts for a reversed date range', () => {
    expect(countWeekdays('2026-10-31', '2026-10-01')).toEqual({ thu5: 0, cn: 0 })
  })
})

describe('attendanceRateByStudents', () => {
  it('calculates 82.1% for 28 students with 5 fully absent', () => {
    expect(attendanceRateByStudents(28, 5)).toBeCloseTo(82.1, 1)
  })

  it('returns null when the student count is zero', () => {
    expect(attendanceRateByStudents(0, 0)).toBeNull()
  })

  it('returns null when the student count is negative', () => {
    expect(attendanceRateByStudents(-2, 1)).toBeNull()
  })

  it('returns 100% when no students are absent', () => {
    expect(attendanceRateByStudents(28, 0)).toBe(100)
  })

  it('returns 0% when all students are absent', () => {
    expect(attendanceRateByStudents(28, 28)).toBe(0)
  })

  it('clamps an absent count above the class size to all absent', () => {
    expect(attendanceRateByStudents(28, 35)).toBe(0)
  })

  it('clamps a negative absent count to no absences', () => {
    expect(attendanceRateByStudents(28, -3)).toBe(100)
  })

  it('calculates a branch rate from summed class sizes and absences', () => {
    expect(attendanceRateByStudents(28 + 30, 5 + 3)).toBeCloseTo((50 / 58) * 100)
  })
})
