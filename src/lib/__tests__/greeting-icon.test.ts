import { describe, it, expect } from 'vitest'
import { getGreetingIcon, normalizePhone } from '../greeting-icon'

describe('getGreetingIcon', () => {
  it('trái tim cho SĐT 0357377064', () => {
    expect(getGreetingIcon('0357377064')).toBe('❤️')
    expect(getGreetingIcon('+84357377064')).toBe('❤️')
    expect(getGreetingIcon('0357 377 064')).toBe('❤️')
  })
  it('vẫy tay cho người khác / không có SĐT', () => {
    expect(getGreetingIcon('0931342706')).toBe('👋')
    expect(getGreetingIcon(null)).toBe('👋')
    expect(getGreetingIcon(undefined)).toBe('👋')
  })
})

describe('normalizePhone', () => {
  it('chuẩn hoá +84 và 84', () => {
    expect(normalizePhone('+84357377064')).toBe('0357377064')
    expect(normalizePhone('84357377064')).toBe('0357377064')
  })
})
