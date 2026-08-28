import { ThieuNhiProfile } from '@/lib/supabase'

export interface ReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  avatar_url?: string
  /** Thứ 5 / Chủ nhật buổi học giáo lý ('cn'), theo ngày */
  attendance: Record<string, 'present' | 'absent' | null>
  /** Chủ nhật buổi đi lễ ('cn_le'), theo ngày */
  attendance_mass?: Record<string, 'present' | 'absent' | null>
}

export interface ReportStudentScore {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  avatar_url?: string
  score_di_le_t5: number | null
  score_hoc_gl: number | null
  score_45_hk1: number | null
  score_exam_hk1: number | null
  score_45_hk2: number | null
  score_exam_hk2: number | null
  average_hk1: number | null
  average_hk2: number | null
  average_year: number | null
  diem_t5: number | null
  diem_gl: number | null
  diem_le_cn: number | null
  diem_tb: number | null
}

export type TimeFilterMode = 'week' | 'dateRange' | 'month'
export type ReportType = 'attendance' | 'score'
export type AttendanceTypeFilter = 'all' | 'thu5' | 'cn'
export type ReportStyleType = 'parent' | 'priest'
export type PriestTimeFilterMode = 'week' | 'month' | 'year'
export type TabType = 'attendance' | 'report'

export interface StudentWithAttendance extends ThieuNhiProfile {
  class_name?: string
  attendance_status?: 'present' | 'absent' | null
  attendance_time?: string
  attendance_by?: string
  attendance_record_id?: string
  /** Chủ nhật – buổi đi lễ (day_type 'cn_le'); attendance_* là buổi học giáo lý ('cn') */
  mass_status?: 'present' | 'absent' | null
  mass_time?: string
  mass_by?: string
  mass_record_id?: string
  has_thursday_attendance?: boolean
  has_compensatory_attendance?: boolean
  compensatory_record_id?: string
  compensatory_time?: string
  compensatory_by?: string
}
