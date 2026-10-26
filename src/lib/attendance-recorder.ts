export interface AttendanceRecorder {
  full_name: string
  saint_name?: string | null
}

/** Tên giáo lý viên đã điểm danh (cột created_by), hiển thị trong lịch sử điểm danh. */
export function recorderName(user: AttendanceRecorder | undefined): string {
  const name = [user?.saint_name?.trim(), user?.full_name?.trim()].filter(Boolean).join(' ')
  return name || 'Không rõ'
}
