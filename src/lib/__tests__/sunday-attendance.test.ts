import { describe, it, expect } from 'vitest'
import {
  computeSundayCount,
  sundayFullyPresentIds,
  sundayStatus,
  holidayDayTypesFor,
  isSundayType,
  dayTypeLabel,
} from '../sunday-attendance'

describe('computeSundayCount', () => {
  it('đủ cả giáo lý và đi lễ = 1 buổi', () => {
    expect(computeSundayCount(1, 1)).toBe(1)
  })
  it('chỉ 1 trong 2 = nửa buổi', () => {
    expect(computeSundayCount(1, 0)).toBe(0.5)
    expect(computeSundayCount(0, 1)).toBe(0.5)
  })
  it('cộng dồn nhiều tuần', () => {
    expect(computeSundayCount(10, 7)).toBe(8.5)
    expect(computeSundayCount(0, 0)).toBe(0)
  })
})

describe('sundayFullyPresentIds', () => {
  it('chỉ nhận em có mặt cả 2 buổi', () => {
    const ids = sundayFullyPresentIds([
      { student_id: 'a', day_type: 'cn' },
      { student_id: 'a', day_type: 'cn_le' },
      { student_id: 'b', day_type: 'cn' },
      { student_id: 'c', day_type: 'cn_le' },
    ])
    expect(Array.from(ids)).toEqual(['a'])
  })
  it('bỏ qua bản ghi vắng và thứ 5', () => {
    const ids = sundayFullyPresentIds([
      { student_id: 'a', day_type: 'cn', status: 'present' },
      { student_id: 'a', day_type: 'cn_le', status: 'absent' },
      { student_id: 'b', day_type: 'thu5', status: 'present' },
    ])
    expect(ids.size).toBe(0)
  })
})

describe('sundayStatus', () => {
  it('phân loại đúng', () => {
    expect(sundayStatus('present', 'present')).toBe('full')
    expect(sundayStatus('present', null)).toBe('catechism_only')
    expect(sundayStatus(null, 'present')).toBe('mass_only')
    expect(sundayStatus('absent', null)).toBe('absent')
    expect(sundayStatus('absent', 'absent')).toBe('absent')
    expect(sundayStatus(null, null)).toBe('none')
    expect(sundayStatus(undefined, undefined)).toBe('none')
  })
})

describe('helpers', () => {
  it('holidayDayTypesFor: cn_le kiểm tra như cn', () => {
    expect(holidayDayTypesFor('cn_le')).toEqual(['cn', 'both'])
    expect(holidayDayTypesFor('cn')).toEqual(['cn', 'both'])
    expect(holidayDayTypesFor('thu5')).toEqual(['thu5', 'both'])
  })
  it('isSundayType', () => {
    expect(isSundayType('cn')).toBe(true)
    expect(isSundayType('cn_le')).toBe(true)
    expect(isSundayType('thu5')).toBe(false)
  })
  it('dayTypeLabel', () => {
    expect(dayTypeLabel('thu5')).toBe('Thứ 5')
    expect(dayTypeLabel('cn')).toBe('Chủ nhật · Học giáo lý')
    expect(dayTypeLabel('cn_le')).toBe('Chủ nhật · Đi lễ')
  })
})

import { mergeSundayRecords } from '../sunday-attendance'

describe('mergeSundayRecords', () => {
  const rec = (student_id: string, attendance_date: string, day_type: string, status: string) =>
    ({ student_id, attendance_date, day_type, status })

  it('đủ 2 buổi → 1 bản ghi cn present', () => {
    const out = mergeSundayRecords([
      rec('a', '2026-08-23', 'cn', 'present'),
      rec('a', '2026-08-23', 'cn_le', 'present'),
    ])
    expect(out).toEqual([rec('a', '2026-08-23', 'cn', 'present')])
  })
  it('thiếu 1 buổi → absent', () => {
    expect(mergeSundayRecords([rec('a', '2026-08-23', 'cn', 'present')]))
      .toEqual([rec('a', '2026-08-23', 'cn', 'absent')])
    expect(mergeSundayRecords([rec('a', '2026-08-23', 'cn_le', 'present')]))
      .toEqual([rec('a', '2026-08-23', 'cn', 'absent')])
    expect(mergeSundayRecords([rec('a', '2026-08-23', 'cn', 'present'), rec('a', '2026-08-23', 'cn_le', 'absent')]))
      .toEqual([rec('a', '2026-08-23', 'cn', 'absent')])
  })
  it('thứ 5 giữ nguyên, không gộp nhầm khác ngày/khác em', () => {
    const out = mergeSundayRecords([
      rec('a', '2026-08-20', 'thu5', 'present'),
      rec('a', '2026-08-23', 'cn', 'present'),
      rec('b', '2026-08-23', 'cn', 'present'),
      rec('b', '2026-08-23', 'cn_le', 'present'),
      rec('a', '2026-08-30', 'cn_le', 'present'),
    ])
    expect(out).toHaveLength(4)
    expect(out.find(r => r.day_type === 'thu5')?.status).toBe('present')
    expect(out.find(r => r.student_id === 'b')?.status).toBe('present')
    expect(out.filter(r => r.student_id === 'a' && r.day_type === 'cn').map(r => r.status)).toEqual(['absent', 'absent'])
  })
})

import { isSundayDate, countSundayReport } from '../sunday-attendance'

describe('isSundayDate', () => {
  it('nhận đúng Chủ nhật theo giờ địa phương', () => {
    expect(isSundayDate('2026-08-23')).toBe(true)
    expect(isSundayDate('2026-08-20')).toBe(false)
    expect(isSundayDate('2026-08-25')).toBe(false)
  })
})

describe('countSundayReport', () => {
  it('đếm lượt đủ 2 buổi và lượt chỉ 1 buổi', () => {
    const r = countSundayReport([
      { attendance: { '2026-08-23': 'present', '2026-08-30': 'present' }, attendance_mass: { '2026-08-23': 'present', '2026-08-30': null } },
      { attendance: { '2026-08-23': null, '2026-08-30': 'absent' }, attendance_mass: { '2026-08-23': 'present', '2026-08-30': 'absent' } },
      { attendance: { '2026-08-23': 'present' } },
    ], ['2026-08-23', '2026-08-30'])
    expect(r).toEqual({ full: 1, partial: 3 })
  })
})
