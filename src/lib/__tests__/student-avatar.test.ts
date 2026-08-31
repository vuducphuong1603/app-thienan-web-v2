import { describe, it, expect } from 'vitest'
import {
  validateAvatarFile,
  buildAvatarPath,
  extractStoragePath,
  MAX_AVATAR_SIZE,
  STUDENT_PHOTOS_BUCKET,
} from '../student-avatar'

describe('validateAvatarFile', () => {
  it('chấp nhận ảnh JPG/PNG/WebP dưới 5MB', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(validateAvatarFile({ type: 'image/png', size: MAX_AVATAR_SIZE })).toBeNull()
    expect(validateAvatarFile({ type: 'image/webp', size: 500_000 })).toBeNull()
  })

  it('từ chối file không phải ảnh', () => {
    expect(validateAvatarFile({ type: 'application/pdf', size: 1024 })).toMatch(/hình ảnh/)
    expect(validateAvatarFile({ type: 'video/mp4', size: 1024 })).toMatch(/hình ảnh/)
  })

  it('từ chối file quá 5MB', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: MAX_AVATAR_SIZE + 1 })).toMatch(/5MB/)
  })

  it('từ chối file rỗng', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 0 })).toMatch(/rỗng/i)
  })
})

describe('buildAvatarPath', () => {
  it('dựng path theo studentId + timestamp + đuôi file theo mime', () => {
    expect(buildAvatarPath('abc-123', 'image/png', 1700000000000)).toBe(
      'students/abc-123/1700000000000.png'
    )
    expect(buildAvatarPath('abc-123', 'image/jpeg', 1)).toBe('students/abc-123/1.jpg')
    expect(buildAvatarPath('abc-123', 'IMAGE/WEBP', 2)).toBe('students/abc-123/2.webp')
  })

  it('mime lạ (vd camera iOS) fallback về jpg', () => {
    expect(buildAvatarPath('x', 'image/unknown', 5)).toBe('students/x/5.jpg')
    expect(buildAvatarPath('x', '', 5)).toBe('students/x/5.jpg')
  })
})

describe('extractStoragePath', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public'

  it('lấy lại path trong bucket student-photos từ public URL', () => {
    expect(
      extractStoragePath(`${base}/${STUDENT_PHOTOS_BUCKET}/students/abc/170.jpg`)
    ).toBe('students/abc/170.jpg')
  })

  it('bỏ query string nếu có', () => {
    expect(
      extractStoragePath(`${base}/${STUDENT_PHOTOS_BUCKET}/students/abc/170.jpg?t=123`)
    ).toBe('students/abc/170.jpg')
  })

  it('trả null với avatar cũ dạng base64 hoặc URL ngoài', () => {
    expect(extractStoragePath('data:image/png;base64,iVBOR...')).toBeNull()
    expect(extractStoragePath('https://example.com/a.jpg')).toBeNull()
    expect(extractStoragePath(`${base}/avatars/x.jpg`)).toBeNull()
    expect(extractStoragePath(null)).toBeNull()
    expect(extractStoragePath('')).toBeNull()
  })
})
