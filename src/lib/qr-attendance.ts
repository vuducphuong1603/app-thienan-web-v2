// Logic thuần cho điểm danh quét QR (đồng bộ với app mobile TN Thiên Ân)

export const SCAN_THROTTLE_MS = 3000

/** QR có thể chứa "MÃ - Họ tên" hoặc chỉ mã thiếu nhi */
export function parseStudentCode(raw: string): string {
  return (raw.includes(' - ') ? raw.split(' - ')[0] : raw).trim()
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Ngày điểm danh mục tiêu khi quét QR:
 * - Chủ nhật → chính hôm đó (day_type 'cn')
 * - Các ngày còn lại → Thứ 5 của tuần đó (day_type 'thu5')
 */
export function getScanTarget(now: Date): { dateStr: string; dayType: 'cn' | 'thu5' } {
  if (now.getDay() === 0) {
    return { dateStr: toLocalDateStr(now), dayType: 'cn' }
  }
  const thursday = new Date(now)
  thursday.setDate(now.getDate() + (4 - now.getDay()))
  return { dateStr: toLocalDateStr(thursday), dayType: 'thu5' }
}

/** Tách chuỗi tìm kiếm thành các từ khóa */
export function splitSearchWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(w => w.length > 0)
}

/** Bộ lọc `or` của Supabase: khớp tên, tên thánh hoặc mã thiếu nhi */
export function studentSearchOrFilter(word: string): string {
  return `full_name.ilike.%${word}%,saint_name.ilike.%${word}%,student_code.ilike.%${word}%`
}

/**
 * Chống quét trùng: cùng một mã trong SCAN_THROTTLE_MS thì bỏ qua.
 * Trả về true nếu cần bỏ qua; ngược lại ghi nhận thời điểm quét và dọn mã hết hạn.
 */
export function shouldThrottleScan(
  code: string,
  recentScans: Map<string, number>,
  now: number,
): boolean {
  const last = recentScans.get(code)
  if (last !== undefined && now - last < SCAN_THROTTLE_MS) return true
  recentScans.forEach((time, key) => {
    if (now - time >= SCAN_THROTTLE_MS) recentScans.delete(key)
  })
  recentScans.set(code, now)
  return false
}

/** Bản ghi điểm danh (kèm join thieu_nhi) đọc từ DB để khôi phục lịch sử quét */
export type RestoredAttendanceRecord = {
  id: string
  check_in_time: string | null
  thieu_nhi?: {
    full_name?: string
    saint_name?: string | null
    student_code?: string
    classes?: { name?: string } | null
  } | null
}

/**
 * Chuyển bản ghi DB thành mục lịch sử quét hiển thị trong modal.
 * Dùng khi mở lại modal (sau reload) để dữ liệu đã điểm danh không "biến mất".
 */
export function mapRestoredScanEntry(record: RestoredAttendanceRecord): {
  id: string
  studentName: string
  studentCode: string
  className: string
  time: string
  status: 'success'
} {
  const tn = record.thieu_nhi
  return {
    id: record.id,
    studentName: `${tn?.saint_name ? `${tn.saint_name} ` : ''}${tn?.full_name || 'Không xác định'}`,
    studentCode: tn?.student_code || '',
    className: tn?.classes?.name || '',
    time: record.check_in_time?.substring(0, 5) || '',
    status: 'success',
  }
}
