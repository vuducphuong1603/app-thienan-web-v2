import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sundayFullyPresentIds } from '@/lib/sunday-attendance'
import { supabase, UserProfile, Class, Branch, WeeklyPlan, PlanCategory, AlertRule, AlertRecord, NotificationWithStatus, Notification, UserNote, Holiday, SchoolYear, AttendanceRecord, ThieuNhiProfile, BRANCHES } from './supabase'
import { CLASS_TEACHER_ROLES } from './class-teachers'
import { sortByGivenName } from './student-sort'

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

// ============ Helper: fetch all rows bypassing Supabase 1000-row default limit ============
async function fetchAllRows<T = Record<string, unknown>>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const PAGE_SIZE = 1000
  const allData: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allData
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
  schoolYears: ['schoolYears'] as const,
  attendanceStudents: (classId: string, date: string) => ['attendanceStudents', classId, date] as const,
  holidayCheck: (schoolYearId: string, date: string) => ['holidayCheck', schoolYearId, date] as const,
  classDetail: (classId: string) => ['classDetail', classId] as const,
}

// ============ Dashboard Stats ============
export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    staleTime: 5 * 60 * 1000, // Dashboard stats don't change often
    queryFn: async () => {
      const [glvRes, thieuNhiRes, classesRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'giao_ly_vien').eq('status', 'ACTIVE'),
        supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      ])

      // Throw on auth/RLS errors so React Query retries instead of caching 0
      if (glvRes.error) throw glvRes.error
      if (thieuNhiRes.error) throw thieuNhiRes.error
      if (classesRes.error) throw classesRes.error

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
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

      if (classRes.error) throw classRes.error
      if (studentCountRes.error) throw studentCountRes.error

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
          ? supabase.from('attendance_records').select('student_id, day_type')
              .eq('class_id', user.class_id).eq('attendance_date', lastCN).in('day_type', ['cn', 'cn_le']).eq('status', 'present')
          : Promise.resolve({ data: [] as { student_id: string; day_type: string }[] }),
      ])

      // Chủ nhật: có mặt = đủ cả học giáo lý lẫn đi lễ
      const cnPresent = sundayFullyPresentIds(cnRes.data || []).size
      const thu5Rate = studentCount > 0 ? Math.round(((thu5Res.count || 0) / studentCount) * 100) : 0
      const cnRate = studentCount > 0 ? Math.round((cnPresent / studentCount) * 100) : 0

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

      const [studentCountRes, attendanceData] = await Promise.all([
        supabase.from('thieu_nhi').select('*', { count: 'exact', head: true })
          .eq('class_id', classId).eq('status', 'ACTIVE'),
        fetchAllRows<{ attendance_date: string; day_type: string; student_id: string }>(
          (from, to) => supabase.from('attendance_records').select('attendance_date, day_type, student_id')
            .eq('class_id', classId).eq('status', 'present')
            .gte('attendance_date', startDate).lte('attendance_date', endDate)
            .range(from, to)
        ),
      ])

      if (studentCountRes.error) throw studentCountRes.error

      const totalStudents = studentCountRes.count || 0
      const records = attendanceData

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
        schoolYearId
          ? supabase.from('attendance_records').select('student_id, day_type')
              .eq('class_id', classId).eq('status', 'present').eq('school_year_id', schoolYearId)
              .gte('attendance_date', schoolYear.start_date).lte('attendance_date', schoolYear.end_date)
          : supabase.from('attendance_records').select('student_id, day_type')
              .eq('class_id', classId).eq('status', 'present'),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (attendanceRes.error) throw attendanceRes.error

      const holidays = (holidaysRes.data || []) as Holiday[]
      const thu5Holidays = holidays.filter(h => h.day_type === 'thu5' || h.day_type === 'both').length
      const cnHolidays = holidays.filter(h => h.day_type === 'cn' || h.day_type === 'both').length
      const effectiveThu5Days = Math.max(1, totalThu5 - thu5Holidays)
      const effectiveCnDays = Math.max(1, totalCn - cnHolidays)

      const students = sortByGivenName(studentsRes.data || [])
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
        supabase.from('attendance_records').select('student_id, day_type')
          .eq('class_id', classId).eq('attendance_date', date)
          .in('day_type', dayType === 'cn' ? ['cn', 'cn_le'] : ['thu5']).eq('status', 'present'),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (attendanceRes.error) throw attendanceRes.error

      const students = sortByGivenName((studentsRes.data || []) as AbsentStudent[])
      // Chủ nhật: có mặt = đủ cả học giáo lý lẫn đi lễ
      const presentIds = dayType === 'cn'
        ? sundayFullyPresentIds(attendanceRes.data || [])
        : new Set((attendanceRes.data || []).map(r => r.student_id))

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
export function useClassStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.classStats,
    staleTime: 10 * 60 * 1000, // Stats rarely change
    enabled,
    queryFn: async () => {
      const [branchesRes, classesRes, students, teachersRes] = await Promise.all([
        supabase.from('branches').select('id, name, order_index').order('order_index'),
        supabase.from('classes').select('id, branch').eq('status', 'ACTIVE'),
        // Phân trang: quá 1000 thiếu nhi thì sĩ số theo ngành bị cắt cụt
        fetchAllRows<{ id: string; class_id: string }>(
          (from, to) => supabase.from('thieu_nhi').select('id, class_id').eq('status', 'ACTIVE').order('id', { ascending: true }).range(from, to)
        ),
        supabase.from('users').select('id, class_id').eq('role', 'giao_ly_vien').eq('status', 'ACTIVE'),
      ])

      if (branchesRes.error) throw branchesRes.error
      if (classesRes.error) throw classesRes.error
      if (teachersRes.error) throw teachersRes.error

      const branches = branchesRes.data
      if (!branches) return []

      const classes = classesRes.data
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
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, full_name, saint_name, phone, address, role, status, branch, class_id, class_name, avatar_url, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      // Xếp theo tên gọi đúng bảng chữ cái tiếng Việt (như danh sách thiếu nhi)
      return sortByGivenName((data || []) as UserProfile[])
    },
  })
}

// ============ Classes (all) ============
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    staleTime: 10 * 60 * 1000, // Classes rarely change
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
    staleTime: 10 * 60 * 1000, // Classes rarely change
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
      console.log('[useStudentsWithDetails] queryFn START')
      const t0 = Date.now()

      // Fetch everything in parallel - no waterfall
      const [schoolYearRes, classesRes, studentsData, allHolidaysRes] = await Promise.all([
        supabase.from('school_years').select('id, start_date, end_date').eq('is_current', true).single()
          .then(r => { console.log('[query] school_years done:', Date.now() - t0, 'ms', r.error?.message || 'OK'); return r }),
        supabase.from('classes').select('id, name, branch, display_order, status, created_at, updated_at').eq('status', 'ACTIVE').order('display_order', { ascending: true })
          .then(r => { console.log('[query] classes done:', Date.now() - t0, 'ms', r.error?.message || 'OK'); return r }),
        // Supabase chỉ trả tối đa 1000 dòng mỗi request nên phải lấy hết theo trang,
        // nếu không danh sách và ô tìm kiếm sẽ bỏ sót thiếu nhi khi vượt 1000 em.
        // Kèm .order('id') làm khoá phụ để phân trang ổn định khi trùng full_name.
        fetchAllRows<ThieuNhiProfile>(
          (from, to) => supabase.from('thieu_nhi').select('id, full_name, saint_name, student_code, date_of_birth, gender, phone, address, parent_name, parent_phone, parent_name_2, parent_phone_2, class_id, status, avatar_url, notes, score_45_hk1, score_exam_hk1, score_45_hk2, score_exam_hk2, attendance_thu5, attendance_cn, created_at, updated_at')
            .order('full_name', { ascending: true }).order('id', { ascending: true }).range(from, to)
        ).then(rows => { console.log('[query] thieu_nhi done:', Date.now() - t0, 'ms', 'rows:', rows.length); return rows }),
        supabase.from('holidays').select('day_type, school_year_id')
          .then(r => { console.log('[query] holidays done:', Date.now() - t0, 'ms', r.error?.message || 'OK'); return r }),
      ])

      console.log('[useStudentsWithDetails] All queries done:', Date.now() - t0, 'ms')

      if (schoolYearRes.error) throw schoolYearRes.error
      if (classesRes.error) throw classesRes.error
      if (allHolidaysRes.error) throw allHolidaysRes.error

      const schoolYear = schoolYearRes.data
      const classesData = classesRes.data || []
      // Chỉ lấy ngày nghỉ của năm học hiện tại, tránh trừ nhầm ngày nghỉ năm cũ
      const holidays = ((allHolidaysRes.data || []) as Pick<Holiday, 'day_type' | 'school_year_id'>[])
        .filter(h => !schoolYear || h.school_year_id === schoolYear.id)

      // Count actual Thursdays (4) and Sundays (0) in school year
      const totalThu5 = schoolYear ? countWeekdays(schoolYear.start_date, schoolYear.end_date, 4) : 40
      const totalCn = schoolYear ? countWeekdays(schoolYear.start_date, schoolYear.end_date, 0) : 40

      // Calculate effective days (actual day count minus holidays)
      const thu5Holidays = holidays.filter(h => h.day_type === 'thu5' || h.day_type === 'both').length
      const cnHolidays = holidays.filter(h => h.day_type === 'cn' || h.day_type === 'both').length
      const effectiveThu5Days = Math.max(1, totalThu5 - thu5Holidays)
      const effectiveCnDays = Math.max(1, totalCn - cnHolidays)

      // Build class lookup map for O(1) access instead of O(n) find per student
      const classMap = new Map(classesData.map(c => [c.id, c]))

      // Xếp theo TÊN GỌI đúng bảng chữ cái tiếng Việt (DB order theo họ)
      const studentsWithDetails = sortByGivenName(studentsData).map((student) => {
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
    staleTime: 10 * 60 * 1000, // Class details rarely change
    queryFn: async () => {
      // Supabase chỉ trả tối đa 1000 dòng mỗi request nên phải lấy hết theo trang,
      // nếu không sĩ số sẽ bị cắt cụt khi số thiếu nhi vượt 1000.
      const [classesRes, usersRes, students] = await Promise.all([
        supabase.from('classes').select('*').order('display_order', { ascending: true }),
        supabase.from('users').select('id, full_name, saint_name, class_id, class_name').in('role', [...CLASS_TEACHER_ROLES]),
        fetchAllRows<{ id: string; class_id: string }>(
          (from, to) => supabase.from('thieu_nhi').select('id, class_id').eq('status', 'ACTIVE').order('id', { ascending: true }).range(from, to)
        ),
      ])

      if (classesRes.error) throw classesRes.error
      if (usersRes.error) throw usersRes.error

      // Build student count map - O(n)
      const studentCountByClass: Record<string, number> = {}
      students.forEach((student) => {
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

// ============ Class Detail (xem chi tiết lớp) ============
export interface ClassStudentDetail {
  id: string
  student_code: string | null
  full_name: string
  saint_name: string | null
  date_of_birth: string | null
  parent_name: string | null
  parent_phone: string | null
  status: 'ACTIVE' | 'INACTIVE'
  avatar_url: string | null
  score_45_hk1: number | null
  score_exam_hk1: number | null
  score_45_hk2: number | null
  score_exam_hk2: number | null
  attendance_thu5: number | null
  attendance_cn: number | null
  avgCatechism: number
  avgAttendance: number
  totalAvg: number
}

export interface ClassTeacherDetail {
  id: string
  full_name: string
  saint_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export function useClassDetail(classId: string) {
  return useQuery({
    queryKey: queryKeys.classDetail(classId),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (classError) throw classError
      const classInfo = classData as Class

      // Buổi thứ 5 và Chúa nhật gần nhất để tính tỉ lệ điểm danh
      const lastThu5 = getRecentDay('thu5')
      const lastCN = getRecentDay('cn')
      const recentDates = [lastThu5, lastCN].filter(Boolean) as string[]

      const [teachersRes, students, schoolYearRes, attendanceRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, saint_name, phone, email, avatar_url, status, class_id, class_name')
          .in('role', [...CLASS_TEACHER_ROLES]),
        // Supabase trả tối đa 1000 dòng mỗi request nên phải lấy hết theo trang
        fetchAllRows<Omit<ClassStudentDetail, 'avgCatechism' | 'avgAttendance' | 'totalAvg'>>(
          (from, to) =>
            supabase
              .from('thieu_nhi')
              .select(
                'id, student_code, full_name, saint_name, date_of_birth, parent_name, parent_phone, status, avatar_url, score_45_hk1, score_exam_hk1, score_45_hk2, score_exam_hk2, attendance_thu5, attendance_cn'
              )
              .eq('class_id', classId)
              .order('id', { ascending: true })
              .range(from, to)
        ),
        supabase.from('school_years').select('id, start_date, end_date').eq('is_current', true).maybeSingle(),
        supabase
          .from('attendance_records')
          .select('student_id, day_type')
          .eq('class_id', classId)
          .eq('status', 'present')
          .in('attendance_date', recentDates),
      ])

      if (teachersRes.error) throw teachersRes.error

      // Giáo lý viên khớp theo class_id hoặc class_name (dữ liệu cũ chỉ có tên lớp)
      const teachers: ClassTeacherDetail[] = (teachersRes.data || [])
        .filter((t) => t.class_id === classId || t.class_name === classInfo.name)
        .map((t) => ({
          id: t.id,
          full_name: t.full_name,
          saint_name: t.saint_name,
          phone: t.phone,
          email: t.email,
          avatar_url: t.avatar_url,
          status: t.status,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))

      // Số buổi học thực tế (trừ ngày lễ) để quy đổi điểm danh ra thang 10
      let effectiveThu5Days = 40
      let effectiveCnDays = 40
      const schoolYear = schoolYearRes.data
      if (schoolYear) {
        const totalThu5 = countWeekdays(schoolYear.start_date, schoolYear.end_date, 4)
        const totalCn = countWeekdays(schoolYear.start_date, schoolYear.end_date, 0)
        const { data: holidaysData } = await supabase
          .from('holidays')
          .select('day_type')
          .eq('school_year_id', schoolYear.id)
        const holidays = (holidaysData || []) as { day_type: string }[]
        const thu5Holidays = holidays.filter((h) => h.day_type === 'thu5' || h.day_type === 'both').length
        const cnHolidays = holidays.filter((h) => h.day_type === 'cn' || h.day_type === 'both').length
        effectiveThu5Days = Math.max(1, totalThu5 - thu5Holidays)
        effectiveCnDays = Math.max(1, totalCn - cnHolidays)
      }

      const studentList: ClassStudentDetail[] = students
        .map((s) => {
          const avgCatechism =
            ((s.score_45_hk1 || 0) +
              (s.score_45_hk2 || 0) +
              (s.score_exam_hk1 || 0) * 2 +
              (s.score_exam_hk2 || 0) * 2) /
            6
          const avgAttendance =
            (s.attendance_thu5 || 0) * 0.4 * (10 / effectiveThu5Days) +
            (s.attendance_cn || 0) * 0.6 * (10 / effectiveCnDays)
          return {
            ...s,
            avgCatechism,
            avgAttendance,
            totalAvg: avgCatechism * 0.6 + avgAttendance * 0.4,
          }
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))

      const activeStudents = studentList.filter((s) => s.status === 'ACTIVE')
      const attendanceRows = (attendanceRes.data || []) as { student_id: string; day_type: string }[]
      const presentThu5 = attendanceRows.filter((r) => r.day_type === 'thu5').length
      const presentCn = attendanceRows.filter((r) => r.day_type === 'cn').length
      const denominator = activeStudents.length

      const classAvg =
        activeStudents.length > 0
          ? activeStudents.reduce((sum, s) => sum + s.totalAvg, 0) / activeStudents.length
          : 0

      return {
        classInfo,
        teachers,
        students: studentList,
        activeCount: activeStudents.length,
        inactiveCount: studentList.length - activeStudents.length,
        classAvg,
        attendance: {
          lastThu5,
          lastCN,
          presentThu5,
          presentCn,
          rateThu5: denominator > 0 ? Math.round((presentThu5 / denominator) * 100) : 0,
          rateCn: denominator > 0 ? Math.round((presentCn / denominator) * 100) : 0,
        },
      }
    },
  })
}

// ============ Current School Year ============
export function useCurrentSchoolYear(enabled = true) {
  return useQuery({
    queryKey: queryKeys.schoolYear,
    staleTime: 30 * 60 * 1000, // School year almost never changes
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
    staleTime: 10 * 60 * 1000, // Categories and classes rarely change
    queryFn: async () => {
      const [catRes, classRes] = await Promise.all([
        supabase.from('plan_categories').select('*').order('display_order'),
        supabase.from('classes').select('*').eq('status', 'ACTIVE').order('display_order'),
      ])

      if (catRes.error) throw catRes.error
      if (classRes.error) throw classRes.error

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
    const dateStr = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}-${String(weekDate.getDate()).padStart(2, '0')}`
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
    staleTime: 5 * 60 * 1000, // Attendance trends don't change frequently
    queryFn: async () => {
      const dayType: 'thu5' | 'cn' = chartType === 'sunday' ? 'cn' : 'thu5'
      const weeks = getLast3Weeks(dayType)

      const classesRes = await supabase.from('classes').select('id, name, branch').eq('status', 'ACTIVE')
      if (classesRes.error) throw classesRes.error

      const allStudents = await fetchAllRows<{ id: string; class_id: string }>(
        (from, to) => supabase.from('thieu_nhi').select('id, class_id').eq('status', 'ACTIVE').range(from, to)
      )

      const classToBranch: Record<string, Branch> = {}
      classesRes.data?.forEach(cls => {
        classToBranch[cls.id] = cls.branch as Branch
      })

      const studentCountByBranch: Record<string, number> = {
        'Chiên Con': 0, 'Ấu Nhi': 0, 'Thiếu Nhi': 0, 'Nghĩa Sĩ': 0,
      }
      allStudents.forEach(student => {
        if (student.class_id && classToBranch[student.class_id]) {
          const branch = classToBranch[student.class_id]
          studentCountByBranch[branch] = (studentCountByBranch[branch] || 0) + 1
        }
      })

      const startDate = weeks[0].date
      const endDate = weeks[weeks.length - 1].date

      const attendanceData = await fetchAllRows<{ id: string; student_id: string; class_id: string; attendance_date: string; day_type: string; status: string }>(
        (from, to) => supabase
          .from('attendance_records')
          .select('id, student_id, class_id, attendance_date, day_type, status')
          .in('day_type', dayType === 'cn' ? ['cn', 'cn_le'] : ['thu5'])
          .eq('status', 'present')
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)
          .range(from, to)
      )

      // Chủ nhật: chỉ tính em có mặt đủ cả giáo lý lẫn đi lễ (giữ 1 bản ghi đại diện / em)
      const toFullyPresent = (rows: typeof attendanceData) => {
        if (dayType !== 'cn') return rows
        const full = sundayFullyPresentIds(rows)
        return rows.filter(r => r.day_type === 'cn' && full.has(r.student_id))
      }

      const chartData = weeks.map(week => {
        const weekAttendance = toFullyPresent(attendanceData.filter(r => r.attendance_date === week.date))
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
        const weekAttendance = attendanceData.filter(r => r.attendance_date === week.date)
        return { date: week.fullDisplayDate, value: weekAttendance.length, type: statsTypes[index] }
      })

      const mostRecentWeek = weeks[weeks.length - 1]
      const recentAttendance = attendanceData.filter(r => r.attendance_date === mostRecentWeek.date)
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

      const [students, attendanceData] = await Promise.all([
        // Phân trang: gộp mọi lớp trong ngành nên vẫn có thể vượt 1000 dòng
        fetchAllRows<{ id: string; class_id: string }>(
          (from, to) => supabase.from('thieu_nhi').select('id, class_id').in('class_id', classIds).eq('status', 'ACTIVE').order('id', { ascending: true }).range(from, to)
        ),
        fetchAllRows<{ id: string; student_id: string; class_id: string; status: string; day_type: string }>(
          (from, to) => supabase.from('attendance_records').select('id, student_id, class_id, status, day_type')
            .in('class_id', classIds).eq('attendance_date', date)
            .in('day_type', dayType === 'cn' ? ['cn', 'cn_le'] : ['thu5']).eq('status', 'present')
            .range(from, to)
        ),
      ]).then(([students, rows]) => {
        // Chủ nhật: có mặt = đủ cả học giáo lý lẫn đi lễ
        if (dayType !== 'cn') return [students, rows] as const
        const full = sundayFullyPresentIds(rows)
        return [students, rows.filter(r => r.day_type === 'cn' && full.has(r.student_id))] as const
      })

      const studentsByClass: Record<string, number> = {}
      classIds.forEach(id => { studentsByClass[id] = 0 })
      students.forEach(student => {
        if (student.class_id) {
          studentsByClass[student.class_id] = (studentsByClass[student.class_id] || 0) + 1
        }
      })

      const attendanceByClass: Record<string, number> = {}
      classIds.forEach(id => { attendanceByClass[id] = 0 })
      attendanceData.forEach(record => {
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
          supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('thieu_nhi').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        ])
        if (classesRes.error) throw classesRes.error
        if (studentsRes.error) throw studentsRes.error
        classCount = classesRes.count || 0
        studentCount = studentsRes.count || 0
      } else if (user.role === 'phan_doan_truong' && user.branch) {
        // Parallel: get class IDs and student count by branch classes
        const { data: branchClasses } = await supabase
          .from('classes').select('id').eq('branch', user.branch).eq('status', 'ACTIVE')
        classCount = branchClasses?.length || 0
        if (classCount > 0) {
          const { count } = await supabase
            .from('thieu_nhi').select('id', { count: 'exact', head: true })
            .in('class_id', branchClasses!.map(c => c.id)).eq('status', 'ACTIVE')
          studentCount = count || 0
        }
      } else if (user.role === 'giao_ly_vien' && user.class_id) {
        classCount = 1
        const { count } = await supabase
          .from('thieu_nhi').select('id', { count: 'exact', head: true })
          .eq('class_id', user.class_id).eq('status', 'ACTIVE')
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

      if (totalRes.error) throw totalRes.error
      if (unreadRes.error) throw unreadRes.error
      if (highRes.error) throw highRes.error
      if (resolvedRes.error) throw resolvedRes.error

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
export function useDashboardAlerts(enabled = true) {
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
    enabled,
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

// ============ School Years (all) ============
export function useSchoolYears() {
  return useQuery({
    queryKey: queryKeys.schoolYears,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_years')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      return (data || []) as SchoolYear[]
    },
  })
}

// ============ Attendance Students ============
export interface StudentWithAttendance extends ThieuNhiProfile {
  class_name?: string
  attendance_status?: 'present' | 'absent' | null
  attendance_time?: string
  attendance_by?: string
  attendance_record_id?: string
  /** Chủ nhật – buổi đi lễ (day_type 'cn_le'); attendance_* ở trên là buổi học giáo lý ('cn') */
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

export function useAttendanceStudents(
  classId: string,
  date: string,
  classes: Class[]
) {
  // Compute derived date info
  const dateObj = new Date(date)
  const dayIndex = dateObj.getDay()
  const dayType: 'thu5' | 'cn' | null = dayIndex === 4 ? 'thu5' : dayIndex === 0 ? 'cn' : null
  const isCompensatoryMode = [1, 2, 3, 5, 6].includes(dayIndex)

  // Thursday of the week
  const getThursdayOfWeek = (d: Date): string => {
    const di = d.getDay()
    let daysToThursday = 4 - di
    if (di === 0) daysToThursday = -3
    const thu = new Date(d)
    thu.setDate(d.getDate() + daysToThursday)
    return `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, '0')}-${String(thu.getDate()).padStart(2, '0')}`
  }
  const thursdayOfWeek = getThursdayOfWeek(dateObj)

  return useQuery({
    queryKey: queryKeys.attendanceStudents(classId, date),
    queryFn: async (): Promise<StudentWithAttendance[]> => {
      if (!classId) return []

      const { data: studentsData, error: studentsError } = await supabase
        .from('thieu_nhi')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'ACTIVE')
        .order('full_name', { ascending: true })

      if (studentsError) throw studentsError

      const sortedStudents = sortByGivenName(studentsData || [])
      const selectedClass = classes.find(c => c.id === classId)
      const studentIds = sortedStudents.map(s => s.id)

      if (isCompensatoryMode) {
        // Compensatory mode
        const thursdayAttendanceMap = new Map<string, { check_in_time?: string; created_by?: string }>()
        if (studentIds.length > 0) {
          const { data: thursdayData } = await supabase
            .from('attendance_records')
            .select('student_id, is_compensatory, check_in_time, created_by')
            .in('student_id', studentIds)
            .eq('attendance_date', thursdayOfWeek)
            .eq('day_type', 'thu5')
            .eq('status', 'present')

          if (thursdayData) {
            thursdayData.forEach(record => {
              if (!record.is_compensatory) {
                thursdayAttendanceMap.set(record.student_id, {
                  check_in_time: record.check_in_time,
                  created_by: record.created_by,
                })
              }
            })
          }
        }

        const compensatoryMap = new Map<string, { id: string; check_in_time?: string; created_by?: string }>()
        if (studentIds.length > 0) {
          try {
            const { data: compensatoryData } = await supabase
              .from('attendance_records')
              .select('id, student_id, check_in_time, created_by')
              .in('student_id', studentIds)
              .eq('is_compensatory', true)
              .eq('compensated_for_date', thursdayOfWeek)
              .eq('status', 'present')

            if (compensatoryData) {
              compensatoryData.forEach(record => {
                compensatoryMap.set(record.student_id, {
                  id: record.id,
                  check_in_time: record.check_in_time,
                  created_by: record.created_by,
                })
              })
            }
          } catch { /* column might not exist */ }
        }

        // Resolve user names
        const allCreatedByIds = [
          ...Array.from(thursdayAttendanceMap.values()).map(v => v.created_by),
          ...Array.from(compensatoryMap.values()).map(v => v.created_by),
        ].filter((id): id is string => !!id)
        const userNameMap = new Map<string, string>()
        if (allCreatedByIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(new Set(allCreatedByIds)))
          if (usersData) usersData.forEach(u => userNameMap.set(u.id, u.full_name))
        }

        return sortedStudents.map(student => {
          const thursdayRecord = thursdayAttendanceMap.get(student.id)
          const hasThursday = !!thursdayRecord
          const compensatory = compensatoryMap.get(student.id)
          return {
            ...student,
            class_name: selectedClass?.name,
            attendance_status: (hasThursday || !!compensatory) ? 'present' as const : null,
            attendance_time: thursdayRecord?.check_in_time?.substring(0, 5),
            attendance_by: thursdayRecord?.created_by ? userNameMap.get(thursdayRecord.created_by) : undefined,
            has_thursday_attendance: hasThursday,
            has_compensatory_attendance: !!compensatory,
            compensatory_record_id: compensatory?.id,
            compensatory_time: compensatory?.check_in_time?.substring(0, 5),
            compensatory_by: compensatory?.created_by ? userNameMap.get(compensatory.created_by) : undefined,
          }
        })
      } else {
        // Normal mode
        let attendanceData: AttendanceRecord[] | null = null
        try {
          const { data, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('class_id', classId)
            .eq('attendance_date', date)
          if (!attendanceError) attendanceData = data
        } catch { /* table may not exist */ }

        // Compensatory records for Thursday
        const compensatoryMap = new Map<string, { id: string; check_in_time?: string; created_by?: string }>()
        if (dayType === 'thu5' && studentIds.length > 0) {
          try {
            const { data: compensatoryData } = await supabase
              .from('attendance_records')
              .select('id, student_id, check_in_time, created_by')
              .in('student_id', studentIds)
              .eq('is_compensatory', true)
              .eq('compensated_for_date', date)
              .eq('status', 'present')
            if (compensatoryData) {
              compensatoryData.forEach(record => {
                compensatoryMap.set(record.student_id, {
                  id: record.id,
                  check_in_time: record.check_in_time,
                  created_by: record.created_by,
                })
              })
            }
          } catch { /* compensatory column might not exist */ }
        }

        // Resolve compensatory user names
        const compensatoryUserIds = Array.from(compensatoryMap.values()).map(v => v.created_by).filter((id): id is string => !!id)
        const compensatoryUserNameMap = new Map<string, string>()
        if (compensatoryUserIds.length > 0) {
          const { data: usersData } = await supabase.from('users').select('id, full_name').in('id', Array.from(new Set(compensatoryUserIds)))
          if (usersData) usersData.forEach(u => compensatoryUserNameMap.set(u.id, u.full_name))
        }

        // Build attendance map (exclude compensatory)
        const attendanceMap = new Map<string, AttendanceRecord>()
        const massMap = new Map<string, AttendanceRecord>()
        if (attendanceData) {
          attendanceData.forEach(record => {
            if ((record as unknown as { is_compensatory?: boolean }).is_compensatory === true) return
            if (record.day_type === 'cn_le') massMap.set(record.student_id, record)
            else attendanceMap.set(record.student_id, record)
          })
        }

        // Resolve attendance user names
        const attendanceUserIds = [...Array.from(attendanceMap.values()), ...Array.from(massMap.values())].map(r => r.created_by).filter((id): id is string => !!id)
        const attendanceUserNameMap = new Map<string, string>()
        if (attendanceUserIds.length > 0) {
          const { data: usersData } = await supabase.from('users').select('id, full_name').in('id', Array.from(new Set(attendanceUserIds)))
          if (usersData) usersData.forEach(u => attendanceUserNameMap.set(u.id, u.full_name))
        }

        return sortedStudents.map(student => {
          const attendance = attendanceMap.get(student.id)
          const mass = massMap.get(student.id)
          const compensatory = compensatoryMap.get(student.id)
          return {
            ...student,
            class_name: selectedClass?.name,
            attendance_status: attendance?.status || null,
            attendance_time: attendance?.check_in_time?.substring(0, 5) || undefined,
            attendance_by: attendance?.created_by ? attendanceUserNameMap.get(attendance.created_by) : undefined,
            attendance_record_id: attendance?.id || undefined,
            mass_status: mass?.status || null,
            mass_time: mass?.check_in_time?.substring(0, 5) || undefined,
            mass_by: mass?.created_by ? attendanceUserNameMap.get(mass.created_by) : undefined,
            mass_record_id: mass?.id || undefined,
            has_compensatory_attendance: !!compensatory,
            compensatory_record_id: compensatory?.id,
            compensatory_time: compensatory?.check_in_time?.substring(0, 5),
            compensatory_by: compensatory?.created_by ? compensatoryUserNameMap.get(compensatory.created_by) : undefined,
          }
        })
      }
    },
    enabled: !!classId,
    staleTime: 0, // Always refetch attendance
  })
}

// ============ Holiday Check for a specific date ============
export function useHolidayCheck(schoolYearId: string | undefined, date: string) {
  return useQuery({
    queryKey: queryKeys.holidayCheck(schoolYearId || '', date),
    queryFn: async (): Promise<{ name: string; day_type: string } | null> => {
      if (!schoolYearId || !date) return null

      const dateObj = new Date(date)
      const dayIndex = dateObj.getDay()

      let queryDate: string
      let dayTypes: string[]

      if (dayIndex === 0) {
        queryDate = date
        dayTypes = ['cn', 'both']
      } else if (dayIndex === 4) {
        queryDate = date
        dayTypes = ['thu5', 'both']
      } else {
        // Compensatory days: check Thursday of this week
        const daysToThursday = dayIndex === 0 ? -3 : 4 - dayIndex
        const thu = new Date(dateObj)
        thu.setDate(dateObj.getDate() + daysToThursday)
        queryDate = `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, '0')}-${String(thu.getDate()).padStart(2, '0')}`
        dayTypes = ['thu5', 'both']
      }

      const { data } = await supabase
        .from('holidays')
        .select('name, day_type')
        .eq('school_year_id', schoolYearId)
        .eq('holiday_date', queryDate)
        .in('day_type', dayTypes)
        .limit(1)

      if (data && data.length > 0) {
        return { name: data[0].name, day_type: data[0].day_type }
      }
      return null
    },
    enabled: !!schoolYearId && !!date,
    staleTime: 5 * 60 * 1000,
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
    invalidateAttendanceStudents: (classId?: string, date?: string) =>
      classId && date
        ? queryClient.invalidateQueries({ queryKey: queryKeys.attendanceStudents(classId, date) })
        : queryClient.invalidateQueries({ queryKey: ['attendanceStudents'] }),
    invalidateHolidayCheck: () => queryClient.invalidateQueries({ queryKey: ['holidayCheck'] }),
    invalidateGLVClassTrend: () => queryClient.invalidateQueries({ queryKey: ['glvClassTrend'] }),
    invalidateGLVPerStudentStats: () => queryClient.invalidateQueries({ queryKey: ['glvPerStudentStats'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}
