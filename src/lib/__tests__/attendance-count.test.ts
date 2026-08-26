import { describe, it, expect } from 'vitest'
import { isWithinSchoolYear } from '../sunday-attendance'

describe('isWithinSchoolYear', () => {
  const sy = { start_date: '2026-09-13', end_date: '2027-05-16' }

  it('ngày trong khoảng năm học thì tính', () => {
    expect(isWithinSchoolYear('2026-09-13', sy)).toBe(true)
    expect(isWithinSchoolYear('2026-12-25', sy)).toBe(true)
    expect(isWithinSchoolYear('2027-05-16', sy)).toBe(true)
  })

  it('điểm danh test trước ngày bắt đầu (13/9) không tính', () => {
    expect(isWithinSchoolYear('2026-08-26', sy)).toBe(false)
    expect(isWithinSchoolYear('2026-09-12', sy)).toBe(false)
  })

  it('sau ngày tổng kết (16/5) không tính', () => {
    expect(isWithinSchoolYear('2027-05-17', sy)).toBe(false)
    expect(isWithinSchoolYear('2027-06-06', sy)).toBe(false)
  })

  it('thiếu thông tin năm học thì không chặn (giữ hành vi cũ)', () => {
    expect(isWithinSchoolYear('2026-08-26', null)).toBe(true)
    expect(isWithinSchoolYear('2026-08-26', undefined)).toBe(true)
    expect(isWithinSchoolYear('2026-08-26', { start_date: null, end_date: null })).toBe(true)
  })
})
