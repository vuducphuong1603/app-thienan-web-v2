import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, UserProfile, Class } from './supabase'

// ============ Query Keys ============
export const queryKeys = {
  users: ['users'] as const,
  classes: ['classes'] as const,
  activeClasses: ['classes', 'active'] as const,
  students: ['students'] as const,
  branches: ['branches'] as const,
  schoolYear: ['schoolYear', 'current'] as const,
  dashboardStats: ['dashboardStats'] as const,
  classStats: ['classStats'] as const,
  planCategories: ['planCategories'] as const,
  weeklyPlans: (weekStart: string) => ['weeklyPlans', weekStart] as const,
}

// ============ Dashboard Stats ============
export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
      const [usersRes, thieuNhiRes, classesRes] = await Promise.all([
        supabase.from('users').select('role'),
        supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
      ])

      const totalGiaoLyVien = usersRes.data?.filter(u => u.role === 'giao_ly_vien').length || 0

      return {
        totalBranches: 4,
        totalClasses: classesRes.count || 0,
        totalThieuNhi: thieuNhiRes.count || 0,
        totalGiaoLyVien,
      }
    },
    enabled,
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
        supabase.from('school_years').select('total_weeks').eq('is_current', true).single(),
        supabase.from('classes').select('*').eq('status', 'ACTIVE').order('display_order', { ascending: true }),
        supabase.from('thieu_nhi').select('*').order('full_name', { ascending: true }),
      ])

      const currentTotalWeeks = schoolYearRes.data?.total_weeks || 40
      const classesData = classesRes.data || []
      const studentsData = studentsRes.data || []

      const studentsWithDetails = studentsData.map((student) => {
        const studentClass = classesData.find((c) => c.id === student.class_id)
        const birthDate = student.date_of_birth ? new Date(student.date_of_birth) : null
        const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined

        const score_45_hk1 = student.score_45_hk1 || 0
        const score_exam_hk1 = student.score_exam_hk1 || 0
        const score_45_hk2 = student.score_45_hk2 || 0
        const score_exam_hk2 = student.score_exam_hk2 || 0
        const attendance_thu5 = student.attendance_thu5 || 0
        const attendance_cn = student.attendance_cn || 0

        const avg_catechism = (score_45_hk1 + score_45_hk2 + score_exam_hk1 * 2 + score_exam_hk2 * 2) / 6
        const score_thu5 = (attendance_thu5 * 0.4) * (10 / currentTotalWeeks)
        const score_cn = (attendance_cn * 0.6) * (10 / currentTotalWeeks)
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
      const [classesRes, usersRes] = await Promise.all([
        supabase.from('classes').select('*').order('display_order', { ascending: true }),
        supabase.from('users').select('id, full_name, saint_name, class_id, class_name').eq('role', 'giao_ly_vien'),
      ])

      if (classesRes.error) throw classesRes.error

      // Fetch all students with pagination
      const allStudents: { id: string; class_id: string | null }[] = []
      const pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        const from = page * pageSize
        const to = from + pageSize - 1
        const { data: pageData } = await supabase
          .from('thieu_nhi')
          .select('id, class_id')
          .range(from, to)

        if (pageData && pageData.length > 0) {
          allStudents.push(...pageData)
          page++
          hasMore = pageData.length === pageSize
        } else {
          hasMore = false
        }
      }

      const studentCountByClass: Record<string, number> = {}
      allStudents.forEach((student) => {
        if (student.class_id) {
          studentCountByClass[student.class_id] = (studentCountByClass[student.class_id] || 0) + 1
        }
      })

      const classesWithDetails = (classesRes.data || []).map((cls) => {
        const classTeachers = (usersRes.data || [])
          .filter((user) => user.class_id === cls.id || user.class_name === cls.name)
          .map((user) => `${user.saint_name || ''} ${user.full_name}`.trim())

        return {
          ...cls,
          teachers: classTeachers,
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
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}
