// Xét ĐI TRỄ điểm danh Chủ nhật theo khung giờ do admin cài.
// Logic thuần, phản chiếu đúng hàm SQL attendance_is_late (DB là nguồn sự thật):
// so sánh theo PHÚT, hai đầu khung đều tính là đúng giờ.

export type PunctualitySession = 'cn' | 'cn_le'

export interface AttendanceTimeWindow {
  id: string
  session_type: PunctualitySession
  start_time: string // 'HH:MM:SS'
  end_time: string
  label: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface WindowDraft {
  start: string // 'HH:MM' hoặc 'HH:MM:SS'
  end: string
  label?: string | null
}

export type WindowDraftResult =
  | { ok: true; value: { start_time: string; end_time: string; label: string | null } }
  | { ok: false; error: string }

export type Punctuality = 'late' | 'on_time' | 'unknown'

export const PUNCTUALITY_LABELS: Record<Punctuality, string> = {
  late: 'Trễ',
  on_time: 'Đúng giờ',
  unknown: 'Chưa xét',
}

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/

/** 'HH:MM' / 'HH:MM:SS' → số phút từ 0h (giây bị bỏ). Sai định dạng/rỗng → null. */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (typeof t !== 'string') return null
  const m = TIME_RE.exec(t.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  const sec = m[3] === undefined ? 0 : Number(m[3])
  if (h > 23 || min > 59 || sec > 59) return null
  return h * 60 + min
}

interface Range {
  start: number
  end: number
}

/** Khung giờ hợp lệ của một buổi (bỏ qua khung hỏng). */
function rangesFor(windows: AttendanceTimeWindow[], session: PunctualitySession): Range[] {
  const out: Range[] = []
  for (const w of windows) {
    if (w.session_type !== session) continue
    const start = timeToMinutes(w.start_time)
    const end = timeToMinutes(w.end_time)
    if (start === null || end === null) continue
    out.push({ start, end })
  }
  return out
}

/**
 * true = trễ, false = đúng giờ, null = chưa xét (buổi chưa có khung giờ hoặc giờ không hợp lệ).
 * Giờ nằm trong BẤT KỲ khung nào của buổi (gồm cả hai đầu) → đúng giờ; ngoài mọi khung → trễ.
 */
export function classifyLate(
  time: string | null | undefined,
  windows: AttendanceTimeWindow[],
  session: PunctualitySession,
): boolean | null {
  const minutes = timeToMinutes(time)
  if (minutes === null) return null
  const ranges = rangesFor(windows, session)
  if (ranges.length === 0) return null
  return !ranges.some(r => minutes >= r.start && minutes <= r.end)
}

/**
 * Dự đoán trên client trước khi DB trả kết quả: chỉ xét khi điểm danh đúng ngày hôm nay
 * (bản ghi điểm danh bù/lùi ngày thì giờ bấm không phải giờ đến → null).
 * `today` là 'YYYY-MM-DD' giờ địa phương (xem localTodayISO).
 */
export function predictLate(a: {
  attendanceDate: string
  today: string
  time: string | null | undefined
  windows: AttendanceTimeWindow[]
  session: PunctualitySession
}): boolean | null {
  if (a.attendanceDate !== a.today) return null
  return classifyLate(a.time, a.windows, a.session)
}

/** 'YYYY-MM-DD' theo getter giờ địa phương (KHÔNG dùng toISOString — lệch UTC). */
export function localTodayISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function minutesToHHMMSS(total: number): string {
  const h = String(Math.floor(total / 60)).padStart(2, '0')
  const m = String(total % 60).padStart(2, '0')
  return `${h}:${m}:00`
}

function minutesToHHMM(total: number): string {
  return minutesToHHMMSS(total).slice(0, 5)
}

/** Kiểm tra bản nháp khung giờ (thêm/sửa). `editingId` = khung đang sửa, bị loại khỏi so chồng lấn. */
export function validateWindowDraft(
  draft: WindowDraft,
  existing: AttendanceTimeWindow[],
  session: PunctualitySession,
  editingId?: string,
): WindowDraftResult {
  const start = timeToMinutes(draft.start)
  const end = timeToMinutes(draft.end)
  if (start === null) return { ok: false, error: 'Giờ bắt đầu không hợp lệ (định dạng HH:MM)' }
  if (end === null) return { ok: false, error: 'Giờ kết thúc không hợp lệ (định dạng HH:MM)' }
  if (end <= start) return { ok: false, error: 'Giờ kết thúc phải sau giờ bắt đầu' }

  const others = existing.filter(w => w.session_type === session && w.id !== editingId)
  for (const w of others) {
    const s = timeToMinutes(w.start_time)
    const e = timeToMinutes(w.end_time)
    if (s === null || e === null) continue
    if (start <= e && s <= end) {
      return {
        ok: false,
        error: `Khung giờ chồng lấn với khung ${minutesToHHMM(s)} – ${minutesToHHMM(e)} đã có`,
      }
    }
  }

  const label = typeof draft.label === 'string' ? draft.label.trim() : ''
  return {
    ok: true,
    value: {
      start_time: minutesToHHMMSS(start),
      end_time: minutesToHHMMSS(end),
      label: label === '' ? null : label,
    },
  }
}

// Khung hỏng (không đọc được giờ) xếp cuối để không làm vỡ giao diện.
function sortKey(w: Pick<AttendanceTimeWindow, 'start_time' | 'end_time'>): [number, number] {
  return [timeToMinutes(w.start_time) ?? Infinity, timeToMinutes(w.end_time) ?? Infinity]
}

/** Sắp theo giờ bắt đầu rồi giờ kết thúc; trả mảng mới. */
export function sortWindows(ws: AttendanceTimeWindow[]): AttendanceTimeWindow[] {
  return [...ws].sort((a, b) => {
    const [as, ae] = sortKey(a)
    const [bs, be] = sortKey(b)
    if (as !== bs) return as < bs ? -1 : 1
    if (ae !== be) return ae < be ? -1 : 1
    return 0
  })
}

export function windowsForSession(ws: AttendanceTimeWindow[], s: PunctualitySession): AttendanceTimeWindow[] {
  return sortWindows(ws.filter(w => w.session_type === s))
}

/** '06:45 – 07:15' (gạch en dash, có khoảng trắng). */
export function formatWindow(w: Pick<AttendanceTimeWindow, 'start_time' | 'end_time'>): string {
  const fmt = (t: string): string => {
    const m = timeToMinutes(t)
    return m === null ? t : minutesToHHMM(m)
  }
  return `${fmt(w.start_time)} – ${fmt(w.end_time)}`
}

export function punctualityOf(isLate: boolean | null | undefined): Punctuality {
  if (isLate === true) return 'late'
  if (isLate === false) return 'on_time'
  return 'unknown'
}

/** Bấm đổi tay: Trễ → Đúng giờ; Đúng giờ / Chưa xét → Trễ. */
export function nextLateValue(current: boolean | null | undefined): boolean {
  return current !== true
}

/** Chỉ admin (Ban điều hành) được sửa tay Trễ ↔ Đúng giờ. DB (trigger set_attendance_lateness) cũng chặn. */
export function canEditLate(role: string | null | undefined): boolean {
  return role === 'admin'
}
