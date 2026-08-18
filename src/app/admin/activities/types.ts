import { ThieuNhiProfile } from '@/lib/supabase'

export interface ReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  avatar_url?: string
  attendance: Record<string, 'present' | 'absent' | null>
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
  avg_thu5: number | null
  avg_gl: number | null
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
  has_thursday_attendance?: boolean
  has_compensatory_attendance?: boolean
  compensatory_record_id?: string
  compensatory_time?: string
  compensatory_by?: string
}
