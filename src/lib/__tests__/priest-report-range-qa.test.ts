import { describe, expect, it } from 'vitest'
import { attendanceRateByStudents, countWeekdays } from '../priest-report'

describe('countWeekdays QA boundaries', () => {
  it('counts leap day Thursday and following Sunday across February 2024', () => {
    expect(countWeekdays('2024-02-28', '2024-03-03')).toEqual({ thu5: 1, cn: 1 })
  })

  it('includes both sides of a year boundary', () => {
    expect(countWeekdays('2026-12-31', '2027-01-03')).toEqual({ thu5: 1, cn: 1 })
  })

  it('counts only Thursday in a one-day Thursday range', () => {
    expect(countWeekdays('2026-10-08', '2026-10-08')).toEqual({ thu5: 1, cn: 0 })
  })

  it('counts weekdays across the spring clock change using calendar dates', () => {
    expect(countWeekdays('2025-03-06', '2025-03-16')).toEqual({ thu5: 2, cn: 2 })
  })

  it('counts weekdays across the autumn clock change using calendar dates', () => {
    expect(countWeekdays('2025-10-23', '2025-11-02')).toEqual({ thu5: 2, cn: 2 })
  })

  it('rejects an impossible leap day in a non-leap year', () => {
    expect(() => countWeekdays('2025-02-29', '2025-03-01')).toThrow(RangeError)
  })

  it('rejects malformed and impossible ending dates', () => {
    expect(() => countWeekdays('2026-10-01', '2026-13-01')).toThrow(RangeError)
    expect(() => countWeekdays('2026-10-01', '2026-10-1')).toThrow(RangeError)
  })

  it('returns zero for reversed dates across years', () => {
    expect(countWeekdays('2027-01-01', '2026-12-31')).toEqual({ thu5: 0, cn: 0 })
  })
})

describe('attendanceRateByStudents QA boundaries', () => {
  it('preserves fractional absence arithmetic', () => {
    expect(attendanceRateByStudents(2, 0.5)).toBe(75)
  })

  it('returns null for a negative roster size', () => {
    expect(attendanceRateByStudents(-0.5, 0)).toBeNull()
  })

  it('clamps negative absence to zero', () => {
    expect(attendanceRateByStudents(2, -0.5)).toBe(100)
  })

  it('clamps absence exceeding the roster size', () => {
    expect(attendanceRateByStudents(2, 2.5)).toBe(0)
  })

  it('calculates a weighted branch rate from summed sizes and absences', () => {
    expect(attendanceRateByStudents(2 + 8, 1 + 1)).toBe(80)
  })
})
