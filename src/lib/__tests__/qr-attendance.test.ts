import { describe, it, expect } from 'vitest'
import { parseStudentCode, getScanTarget, shouldThrottleScan, splitSearchWords, studentSearchOrFilter } from '../qr-attendance'

describe('parseStudentCode', () => {
  it('trả về nguyên mã khi QR chỉ chứa mã', () => {
    expect(parseStudentCode('TN0123')).toBe('TN0123')
  })

  it('cắt phần trước " - " khi QR chứa "MÃ - Tên"', () => {
    expect(parseStudentCode('TN0123 - Nguyễn Văn A')).toBe('TN0123')
  })

  it('loại bỏ khoảng trắng thừa', () => {
    expect(parseStudentCode('  TN0123  ')).toBe('TN0123')
    expect(parseStudentCode(' TN0123 - Tên ')).toBe('TN0123')
  })
})

describe('getScanTarget', () => {
  it('Chủ nhật → điểm danh cho chính hôm đó, day_type cn', () => {
    // 2026-08-16 là Chủ nhật
    const target = getScanTarget(new Date(2026, 7, 16, 9, 30))
    expect(target).toEqual({ dateStr: '2026-08-16', dayType: 'cn' })
  })

  it('Thứ 5 → điểm danh cho chính hôm đó, day_type thu5', () => {
    // 2026-08-20 là Thứ 5
    const target = getScanTarget(new Date(2026, 7, 20, 19, 0))
    expect(target).toEqual({ dateStr: '2026-08-20', dayType: 'thu5' })
  })

  it('Thứ 2 → quy về Thứ 5 cùng tuần', () => {
    // 2026-08-17 là Thứ 2 → Thứ 5 là 2026-08-20
    const target = getScanTarget(new Date(2026, 7, 17, 10, 0))
    expect(target).toEqual({ dateStr: '2026-08-20', dayType: 'thu5' })
  })

  it('Thứ 7 → quy về Thứ 5 cùng tuần (lùi lại)', () => {
    // 2026-08-22 là Thứ 7 → Thứ 5 là 2026-08-20
    const target = getScanTarget(new Date(2026, 7, 22, 10, 0))
    expect(target).toEqual({ dateStr: '2026-08-20', dayType: 'thu5' })
  })

  it('dùng ngày local, không lệch vì UTC', () => {
    // 23h59 Chủ nhật giờ VN vẫn phải là ngày Chủ nhật đó
    const target = getScanTarget(new Date(2026, 7, 16, 23, 59))
    expect(target.dateStr).toBe('2026-08-16')
  })
})

describe('shouldThrottleScan', () => {
  it('cho phép quét mã lần đầu và ghi lại thời điểm', () => {
    const recent = new Map<string, number>()
    expect(shouldThrottleScan('TN0123', recent, 1000)).toBe(false)
    expect(recent.get('TN0123')).toBe(1000)
  })

  it('chặn cùng mã trong vòng 3 giây', () => {
    const recent = new Map<string, number>([['TN0123', 1000]])
    expect(shouldThrottleScan('TN0123', recent, 2500)).toBe(true)
  })

  it('cho phép lại sau 3 giây và dọn mã cũ', () => {
    const recent = new Map<string, number>([['TN0123', 1000], ['TN9999', 500]])
    expect(shouldThrottleScan('TN0123', recent, 4100)).toBe(false)
    expect(recent.get('TN0123')).toBe(4100)
    expect(recent.has('TN9999')).toBe(false)
  })

  it('mã khác nhau không chặn lẫn nhau', () => {
    const recent = new Map<string, number>([['TN0123', 1000]])
    expect(shouldThrottleScan('TN0456', recent, 1100)).toBe(false)
  })
})

describe('splitSearchWords', () => {
  it('tách từ khóa theo khoảng trắng, bỏ khoảng trắng thừa', () => {
    expect(splitSearchWords('  Nguyễn   Văn A ')).toEqual(['Nguyễn', 'Văn', 'A'])
  })

  it('chuỗi rỗng hoặc toàn khoảng trắng → mảng rỗng', () => {
    expect(splitSearchWords('')).toEqual([])
    expect(splitSearchWords('   ')).toEqual([])
  })
})

describe('studentSearchOrFilter', () => {
  it('tạo bộ lọc or theo tên, tên thánh và mã thiếu nhi', () => {
    expect(studentSearchOrFilter('An')).toBe(
      'full_name.ilike.%An%,saint_name.ilike.%An%,student_code.ilike.%An%'
    )
  })
})
