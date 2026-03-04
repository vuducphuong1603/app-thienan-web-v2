import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, UserProfile, Class, Branch, WeeklyPlan, PlanCategory, AlertRule, AlertRecord, NotificationWithStatus, Notification, UserNote, Holiday } from './supabase'

// ============ Helper: Count weekdays between two dates ============
export function countWeekdays(startDate: string, endDate: string, dayOfWeek: number): number {
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    if (current.getDay() === dayOfWeek) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

// ============ Query Keys ============
export const queryKeys = {
  users: ['users'] as const,
  classes: ['classes'] as const,
  activeClasses: ['classes', 'active'] as const,
  students: ['students'] as const,
  branches: ['branches'] as const,
  schoolYear: ['schoolYear', 'current'] as const,
  dashboardStats: ['dashboardStats'] as const,
  glvDashboardStats: (classId: string) => ['glvDashboardStats', classId] as const,
  absentStudents: (classId: string, dayType: string) => ['absentStudents', classId, dayType] as const,
  classStats: ['classStats'] as const,
  planCategories: ['planCategories'] as const,
  weeklyPlans: (weekStart: string) => ['weeklyPlans', weekStart] as const,
  performanceTrend: (chartType: string) => ['performanceTrend', chartType] as const,
  classAttendance: (branch: string, date: string, dayType: string) => ['classAttendance', branch, date, dayType] as const,
  myNotesData: (userId: string) => ['myNotesData', userId] as const,
  alertRules: ['alertRules'] as const,
  alerts: (filters: Record<string, string>) => ['alerts', filters] as const,
  alertStats: ['alertStats'] as const,
  alertHistory: ['alertHistory'] as const,
  userNotes: (userId: string) => ['userNotes', userId] as const,
  notifications: ['notifications'] as const,
  unreadNotifications: ['notifications', 'unread'] as const,
  allNotifications: ['notifications', 'all'] as const,
  holidays: (schoolYearId: string) => ['holidays', schoolYearId] as const,
  glvClassTrend: (classId: string) => ['glvClassTrend', classId] as const,
  glvPerStudentStats: (classId: string) => ['glvPerStudentStats', classId] as const,
}

// ============ Dashboard Stats ============
export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
      const [glvRes, thieuNhiRes, classesRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'giao_ly_vien'),
        supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
      ])

      return {
        totalBranches: 4,
        totalClasses: classesRes.count || 0,
        totalThieuNhi: thieuNhiRes.count || 0,
        totalGiaoLyVien: glvRes.count || 0,
      }
    },
    enabled,
  })
}

// ============ GLV Dashboard Stats ============
function getRecentDay(dayType: 'cn' | 'thu5'): string | null {
  const today = new Date()
  const targetDay = dayType === 'cn' ? 0 : 4
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (d.getDay() === targetDay) {
      return d.toISOString().split('T')[0]
    }
  }
  return null
}

export function useGLVDashboardStats(user: UserProfile | null) {
  const classId = user?.class_id || ''
  return useQuery({
    queryKey: queryKeys.glvDashboardStats(classId),
    queryFn: async () => {
      if (!user?.class_id) throw new Error('No class_id')

      // Get class info (for branch name) and student count in parallel
      const [classRes, studentCountRes] = await Promise.all([
        supabase.from('classes').select('id, name, branch').eq('id', user.class_id).single(),
        supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).eq('class_id', user.class_id).eq('status', 'ACTIVE'),
      ])

      const className = classRes.data?.name || ''
      const branchName = classRes.data?.branch || user.branch || ''
      const studentCount = studentCountRes.count || 0

      // Get recent Thursday and Sunday dates
      const lastThu5 = getRecentDay('thu5')
      const lastCN = getRecentDay('cn')

      // Fetch attendance for both days
      const [thu5Res, cnRes] = await Promise.all([
        lastThu5
          ? supabase.from('attendance_records').select('*', { count: 'exact', head: true })
              .eq('class_id', user.class_id).eq('attendance_date', lastThu5).eq('day_type', 'thu5').eq('status', 'present')
          : Promise.resolve({ count: 0 }),
        lastCN
          ? supabase.from('attendance_records').select('*', { count: 'exact', head: true })
              .eq('class_id', user.class_id).eq('attendance_date', lastCN).eq('day_type', 'cn').eq('status', 'present')
          : Promise.resolve({ count: 0 }),
      ])

      const thu5Rate = studentCount > 0 ? Math.round(((thu5Res.count || 0) / studentCount) * 100) : 0
      const cnRate = studentCount > 0 ? Math.round(((cnRes.count || 0) / studentCount) * 100) : 0

      return { branchName, className, studentCount, thu5Rate, cnRate }
    },
    enabled: !!user?.class_id,
  })
}

// ============ GLV Class Trend (3 weeks T5 + CN) ============
interface GLVWeekData {
  date: string
  displayDate: string
  presentCount: number
  rate: number
}

interface GLVClassTrendResult {
  totalStudents: number
  thu5Weeks: GLVWeekData[]
  cnWeeks: GLVWeekData[]
}

export function useGLVClassTrend(classId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.glvClassTrend(classId || ''),
    queryFn: async (): Promise<GLVClassTrendResult> => {
      if (!classId) throw new Error('No classId')

      const thu5Weeks = getLast3Weeks('thu5')
      const cnWeeks = getLast3Weeks('cn')

      // Get student count + attendance for all 6 dates
      const allDates = [...thu5Weeks.map(w => w.date), ...cnWeeks.map(w => w.date)]
      const startDate = allDates.reduce((a, b) => (a < b ? a : b))
      const endDate = allDates.reduce((a, b) => (a > b ? a : b))

      const [studentCountRes, attendanceRes] = await Promise.all([
        supabase.from('thieu_nhi').select('*', { count: 'exact', head: true })
          .eq('class_id', classId).eq('status', 'ACTIVE'),
        supabase.from('attendance_records').select('attendance_date, day_type, student_id')
          .eq('class_id', classId).eq('status', 'present')
          .gte('attendance_date', startDate).lte('attendance_date', endDate),
      ])

      const totalStudents = studentCountRes.count || 0
      const records = attendanceRes.data || []

      const countByDate = new Map<string, number>()
      records.forEach(r => {
        countByDate.set(r.attendance_date, (countByDate.get(r.attendance_date) || 0) + 1)
      })

      const mapWeek = (weeks: typeof thu5Weeks): GLVWeekData[] =>
        weeks.map(w => {
          const presentCount = countByDate.get(w.date) || 0
          return {
            date: w.date,
            displayDate: w.displayDate,
            presentCount,
            rate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
          }
        })

      return {
        totalStudents,
        thu5Weeks: mapWeek(thu5Weeks),
        cnWeeks: mapWeek(cnWeeks),
      }
    },
    enabled: enabled && !!classId,
  })
}

// ============ GLV Per-Student Stats ============
interface GLVStudentStat {
  id: string
  full_name: string
  saint_name?: string
  thu5Count: number
  cnCount: number
  thu5Rate: number
  cnRate: number
  overallRate: number
  totalAbsent: number
}

interface GLVPerStudentResult {
  students: GLVStudentStat[]
  effectiveThu5Days: number
  effectiveCnDays: number
}

export function useGLVPerStudentStats(classId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.glvPerStudentStats(classId || ''),
    queryFn: async (): Promise<GLVPerStudentResult> => {
      if (!classId) throw new Error('No classId')

      // Get school year for holiday calculation
      const { data: schoolYear } = await supabase
        .from('school_years').select('id, start_date, end_date').eq('is_current', true).single()

      const schoolYearId = schoolYear?.id
      const totalThu5 = schoolYear ? countWeekdays(schoolYear.start_date, schoolYear.end_date, 4) : 40
      const totalCn = schoolYear ? countWeekdays(schoolYear.start_date, schoolYear.end_date, 0) : 40

      // Get holidays, students, and all attendance records in parallel
      const [holidaysRes, studentsRes, attendanceRes] = await Promise.all([
        schoolYearId
          ? supabase.from('holidays').select('*').eq('school_year_id', schoolYearId)
          : Promise.resolve({ data: [] }),
        supabase.from('thieu_nhi').select('id, full_name, saint_name')
          .eq('class_id', classId).eq('status', 'ACTIVE').order('full_name'),
        supabase.from('attendance_records').select('student_id, day_type')
          .eq('class_id', classId).eq('status', 'present'),
      ])

      const holidays = (holidaysRes.data || []) as Holiday[]
      const thu5Holidays = holidays.filter(h => h.day_type === 'thu5' || h.day_type === 'both').length
      const cnHolidays = holidays.filter(h => h.day_type === 'cn' || h.day_type === 'both').length
      const effectiveThu5Days = Math.max(1, totalThu5 - thu5Holidays)
      const effectiveCnDays = Math.max(1, totalCn - cnHolidays)

      const students = studentsRes.data || []
      const records = attendanceRes.data || []

      // Build per-student attendance counts
      const thu5Map = new Map<string, number>()
      const cnMap = new Map<string, number>()
      records.forEach(r => {
        if (r.day_type === 'thu5') {
          thu5Map.set(r.student_id, (thu5Map.get(r.student_id) || 0) + 1)
        } else if (r.day_type === 'cn') {
          cnMap.set(r.student_id, (cnMap.get(r.student_id) || 0) + 1)
        }
      })

      const studentStats: GLVStudentStat[] = students.map(s => {
        const thu5Count = thu5Map.get(s.id) || 0
        const cnCount = cnMap.get(s.id) || 0
        const thu5Rate = Math.round((thu5Count / effectiveThu5Days) * 100)
        const cnRate = Math.round((cnCount / effectiveCnDays) * 100)
        const totalDays = effectiveThu5Days + effectiveCnDays
        const overallRate = totalDays > 0 ? Math.round(((thu5Count + cnCount) / totalDays) * 100) : 0
        const totalAbsent = (effectiveThu5Days - thu5Count) + (effectiveCnDays - cnCount)

        return {
          id: s.id,
          full_name: s.full_name,
          saint_name: s.saint_name,
          thu5Count,
          cnCount,
          thu5Rate,
          cnRate,
          overallRate,
          totalAbsent: Math.max(0, totalAbsent),
        }
      })

      return { students: studentStats, effectiveThu5Days, effectiveCnDays }
    },
    enabled: enabled && !!classId,
  })
}

// ============ Absent Students (for GLV dashboard) ============
interface AbsentStudent {
  id: string
  full_name: string
  saint_name?: string
  student_code?: string
  date_of_birth?: string
  avatar_url?: string
}

interface AbsentStudentsResult {
  totalStudents: number
  presentCount: number
  absentCount: number
  absentStudents: AbsentStudent[]
  date: string | null
}

export function useAbsentStudents(classId: string | undefined, dayType: 'cn' | 'thu5' = 'cn') {
  return useQuery({
    queryKey: queryKeys.absentStudents(classId || '', dayType),
    queryFn: async (): Promise<AbsentStudentsResult> => {
      if (!classId) throw new Error('No classId')

      const date = getRecentDay(dayType)
      if (!date) return { totalStudents: 0, presentCount: 0, absentCount: 0, absentStudents: [], date: null }

      // Fetch all active students in class and attendance records in parallel
      const [studentsRes, attendanceRes] = await Promise.all([
        supabase.from('thieu_nhi').select('id, full_name, saint_name, student_code, date_of_birth, avatar_url')
          .eq('class_id', classId).eq('status', 'ACTIVE').order('full_name'),
        supabase.from('attendance_records').select('student_id')
          .eq('class_id', classId).eq('attendance_date', date).eq('day_type', dayType).eq('status', 'present'),
      ])

      const students = (studentsRes.data || []) as AbsentStudent[]
      const presentIds = new Set((attendanceRes.data || []).map(r => r.student_id))

      const absentStudents = students.filter(s => !presentIds.has(s.id))

      return {
        totalStudents: students.length,
        presentCount: presentIds.size,
        absentCount: absentStudents.length,
        absentStudents,
        date,
      }
    },
    enabled: !!classId,
  })
}

// ============ Class Stats (for ClassStats component) ============
export function useClassStats() {
  return useQuery({
    queryKey: queryKeys.classStats,
    queryFn: async () => {
      const [branchesRes, classesRes, studentsRes, teachersRes] = await Promise.all([
        supabase.from('branches').select('id, name, order_index').order('order_index'),
        supabase.from('classes').select('id, branch').eq('status', 'ACTIVE'),
        supabase.from('thieu_nhi').select('id, class_id').eq('status', 'ACTIVE'),
        supabase.from('users').select('id, class_id').eq('role', 'giao_ly_vien').eq('status', 'ACTIVE'),
      ])

      const branches = branchesRes.data
      if (!branches) return []

      const classes = classesRes.data
      const students = studentsRes.data
      const teachers = teachersRes.data

      const classBranchMap = new Map<string, string>()
      classes?.forEach(c => {
        if (c.id && c.branch) {
          classBranchMap.set(c.id, c.branch.toLowerCase())
        }
      })

      const branchStats = branches.map(branch => {
        const branchNameLower = branch.name.toLowerCase()
        const branchClasses = classes?.filter(c => c.branch?.toLowerCase() === branchNameLower).length || 0
        const branchStudents = students?.filter(s => {
          if (!s.class_id) return false
          return classBranchMap.get(s.class_id) === branchNameLower
        }).length || 0
        const branchTeachers = teachers?.filter(t => {
          if (!t.class_id) return false
          return classBranchMap.get(t.class_id) === branchNameLower
        }).length || 0

        return { name: branch.name, classes: branchClasses, students: branchStudents, teachers: branchTeachers }
      })

      const totalClasses = branchStats.reduce((sum, b) => sum + b.classes, 0)
      const totalStudents = branchStats.reduce((sum, b) => sum + b.students, 0)
      const totalTeachers = branchStats.reduce((sum, b) => sum + b.teachers, 0)

      return branchStats.map(branch => ({
        name: branch.name,
        stats: [
          { label: 'Lớp', value: branch.classes, percentage: totalClasses > 0 ? Math.round((branch.classes / totalClasses) * 100) : 0 },
          { label: 'Thiếu nhi', value: branch.students, percentage: totalStudents > 0 ? Math.round((branch.students / totalStudents) * 100) : 0 },
          { label: 'Giáo lý viên', value: branch.teachers, percentage: totalTeachers > 0 ? Math.round((branch.teachers / totalTeachers) * 100) : 0 },
        ],
      }))
    },
  })
}

// ============ Users ============
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as UserProfile[]
    },
  })
}

// ============ Classes (all) ============
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data || []) as Class[]
    },
  })
}

// ============ Active Classes ============
export function useActiveClasses() {
  return useQuery({
    queryKey: queryKeys.activeClasses,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data || []) as Class[]
    },
  })
}

// ============ Classes by Branch ============
export function useClassesByBranch(branch: string) {
  return useQuery({
    queryKey: ['classes', 'branch', branch],
    queryFn: async () => {
      if (branch === 'all') return [] as Class[]

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('branch', branch)
        .eq('status', 'ACTIVE')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data || []) as Class[]
    },
    enabled: branch !== 'all',
  })
}

// ============ Students with details ============
export function useStudentsWithDetails() {
  return useQuery({
    queryKey: queryKeys.students,
    queryFn: async () => {
      const [schoolYearRes, classesRes, studentsRes] = await Promise.all([
        supabase.from('school_years').select('id, start_date, end_date').eq('is_current', true).single(),
        supabase.from('classes').select('*').eq('status', 'ACTIVE').order('display_order', { ascending: true }),
        supabase.from('thieu_nhi').select('*').order('full_name', { ascending: true }),
      ])

      const schoolYear = schoolYearRes.data
      const schoolYearId = schoolYear?.id
      const classesData = classesRes.data || []
      const studentsData = studentsRes.data || []

      // Count actual Thursdays (4) and Sundays (0) in school year
      const totalThu5 = schoolYear ? countWeekdays(schoolYear.start_date, schoolYear.end_date, 4) : 40
      const totalCn = schoolYear ? countWeekdays(schoolYear.start_date, schoolYear.end_date, 0) : 40

      // Fetch holidays for current school year
      let holidays: Holiday[] = []
      if (schoolYearId) {
        const { data: holidaysData } = await supabase
          .from('holidays')
          .select('*')
          .eq('school_year_id', schoolYearId)
        holidays = (holidaysData || []) as Holiday[]
      }

      // Calculate effective days (actual day count minus holidays)
      const thu5Holidays = holidays.filter(h => h.day_type === 'thu5' || h.day_type === 'both').length
      const cnHolidays = holidays.filter(h => h.day_type === 'cn' || h.day_type === 'both').length
      const effectiveThu5Days = Math.max(1, totalThu5 - thu5Holidays)
      const effectiveCnDays = Math.max(1, totalCn - cnHolidays)

      // Build class lookup map for O(1) access instead of O(n) find per student
      const classMap = new Map(classesData.map(c => [c.id, c]))

      const studentsWithDetails = studentsData.map((student) => {
        const studentClass = student.class_id ? classMap.get(student.class_id) : undefined
        const birthDate = student.date_of_birth ? new Date(student.date_of_birth) : null
        const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined

        const score_45_hk1 = student.score_45_hk1 || 0
        const score_exam_hk1 = student.score_exam_hk1 || 0
        const score_45_hk2 = student.score_45_hk2 || 0
        const score_exam_hk2 = student.score_exam_hk2 || 0
        const attendance_thu5 = student.attendance_thu5 || 0
        const attendance_cn = student.attendance_cn || 0

        const avg_catechism = (score_45_hk1 + score_45_hk2 + score_exam_hk1 * 2 + score_exam_hk2 * 2) / 6
        const score_thu5 = (attendance_thu5 * 0.4) * (10 / effectiveThu5Days)
        const score_cn = (attendance_cn * 0.6) * (10 / effectiveCnDays)
        const avg_attendance = score_thu5 + score_cn
        const total_avg = avg_catechism * 0.6 + avg_attendance * 0.4

        return {
          ...student,
          class_name: studentClass?.name || undefined,
          class_branch: studentClass?.branch || undefined,
          age,
          score_45_hk1, score_exam_hk1, score_45_hk2, score_exam_hk2,
          avg_catechism, attendance_thu5, attendance_cn,
          score_thu5, score_cn, avg_attendance, total_avg,
        }
      })

      return { students: studentsWithDetails, classes: classesData }
    },
  })
}

// ============ Classes with details (teachers + student counts) ============
export function useClassesWithDetails() {
  return useQuery({
    queryKey: ['classes', 'withDetails'],
    queryFn: async () => {
      const [classesRes, usersRes, studentsRes] = await Promise.all([
        supabase.from('classes').select('*').order('display_order', { ascending: true }),
        supabase.from('users').select('id, full_name, saint_name, class_id, class_name').eq('role', 'giao_ly_vien'),
        supabase.from('thieu_nhi').select('id, class_id'),
      ])

      if (classesRes.error) throw classesRes.error

      // Build student count map - O(n) instead of sequential pagination
      const studentCountByClass: Record<string, number> = {}
      ;(studentsRes.data || []).forEach((student) => {
        if (student.class_id) {
          studentCountByClass[student.class_id] = (studentCountByClass[student.class_id] || 0) + 1
        }
      })

      // Build teacher lookup map for O(1) access
      const teachersByClassId = new Map<string, string[]>()
      const teachersByClassName = new Map<string, string[]>()
      ;(usersRes.data || []).forEach((user) => {
        const name = `${user.saint_name || ''} ${user.full_name}`.trim()
        if (user.class_id) {
          const arr = teachersByClassId.get(user.class_id) || []
          arr.push(name)
          teachersByClassId.set(user.class_id, arr)
        }
        if (user.class_name) {
          const arr = teachersByClassName.get(user.class_name) || []
          arr.push(name)
          teachersByClassName.set(user.class_name, arr)
        }
      })

      const classesWithDetails = (classesRes.data || []).map((cls) => {
        // Merge teachers by id and name, deduplicate
        const byId = teachersByClassId.get(cls.id) || []
        const byName = teachersByClassName.get(cls.name) || []
        const teachers = Array.from(new Set([...byId, ...byName]))

        return {
          ...cls,
          teachers,
          student_count: studentCountByClass[cls.id] || 0,
        }
      })

      return classesWithDetails
    },
  })
}

// ============ Current School Year ============
export function useCurrentSchoolYear(enabled = true) {
  return useQuery({
    queryKey: queryKeys.schoolYear,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_years')
        .select('*')
        .eq('is_current', true)
        .single()

      if (error) {
        const errorCode = error.code
        const errorMessage = error.message?.toLowerCase() || ''
        const errorHint = ((error as { hint?: string }).hint || '').toLowerCase()

        const isTableNotFound =
          errorCode === '42P01' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorHint.includes('does not exist') ||
          errorMessage.includes('406')

        const isNoRowsFound = errorCode === 'PGRST116'

        if (isTableNotFound) {
          throw new Error('TABLE_NOT_FOUND')
        } else if (isNoRowsFound) {
          return null
        }
        throw error
      }

      return data
    },
    enabled,
    retry: false,
  })
}

// ============ Plan Categories + Classes (static data for weekly plan) ============
export function usePlanStaticData() {
  return useQuery({
    queryKey: ['planStaticData'],
    queryFn: async () => {
      const [catRes, classRes] = await Promise.all([
        supabase.from('plan_categories').select('*').order('display_order'),
        supabase.from('classes').select('*').eq('status', 'ACTIVE').order('display_order'),
      ])
      return {
        categories: catRes.data || [],
        classes: classRes.data || [],
      }
    },
  })
}

// ============ Weekly Plans by week ============
export function useWeeklyPlans(weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const toDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const startStr = toDateString(weekStart)

  return useQuery({
    queryKey: queryKeys.weeklyPlans(startStr),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*, plan_categories(*)')
        .gte('plan_date', startStr)
        .lte('plan_date', toDateString(weekEnd))
        .order('plan_date')
        .order('time_start')

      if (error) throw error
      return data || []
    },
  })
}

// ============ Performance Trend Data (3 weeks) ============
function getLast3Weeks(dayType: 'thu5' | 'cn') {
  const weeks: { date: string; displayDate: string; fullDisplayDate: string }[] = []
  const today = new Date()
  const targetDay = dayType === 'cn' ? 0 : 4
  const dayLabel = dayType === 'cn' ? 'CN' : 'T5'
  const fullDayLabel = dayType === 'cn' ? 'Chủ nhật' : 'Thứ năm'

  const current = new Date(today)
  const currentDay = current.getDay()
  let daysBack = currentDay - targetDay
  if (daysBack < 0) daysBack += 7
  current.setDate(current.getDate() - daysBack)

  for (let i = 0; i < 3; i++) {
    const weekDate = new Date(current)
    weekDate.setDate(weekDate.getDate() - (i * 7))
    const dateStr = weekDate.toISOString().split('T')[0]
    const day = weekDate.getDate()
    const month = weekDate.getMonth() + 1
    weeks.push({
      date: dateStr,
      displayDate: `${dayLabel} ${day}/${month}`,
      fullDisplayDate: `${fullDayLabel} ${day}/${month}`,
    })
  }
  return weeks.reverse()
}

const branchDisplayNames: Record<Branch, string> = {
  'Chiên Con': 'Chiên con',
  'Ấu Nhi': 'Ấu nhi',
  'Thiếu Nhi': 'Thiếu nhi',
  'Nghĩa Sĩ': 'Nghĩa sĩ',
}

export function usePerformanceTrendData(chartType: 'sunday' | 'thursday', enabled = true) {
  return useQuery({
    queryKey: queryKeys.performanceTrend(chartType),
    queryFn: async () => {
      const dayType: 'thu5' | 'cn' = chartType === 'sunday' ? 'cn' : 'thu5'
      const weeks = getLast3Weeks(dayType)

      const [classesRes, studentsRes] = await Promise.all([
        supabase.from('classes').select('id, name, branch').eq('status', 'ACTIVE'),
        supabase.from('thieu_nhi').select('id, class_id').eq('status', 'ACTIVE'),
      ])

      if (classesRes.error) throw classesRes.error
      if (studentsRes.error) throw studentsRes.error

      const classToBranch: Record<string, Branch> = {}
      classesRes.data?.forEach(cls => {
        classToBranch[cls.id] = cls.branch as Branch
      })

      const studentCountByBranch: Record<string, number> = {
        'Chiên Con': 0, 'Ấu Nhi': 0, 'Thiếu Nhi': 0, 'Nghĩa Sĩ': 0,
      }
      studentsRes.data?.forEach(student => {
        if (student.class_id && classToBranch[student.class_id]) {
          const branch = classToBranch[student.class_id]
          studentCountByBranch[branch] = (studentCountByBranch[branch] || 0) + 1
        }
      })

      const startDate = weeks[0].date
      const endDate = weeks[weeks.length - 1].date

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, student_id, class_id, attendance_date, day_type, status')
        .eq('day_type', dayType)
        .eq('status', 'present')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)

      if (attendanceError) throw attendanceError

      const chartData = weeks.map(week => {
        const weekAttendance = attendanceData?.filter(r => r.attendance_date === week.date) || []
        const countByBranch: Record<string, number> = {
          'Chiên Con': 0, 'Ấu Nhi': 0, 'Thiếu Nhi': 0, 'Nghĩa Sĩ': 0,
        }
        weekAttendance.forEach(record => {
          if (record.class_id && classToBranch[record.class_id]) {
            const branch = classToBranch[record.class_id]
            countByBranch[branch] = (countByBranch[branch] || 0) + 1
          }
        })
        return {
          date: week.displayDate,
          chienCon: countByBranch['Chiên Con'],
          auNhi: countByBranch['Ấu Nhi'],
          thieuNhi: countByBranch['Thiếu Nhi'],
          nghiaSi: countByBranch['Nghĩa Sĩ'],
        }
      })

      const statsTypes: ('line' | 'bar' | 'progress')[] = ['line', 'bar', 'progress']
      const statsData = weeks.map((week, index) => {
        const weekAttendance = attendanceData?.filter(r => r.attendance_date === week.date) || []
        return { date: week.fullDisplayDate, value: weekAttendance.length, type: statsTypes[index] }
      })

      const mostRecentWeek = weeks[weeks.length - 1]
      const recentAttendance = attendanceData?.filter(r => r.attendance_date === mostRecentWeek.date) || []
      const countByBranch: Record<string, number> = {
        'Chiên Con': 0, 'Ấu Nhi': 0, 'Thiếu Nhi': 0, 'Nghĩa Sĩ': 0,
      }
      recentAttendance.forEach(record => {
        if (record.class_id && classToBranch[record.class_id]) {
          const branch = classToBranch[record.class_id]
          countByBranch[branch] = (countByBranch[branch] || 0) + 1
        }
      })

      const branchOrder: Branch[] = ['Nghĩa Sĩ', 'Thiếu Nhi', 'Ấu Nhi', 'Chiên Con']
      const branchStats = branchOrder.map((branch, index) => ({
        name: branchDisplayNames[branch],
        value: countByBranch[branch],
        total: studentCountByBranch[branch],
        color: (index === 0 ? 'primary' : 'default') as 'primary' | 'default',
      }))

      return { chartData, statsData, branchStats }
    },
    enabled,
  })
}

// ============ Class Attendance Data (by branch + date) ============
export function useClassAttendanceData(branch: Branch, date: string, dayType: 'cn' | 'thu5', enabled = true) {
  return useQuery({
    queryKey: queryKeys.classAttendance(branch, date, dayType),
    queryFn: async () => {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, branch')
        .eq('branch', branch)
        .eq('status', 'ACTIVE')
        .order('display_order', { ascending: true })

      if (classesError) throw classesError

      if (!classesData || classesData.length === 0) {
        return {
          classStats: { totalClasses: 0, totalStudents: 0, presentCount: 0, averageRate: 0 },
          classAttendanceData: [],
        }
      }

      const classIds = classesData.map(c => c.id)

      const [studentsRes, attendanceRes] = await Promise.all([
        supabase.from('thieu_nhi').select('id, class_id').in('class_id', classIds).eq('status', 'ACTIVE'),
        supabase.from('attendance_records').select('id, student_id, class_id, status')
          .in('class_id', classIds).eq('attendance_date', date).eq('day_type', dayType).eq('status', 'present'),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (attendanceRes.error) throw attendanceRes.error

      const studentsByClass: Record<string, number> = {}
      classIds.forEach(id => { studentsByClass[id] = 0 })
      studentsRes.data?.forEach(student => {
        if (student.class_id) {
          studentsByClass[student.class_id] = (studentsByClass[student.class_id] || 0) + 1
        }
      })

      const attendanceByClass: Record<string, number> = {}
      classIds.forEach(id => { attendanceByClass[id] = 0 })
      attendanceRes.data?.forEach(record => {
        if (record.class_id) {
          attendanceByClass[record.class_id] = (attendanceByClass[record.class_id] || 0) + 1
        }
      })

      const classAttendanceData = classesData.map(cls => ({
        classId: cls.id,
        className: cls.name,
        totalStudents: studentsByClass[cls.id] || 0,
        presentCount: attendanceByClass[cls.id] || 0,
      }))

      const totalClasses = classesData.length
      const totalStudents = Object.values(studentsByClass).reduce((a, b) => a + b, 0)
      const presentCount = Object.values(attendanceByClass).reduce((a, b) => a + b, 0)
      const averageRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 1000) / 10 : 0

      return {
        classStats: { totalClasses, totalStudents, presentCount, averageRate },
        classAttendanceData,
      }
    },
    enabled: enabled && !!date && !!branch,
  })
}

// ============ MyNotes Dashboard Data ============
type DerivedStatus = 'pending' | 'in_progress' | 'completed'

interface MyNotesResult {
  classCount: number
  studentCount: number
  todayPlans: (WeeklyPlan & { plan_categories?: PlanCategory; derivedStatus: DerivedStatus })[]
  completionPercentage: number
  nextActivity: WeeklyPlan | null
}

function deriveStatus(planDate: string, timeStart: string, timeEnd: string): DerivedStatus {
  const now = new Date()
  const start = new Date(`${planDate}T${timeStart}`)
  const end = new Date(`${planDate}T${timeEnd}`)
  if (now < start) return 'pending'
  if (now >= end) return 'completed'
  return 'in_progress'
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function useMyNotesData(user: UserProfile | null) {
  return useQuery({
    queryKey: queryKeys.myNotesData(user?.id || ''),
    queryFn: async (): Promise<MyNotesResult> => {
      if (!user) throw new Error('No user')

      const todayStr = toLocalDateString(new Date())

      // ---- Class & Student counts (role-based) ----
      let classCount = 0
      let studentCount = 0

      if (user.role === 'admin') {
        const [classesRes, studentsRes] = await Promise.all([
          supabase.from('classes').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        ])
        classCount = classesRes.count || 0
        studentCount = studentsRes.count || 0
      } else if (user.role === 'phan_doan_truong' && user.branch) {
        const { data: branchClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('branch', user.branch)
          .eq('status', 'ACTIVE')
        classCount = branchClasses?.length || 0
        if (branchClasses && branchClasses.length > 0) {
          const classIds = branchClasses.map(c => c.id)
          const { count } = await supabase
            .from('thieu_nhi')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classIds)
            .eq('status', 'ACTIVE')
          studentCount = count || 0
        }
      } else if (user.role === 'giao_ly_vien' && user.class_id) {
        classCount = 1
        const { count } = await supabase
          .from('thieu_nhi')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', user.class_id)
          .eq('status', 'ACTIVE')
        studentCount = count || 0
      }

      // ---- Today's plans (role-based) ----
      let todayQuery = supabase
        .from('weekly_plans')
        .select('*, plan_categories(*)')
        .eq('plan_date', todayStr)
        .order('time_start')

      if (user.role === 'phan_doan_truong' && user.branch) {
        todayQuery = todayQuery.eq('branch', user.branch)
      } else if (user.role === 'giao_ly_vien' && user.class_id) {
        // For giao_ly_vien: plans where branch matches OR class_ids contains their class
        // Supabase doesn't support OR across different columns easily in a single query,
        // so we fetch by branch and by class_ids, then merge
        const [byBranchRes, byClassRes] = await Promise.all([
          user.branch
            ? supabase.from('weekly_plans').select('*, plan_categories(*)').eq('plan_date', todayStr).eq('branch', user.branch).order('time_start')
            : Promise.resolve({ data: [] as (WeeklyPlan & { plan_categories?: PlanCategory })[] }),
          supabase.from('weekly_plans').select('*, plan_categories(*)').eq('plan_date', todayStr).contains('class_ids', [user.class_id]).order('time_start'),
        ])
        const byBranch = (byBranchRes as { data: (WeeklyPlan & { plan_categories?: PlanCategory })[] | null }).data || []
        const byClass = byClassRes.data || []
        // Merge and deduplicate
        const merged = new Map<string, WeeklyPlan & { plan_categories?: PlanCategory }>()
        for (const p of [...byBranch, ...byClass]) {
          merged.set(p.id, p as WeeklyPlan & { plan_categories?: PlanCategory })
        }
        const todayRaw = Array.from(merged.values()).sort((a, b) => a.time_start.localeCompare(b.time_start))

        const todayPlans = todayRaw.map(p => ({
          ...p,
          derivedStatus: deriveStatus(p.plan_date, p.time_start, p.time_end),
        }))
        const completedCount = todayPlans.filter(p => p.derivedStatus === 'completed').length
        const completionPercentage = todayPlans.length > 0 ? Math.round((completedCount / todayPlans.length) * 100) : 0

        // Next upcoming activity
        let nextActivity: WeeklyPlan | null = null
        const now = new Date()
        const todayFuture = todayPlans.find(p => new Date(`${p.plan_date}T${p.time_start}`) > now)
        if (todayFuture) {
          nextActivity = todayFuture
        } else {
          // Check future days
          const [futBranchRes, futClassRes] = await Promise.all([
            user.branch
              ? supabase.from('weekly_plans').select('*, plan_categories(*)').gt('plan_date', todayStr).eq('branch', user.branch).order('plan_date').order('time_start').limit(1)
              : Promise.resolve({ data: [] as WeeklyPlan[] }),
            supabase.from('weekly_plans').select('*, plan_categories(*)').gt('plan_date', todayStr).contains('class_ids', [user.class_id]).order('plan_date').order('time_start').limit(1),
          ])
          const futBranch = (futBranchRes as { data: WeeklyPlan[] | null }).data || []
          const futClass = futClassRes.data || []
          const candidates = [...futBranch, ...futClass].sort((a, b) => {
            const cmp = a.plan_date.localeCompare(b.plan_date)
            return cmp !== 0 ? cmp : a.time_start.localeCompare(b.time_start)
          })
          nextActivity = candidates[0] || null
        }

        return { classCount, studentCount, todayPlans, completionPercentage, nextActivity }
      }

      // Admin and phan_doan_truong path
      const { data: todayRaw } = await todayQuery
      const plans = (todayRaw || []) as (WeeklyPlan & { plan_categories?: PlanCategory })[]

      const todayPlans = plans.map(p => ({
        ...p,
        derivedStatus: deriveStatus(p.plan_date, p.time_start, p.time_end),
      }))
      const completedCount = todayPlans.filter(p => p.derivedStatus === 'completed').length
      const completionPercentage = todayPlans.length > 0 ? Math.round((completedCount / todayPlans.length) * 100) : 0

      // Next upcoming activity
      let nextActivity: WeeklyPlan | null = null
      const now = new Date()
      const todayFuture = todayPlans.find(p => new Date(`${p.plan_date}T${p.time_start}`) > now)
      if (todayFuture) {
        nextActivity = todayFuture
      } else {
        let nextQuery = supabase
          .from('weekly_plans')
          .select('*, plan_categories(*)')
          .gt('plan_date', todayStr)
          .order('plan_date')
          .order('time_start')
          .limit(1)
        if (user.role === 'phan_doan_truong' && user.branch) {
          nextQuery = nextQuery.eq('branch', user.branch)
        }
        const { data: nextData } = await nextQuery
        nextActivity = (nextData?.[0] as WeeklyPlan) || null
      }

      return { classCount, studentCount, todayPlans, completionPercentage, nextActivity }
    },
    enabled: !!user,
  })
}

// ============ Alert Rules ============
export function useAlertRules() {
  return useQuery({
    queryKey: queryKeys.alertRules,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as AlertRule[]
    },
  })
}

// ============ Alerts (with filters) ============
export function useAlerts(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: queryKeys.alerts(filters),
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .in('status', ['unread', 'read'])
        .order('created_at', { ascending: false })

      if (filters.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity)
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }
      if (filters.timeRange && filters.timeRange !== 'all') {
        const now = new Date()
        let startDate: Date
        switch (filters.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as AlertRecord[]
    },
  })
}

// ============ Alert Stats ============
export function useAlertStats() {
  return useQuery({
    queryKey: queryKeys.alertStats,
    queryFn: async () => {
      const [totalRes, unreadRes, highRes, resolvedRes] = await Promise.all([
        supabase.from('alerts').select('*', { count: 'exact', head: true }),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'high').in('status', ['unread', 'read']),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'dismissed']),
      ])

      return {
        total: totalRes.count || 0,
        unread: unreadRes.count || 0,
        high: highRes.count || 0,
        resolved: resolvedRes.count || 0,
      }
    },
  })
}

// ============ Alert History ============
export function useAlertHistory() {
  return useQuery({
    queryKey: queryKeys.alertHistory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .in('status', ['resolved', 'dismissed'])
        .order('resolved_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data || []) as AlertRecord[]
    },
  })
}

// ============ Dashboard Alerts (latest 2) ============
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['dashboardAlerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2)

      if (error) throw error
      return (data || []) as AlertRecord[]
    },
  })
}
// ============ User Notes (personal notes) ============
export function useUserNotes(userId?: string) {
  return useQuery({
    queryKey: queryKeys.userNotes(userId || ''),
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as UserNote[]
    },
    enabled: !!userId,
  })
}

// ============ Filtered User Notes (by date range) ============
export function useFilteredUserNotes(userId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['userNotes', userId, 'filtered', startDate, endDate],
    queryFn: async () => {
      if (!userId) return []
      let query = supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('note_date', { ascending: true })
        .order('created_at', { ascending: false })

      if (startDate) {
        query = query.gte('note_date', startDate)
      }
      if (endDate) {
        query = query.lte('note_date', endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as UserNote[]
    },
    enabled: !!userId,
  })
}

// ============ My Notifications (all for user) ============
export function useMyNotifications(userId?: string) {
  return useQuery({
    queryKey: [...queryKeys.notifications, userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('notification_recipients')
        .select(`
          id,
          is_read,
          read_at,
          notification_id,
          notifications (
            id,
            title,
            content,
            target_type,
            target_values,
            priority,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch creator names for all unique created_by ids
      const notifications = (data || [])
        .filter((r: Record<string, unknown>) => r.notifications)
        .map((r: Record<string, unknown>) => {
          const n = r.notifications as Record<string, unknown>
          return {
            id: n.id as string,
            title: n.title as string,
            content: n.content as string,
            target_type: n.target_type as string,
            target_values: n.target_values as string[],
            priority: n.priority as string,
            created_by: n.created_by as string | undefined,
            created_at: n.created_at as string,
            updated_at: n.updated_at as string | undefined,
            is_read: r.is_read as boolean,
            read_at: r.read_at as string | undefined,
            recipient_id: r.id as string,
          } as NotificationWithStatus
        })

      // Get creator names
      const creatorIds = Array.from(new Set(notifications.map(n => n.created_by).filter(Boolean)))
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('users')
          .select('id, full_name, saint_name')
          .in('id', creatorIds as string[])

        const creatorMap = new Map(
          (creators || []).map(c => [c.id, `${c.saint_name || ''} ${c.full_name}`.trim()])
        )
        notifications.forEach(n => {
          if (n.created_by) n.creator_name = creatorMap.get(n.created_by)
        })
      }

      return notifications
    },
    enabled: !!userId,
  })
}

// ============ Unread Notifications (for auto-popup) ============
export function useUnreadNotifications(userId?: string) {
  return useQuery({
    queryKey: [...queryKeys.unreadNotifications, userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('notification_recipients')
        .select(`
          id,
          is_read,
          read_at,
          notification_id,
          notifications (
            id,
            title,
            content,
            target_type,
            target_values,
            priority,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || [])
        .filter((r: Record<string, unknown>) => r.notifications)
        .map((r: Record<string, unknown>) => {
          const n = r.notifications as Record<string, unknown>
          return {
            id: n.id as string,
            title: n.title as string,
            content: n.content as string,
            target_type: n.target_type as string,
            target_values: n.target_values as string[],
            priority: n.priority as string,
            created_by: n.created_by as string | undefined,
            created_at: n.created_at as string,
            updated_at: n.updated_at as string | undefined,
            is_read: false,
            read_at: undefined,
            recipient_id: r.id as string,
          } as NotificationWithStatus
        })
    },
    enabled: !!userId,
  })
}

// ============ All Notifications (admin management) ============
export function useAllNotifications() {
  return useQuery({
    queryKey: queryKeys.allNotifications,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get creator names
      const notifications = (data || []) as Notification[]
      const creatorIds = Array.from(new Set(notifications.map(n => n.created_by).filter(Boolean)))
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('users')
          .select('id, full_name, saint_name')
          .in('id', creatorIds as string[])

        const creatorMap = new Map(
          (creators || []).map(c => [c.id, `${c.saint_name || ''} ${c.full_name}`.trim()])
        )
        return notifications.map(n => ({
          ...n,
          creator_name: n.created_by ? creatorMap.get(n.created_by) : undefined,
        }))
      }

      return notifications.map(n => ({ ...n, creator_name: undefined }))
    },
  })
}

// ============ Holidays ============
export function useHolidays(schoolYearId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.holidays(schoolYearId || ''),
    queryFn: async () => {
      if (!schoolYearId) return [] as Holiday[]

      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('school_year_id', schoolYearId)
        .order('holiday_date', { ascending: true })

      if (error) {
        // If table doesn't exist yet, return empty
        if (error.code === '42P01') return [] as Holiday[]
        throw error
      }
      return (data || []) as Holiday[]
    },
    enabled: !!schoolYearId,
  })
}

// ============ Invalidation helpers ============
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateUsers: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
    invalidateClasses: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
    invalidateStudents: () => queryClient.invalidateQueries({ queryKey: queryKeys.students }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
    invalidateClassStats: () => queryClient.invalidateQueries({ queryKey: queryKeys.classStats }),
    invalidateWeeklyPlans: (weekStart: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlans(weekStart) }),
    invalidateMyNotes: () => queryClient.invalidateQueries({ queryKey: ['myNotesData'] }),
    invalidateAlerts: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    invalidateAlertRules: () => queryClient.invalidateQueries({ queryKey: queryKeys.alertRules }),
    invalidateAlertStats: () => queryClient.invalidateQueries({ queryKey: queryKeys.alertStats }),
    invalidateAlertHistory: () => queryClient.invalidateQueries({ queryKey: queryKeys.alertHistory }),
    invalidateDashboardAlerts: () => queryClient.invalidateQueries({ queryKey: ['dashboardAlerts'] }),
    invalidateUserNotes: () => queryClient.invalidateQueries({ queryKey: ['userNotes'] }),
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    invalidateHolidays: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
    invalidateGLVClassTrend: () => queryClient.invalidateQueries({ queryKey: ['glvClassTrend'] }),
    invalidateGLVPerStudentStats: () => queryClient.invalidateQueries({ queryKey: ['glvPerStudentStats'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}
