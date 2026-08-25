// Logic thuần cho điểm danh Chủ nhật tách 2 buổi: học giáo lý ('cn') và đi lễ ('cn_le')

export type DayType = 'thu5' | 'cn' | 'cn_le'
export type SundaySession = 'cn' | 'cn_le'

export const SUNDAY_SESSIONS: SundaySession[] = ['cn', 'cn_le']

export const SUNDAY_SESSION_LABELS: Record<SundaySession, string> = {
  cn: 'Học giáo lý',
  cn_le: 'Đi lễ',
}

export const SUNDAY_SESSION_SHORT_LABELS: Record<SundaySession, string> = {
  cn: 'Giáo lý',
  cn_le: 'Đi lễ',
}

/** Buổi Chủ nhật (giáo lý hoặc đi lễ) */
export function isSundayType(dayType: string): dayType is SundaySession {
  return dayType === 'cn' || dayType === 'cn_le'
}

/** Nhãn ngày + buổi để hiển thị */
export function dayTypeLabel(dayType: DayType): string {
  if (dayType === 'thu5') return 'Thứ 5'
  return `Chủ nhật · ${SUNDAY_SESSION_LABELS[dayType]}`
}

/** Các day_type của bảng holidays cần kiểm tra cho một buổi điểm danh */
export function holidayDayTypesFor(dayType: DayType): string[] {
  return isSundayType(dayType) ? ['cn', 'both'] : ['thu5', 'both']
}

/**
 * Số buổi Chủ nhật quy đổi để tính điểm:
 * mỗi buổi giáo lý = 0.5, mỗi buổi đi lễ = 0.5 → đủ cả 2 = 1 buổi Chủ nhật.
 */
export function computeSundayCount(catechismCount: number, massCount: number): number {
  return (catechismCount + massCount) / 2
}

type PresenceRecord = { student_id: string; day_type: string; status?: string }

/**
 * Tập thiếu nhi "có mặt Chủ nhật" của một ngày: phải có mặt CẢ giáo lý lẫn đi lễ.
 * Bản ghi status khác 'present' (nếu có) bị bỏ qua.
 */
export function sundayFullyPresentIds(records: PresenceRecord[]): Set<string> {
  const gl = new Set<string>()
  const le = new Set<string>()
  for (const r of records) {
    if (r.status && r.status !== 'present') continue
    if (r.day_type === 'cn') gl.add(r.student_id)
    else if (r.day_type === 'cn_le') le.add(r.student_id)
  }
  const result = new Set<string>()
  gl.forEach(id => { if (le.has(id)) result.add(id) })
  return result
}

/** Trạng thái tổng hợp của một em trong một ngày Chủ nhật */
export type SundayStatus = 'full' | 'catechism_only' | 'mass_only' | 'absent' | 'none'

export function sundayStatus(
  catechism: 'present' | 'absent' | null | undefined,
  mass: 'present' | 'absent' | null | undefined,
): SundayStatus {
  const gl = catechism === 'present'
  const le = mass === 'present'
  if (gl && le) return 'full'
  if (gl) return 'catechism_only'
  if (le) return 'mass_only'
  if (catechism === 'absent' || mass === 'absent') return 'absent'
  return 'none'
}

export const SUNDAY_STATUS_LABELS: Record<SundayStatus, string> = {
  full: 'Đủ 2 buổi',
  catechism_only: 'Chỉ giáo lý',
  mass_only: 'Chỉ đi lễ',
  absent: 'Vắng mặt',
  none: 'Chưa điểm danh',
}

type MergeableRecord = { student_id: string; attendance_date: string; day_type: string; status: string }

/**
 * Gộp 2 bản ghi Chủ nhật (cn + cn_le) của cùng một em / ngày thành 1 bản ghi 'cn' đại diện
 * để các báo cáo cũ (1 ô / ngày) hiển thị đúng: 'present' chỉ khi đủ cả 2 buổi,
 * còn lại là 'absent'. Bản ghi Thứ 5 giữ nguyên.
 */
export function mergeSundayRecords<T extends MergeableRecord>(records: T[]): T[] {
  const result: T[] = []
  const sunday = new Map<string, { gl?: T; le?: T }>()
  for (const r of records) {
    if (r.day_type === 'cn' || r.day_type === 'cn_le') {
      const key = `${r.student_id}|${r.attendance_date}`
      const entry = sunday.get(key) ?? {}
      if (r.day_type === 'cn') entry.gl = r
      else entry.le = r
      sunday.set(key, entry)
    } else {
      result.push(r)
    }
  }
  sunday.forEach(({ gl, le }) => {
    const base = gl ?? le
    if (!base) return
    const full = gl?.status === 'present' && le?.status === 'present'
    result.push({ ...base, day_type: 'cn', status: full ? 'present' : 'absent' })
  })
  return result
}

/** Ngày (YYYY-MM-DD, theo giờ địa phương) có phải Chủ nhật không */
export function isSundayDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}

type ReportCell = 'present' | 'absent' | null | undefined

/**
 * Thống kê Chủ nhật cho báo cáo: số lượt (em × ngày) đủ 2 buổi và số lượt chỉ 1 buổi.
 */
export function countSundayReport(
  students: { attendance: Record<string, ReportCell>; attendance_mass?: Record<string, ReportCell> }[],
  sundayDates: string[],
): { full: number; partial: number } {
  let full = 0
  let partial = 0
  for (const s of students) {
    for (const date of sundayDates) {
      const gl = s.attendance[date] === 'present'
      const le = s.attendance_mass?.[date] === 'present'
      if (gl && le) full++
      else if (gl || le) partial++
    }
  }
  return { full, partial }
}
