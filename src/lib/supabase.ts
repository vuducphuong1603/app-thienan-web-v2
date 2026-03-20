import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ============ Lightweight proactive token refresh ============
// When the browser tab is hidden, Supabase's auto-refresh timer gets throttled.
// This interceptor fires a NON-BLOCKING background refresh when the cached
// expires_at is within 2 minutes of expiry.
//
// CRITICAL: This interceptor NEVER calls getSession() and NEVER awaits anything.
// In Supabase JS v2.90+, getSession() uses navigator.locks internally.
// Calling it from a fetch interceptor causes severe lock contention when multiple
// requests fire simultaneously, leading to requests hanging for seconds or forever.

let _refreshing = false
let _cachedExpiresAt = 0 // Unix seconds — kept in sync via onAuthStateChange

// The fetch callback references _client to fire background refreshes.
// By the time fetch actually runs (during a network request), _client is
// fully initialized, so const + direct initialization is safe.
const _client: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: async (input, init) => {
      // Non-blocking proactive token refresh: if the cached expiry shows the
      // token is about to expire, fire a background refreshSession(). The current
      // request goes through IMMEDIATELY without waiting — Supabase's internal
      // _getAccessToken() handles the actual auth header for this request.
      if (typeof window !== 'undefined' && _cachedExpiresAt > 0 && !_refreshing) {
        const url = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url

        if (!url.includes('/auth/v1/')) {
          const nowSec = Math.floor(Date.now() / 1000)
          if (nowSec > _cachedExpiresAt - 120) {
            // Token expires within 2 min — trigger background refresh
            _refreshing = true
            _client.auth.refreshSession()
              .catch(() => { /* let handleAuthError in query-provider deal with it */ })
              .finally(() => { _refreshing = false })
          }
        }
      }

      // Pass through immediately — no blocking, no timeout, no lock contention
      return fetch(input, init)
    },
  },
})

// Keep cached expiry in sync with Supabase auth events (sign-in, refresh, sign-out)
if (typeof window !== 'undefined') {
  _client.auth.onAuthStateChange((event, session) => {
    if (session?.expires_at) {
      _cachedExpiresAt = session.expires_at
    } else if (event === 'SIGNED_OUT') {
      _cachedExpiresAt = 0
    }
  })
}

export const supabase = _client

// Roles từ database
export type UserRole = 'admin' | 'phan_doan_truong' | 'giao_ly_vien'

// Role labels để hiển thị
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Ban điều hành',
  phan_doan_truong: 'Phân đoàn trưởng',
  giao_ly_vien: 'Giáo lý viên',
}

export interface UserProfile {
  id: string
  username?: string
  email?: string
  full_name: string
  saint_name?: string
  phone: string
  address?: string
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE'
  branch?: string
  class_id?: string
  class_name?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
}

// Branch options (with Vietnamese diacritics)
export const BRANCHES = ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'] as const
export type Branch = typeof BRANCHES[number]

// Class interface
export interface Class {
  id: string
  name: string
  branch: Branch
  display_order: number
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at?: string
}

// Thiếu nhi profile (đối tượng được quản lý)
export interface ThieuNhiProfile {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  date_of_birth?: string
  gender?: 'male' | 'female'
  phone?: string
  address?: string
  parent_name?: string
  parent_phone?: string
  parent_name_2?: string
  parent_phone_2?: string
  class_id?: string
  status: 'ACTIVE' | 'INACTIVE'
  avatar_url?: string
  notes?: string
  // Score fields
  score_45_hk1?: number
  score_exam_hk1?: number
  score_45_hk2?: number
  score_exam_hk2?: number
  attendance_thu5?: number
  attendance_cn?: number
  created_at: string
  updated_at?: string
}

// Năm học
export interface SchoolYear {
  id: string
  name: string // e.g., "2025 - 2026"
  start_date: string // e.g., "2025-09-14"
  end_date: string // e.g., "2026-05-31"
  is_current: boolean
  parish_name: string // e.g., "Giáo xứ Thiên Ân"
  total_weeks: number
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at?: string
}

// Holiday day type
export type HolidayDayType = 'thu5' | 'cn' | 'both'

// Holiday record
export interface Holiday {
  id: string
  school_year_id: string
  holiday_date: string
  name: string
  day_type: HolidayDayType
  notes?: string
  created_by?: string
  created_at: string
  updated_at?: string
}

// Attendance record for detailed tracking
export interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string
  school_year_id?: string
  attendance_date: string // YYYY-MM-DD
  day_type: 'thu5' | 'cn' // thu5 = Thursday, cn = Sunday
  status: 'present' | 'absent'
  check_in_time?: string // HH:MM:SS
  check_in_method?: 'manual' | 'qr_scan'
  notes?: string
  created_by?: string
  created_at: string
  updated_at?: string
  // Compensatory attendance fields
  is_compensatory?: boolean // TRUE if this is a make-up attendance for missed Thursday
  compensated_for_date?: string // The Thursday date this attendance compensates for (YYYY-MM-DD)
}

// Plan category
export interface PlanCategory {
  id: string
  name: string
  color: string // hex color
  icon: string // lucide icon name
  is_default: boolean
  display_order: number
  created_at: string
  updated_at?: string
}

// ============ Alert System Types ============
export type AlertSeverity = 'high' | 'medium' | 'low'
export type AlertType = 'attendance' | 'score' | 'system'
export type AlertStatus = 'unread' | 'read' | 'resolved' | 'dismissed'

export interface RuleCondition {
  key: string
  enabled: boolean
  value?: number
}

export interface AlertRule {
  id: string
  name: string
  description?: string
  type: AlertType
  severity: AlertSeverity
  threshold?: number
  conditions: RuleCondition[]
  condition_expression?: string
  notification_types: string[]
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at?: string
}

export interface AlertRecord {
  id: string
  rule_id?: string
  title: string
  description?: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  student_id?: string
  student_name?: string
  student_code?: string
  class_id?: string
  class_name?: string
  source: string
  metadata: Record<string, unknown>
  resolved_by?: string
  resolved_at?: string
  created_at: string
  updated_at?: string
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  attendance: 'Điểm danh',
  score: 'Điểm số',
  system: 'Hệ thống',
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

export const ALERT_CONDITION_KEYS: Record<AlertType, { key: string; label: string; expression: string }[]> = {
  attendance: [
    { key: 'attendance_rate_below', label: 'Tỷ lệ điểm danh thấp hơn', expression: 'attendance_rate < {threshold}' },
    { key: 'consecutive_absent', label: 'Vắng mặt liên tục từ', expression: 'consecutive_absent >= {threshold}' },
    { key: 'sunday_lower_thursday', label: 'CN thấp hơn T5 từ', expression: 'cn_lower_thu5 >= {threshold}' },
  ],
  score: [
    { key: 'study_score_below', label: 'Điểm học tập thấp hơn', expression: 'study_score < {threshold}' },
    { key: 'total_score_below', label: 'Điểm tổng thấp hơn', expression: 'student_final_score < {threshold}' },
    { key: 'score_decline', label: 'Điểm giảm từ', expression: 'score_decline >= {threshold}' },
    { key: 'individual_study_low', label: 'Điểm học từng học sinh thấp', expression: 'individual_study < {threshold}' },
    { key: 'individual_total_low', label: 'Điểm tổng từng học sinh thấp', expression: 'individual_total < {threshold}' },
  ],
  system: [
    { key: 'class_size_below', label: 'Sĩ số lớp ít hơn', expression: 'class_size < {threshold}' },
    { key: 'teacher_ratio_above', label: 'Tỷ lệ GV/TN cao hơn', expression: 'teacher_ratio > {threshold}' },
    { key: 'missing_data_days', label: 'Thiếu dữ liệu từ ngày', expression: 'missing_data_days >= {threshold}' },
  ],
}

// Weekly plan
export interface WeeklyPlan {
  id: string
  title: string
  description?: string
  category_id?: string
  plan_date: string // YYYY-MM-DD
  time_start: string // HH:MM:SS
  time_end: string // HH:MM:SS
  location?: string
  branch?: string
  class_ids: string[]
  notes?: string
  created_by?: string
  created_at: string
  updated_at?: string
  // Joined data
  plan_categories?: PlanCategory
}

// User note (personal notes per account)
export interface UserNote {
  id: string
  user_id: string
  title: string
  description?: string
  is_completed: boolean
  color: string
  note_date?: string // YYYY-MM-DD (start date)
  date_end?: string // YYYY-MM-DD (end date)
  class_name?: string
  note_time?: string // e.g., "08:00" (start time)
  time_end?: string // e.g., "16:00" (end time)
  location?: string
  is_favorite: boolean
  reminder?: string // e.g., "30_min", "2_hours", "1_day", or custom
  link?: string
  created_at: string
  updated_at?: string
}

// Notification types
export type NotificationTargetType = 'all' | 'role' | 'branch' | 'class' | 'student'
export type NotificationPriority = 'low' | 'normal' | 'high'

export interface Notification {
  id: string
  title: string
  content: string
  target_type: NotificationTargetType
  target_values: string[]
  priority: NotificationPriority
  created_by?: string
  created_at: string
  updated_at?: string
}

export interface NotificationRecipient {
  id: string
  notification_id: string
  user_id: string
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface NotificationWithStatus extends Notification {
  is_read: boolean
  read_at?: string
  recipient_id: string
  creator_name?: string
}
