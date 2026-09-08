import { describe, it, expect, vi } from 'vitest'
import { feedbackCue, vibrateFor, FEEDBACK_CUES } from '../attendance-feedback'

describe('feedbackCue', () => {
  it('thành công: 1 bíp cao, rung ngắn', () => {
    expect(feedbackCue('success')).toEqual(FEEDBACK_CUES.success)
    expect(FEEDBACK_CUES.success.tones).toHaveLength(1)
    expect(FEEDBACK_CUES.success.vibrate).toEqual([80])
  })

  it('trùng: 2 bíp thấp hơn thành công, rung 2 nhịp', () => {
    const cue = feedbackCue('duplicate')!
    expect(cue.tones).toHaveLength(2)
    expect(cue.tones[0].freq).toBeLessThan(FEEDBACK_CUES.success.tones[0].freq)
    expect(cue.vibrate).toEqual([60, 60, 60])
  })

  it('lỗi / không tìm thấy: 1 bíp trầm dài, rung dài', () => {
    const cue = feedbackCue('not_found')!
    expect(cue.tones[0].freq).toBeLessThan(feedbackCue('duplicate')!.tones[0].freq)
    expect(cue.vibrate).toEqual([250])
  })

  it('không có loại → không phát gì', () => {
    expect(feedbackCue(null)).toBeNull()
  })
})

describe('vibrateFor', () => {
  it('gọi navigator.vibrate với mẫu rung khi trình duyệt hỗ trợ', () => {
    const vibrate = vi.fn(() => true)
    expect(vibrateFor([80], { vibrate } as unknown as Navigator)).toBe(true)
    expect(vibrate).toHaveBeenCalledWith([80])
  })

  it('bỏ qua an toàn khi không hỗ trợ (iPhone)', () => {
    expect(vibrateFor([80], {} as Navigator)).toBe(false)
    expect(vibrateFor([80], undefined)).toBe(false)
  })
})
