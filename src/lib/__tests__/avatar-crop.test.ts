// Test toán học crop avatar: scale phủ khung, kẹp offset khi kéo ảnh,
// và tính vùng cắt trên ảnh gốc từ zoom/offset trong khung xem trước.
import { describe, it, expect } from 'vitest'
import { coverScale, clampOffset, computeSourceRect, MIN_ZOOM, MAX_ZOOM } from '../avatar-crop'

describe('coverScale', () => {
  it('ảnh vuông bằng khung → scale 1', () => {
    expect(coverScale(100, 100, 100)).toBe(1)
  })
  it('ảnh ngang: scale theo chiều thấp hơn để phủ kín khung', () => {
    expect(coverScale(200, 100, 100)).toBe(1)
    expect(coverScale(400, 200, 100)).toBe(0.5)
  })
  it('ảnh nhỏ hơn khung → phóng to lên', () => {
    expect(coverScale(50, 80, 100)).toBe(2)
  })
})

describe('clampOffset', () => {
  it('ảnh vừa khít khung → offset luôn về 0', () => {
    expect(clampOffset({ x: 30, y: -50 }, 100, 100, 1, 100)).toEqual({ x: 0, y: 0 })
  })
  it('offset trong giới hạn giữ nguyên', () => {
    // ảnh 200x100 scale 1, khung 100 → dư ngang (200-100)/2 = 50 mỗi bên
    expect(clampOffset({ x: 40, y: 0 }, 200, 100, 1, 100)).toEqual({ x: 40, y: 0 })
  })
  it('offset vượt giới hạn bị kẹp lại', () => {
    expect(clampOffset({ x: 80, y: 10 }, 200, 100, 1, 100)).toEqual({ x: 50, y: 0 })
    expect(clampOffset({ x: -999, y: -999 }, 200, 100, 1, 100)).toEqual({ x: -50, y: 0 })
  })
  it('zoom lên thì được kéo xa hơn', () => {
    // scale 2: ảnh hiển thị 400x200, dư ngang 150, dọc 50
    expect(clampOffset({ x: 150, y: 50 }, 200, 100, 2, 100)).toEqual({ x: 150, y: 50 })
    expect(clampOffset({ x: 200, y: 60 }, 200, 100, 2, 100)).toEqual({ x: 150, y: 50 })
  })
})

describe('computeSourceRect', () => {
  it('không offset, scale phủ khung → cắt chính giữa ảnh', () => {
    // ảnh 200x100, khung 100, scale cover = 1 → vùng cắt 100x100 giữa ảnh
    expect(computeSourceRect(200, 100, 1, { x: 0, y: 0 }, 100)).toEqual({
      sx: 50,
      sy: 0,
      sSize: 100,
    })
  })
  it('kéo ảnh sang phải → vùng cắt dịch về bên trái ảnh', () => {
    expect(computeSourceRect(200, 100, 1, { x: 50, y: 0 }, 100)).toEqual({
      sx: 0,
      sy: 0,
      sSize: 100,
    })
  })
  it('zoom 2x → vùng cắt nhỏ lại một nửa', () => {
    const r = computeSourceRect(200, 100, 2, { x: 0, y: 0 }, 100)
    expect(r.sSize).toBe(50)
    expect(r.sx).toBe(75)
    expect(r.sy).toBe(25)
  })
})

describe('giới hạn zoom', () => {
  it('MIN_ZOOM là 1 (phủ khít khung), MAX_ZOOM lớn hơn', () => {
    expect(MIN_ZOOM).toBe(1)
    expect(MAX_ZOOM).toBeGreaterThan(MIN_ZOOM)
  })
})
