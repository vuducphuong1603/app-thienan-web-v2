// Âm thanh + rung khi điểm danh (quét QR / thủ công).
// Âm thanh tạo bằng Web Audio, không cần file; rung chỉ chạy trên Android (iPhone Safari không hỗ trợ).

export type FeedbackKind = 'success' | 'duplicate' | 'not_found'

export type Tone = { freq: number; ms: number }
export type FeedbackCue = { tones: Tone[]; vibrate: number[] }

export const FEEDBACK_CUES: Record<FeedbackKind, FeedbackCue> = {
  // 1 bíp cao, rung ngắn
  success: { tones: [{ freq: 1200, ms: 120 }], vibrate: [80] },
  // 2 bíp trung, rung 2 nhịp
  duplicate: { tones: [{ freq: 700, ms: 90 }, { freq: 700, ms: 90 }], vibrate: [60, 60, 60] },
  // 1 bíp trầm dài, rung dài
  not_found: { tones: [{ freq: 300, ms: 260 }], vibrate: [250] },
}

export function feedbackCue(kind: FeedbackKind | null | undefined): FeedbackCue | null {
  return kind ? FEEDBACK_CUES[kind] : null
}

/** Rung nếu trình duyệt hỗ trợ. Trả về true nếu đã gọi được. */
export function vibrateFor(pattern: number[], nav: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined): boolean {
  if (!nav || typeof nav.vibrate !== 'function') return false
  try {
    return !!nav.vibrate(pattern)
  } catch {
    return false
  }
}

let audioCtx: AudioContext | null = null

/**
 * Lấy/ tạo AudioContext. Nên gọi từ một thao tác của người dùng (mở modal, bấm nút)
 * để trình duyệt di động cho phép phát tiếng.
 */
export function primeAudio(): void {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    // không hỗ trợ âm thanh → bỏ qua
  }
}

function playTones(tones: Tone[]): void {
  if (!audioCtx) primeAudio()
  const ctx = audioCtx
  if (!ctx) return
  try {
    let t = ctx.currentTime
    for (const tone of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = tone.freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.ms / 1000)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + tone.ms / 1000 + 0.02)
      t += tone.ms / 1000 + 0.06
    }
  } catch {
    // bỏ qua nếu không phát được
  }
}

/** Phát tiếng + rung tương ứng loại phản hồi. An toàn trên mọi trình duyệt. */
export function playFeedback(kind: FeedbackKind | null | undefined): void {
  const cue = feedbackCue(kind)
  if (!cue) return
  playTones(cue.tones)
  vibrateFor(cue.vibrate)
}
