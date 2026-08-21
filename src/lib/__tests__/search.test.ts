import { describe, it, expect } from 'vitest'
import { normalizeSearchText } from '../search'

describe('normalizeSearchText', () => {
  it('bỏ dấu tiếng Việt và hạ chữ thường', () => {
    expect(normalizeSearchText('VÕ THỊ Ý')).toBe('vo thi y')
    expect(normalizeSearchText('Ấu 1A')).toBe('au 1a')
    expect(normalizeSearchText('Nghĩa Sĩ')).toBe('nghia si')
  })

  it('quy đổi chữ đ thành d', () => {
    expect(normalizeSearchText('Nguyễn Văn Đức')).toBe('nguyen van duc')
  })

  it('giữ nguyên chuỗi không dấu và chuỗi rỗng', () => {
    expect(normalizeSearchText('maria')).toBe('maria')
    expect(normalizeSearchText('')).toBe('')
  })

  it('cho phép tìm không dấu ra kết quả có dấu', () => {
    expect(normalizeSearchText('VÕ THỊ Ý').includes(normalizeSearchText('vo thi'))).toBe(true)
    expect(normalizeSearchText('Thiếu Nhi').includes(normalizeSearchText('thieu'))).toBe(true)
  })
})
