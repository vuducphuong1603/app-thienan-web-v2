import { describe, expect, it } from 'vitest'
import { loginIdentifierToEmail, normalizePhone } from '../login-identifier'

describe('normalizePhone', () => {
  it('trims and removes every non-digit except a leading plus', () => {
    expect(normalizePhone(' (090) 123-4567 ')).toBe('0901234567')
  })

  it('converts a +84 prefix to the local leading-zero form', () => {
    expect(normalizePhone('+84 90.123-4567')).toBe('0901234567')
  })

  it('converts an eleven-digit 84 prefix to the local leading-zero form', () => {
    expect(normalizePhone('84901234567')).toBe('0901234567')
  })

  it('preserves an existing leading zero, including repeated leading zeros', () => {
    expect(normalizePhone('0901234567')).toBe('0901234567')
    expect(normalizePhone('00123456789')).toBe('00123456789')
  })
})

describe('loginIdentifierToEmail', () => {
  it('passes through existing local-account emails case-insensitively', () => {
    expect(loginIdentifierToEmail('  GLV001@THIenan.LOCAL ')).toBe('glv001@thienan.local')
  })

  it('passes through any email identifier instead of appending the app domain', () => {
    expect(loginIdentifierToEmail('Member@Example.com')).toBe('member@example.com')
  })

  it('uses the app domain for a non-email identifier after normalization', () => {
    expect(loginIdentifierToEmail('  GLV001  ')).toBe('001@thienan.app')
  })

  it('derives the app email from a local phone number', () => {
    expect(loginIdentifierToEmail('090.123-4567')).toBe('0901234567@thienan.app')
  })

  it('derives the app email from +84 and 84 phone prefixes', () => {
    expect(loginIdentifierToEmail('+84901234567')).toBe('0901234567@thienan.app')
    expect(loginIdentifierToEmail('84901234567')).toBe('0901234567@thienan.app')
  })

  it('uses the app domain for a blank identifier', () => {
    expect(loginIdentifierToEmail('   ')).toBe('@thienan.app')
  })
})
