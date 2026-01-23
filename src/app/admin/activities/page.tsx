'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, ThieuNhiProfile, Class, BRANCHES, AttendanceRecord, SchoolYear } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Check, X, List, FileText, Loader2, Plus, Calendar } from 'lucide-react'
import CustomCalendar from '@/components/ui/CustomCalendar'
import QRAttendanceModal from '@/components/QRAttendanceModal'
import AttendanceConfirmModal from '@/components/AttendanceConfirmModal'
import ImportExcelModal from '@/components/ImportExcelModal'
import ExportSuccessModal from '@/components/ExportSuccessModal'
import ReportExportTemplate from '@/components/ReportExportTemplate'
import html2canvas from 'html2canvas'

// Report related interfaces
interface ReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  avatar_url?: string
  attendance: Record<string, 'present' | 'absent' | null> // date -> status
}

// Score report interface
interface ReportStudentScore {
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
}

type TimeFilterMode = 'week' | 'dateRange'
type ReportType = 'attendance' | 'score'
type AttendanceTypeFilter = 'all' | 'thu5' | 'cn'

interface StudentWithAttendance extends ThieuNhiProfile {
  class_name?: string
  attendance_status?: 'present' | 'absent' | null
  attendance_time?: string
  attendance_by?: string
  attendance_record_id?: string
  // Compensatory attendance fields
  has_thursday_attendance?: boolean
  has_compensatory_attendance?: boolean
  compensatory_record_id?: string
  compensatory_time?: string
  compensatory_by?: string
}

type TabType = 'attendance' | 'report'

export default function ActivitiesPage() {
  const { user } = useAuth()
  const reportExportRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // studentId being saved
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<StudentWithAttendance[]>([])
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // QR Modal states
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<StudentWithAttendance | null>(null)
  const [isQRForCompensatory, setIsQRForCompensatory] = useState(false)

  // Confirmation Modal states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedStudentForConfirm, setSelectedStudentForConfirm] = useState<StudentWithAttendance | null>(null)

  // Import Excel Modal states
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState(false)

  // Report states
  const [reportTimeFilterMode, setReportTimeFilterMode] = useState<TimeFilterMode>('dateRange')
  const [reportFromDate, setReportFromDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reportToDate, setReportToDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reportWeekStart, setReportWeekStart] = useState<string>('')
  const [reportWeekEnd, setReportWeekEnd] = useState<string>('')
  const [reportType, setReportType] = useState<ReportType>('attendance')
  const [reportBranch, setReportBranch] = useState<string>('')
  const [reportClassId, setReportClassId] = useState<string>('')
  const [reportAttendanceType, setReportAttendanceType] = useState<AttendanceTypeFilter>('all')
  const [isReportGenerated, setIsReportGenerated] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportStudents, setReportStudents] = useState<ReportStudent[]>([])
  const [reportDates, setReportDates] = useState<string[]>([])
  const [reportStats, setReportStats] = useState({
    presentThu5: 0,
    presentCn: 0,
    notChecked: 0,
    totalAttendance: 0,
  })
  // Score report states
  const [reportScoreStudents, setReportScoreStudents] = useState<ReportStudentScore[]>([])
  const [reportScoreStats, setReportScoreStats] = useState({
    totalStudents: 0,
    averageHK1: 0,
    averageHK2: 0,
    averageYear: 0,
    excellentCount: 0,  // >= 8.0
    goodCount: 0,       // >= 6.5
    averageCount: 0,    // >= 5.0
    belowAverageCount: 0, // < 5.0
  })
  const [isExportSuccessModalOpen, setIsExportSuccessModalOpen] = useState(false)
  const [exportSuccessMessage, setExportSuccessMessage] = useState('')

  // Report dropdown states
  const [isReportClassDropdownOpen, setIsReportClassDropdownOpen] = useState(false)
  const [isReportBranchDropdownOpen, setIsReportBranchDropdownOpen] = useState(false)
  const [isReportTypeDropdownOpen, setIsReportTypeDropdownOpen] = useState(false)
  const [isReportAttendanceTypeDropdownOpen, setIsReportAttendanceTypeDropdownOpen] = useState(false)
  const [isReportFromDatePickerOpen, setIsReportFromDatePickerOpen] = useState(false)
  const [isReportToDatePickerOpen, setIsReportToDatePickerOpen] = useState(false)
  const [isReportWeekPickerOpen, setIsReportWeekPickerOpen] = useState(false)

  // Score report column selection (default all unchecked = show all)
  const [scoreColumns, setScoreColumns] = useState({
    diLeT5: false,
    hocGL: false,
    diemTB: false,
    score45HK1: false,
    scoreExamHK1: false,
    score45HK2: false,
    scoreExamHK2: false,
    diemTong: false,
  })

  // Get day of week from selected date
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
    return days[date.getDay()]
  }

  // Determine day_type for database (thu5 or cn)
  const getDayType = (dateString: string): 'thu5' | 'cn' | null => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    if (dayIndex === 4) return 'thu5' // Thursday
    if (dayIndex === 0) return 'cn' // Sunday
    return null // Other days not for attendance
  }

  const dayOfWeek = getDayOfWeek(selectedDate)
  const dayType = getDayType(selectedDate)

  // Compensatory mode: when selected day is Mon-Wed, Fri-Sat (not Thu5 or CN)
  const isCompensatoryMode = (() => {
    const date = new Date(selectedDate)
    const dayIndex = date.getDay()
    // 1=Mon, 2=Tue, 3=Wed, 5=Fri, 6=Sat
    return [1, 2, 3, 5, 6].includes(dayIndex)
  })()

  // Get the Thursday of the week for compensatory attendance
  const getThursdayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    let daysToThursday = 4 - dayIndex
    if (dayIndex === 0) {
      daysToThursday = -3
    }
    const thursday = new Date(date)
    thursday.setDate(date.getDate() + daysToThursday)
    return thursday.toISOString().split('T')[0]
  }

  // Get the start of the week (Monday)
  const getWeekStart = (dateString: string): string => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    const daysToMonday = dayIndex === 0 ? -6 : 1 - dayIndex
    const monday = new Date(date)
    monday.setDate(date.getDate() + daysToMonday)
    return monday.toISOString().split('T')[0]
  }

  // Get the end of the week (Sunday)
  const getWeekEnd = (dateString: string): string => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    const daysToSunday = dayIndex === 0 ? 0 : 7 - dayIndex
    const sunday = new Date(date)
    sunday.setDate(date.getDate() + daysToSunday)
    return sunday.toISOString().split('T')[0]
  }

  const thursdayOfWeek = getThursdayOfWeek(selectedDate)
  const weekStart = getWeekStart(selectedDate)
  const weekEnd = getWeekEnd(selectedDate)

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Fetch school year
  const fetchSchoolYear = useCallback(async () => {
    const { data } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_current', true)
      .single()

    if (data) {
      setSchoolYear(data)
    }
  }, [])

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('display_order', { ascending: true })

    if (!error && data) {
      setClasses(data)
    }
  }, [])

  // Fetch students and their attendance for selected class and date
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([])
      return
    }

    setLoading(true)
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('thieu_nhi')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('status', 'ACTIVE')
        .order('full_name', { ascending: true })

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        showNotification('error', 'Không thể tải danh sách thiếu nhi')
        return
      }

      // Get class name
      const selectedClass = classes.find(c => c.id === selectedClassId)

      if (isCompensatoryMode) {
        // Compensatory mode: check Thursday attendance and existing compensatory records
        const studentIds = (studentsData || []).map(s => s.id)

        // Query all Thursday records (both regular and compensatory now share attendance_date = thursdayOfWeek)
        // Filter out compensatory records to identify only regular Thursday attendance
        const thursdayAttendanceSet = new Set<string>()
        if (studentIds.length > 0) {
          const { data: thursdayData } = await supabase
            .from('attendance_records')
            .select('student_id, is_compensatory')
            .in('student_id', studentIds)
            .eq('attendance_date', thursdayOfWeek)
            .eq('day_type', 'thu5')
            .eq('status', 'present')

          if (thursdayData) {
            thursdayData.forEach(record => {
              // Only count as regular Thursday attendance if is_compensatory is not true
              if (!record.is_compensatory) {
                thursdayAttendanceSet.add(record.student_id)
              }
            })
          }
        }

        // Check for compensatory attendance that compensates for this week's Thursday
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
          } catch {
            // Column might not exist yet
          }
        }

        // Resolve created_by user IDs to names
        const createdByIds = Array.from(compensatoryMap.values())
          .map(v => v.created_by)
          .filter((id): id is string => !!id)
        const userNameMap = new Map<string, string>()
        if (createdByIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(new Set(createdByIds)))

          if (usersData) {
            usersData.forEach(u => userNameMap.set(u.id, u.full_name))
          }
        }

        const studentsWithStatus: StudentWithAttendance[] = (studentsData || []).map(student => {
          const hasThursday = thursdayAttendanceSet.has(student.id)
          const compensatory = compensatoryMap.get(student.id)

          return {
            ...student,
            class_name: selectedClass?.name,
            attendance_status: (hasThursday || !!compensatory) ? 'present' as const : null,
            has_thursday_attendance: hasThursday,
            has_compensatory_attendance: !!compensatory,
            compensatory_record_id: compensatory?.id,
            compensatory_time: compensatory?.check_in_time?.substring(0, 5),
            compensatory_by: compensatory?.created_by ? userNameMap.get(compensatory.created_by) : undefined,
          }
        })

        setStudents(studentsWithStatus)
      } else {
        // Normal mode: fetch attendance for selected date
        let attendanceData: (AttendanceRecord & { created_by_user?: { full_name: string } })[] | null = null
        try {
          const { data, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('class_id', selectedClassId)
            .eq('attendance_date', selectedDate)

          if (!attendanceError) {
            attendanceData = data
          } else {
            console.warn('Attendance table may not exist yet:', attendanceError.message)
          }
        } catch {
          console.warn('Could not fetch attendance records - table may not exist')
        }

        // If Thursday, also check for compensatory records for this Thursday
        const compensatoryMap = new Map<string, { id: string; check_in_time?: string; created_by?: string }>()
        if (dayType === 'thu5') {
          const studentIds = (studentsData || []).map(s => s.id)
          if (studentIds.length > 0) {
            try {
              const { data: compensatoryData } = await supabase
                .from('attendance_records')
                .select('id, student_id, check_in_time, created_by')
                .in('student_id', studentIds)
                .eq('is_compensatory', true)
                .eq('compensated_for_date', selectedDate)
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
            } catch {
              console.warn('Could not fetch compensatory records')
            }
          }
        }

        // Resolve created_by user IDs to names for compensatory records
        const compensatoryUserIds = Array.from(compensatoryMap.values())
          .map(v => v.created_by)
          .filter((id): id is string => !!id)
        const compensatoryUserNameMap = new Map<string, string>()
        if (compensatoryUserIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', Array.from(new Set(compensatoryUserIds)))

          if (usersData) {
            usersData.forEach(u => compensatoryUserNameMap.set(u.id, u.full_name))
          }
        }

        // Map attendance records to students (exclude compensatory records from regular attendance)
        const attendanceMap = new Map<string, AttendanceRecord & { created_by_user?: { full_name: string } }>()
        if (attendanceData) {
          attendanceData.forEach(record => {
            // Skip compensatory records - they are handled separately via compensatoryMap
            if ((record as unknown as { is_compensatory?: boolean }).is_compensatory === true) return
            attendanceMap.set(record.student_id, record)
          })
        }

        // Combine students with attendance data
        const studentsWithAttendance: StudentWithAttendance[] = (studentsData || []).map(student => {
          const attendance = attendanceMap.get(student.id)
          const compensatory = compensatoryMap.get(student.id)
          return {
            ...student,
            class_name: selectedClass?.name,
            attendance_status: attendance?.status || null,
            attendance_time: attendance?.check_in_time?.substring(0, 5) || undefined,
            attendance_by: attendance?.created_by_user?.full_name || undefined,
            attendance_record_id: attendance?.id || undefined,
            has_compensatory_attendance: !!compensatory,
            compensatory_record_id: compensatory?.id,
            compensatory_time: compensatory?.check_in_time?.substring(0, 5),
            compensatory_by: compensatory?.created_by ? compensatoryUserNameMap.get(compensatory.created_by) : undefined,
          }
        })

        setStudents(studentsWithAttendance)
      }
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, selectedDate, classes, isCompensatoryMode, weekStart, weekEnd, thursdayOfWeek])

  useEffect(() => {
    fetchClasses()
    fetchSchoolYear()
  }, [fetchClasses, fetchSchoolYear])

  // Group classes by branch
  const classesGroupedByBranch = BRANCHES.reduce((acc, branch) => {
    const branchClasses = classes.filter((c) => c.branch === branch)
    if (branchClasses.length > 0) {
      acc[branch] = branchClasses
    }
    return acc
  }, {} as Record<string, Class[]>)

  // Get class name by id
  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId)
    return cls?.name || 'Chọn lớp'
  }

  // Stats calculations
  const totalStudents = students.length
  const presentCount = students.filter(s => s.attendance_status === 'present').length
  const notCheckedCount = students.filter(s => s.attendance_status === null).length

  // Helper function to update attendance count in thieu_nhi table
  const updateAttendanceCount = async (studentId: string) => {
    try {
      // Count present days for thu5
      const { count: thu5Count } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('day_type', 'thu5')
        .eq('status', 'present')
        .eq('school_year_id', schoolYear?.id)

      // Count present days for cn (Sunday)
      const { count: cnCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('day_type', 'cn')
        .eq('status', 'present')
        .eq('school_year_id', schoolYear?.id)

      // Update thieu_nhi table
      await supabase
        .from('thieu_nhi')
        .update({
          attendance_thu5: thu5Count || 0,
          attendance_cn: cnCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
    } catch (error) {
      console.error('Error updating attendance count:', error)
    }
  }

  // Handle attendance marking - save to database
  const markAttendance = async (studentId: string, status: 'present' | 'absent') => {
    if (!dayType) {
      showNotification('error', 'Chỉ điểm danh vào Thứ 5 hoặc Chủ nhật')
      return
    }

    // Case 2: Block marking Thursday attendance if student already compensated for this Thursday
    if (dayType === 'thu5') {
      const student = students.find(s => s.id === studentId)
      if (student?.has_compensatory_attendance) {
        showNotification('error', 'Thiếu nhi này đã điểm danh bù cho Thứ 5 này rồi')
        return
      }
    }

    setSaving(studentId)

    // Server-side check for Thursday: verify no compensatory record exists
    if (dayType === 'thu5') {
      try {
        const { data: existingCompensatory } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('student_id', studentId)
          .eq('is_compensatory', true)
          .eq('compensated_for_date', selectedDate)
          .eq('status', 'present')
          .limit(1)

        if (existingCompensatory && existingCompensatory.length > 0) {
          setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, has_compensatory_attendance: true, compensatory_record_id: existingCompensatory[0].id } : s
          ))
          showNotification('error', 'Thiếu nhi này đã điểm danh bù cho Thứ 5 này rồi, không thể điểm danh trực tiếp')
          setSaving(null)
          return
        }
      } catch {
        // If query fails (column doesn't exist), proceed normally
      }
    }
    try {
      const now = new Date()
      const checkInTime = now.toTimeString().substring(0, 8)

      // Upsert attendance record
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          student_id: studentId,
          class_id: selectedClassId,
          school_year_id: schoolYear?.id,
          attendance_date: selectedDate,
          day_type: dayType,
          status: status,
          check_in_time: checkInTime,
          check_in_method: 'manual',
          created_by: user?.id,
          updated_at: now.toISOString(),
        }, {
          onConflict: 'student_id,attendance_date,day_type',
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error saving attendance:', error)
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          showNotification('error', 'Bảng attendance_records chưa được tạo. Vui lòng chạy migration.')
        } else {
          showNotification('error', 'Không thể lưu điểm danh: ' + error.message)
        }
        return
      }

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              attendance_status: status,
              attendance_time: checkInTime.substring(0, 5),
              attendance_by: user?.full_name || 'Người dùng hiện tại',
              attendance_record_id: data?.id,
            }
          : s
      ))

      setSaving(null)
      showNotification('success', status === 'present' ? 'Đã điểm danh có mặt' : 'Đã điểm danh vắng mặt')
      updateAttendanceCount(studentId)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
      setSaving(null)
    }
  }

  // Handle mark all present - bulk save to database
  const markAllPresent = async () => {
    if (!dayType) {
      showNotification('error', 'Chỉ điểm danh vào Thứ 5 hoặc Chủ nhật')
      return
    }

    const studentsToMark = students.filter(s => s.attendance_status === null && !s.has_compensatory_attendance)
    if (studentsToMark.length === 0) {
      showNotification('success', 'Tất cả đã được điểm danh')
      return
    }

    setSaving('all')
    try {
      const now = new Date()
      const checkInTime = now.toTimeString().substring(0, 8)

      // Create attendance records for all unmarked students
      const records = studentsToMark.map(student => ({
        student_id: student.id,
        class_id: selectedClassId,
        school_year_id: schoolYear?.id,
        attendance_date: selectedDate,
        day_type: dayType,
        status: 'present' as const,
        check_in_time: checkInTime,
        check_in_method: 'manual' as const,
        created_by: user?.id,
      }))

      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, {
          onConflict: 'student_id,attendance_date,day_type',
        })

      if (error) {
        console.error('Error saving attendance:', error)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          showNotification('error', 'Bảng attendance_records chưa được tạo. Vui lòng chạy migration.')
        } else {
          showNotification('error', 'Không thể lưu điểm danh: ' + error.message)
        }
        return
      }

      // Update local state
      setStudents(prev => prev.map(s => ({
        ...s,
        attendance_status: 'present' as const,
        attendance_time: s.attendance_time || checkInTime.substring(0, 5),
        attendance_by: s.attendance_by || user?.full_name || 'Người dùng hiện tại',
      })))

      setSaving(null)
      showNotification('success', `Đã điểm danh ${studentsToMark.length} thiếu nhi`)
      Promise.all(studentsToMark.map(student => updateAttendanceCount(student.id)))
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
      setSaving(null)
    }
  }

  // Clear attendance for a student - delete from database
  const clearAttendance = async (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    if (!student?.attendance_record_id) {
      // Just clear local state if no record exists
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? { ...s, attendance_status: null, attendance_time: undefined, attendance_by: undefined, attendance_record_id: undefined }
          : s
      ))
      return
    }

    setSaving(studentId)
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', student.attendance_record_id)

      if (error) {
        console.error('Error deleting attendance:', error)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          showNotification('error', 'Bảng attendance_records chưa được tạo.')
        } else {
          showNotification('error', 'Không thể xóa điểm danh: ' + error.message)
        }
        return
      }

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? { ...s, attendance_status: null, attendance_time: undefined, attendance_by: undefined, attendance_record_id: undefined }
          : s
      ))

      setSaving(null)
      showNotification('success', 'Đã xóa điểm danh')
      updateAttendanceCount(studentId)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
      setSaving(null)
    }
  }

  // Handle compensatory attendance marking
  const markCompensatoryAttendance = async (studentId: string) => {
    if (!isCompensatoryMode) {
      showNotification('error', 'Chỉ bổ sung điểm danh vào Thứ 2, 3, 4, 6, 7')
      return
    }

    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (student.has_thursday_attendance) {
      showNotification('error', 'Thiếu nhi này đã điểm danh vào Thứ 5 tuần này')
      return
    }

    if (student.has_compensatory_attendance) {
      showNotification('error', 'Thiếu nhi này đã bổ sung điểm danh cho Thứ 5 tuần này rồi')
      return
    }

    setSaving(studentId)
    try {
      // Server-side check: verify student hasn't already attended Thursday this week
      const { data: existingThursday } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', studentId)
        .eq('attendance_date', thursdayOfWeek)
        .eq('day_type', 'thu5')
        .eq('status', 'present')
        .is('is_compensatory', null)
        .limit(1)

      // Also check for is_compensatory = false
      const { data: existingThursdayFalse } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', studentId)
        .eq('attendance_date', thursdayOfWeek)
        .eq('day_type', 'thu5')
        .eq('status', 'present')
        .eq('is_compensatory', false)
        .limit(1)

      if ((existingThursday && existingThursday.length > 0) || (existingThursdayFalse && existingThursdayFalse.length > 0)) {
        // Update local state to reflect actual Thursday attendance
        setStudents(prev => prev.map(s =>
          s.id === studentId ? { ...s, has_thursday_attendance: true } : s
        ))
        showNotification('error', 'Thiếu nhi này đã điểm danh Thứ 5 tuần này rồi, không thể bổ sung')
        setSaving(null)
        return
      }

      // Server-side check: verify student hasn't already compensated for this Thursday
      const { data: existingCompensatory } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', studentId)
        .eq('is_compensatory', true)
        .eq('compensated_for_date', thursdayOfWeek)
        .eq('status', 'present')
        .limit(1)

      if (existingCompensatory && existingCompensatory.length > 0) {
        setStudents(prev => prev.map(s =>
          s.id === studentId ? { ...s, has_compensatory_attendance: true, compensatory_record_id: existingCompensatory[0].id } : s
        ))
        showNotification('error', 'Thiếu nhi này đã bổ sung điểm danh cho Thứ 5 tuần này rồi')
        setSaving(null)
        return
      }

      const now = new Date()
      const checkInTime = now.toTimeString().substring(0, 8)

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          student_id: studentId,
          class_id: selectedClassId,
          school_year_id: schoolYear?.id,
          attendance_date: thursdayOfWeek,
          day_type: 'thu5',
          status: 'present',
          check_in_time: checkInTime,
          check_in_method: 'manual',
          is_compensatory: true,
          compensated_for_date: thursdayOfWeek,
          notes: `Bổ sung điểm danh ngày ${selectedDate} cho Thứ 5 ngày ${thursdayOfWeek}`,
          created_by: user?.id,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error saving compensatory attendance:', error)
        if (error.code === '23505') {
          showNotification('error', 'Đã có bản ghi điểm danh cho ngày này')
        } else {
          showNotification('error', 'Không thể lưu điểm danh: ' + error.message)
        }
        return
      }

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              attendance_status: 'present' as const,
              has_compensatory_attendance: true,
              compensatory_record_id: data?.id,
              compensatory_time: checkInTime.substring(0, 5),
              compensatory_by: user?.full_name,
            }
          : s
      ))

      setSaving(null)
      showNotification('success', `Đã bổ sung điểm danh cho ${student.full_name}`)
      updateAttendanceCount(studentId)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
      setSaving(null)
    }
  }

  // Clear compensatory attendance
  const clearCompensatoryAttendance = async (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    if (!student?.compensatory_record_id) return

    setSaving(studentId)
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', student.compensatory_record_id)

      if (error) {
        console.error('Error deleting compensatory attendance:', error)
        showNotification('error', 'Không thể xóa điểm danh bổ sung: ' + error.message)
        return
      }

      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? { ...s, attendance_status: null, has_compensatory_attendance: false, compensatory_record_id: undefined, compensatory_time: undefined }
          : s
      ))

      setSaving(null)
      showNotification('success', 'Đã xóa điểm danh bổ sung')
      updateAttendanceCount(studentId)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
      setSaving(null)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }

  // Open QR modal for a student
  const openQRModal = (student: StudentWithAttendance, forCompensatory = false) => {
    setSelectedStudentForQR(student)
    setIsQRForCompensatory(forCompensatory)
    setIsQRModalOpen(true)
  }

  // Handle manual attendance from QR modal
  const handleManualAttendanceFromModal = () => {
    if (selectedStudentForQR) {
      if (isQRForCompensatory) {
        markCompensatoryAttendance(selectedStudentForQR.id)
      } else {
        markAttendance(selectedStudentForQR.id, 'present')
      }
    }
    setIsQRModalOpen(false)
    setSelectedStudentForQR(null)
    setIsQRForCompensatory(false)
  }

  // Close QR modal
  const closeQRModal = () => {
    setIsQRModalOpen(false)
    setSelectedStudentForQR(null)
    setIsQRForCompensatory(false)
  }

  // Open confirmation modal for a student
  const openConfirmModal = (student: StudentWithAttendance) => {
    setSelectedStudentForConfirm(student)
    setIsConfirmModalOpen(true)
  }

  // Handle confirm attendance from modal
  const handleConfirmAttendance = async () => {
    if (selectedStudentForConfirm) {
      await markAttendance(selectedStudentForConfirm.id, 'present')
    }
    setIsConfirmModalOpen(false)
    setSelectedStudentForConfirm(null)
  }

  // Close confirmation modal
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false)
    setSelectedStudentForConfirm(null)
  }

  // Open Import Excel modal
  const openImportExcelModal = () => {
    setIsImportExcelModalOpen(true)
  }

  // Close Import Excel modal
  const closeImportExcelModal = () => {
    setIsImportExcelModalOpen(false)
  }

  // Handle import from Excel file (placeholder - to be implemented later)
  const handleImportExcel = (file: File) => {
    console.log('Import file:', file.name)
    // TODO: Implement actual import logic
    showNotification('success', `Đã chọn file: ${file.name}`)
    closeImportExcelModal()
  }

  // Report helper functions
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  // Get report class name
  const getReportClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId)
    return cls?.name || ''
  }

  // Get classes filtered by branch for report
  const getClassesByBranch = (branch: string) => {
    if (!branch) return classes
    return classes.filter(c => c.branch === branch)
  }

  // Close all report dropdowns
  const closeAllReportDropdowns = () => {
    setIsReportClassDropdownOpen(false)
    setIsReportBranchDropdownOpen(false)
    setIsReportTypeDropdownOpen(false)
    setIsReportAttendanceTypeDropdownOpen(false)
    setIsReportFromDatePickerOpen(false)
    setIsReportToDatePickerOpen(false)
    setIsReportWeekPickerOpen(false)
  }

  // Generate report
  const generateReport = async () => {
    if (!reportClassId) {
      showNotification('error', 'Vui lòng chọn lớp')
      return
    }

    setReportLoading(true)
    try {
      if (reportType === 'score') {
        // Generate score report
        const { data: studentsData, error: studentsError } = await supabase
          .from('thieu_nhi')
          .select('id, student_code, full_name, saint_name, avatar_url, score_di_le_t5, score_hoc_gl, score_45_hk1, score_exam_hk1, score_45_hk2, score_exam_hk2')
          .eq('class_id', reportClassId)
          .eq('status', 'ACTIVE')
          .order('full_name', { ascending: true })

        if (studentsError) {
          throw studentsError
        }

        // Calculate averages for each student
        const reportScoreData: ReportStudentScore[] = (studentsData || []).map(student => {
          const scoreDiLeT5 = student.score_di_le_t5 !== null ? Number(student.score_di_le_t5) : null
          const scoreHocGL = student.score_hoc_gl !== null ? Number(student.score_hoc_gl) : null
          const score45HK1 = student.score_45_hk1 !== null ? Number(student.score_45_hk1) : null
          const scoreExamHK1 = student.score_exam_hk1 !== null ? Number(student.score_exam_hk1) : null
          const score45HK2 = student.score_45_hk2 !== null ? Number(student.score_45_hk2) : null
          const scoreExamHK2 = student.score_exam_hk2 !== null ? Number(student.score_exam_hk2) : null

          // Calculate average HK1 (45 min counts 1, exam counts 2)
          let averageHK1: number | null = null
          if (score45HK1 !== null && scoreExamHK1 !== null) {
            averageHK1 = Math.round(((score45HK1 + scoreExamHK1 * 2) / 3) * 100) / 100
          }

          // Calculate average HK2 (45 min counts 1, exam counts 2)
          let averageHK2: number | null = null
          if (score45HK2 !== null && scoreExamHK2 !== null) {
            averageHK2 = Math.round(((score45HK2 + scoreExamHK2 * 2) / 3) * 100) / 100
          }

          // Calculate average year (HK1 counts 1, HK2 counts 2)
          let averageYear: number | null = null
          if (averageHK1 !== null && averageHK2 !== null) {
            averageYear = Math.round(((averageHK1 + averageHK2 * 2) / 3) * 100) / 100
          }

          return {
            id: student.id,
            student_code: student.student_code,
            full_name: student.full_name,
            saint_name: student.saint_name,
            avatar_url: student.avatar_url,
            score_di_le_t5: scoreDiLeT5,
            score_hoc_gl: scoreHocGL,
            score_45_hk1: score45HK1,
            score_exam_hk1: scoreExamHK1,
            score_45_hk2: score45HK2,
            score_exam_hk2: scoreExamHK2,
            average_hk1: averageHK1,
            average_hk2: averageHK2,
            average_year: averageYear,
          }
        })

        setReportScoreStudents(reportScoreData)

        // Calculate stats
        const totalStudents = reportScoreData.length
        let sumHK1 = 0, countHK1 = 0
        let sumHK2 = 0, countHK2 = 0
        let sumYear = 0, countYear = 0
        let excellentCount = 0
        let goodCount = 0
        let averageCount = 0
        let belowAverageCount = 0

        reportScoreData.forEach(student => {
          if (student.average_hk1 !== null) {
            sumHK1 += student.average_hk1
            countHK1++
          }
          if (student.average_hk2 !== null) {
            sumHK2 += student.average_hk2
            countHK2++
          }
          if (student.average_year !== null) {
            sumYear += student.average_year
            countYear++
            // Classify by year average
            if (student.average_year >= 8.0) {
              excellentCount++
            } else if (student.average_year >= 6.5) {
              goodCount++
            } else if (student.average_year >= 5.0) {
              averageCount++
            } else {
              belowAverageCount++
            }
          }
        })

        setReportScoreStats({
          totalStudents,
          averageHK1: countHK1 > 0 ? Math.round((sumHK1 / countHK1) * 100) / 100 : 0,
          averageHK2: countHK2 > 0 ? Math.round((sumHK2 / countHK2) * 100) / 100 : 0,
          averageYear: countYear > 0 ? Math.round((sumYear / countYear) * 100) / 100 : 0,
          excellentCount,
          goodCount,
          averageCount,
          belowAverageCount,
        })

        setIsReportGenerated(true)
        showNotification('success', 'Đã tạo báo cáo điểm số thành công')
      } else {
        // Generate attendance report
        // Get date range based on filter mode
        let fromDate = reportFromDate
        let toDate = reportToDate
        if (reportTimeFilterMode === 'week' && reportWeekStart && reportWeekEnd) {
          fromDate = reportWeekStart
          toDate = reportWeekEnd
        }

        // Fetch students in the class
        const { data: studentsData, error: studentsError } = await supabase
          .from('thieu_nhi')
          .select('id, student_code, full_name, saint_name, avatar_url')
          .eq('class_id', reportClassId)
          .eq('status', 'ACTIVE')
          .order('full_name', { ascending: true })

        if (studentsError) {
          throw studentsError
        }

        // Build query for attendance records
        let query = supabase
          .from('attendance_records')
          .select('*')
          .eq('class_id', reportClassId)
          .gte('attendance_date', fromDate)
          .lte('attendance_date', toDate)

        // Filter by attendance type if not 'all'
        if (reportAttendanceType !== 'all') {
          query = query.eq('day_type', reportAttendanceType)
        }

        const { data: attendanceData, error: attendanceError } = await query

        if (attendanceError) {
          console.warn('Attendance fetch error:', attendanceError)
        }

        // Get unique dates from attendance records
        const uniqueDates = new Set<string>()
        attendanceData?.forEach(record => {
          uniqueDates.add(record.attendance_date)
        })
        const sortedDates = Array.from(uniqueDates).sort()
        setReportDates(sortedDates)

        // Map attendance to students
        const attendanceMap = new Map<string, Map<string, 'present' | 'absent'>>()
        attendanceData?.forEach(record => {
          if (!attendanceMap.has(record.student_id)) {
            attendanceMap.set(record.student_id, new Map())
          }
          attendanceMap.get(record.student_id)?.set(record.attendance_date, record.status)
        })

        // Build report students
        const reportStudentsData: ReportStudent[] = (studentsData || []).map(student => {
          const studentAttendance: Record<string, 'present' | 'absent' | null> = {}
          sortedDates.forEach(date => {
            studentAttendance[date] = attendanceMap.get(student.id)?.get(date) || null
          })
          return {
            ...student,
            attendance: studentAttendance,
          }
        })

        setReportStudents(reportStudentsData)

        // Calculate stats
        let presentThu5 = 0
        let presentCn = 0
        let notChecked = 0
        let totalAttendance = 0

        attendanceData?.forEach(record => {
          if (record.status === 'present') {
            totalAttendance++
            if (record.day_type === 'thu5') {
              presentThu5++
            } else if (record.day_type === 'cn') {
              presentCn++
            }
          }
        })

        // Count not checked: each student counts as +1 if they have at least one null date
        reportStudentsData.forEach(student => {
          const hasNullDate = sortedDates.some(date => student.attendance[date] === null)
          if (hasNullDate) {
            notChecked++
          }
        })

        setReportStats({
          presentThu5,
          presentCn,
          notChecked,
          totalAttendance,
        })

        setIsReportGenerated(true)
        showNotification('success', 'Đã tạo báo cáo thành công')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      showNotification('error', 'Không thể tạo báo cáo')
    } finally {
      setReportLoading(false)
    }
  }

  // Export image
  const handleExportImage = async () => {
    if (!reportExportRef.current) {
      showNotification('error', 'Không thể xuất ảnh')
      return
    }

    try {
      const canvas = await html2canvas(reportExportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const link = document.createElement('a')
      const today = new Date().toISOString().split('T')[0]
      const reportTypeName = reportType === 'attendance' ? 'diem_danh' : 'diem_so'
      link.download = `${reportTypeName}_${today}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      setExportSuccessMessage('Đã xuất ảnh thành công!')
      setIsExportSuccessModalOpen(true)
      setTimeout(() => setIsExportSuccessModalOpen(false), 2000)
    } catch (error) {
      console.error('Error exporting image:', error)
      showNotification('error', 'Lỗi khi xuất ảnh')
    }
  }

  // Export Excel (placeholder)
  const handleExportExcel = () => {
    setExportSuccessMessage('Đã xuất Excel!')
    setIsExportSuccessModalOpen(true)
    setTimeout(() => setIsExportSuccessModalOpen(false), 2000)
  }

  // Set week dates (get current week by default)
  useEffect(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    setReportWeekStart(monday.toISOString().split('T')[0])
    setReportWeekEnd(sunday.toISOString().split('T')[0])
  }, [])

  return (
    <div className="flex gap-[17px]">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Left Sidebar - Tab Navigation */}
      <div className="w-[208px] flex flex-col gap-2">
        {/* Điểm danh Tab - Active */}
        <button
          onClick={() => setActiveTab('attendance')}
          className={`h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors ${
            activeTab === 'attendance'
              ? 'bg-brand'
              : 'bg-[#f6f6f6] hover:bg-[#eee]'
          }`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] ${
            activeTab === 'attendance'
              ? 'bg-white/20'
              : 'bg-[rgba(250,134,94,0.2)]'
          }`}>
            <List className={`w-5 h-5 ${activeTab === 'attendance' ? 'text-white' : 'text-brand'}`} />
          </div>
          <span className={`text-base font-semibold ${
            activeTab === 'attendance' ? 'text-white' : 'text-black opacity-80'
          }`}>
            Điểm danh
          </span>
        </button>

        {/* Báo cáo Tab */}
        <button
          onClick={() => setActiveTab('report')}
          className={`h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors ${
            activeTab === 'report'
              ? 'bg-brand'
              : 'bg-[#f6f6f6] hover:bg-[#eee]'
          }`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] ${
            activeTab === 'report'
              ? 'bg-white/20'
              : 'bg-[rgba(250,134,94,0.2)]'
          }`}>
            <FileText className={`w-5 h-5 ${activeTab === 'report' ? 'text-white' : 'text-brand'}`} />
          </div>
          <span className={`text-base font-semibold ${
            activeTab === 'report' ? 'text-white' : 'text-black opacity-80'
          }`}>
            Báo cáo
          </span>
        </button>

      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 bg-[#F6F6F6] border border-white rounded-2xl min-h-[768px]">
        {activeTab === 'attendance' ? (
          <>
            {/* Header Section */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[26px] font-semibold text-black">Điểm danh</h1>
                <p className="text-sm font-medium text-[#666d80]">
                  {selectedClassId ? `LỚP ${getClassName(selectedClassId).toUpperCase()}` : 'Chọn lớp để bắt đầu điểm danh'}
                  {!dayType && selectedClassId && !isCompensatoryMode && (
                    <span className="text-orange-500 ml-2">(Chỉ điểm danh Thứ 5 hoặc Chủ nhật)</span>
                  )}
                  {isCompensatoryMode && selectedClassId && (
                    <span className="text-blue-600 ml-2">(Bổ sung cho Thứ 5 ngày {formatDate(thursdayOfWeek)})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Filter Row */}
            <div className="px-6 pb-5">
              <div className="flex items-center gap-4">
                {/* Class Selector */}
                <div className="relative flex-1">
                  <button
                    onClick={() => {
                      setIsClassDropdownOpen(!isClassDropdownOpen)
                      setIsDatePickerOpen(false)
                    }}
                    className="flex items-center justify-between w-full h-[52px] px-6 bg-white rounded-full"
                  >
                    <span className="text-base text-black">
                      {selectedClassId ? getClassName(selectedClassId) : 'Chọn lớp'}
                    </span>
                    <svg
                      className={`w-[9px] h-[18px] text-black transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 9 18"
                      fill="none"
                    >
                      <path
                        d="M4.935 5.5L4.14 6.296L8.473 10.63C8.542 10.7 8.625 10.756 8.716 10.793C8.807 10.831 8.904 10.851 9.003 10.851C9.101 10.851 9.199 10.831 9.29 10.793C9.381 10.756 9.463 10.7 9.533 10.63L13.868 6.296L13.073 5.5L9.004 9.569L4.935 5.5Z"
                        fill="black"
                        transform="translate(-4, -2)"
                      />
                    </svg>
                  </button>

                  {isClassDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden max-h-[350px] overflow-y-auto">
                      {Object.entries(classesGroupedByBranch).map(([branch, branchClasses]) => (
                        <div key={branch}>
                          <div className="px-5 py-2.5 text-sm font-semibold text-[#666d80] uppercase bg-gray-50">
                            {branch}
                          </div>
                          {branchClasses.map((cls) => (
                            <button
                              key={cls.id}
                              onClick={() => {
                                setSelectedClassId(cls.id)
                                setIsClassDropdownOpen(false)
                              }}
                              className={`w-full px-5 py-3 text-left text-base hover:bg-gray-50 ${
                                selectedClassId === cls.id ? 'bg-brand/10 text-brand' : 'text-black'
                              }`}
                            >
                              {cls.name}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Picker */}
                <div className="relative flex-1">
                  <button
                    onClick={() => {
                      setIsDatePickerOpen(!isDatePickerOpen)
                      setIsClassDropdownOpen(false)
                    }}
                    className="flex items-center justify-between w-full h-[52px] px-6 bg-white rounded-full"
                  >
                    <span className="text-base text-black">{formatDate(selectedDate)}</span>
                    {/* Calendar Icon from Figma */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="4" width="20" height="18" rx="3" stroke="#8A8C90" strokeWidth="1.5"/>
                      <path d="M7 2V6" stroke="#8A8C90" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M17 2V6" stroke="#8A8C90" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M2.5 9H21.5" stroke="#8A8C90" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="17" cy="17" r="1" fill="#8A8C90"/>
                      <circle cx="17" cy="13" r="1" fill="#8A8C90"/>
                      <circle cx="12" cy="17" r="1" fill="#8A8C90"/>
                      <circle cx="12" cy="13" r="1" fill="#8A8C90"/>
                      <circle cx="7" cy="17" r="1" fill="#8A8C90"/>
                      <circle cx="7" cy="13" r="1" fill="#8A8C90"/>
                    </svg>
                  </button>

                  {isDatePickerOpen && (
                    <div className="absolute top-full right-0 mt-1 z-20">
                      <CustomCalendar
                        value={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        onClose={() => setIsDatePickerOpen(false)}
                        showConfirmButton={true}
                        highlightWeek={true}
                      />
                    </div>
                  )}
                </div>

                {/* Day Badge */}
                <div className={`h-[52px] px-8 border border-[#F6F6F6] rounded-full flex items-center justify-center flex-1 ${
                  dayType ? 'bg-[#E5E1DC]' : isCompensatoryMode ? 'bg-blue-100' : 'bg-orange-100'
                }`}>
                  <span className={`text-base ${dayType ? 'text-black' : isCompensatoryMode ? 'text-blue-700' : 'text-orange-600'}`}>
                    {dayType
                      ? `Buổi: ${dayOfWeek.toLowerCase()}`
                      : isCompensatoryMode
                        ? `Bổ sung Thứ 5`
                        : `Buổi: ${dayOfWeek.toLowerCase()} (không điểm danh)`
                    }
                  </span>
                </div>

                {/* Load Data Button */}
                <button
                  onClick={fetchStudents}
                  disabled={!selectedClassId || loading}
                  className="h-[52px] px-10 bg-brand border border-white/60 rounded-full flex items-center justify-center flex-1 hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <span className="text-base font-medium text-white">Tải dữ liệu</span>
                  )}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-6 pb-6">
              <div className="bg-white rounded-3xl min-h-[580px]">
                {!selectedClassId || students.length === 0 ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center h-[580px]">
                    <div className="bg-[#f6f6f6] rounded-2xl px-10 py-6 flex flex-col items-center gap-2">
                      {/* Calendar Icon */}
                      <svg className="w-12 h-12" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="6" width="30" height="27" rx="3" stroke="#f6f6f6" strokeWidth="2" fill="#f6f6f6"/>
                        <path d="M3 12H33" stroke="#666d80" strokeWidth="2"/>
                        <path d="M10 3V9" stroke="#666d80" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M26 3V9" stroke="#666d80" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="8" y="16" width="6" height="4" rx="1" fill="#666d80"/>
                        <rect x="15" y="16" width="6" height="4" rx="1" fill="#666d80"/>
                        <rect x="22" y="16" width="6" height="4" rx="1" fill="#666d80"/>
                        <rect x="8" y="22" width="6" height="4" rx="1" fill="#666d80"/>
                        <rect x="15" y="22" width="6" height="4" rx="1" fill="#666d80"/>
                        <rect x="22" y="22" width="6" height="4" rx="1" fill="#666d80"/>
                        <rect x="8" y="28" width="6" height="4" rx="1" fill="#666d80"/>
                      </svg>
                      <p className="text-sm text-black">
                        {selectedClassId ? 'Nhấn "Tải dữ liệu" để xem danh sách' : 'Chọn lớp để bắt đầu điểm danh'}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Student List */
                  <div className="p-6">
                    {/* Stats Row */}
                    <div className="flex items-stretch gap-4 mb-6">
                      {/* Có mặt / Đã bổ sung Card */}
                      <div className={`h-[130px] flex-1 rounded-[18px] p-5 flex flex-col justify-between relative overflow-hidden ${
                        isCompensatoryMode ? 'bg-blue-500' : 'bg-brand'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-white/80">{isCompensatoryMode ? 'Đã đi/bổ sung' : 'Có mặt'}</span>
                          </div>
                          {/* Chart icon in circle */}
                          <div className="w-[48px] h-[48px] rounded-full bg-white/10 backdrop-blur-[4.24px] flex items-center justify-center border border-white/20">
                            <svg className="w-[26px] h-[26px] text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7.074 24.4631L12.295 29.6514C13 30.3528 13.353 30.7035 13.791 30.7035C14.228 30.7034 14.581 30.3526 15.287 29.6511L15.456 29.4827C16.162 28.7805 16.515 28.4294 16.953 28.4296C17.391 28.4297 17.744 28.7811 18.45 29.4838L21.222 32.2441M7.074 24.4631V28.3861M7.074 24.4631H11.023" transform="translate(-5, -20)" stroke="white" strokeWidth="1.27" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[48px] font-bold text-white leading-none">
                          {isCompensatoryMode
                            ? students.filter(s => s.has_thursday_attendance || s.has_compensatory_attendance).length
                            : presentCount
                          }
                        </span>
                        {/* Decorative wave chart */}
                        <div className="absolute bottom-0 left-0 right-0 h-[45px]">
                          <svg viewBox="0 0 300 45" fill="none" preserveAspectRatio="none" className="w-full h-full">
                            <path d="M0 20C30 35 50 8 90 25C130 42 150 12 190 28C220 40 240 20 267 30" stroke="url(#wave1)" strokeWidth="2.6" fill="none"/>
                            <path d="M0 15C25 35 60 5 100 22C140 38 165 10 200 25C240 38 255 18 267 28" stroke="url(#wave2)" strokeWidth="2.6" fill="none"/>
                            <defs>
                              <linearGradient id="wave1" x1="0" y1="20" x2="267" y2="20">
                                <stop stopColor="white" stopOpacity="0"/>
                                <stop offset="0.25" stopColor="white"/>
                                <stop offset="0.75" stopColor="white"/>
                                <stop offset="1" stopColor="white" stopOpacity="0"/>
                              </linearGradient>
                              <linearGradient id="wave2" x1="0" y1="20" x2="267" y2="20">
                                <stop stopColor="white" stopOpacity="0"/>
                                <stop offset="0.6" stopColor="white"/>
                                <stop offset="1" stopColor="white" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                          </svg>
                          {/* Dot indicator */}
                          <div className="absolute left-[85px] top-[15px] w-[9px] h-[9px] rounded-full bg-brand border-2 border-white"/>
                        </div>
                      </div>

                      {/* Tổng số Card */}
                      <div className="h-[130px] flex-1 bg-white border border-white/60 rounded-[18px] p-5 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-black/80">Tổng số</span>
                            <span className="text-xs text-[#666d80]">Năm học {schoolYear?.name || '2025-2026'}</span>
                          </div>
                          {/* Activity icon */}
                          <div className="w-[48px] h-[48px] rounded-full bg-black/[0.03] flex items-center justify-center">
                            <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24" fill="none">
                              <path d="M11.46 24.225L16.537 36.0712L19.633 28.8462H23.306V27.1539H18.518L16.537 31.7751L11.46 19.929L8.364 27.1539H4.691V28.8462H9.48L11.46 24.225Z" transform="translate(-4, -19)" fill="black"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-[48px] font-bold text-black leading-none">{totalStudents}</span>
                          {/* Mini bar chart */}
                          <div className="flex items-end gap-2 h-[28px] mr-2">
                            <div className="w-[16px] h-[4px] rounded-full bg-[#E5E1DC]"/>
                            <div className="w-[16px] h-[7px] rounded-full bg-[#E5E1DC]"/>
                            <div className="w-[16px] h-[11px] rounded-full bg-[#E5E1DC]"/>
                            <div className="w-[16px] h-[20px] rounded-[5px] bg-brand"/>
                            <div className="w-[16px] h-[28px] rounded-[5px] bg-brand"/>
                            <div className="w-[16px] h-[18px] rounded-[5px] bg-brand"/>
                            <div className="w-[16px] h-[12px] rounded-full bg-[#E5E1DC]"/>
                            <div className="w-[16px] h-[4px] rounded-full bg-[#E5E1DC]"/>
                          </div>
                        </div>
                      </div>

                      {/* Chưa điểm danh Card */}
                      <div className="h-[130px] flex-1 bg-white border border-white/60 rounded-[18px] p-5 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-black/80">{isCompensatoryMode ? 'Chưa bổ sung' : 'Thiếu nhi chưa điểm danh'}</span>
                            <span className="text-xs text-[#666d80]">{isCompensatoryMode ? `Thứ 5 ngày ${formatDate(thursdayOfWeek)}` : `Ngày ${formatDate(selectedDate)}`}</span>
                          </div>
                          {/* Moon icon */}
                          <div className="w-[48px] h-[48px] rounded-full bg-black/[0.03] flex items-center justify-center">
                            <svg className="w-[24px] h-[24px]" viewBox="0 0 20 20" fill="none">
                              <path d="M17.672 9.879L17.129 9.5508V9.5508L17.672 9.879ZM10.121 2.3278L9.793 1.7847V1.7847L10.121 2.3278ZM18.462 10.0001H17.827C17.827 14.3228 14.323 17.827 10 17.827V18.4617V19.0963C15.024 19.0963 19.096 15.0238 19.096 10.0001H18.462ZM10 18.4617V17.827C5.677 17.827 2.173 14.3228 2.173 10.0001H1.539H0.904C0.904 15.0238 4.976 19.0963 10 19.0963V18.4617ZM1.539 10.0001H2.173C2.173 5.6774 5.677 2.1732 10 2.1732V1.5386V0.904C4.976 0.904 0.904 4.9764 0.904 10.0001H1.539ZM12.962 12.5386V11.904C10.275 11.904 8.096 9.7257 8.096 7.0386H7.462H6.827C6.827 10.4266 9.574 13.1732 12.962 13.1732V12.5386ZM17.672 9.879L17.129 9.5508C16.276 10.9625 14.729 11.904 12.962 11.904V12.5386V13.1732C15.191 13.1732 17.142 11.9834 18.216 10.2072L17.672 9.879ZM7.462 7.0386H8.096C8.096 5.2717 9.038 3.724 10.449 2.871L10.121 2.3278L9.793 1.7847C8.017 2.858 6.827 4.809 6.827 7.0386H7.462ZM10 1.5386V2.1732C9.925 2.1732 9.837 2.1394 9.774 2.0731C9.72 2.0169 9.707 1.9637 9.704 1.9422C9.701 1.9159 9.702 1.8394 9.793 1.7847L10.121 2.3278L10.449 2.871C10.875 2.6137 11.012 2.1427 10.962 1.7723C10.91 1.3873 10.606 0.904 10 0.904V1.5386ZM17.672 9.879L18.216 10.2072C18.161 10.2978 18.084 10.2995 18.058 10.296C18.037 10.2931 17.983 10.2805 17.927 10.2265C17.861 10.1628 17.827 10.075 17.827 10.0001H18.462H19.096C19.096 9.3937 18.613 9.0902 18.228 9.0382C17.858 8.9881 17.386 9.1251 17.129 9.5508L17.672 9.879Z" fill="black"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-[48px] font-bold text-black leading-none">
                            {isCompensatoryMode
                              ? students.filter(s => !s.has_thursday_attendance && !s.has_compensatory_attendance).length
                              : notCheckedCount
                            }
                          </span>
                          {/* Vertical indicator bars */}
                          <div className="flex items-end gap-[10px] h-[28px] mr-2">
                            {[
                              { h1: 0, h2: 12.26, c1: 'white', c2: 'black' },
                              { h1: 6.4, h2: 9.7, c1: 'white', c2: 'black' },
                              { h1: 3.2, h2: 12.9, c1: 'black', c2: 'white' },
                              { h1: 2.56, h2: 13.54, c1: 'white', c2: 'black' },
                              { h1: 3.2, h2: 12.9, c1: 'black', c2: 'white' },
                              { h1: 2.56, h2: 13.54, c1: 'white', c2: 'black' },
                              { h1: 3.2, h2: 12.9, c1: 'black', c2: 'white' },
                              { h1: 3.2, h2: 12.9, c1: 'white', c2: 'black' },
                              { h1: 6.4, h2: 9.7, c1: 'white', c2: 'black' },
                              { h1: 3.2, h2: 12.9, c1: 'black', c2: 'white' },
                              { h1: 8.3, h2: 7.78, c1: 'white', c2: 'black' },
                            ].map((bar, i) => (
                              <div key={i} className="flex flex-col gap-[2px]">
                                <div className="w-[2.56px] rounded-full" style={{ height: `${bar.h1}px`, backgroundColor: bar.c1 === 'black' ? '#000' : '#fff', border: bar.c1 === 'white' ? '0.5px solid #e5e1dc' : 'none' }}/>
                                <div className="w-[2.56px] rounded-full" style={{ height: `${bar.h2}px`, backgroundColor: bar.c2 === 'black' ? '#000' : '#fff', border: bar.c2 === 'white' ? '0.5px solid #e5e1dc' : 'none' }}/>
                                <div className={`w-[3.84px] h-[3.84px] rounded-full ${bar.c2 === 'black' ? 'bg-black' : 'bg-white border border-[#e5e1dc]'}`} style={{ marginLeft: '-0.64px' }}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions - Right side */}
                      <div className="flex-1 flex flex-col gap-2">
                        {isCompensatoryMode ? (
                          /* Compensatory mode actions */
                          <>
                            <div className="h-[130px] bg-blue-50 border border-blue-200 rounded-[18px] p-5 flex flex-col justify-between">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-blue-800">Bổ sung điểm danh Thứ 5</span>
                                <span className="text-xs text-blue-600">
                                  Tuần: {formatDate(weekStart)} - {formatDate(weekEnd)}
                                </span>
                              </div>
                              <div className="text-xs text-blue-700 space-y-0.5">
                                <p>Đã đi/bổ sung: <strong>{students.filter(s => s.has_thursday_attendance || s.has_compensatory_attendance).length}</strong></p>
                                <p>Chưa điểm danh: <strong>{students.filter(s => !s.has_thursday_attendance && !s.has_compensatory_attendance).length}</strong></p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Mark All Present Checkbox */}
                            <button
                              onClick={markAllPresent}
                              disabled={saving === 'all' || !dayType}
                              className="h-[60px] w-full bg-white border border-white/60 rounded-[18px] flex items-center gap-4 px-5 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving === 'all' ? (
                                <Loader2 className="w-[20px] h-[20px] animate-spin text-brand" />
                              ) : (
                                <div className="w-[20px] h-[20px] rounded border border-black flex items-center justify-center">
                                  <Check className="w-4 h-4 text-black" strokeWidth={2.5} />
                                </div>
                              )}
                              <span className="text-sm text-black/80">Có mặt tất cả</span>
                            </button>

                            {/* Import Excel Button */}
                            <button
                              onClick={openImportExcelModal}
                              disabled={!dayType}
                              className="h-[60px] w-full bg-[#E5E1DC] border border-white/60 rounded-[18px] flex items-center gap-4 px-5 hover:bg-[#d9d5d0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-sm text-black/80">Import Excel</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Student List */}
                    <div className="space-y-0">
                      {loading ? (
                        <div className="flex items-center justify-center py-16">
                          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : isCompensatoryMode ? (
                        /* Compensatory mode student list - same layout as regular attendance */
                        students.map((student, index) => (
                          <div
                            key={student.id}
                            className={`flex items-center py-5 ${index !== students.length - 1 ? 'border-b border-[#f0f0f0]' : ''} ${saving === student.id ? 'opacity-50' : ''}`}
                          >
                            {/* Checkbox Column */}
                            <div className="w-[60px] flex items-center justify-center">
                              {saving === student.id ? (
                                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                              ) : student.has_thursday_attendance || student.has_compensatory_attendance ? (
                                <div className={`w-[26px] h-[26px] rounded-[5px] flex items-center justify-center ${
                                  student.has_thursday_attendance ? 'bg-[#00a86b]' : 'bg-brand'
                                }`}>
                                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                </div>
                              ) : (
                                <button
                                  onClick={() => markCompensatoryAttendance(student.id)}
                                  className="w-[26px] h-[26px] rounded-[5px] border-2 border-[#e0e0e0] hover:border-brand transition-colors"
                                />
                              )}
                            </div>

                            {/* Avatar Column */}
                            <div className="w-[64px] flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-[#f5eaf6] flex items-center justify-center overflow-hidden">
                                {student.avatar_url ? (
                                  <img
                                    src={student.avatar_url}
                                    alt={student.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-base font-medium text-[#8B8685]">
                                    {student.full_name.charAt(0)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Name & Code Column */}
                            <div className="w-[220px] flex flex-col pl-3">
                              <span className="text-base font-medium text-black leading-tight">
                                {student.saint_name && `${student.saint_name} `}{student.full_name}
                              </span>
                              <span className="text-sm text-[#666d80] mt-1">{student.student_code || '---'}</span>
                            </div>

                            {/* Status Text Column */}
                            <div className="w-[150px]">
                              <span className={`text-base font-medium ${
                                student.has_thursday_attendance
                                  ? 'text-[#00a86b]'
                                  : student.has_compensatory_attendance
                                    ? 'text-[#00a86b]'
                                    : 'text-brand'
                              }`}>
                                {student.has_thursday_attendance
                                  ? 'Đã đi Thứ 5'
                                  : student.has_compensatory_attendance
                                    ? 'Đã bổ sung'
                                    : 'Chưa điểm danh'
                                }
                              </span>
                            </div>

                            {/* Badge Column */}
                            <div className="w-[120px]">
                              {student.has_thursday_attendance ? (
                                <div className="h-[34px] px-4 bg-[rgba(0,168,107,0.12)] rounded-full flex items-center gap-2">
                                  <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#00a86b] flex items-center justify-center">
                                    <Check className="w-3 h-3 text-[#00a86b]" strokeWidth={3} />
                                  </div>
                                  <span className="text-sm font-medium text-[#00a86b]">Có mặt</span>
                                </div>
                              ) : student.has_compensatory_attendance ? (
                                <div className="h-[34px] px-4 bg-[rgba(0,168,107,0.12)] rounded-full flex items-center gap-2">
                                  <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#00a86b] flex items-center justify-center">
                                    <Check className="w-3 h-3 text-[#00a86b]" strokeWidth={3} />
                                  </div>
                                  <span className="text-sm font-medium text-[#00a86b]">Đã bổ sung</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => markCompensatoryAttendance(student.id)}
                                  disabled={saving === student.id}
                                  className="h-[34px] px-4 bg-[rgba(250,134,94,0.15)] rounded-full flex items-center gap-2 hover:bg-[rgba(250,134,94,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-4 h-4 text-brand" strokeWidth={2.5} />
                                  <span className="text-sm font-medium text-brand">Bổ sung</span>
                                </button>
                              )}
                            </div>

                            {/* Timestamp & By Column */}
                            <div className="flex-1 flex flex-col pl-5">
                              {student.has_compensatory_attendance && student.compensatory_time ? (
                                <>
                                  <span className="text-sm font-medium text-black leading-tight">
                                    {student.compensatory_time} {dayOfWeek} {formatDate(selectedDate)}
                                  </span>
                                  <span className="text-sm text-[#666d80] mt-0.5">
                                    Bổ sung cho: Thứ 5 {formatDate(thursdayOfWeek)}
                                  </span>
                                  <span className="text-sm text-[#666d80] mt-0.5">
                                    Điểm danh bởi: {student.compensatory_by || 'Không rõ'}
                                  </span>
                                </>
                              ) : student.has_thursday_attendance ? (
                                <span className="text-sm text-[#666d80]">
                                  Đã điểm danh Thứ 5 {formatDate(thursdayOfWeek)}
                                </span>
                              ) : null}
                            </div>

                            {/* Actions Column */}
                            <div className="w-[80px] flex items-center justify-end gap-3">
                              {student.has_compensatory_attendance ? (
                                <button
                                  onClick={() => clearCompensatoryAttendance(student.id)}
                                  disabled={saving === student.id}
                                  className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50"
                                  title="Xóa điểm danh bổ sung"
                                >
                                  <svg width="18" height="18" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.293 0.292896C12.6836 -0.0976321 13.3166 -0.0976321 13.7071 0.292896C14.0976 0.683425 14.0976 1.31645 13.7071 1.70697L8.41408 7L13.7071 12.293C14.0976 12.6836 14.0976 13.3166 13.7071 13.7071C13.3166 14.0976 12.6836 14.0976 12.293 13.7071L7 8.41408L1.70697 13.7071C1.31645 14.0976 0.683425 14.0976 0.292896 13.7071C-0.0976321 13.3166 -0.0976321 12.6836 0.292896 12.293L5.58592 7L0.292896 1.70697C-0.0976321 1.31645 -0.0976321 0.683425 0.292896 0.292896C0.683425 -0.0976321 1.31645 -0.0976321 1.70697 0.292896L7 5.58592L12.293 0.292896Z" fill="#8A8C90"/>
                                  </svg>
                                </button>
                              ) : !student.has_thursday_attendance && (
                                <button
                                  onClick={() => openQRModal(student, true)}
                                  disabled={saving === student.id}
                                  className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50"
                                  title="Quét QR điểm danh bổ sung"
                                >
                                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.2915 19.0834V17.1667H18.1665V14.2917H20.0832V17.6459C20.0832 18.0292 19.8915 18.3167 19.604 18.6042C19.3165 18.8917 18.9332 19.0834 18.6457 19.0834H15.2915ZM5.70825 19.0834H2.354C1.97067 19.0834 1.68317 18.8917 1.39567 18.6042C1.10817 18.3167 0.916504 17.9334 0.916504 17.6459V14.2917H2.83317V17.1667H5.70825V19.0834ZM15.2915 0.916748H18.6457C19.029 0.916748 19.3165 1.10841 19.604 1.39591C19.8915 1.68341 20.0832 1.97091 20.0832 2.35425V5.70841H18.1665V2.83341H15.2915V0.916748ZM5.70825 0.916748V2.83341H2.83317V5.70841H0.916504V2.35425C0.916504 1.97091 1.10817 1.68341 1.39567 1.39591C1.68317 1.10841 1.97067 0.916748 2.354 0.916748H5.70825ZM17.2082 9.54175H3.79159V11.4584H17.2082V9.54175Z" fill="#FA865E"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        /* Normal attendance mode student list */
                        students.map((student, index) => (
                          <div
                            key={student.id}
                            className={`flex items-center py-5 ${index !== students.length - 1 ? 'border-b border-[#f0f0f0]' : ''} ${saving === student.id ? 'opacity-50' : ''}`}
                          >
                            {/* Checkbox Column */}
                            <div className="w-[60px] flex items-center justify-center">
                              {saving === student.id ? (
                                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                              ) : student.attendance_status ? (
                                <div className={`w-[26px] h-[26px] rounded-[5px] flex items-center justify-center ${
                                  student.attendance_status === 'present' ? 'bg-brand' : 'bg-[#666d80]'
                                }`}>
                                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                </div>
                              ) : student.has_compensatory_attendance ? (
                                <div className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center bg-blue-500">
                                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                </div>
                              ) : (
                                <button
                                  onClick={() => openConfirmModal(student)}
                                  disabled={!dayType}
                                  className="w-[26px] h-[26px] rounded-[5px] border-2 border-[#e0e0e0] hover:border-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              )}
                            </div>

                            {/* Avatar Column */}
                            <div className="w-[64px] flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-[#f5eaf6] flex items-center justify-center overflow-hidden">
                                {student.avatar_url ? (
                                  <img
                                    src={student.avatar_url}
                                    alt={student.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-base font-medium text-[#8B8685]">
                                    {student.full_name.charAt(0)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Name & Code Column */}
                            <div className="w-[220px] flex flex-col pl-3">
                              <span className="text-base font-medium text-black leading-tight">
                                {student.saint_name && `${student.saint_name} `}{student.full_name}
                              </span>
                              <span className="text-sm text-[#666d80] mt-1">{student.student_code || '---'}</span>
                            </div>

                            {/* Status Text Column */}
                            <div className="w-[150px]">
                              <span className={`text-base font-medium ${
                                student.has_compensatory_attendance && !student.attendance_status
                                  ? 'text-blue-600'
                                  : student.attendance_status === null
                                    ? 'text-brand'
                                    : 'text-[#00a86b]'
                              }`}>
                                {student.has_compensatory_attendance && !student.attendance_status
                                  ? 'Đã bổ sung'
                                  : student.attendance_status === null
                                    ? 'Chưa điểm danh'
                                    : 'Đã điểm danh'}
                              </span>
                            </div>

                            {/* Attendance Badge Column */}
                            <div className="w-[120px]">
                              {student.has_compensatory_attendance && !student.attendance_status ? (
                                <div className="h-[34px] px-4 rounded-full flex items-center gap-2 bg-blue-50">
                                  <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-blue-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-blue-500" strokeWidth={3} />
                                  </div>
                                  <span className="text-sm font-medium text-blue-600">Đã bổ sung</span>
                                </div>
                              ) : student.attendance_status === null ? (
                                <button
                                  onClick={() => markAttendance(student.id, 'absent')}
                                  disabled={!dayType || saving === student.id}
                                  className="h-[34px] px-4 bg-[rgba(250,134,94,0.15)] rounded-full flex items-center gap-2 hover:bg-[rgba(250,134,94,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-brand flex items-center justify-center">
                                    <X className="w-3 h-3 text-brand" strokeWidth={3} />
                                  </div>
                                  <span className="text-sm font-medium text-brand">Vắng mặt</span>
                                </button>
                              ) : (
                                <div className={`h-[34px] px-4 rounded-full flex items-center gap-2 ${
                                  student.attendance_status === 'present'
                                    ? 'bg-[rgba(0,168,107,0.12)]'
                                    : 'bg-[rgba(250,134,94,0.15)]'
                                }`}>
                                  <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${
                                    student.attendance_status === 'present'
                                      ? 'border-[#00a86b]'
                                      : 'border-brand'
                                  }`}>
                                    <Check className={`w-3 h-3 ${
                                      student.attendance_status === 'present'
                                        ? 'text-[#00a86b]'
                                        : 'text-brand'
                                    }`} strokeWidth={3} />
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    student.attendance_status === 'present'
                                      ? 'text-[#00a86b]'
                                      : 'text-brand'
                                  }`}>
                                    {student.attendance_status === 'present' ? 'Có mặt' : 'Vắng mặt'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Timestamp & By Column */}
                            <div className="flex-1 flex flex-col pl-5">
                              {student.has_compensatory_attendance && !student.attendance_status ? (
                                <>
                                  <span className="text-sm font-medium text-blue-600 leading-tight">
                                    {student.compensatory_time} (Điểm danh bù)
                                  </span>
                                  <span className="text-sm text-[#666d80] mt-0.5">
                                    Đã bổ sung cho Thứ 5 này
                                  </span>
                                  <span className="text-sm text-[#666d80] mt-0.5">
                                    Điểm danh bởi: {student.compensatory_by || 'Không rõ'}
                                  </span>
                                </>
                              ) : student.attendance_status !== null ? (
                                <>
                                  <span className="text-sm font-medium text-black leading-tight">
                                    {student.attendance_time} {dayOfWeek} {formatDate(selectedDate)}
                                  </span>
                                  <span className="text-sm text-[#666d80] mt-1">
                                    Điểm danh bởi: {student.attendance_by || 'Hệ thống'}
                                  </span>
                                </>
                              ) : null}
                            </div>

                            {/* Actions Column */}
                            <div className="w-[80px] flex items-center justify-end gap-3">
                              {/* X Icon - Clear attendance */}
                              <button
                                onClick={() => clearAttendance(student.id)}
                                disabled={saving === student.id}
                                className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50"
                                title="Xóa điểm danh"
                              >
                                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12.293 0.292896C12.6836 -0.0976321 13.3166 -0.0976321 13.7071 0.292896C14.0976 0.683425 14.0976 1.31645 13.7071 1.70697L8.41408 7L13.7071 12.293C14.0976 12.6836 14.0976 13.3166 13.7071 13.7071C13.3166 14.0976 12.6836 14.0976 12.293 13.7071L7 8.41408L1.70697 13.7071C1.31645 14.0976 0.683425 14.0976 0.292896 13.7071C-0.0976321 13.3166 -0.0976321 12.6836 0.292896 12.293L5.58592 7L0.292896 1.70697C-0.0976321 1.31645 -0.0976321 0.683425 0.292896 0.292896C0.683425 -0.0976321 1.31645 -0.0976321 1.70697 0.292896L7 5.58592L12.293 0.292896Z" fill="#8A8C90"/>
                                </svg>
                              </button>
                              {/* Scan Icon - QR scan attendance */}
                              <button
                                onClick={() => openQRModal(student)}
                                disabled={!dayType || saving === student.id}
                                className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50"
                                title="Quét QR điểm danh"
                              >
                                <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M15.2915 19.0834V17.1667H18.1665V14.2917H20.0832V17.6459C20.0832 18.0292 19.8915 18.3167 19.604 18.6042C19.3165 18.8917 18.9332 19.0834 18.6457 19.0834H15.2915ZM5.70825 19.0834H2.354C1.97067 19.0834 1.68317 18.8917 1.39567 18.6042C1.10817 18.3167 0.916504 17.9334 0.916504 17.6459V14.2917H2.83317V17.1667H5.70825V19.0834ZM15.2915 0.916748H18.6457C19.029 0.916748 19.3165 1.10841 19.604 1.39591C19.8915 1.68341 20.0832 1.97091 20.0832 2.35425V5.70841H18.1665V2.83341H15.2915V0.916748ZM5.70825 0.916748V2.83341H2.83317V5.70841H0.916504V2.35425C0.916504 1.97091 1.10817 1.68341 1.39567 1.39591C1.68317 1.10841 1.97067 0.916748 2.354 0.916748H5.70825ZM17.2082 9.54175H3.79159V11.4584H17.2082V9.54175Z" fill="#FA865E"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Reports Tab */
          <div className="p-6">
            {/* Header Section */}
            <div className="flex items-start gap-6 mb-6">
              {/* Title */}
              <div className="w-[300px]">
                <h1 className="text-[26px] font-semibold text-black">Tạo báo cáo mới</h1>
                <p className="text-sm font-medium text-[#666d80] mt-1">Tạo và xuất báo cáo</p>
              </div>

              {/* Time Filter Mode Selector */}
              <div className="flex-1 bg-white border border-[#e5e1dc] rounded-2xl overflow-hidden">
                <div className="flex items-center h-12 px-4">
                  <span className="flex-1 text-base font-semibold text-black">Cách chọn lọc thời gian</span>
                  <div className="flex items-center gap-4">
                    {/* Chọn tuần option */}
                    <button
                      onClick={() => setReportTimeFilterMode('week')}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        reportTimeFilterMode === 'week' ? 'border-brand' : 'border-gray-300'
                      }`}>
                        {reportTimeFilterMode === 'week' && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-black">Chọn tuần</span>
                    </button>

                    {/* Chọn từ ngày - đến ngày option */}
                    <button
                      onClick={() => setReportTimeFilterMode('dateRange')}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        reportTimeFilterMode === 'dateRange' ? 'border-brand' : 'border-gray-300'
                      }`}>
                        {reportTimeFilterMode === 'dateRange' && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-black">Chọn từ ngày - đến ngày</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#e5e1dc] mb-6" />

            {/* Form Row 1 - Date Selection */}
            <div className="flex items-start gap-3 mb-6">
              {reportTimeFilterMode === 'dateRange' ? (
                <>
                  {/* Từ ngày */}
                  <div className="w-[27%]">
                    <label className="block text-sm font-medium text-[#666d80] mb-2">Từ ngày</label>
                    <div className="relative">
                      <button
                        onClick={() => {
                          closeAllReportDropdowns()
                          setIsReportFromDatePickerOpen(!isReportFromDatePickerOpen)
                        }}
                        className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                      >
                        <span className="text-sm text-black">{formatDisplayDate(reportFromDate)}</span>
                        <Calendar className="w-5 h-5 text-[#8A8C90]" />
                      </button>
                      {isReportFromDatePickerOpen && (
                        <div className="absolute top-full right-0 mt-1 z-20">
                          <CustomCalendar
                            value={reportFromDate}
                            onChange={(date) => setReportFromDate(date)}
                            onClose={() => setIsReportFromDatePickerOpen(false)}
                            showConfirmButton={true}
                            highlightWeek={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Đến ngày */}
                  <div className="w-[27%]">
                    <label className="block text-sm font-medium text-[#666d80] mb-2">Đến ngày</label>
                    <div className="relative">
                      <button
                        onClick={() => {
                          closeAllReportDropdowns()
                          setIsReportToDatePickerOpen(!isReportToDatePickerOpen)
                        }}
                        className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                      >
                        <span className="text-sm text-black">{formatDisplayDate(reportToDate)}</span>
                        <Calendar className="w-5 h-5 text-[#8A8C90]" />
                      </button>
                      {isReportToDatePickerOpen && (
                        <div className="absolute top-full right-0 mt-1 z-20">
                          <CustomCalendar
                            value={reportToDate}
                            onChange={(date) => setReportToDate(date)}
                            onClose={() => setIsReportToDatePickerOpen(false)}
                            showConfirmButton={true}
                            highlightWeek={false}
                            minDate={reportFromDate}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Chọn tuần */
                <div className="w-[55%]">
                  <label className="block text-sm font-medium text-[#666d80] mb-2">Chọn tuần</label>
                  <div className="relative">
                    <button
                      onClick={() => {
                        closeAllReportDropdowns()
                        setIsReportWeekPickerOpen(!isReportWeekPickerOpen)
                      }}
                      className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                    >
                      <span className="text-sm text-black">
                        {reportWeekStart && reportWeekEnd
                          ? `${formatDisplayDate(reportWeekStart)} - ${formatDisplayDate(reportWeekEnd)}`
                          : 'Chọn tuần'}
                      </span>
                      <Calendar className="w-5 h-5 text-[#8A8C90]" />
                    </button>
                    {isReportWeekPickerOpen && (
                      <div className="absolute top-full right-0 mt-1 z-20">
                        <CustomCalendar
                          value={reportWeekStart}
                          onChange={(date) => {
                            const start = new Date(date)
                            const end = new Date(start)
                            end.setDate(start.getDate() + 6)
                            setReportWeekStart(date)
                            setReportWeekEnd(end.toISOString().split('T')[0])
                          }}
                          onClose={() => setIsReportWeekPickerOpen(false)}
                          showConfirmButton={true}
                          highlightWeek={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loại báo cáo */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-2">Loại báo cáo</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      closeAllReportDropdowns()
                      setIsReportTypeDropdownOpen(!isReportTypeDropdownOpen)
                    }}
                    className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                  >
                    <span className="text-sm text-black">
                      {reportType === 'attendance' ? 'Báo cáo điểm danh' : 'Báo cáo điểm số'}
                    </span>
                    <svg className={`w-[9px] h-[18px] text-black transition-transform ${isReportTypeDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 9 18" fill="none">
                      <path d="M4.935 5.5L4.14 6.296L8.473 10.63C8.542 10.7 8.625 10.756 8.716 10.793C8.807 10.831 8.904 10.851 9.003 10.851C9.101 10.851 9.199 10.831 9.29 10.793C9.381 10.756 9.463 10.7 9.533 10.63L13.868 6.296L13.073 5.5L9.004 9.569L4.935 5.5Z" fill="black" transform="translate(-4, -2)" />
                    </svg>
                  </button>
                  {isReportTypeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          setReportType('attendance')
                          setIsReportTypeDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${reportType === 'attendance' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                      >
                        Báo cáo điểm danh
                      </button>
                      <button
                        onClick={() => {
                          setReportType('score')
                          setIsReportTypeDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${reportType === 'score' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                      >
                        Báo cáo điểm số
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Row 2 - Filters */}
            <div className="flex items-start gap-3 mb-6">
              {/* Ngành (tùy chọn) */}
              <div className="flex-[1.28]">
                <label className="block text-sm font-medium text-[#666d80] mb-2">Ngành (tùy chọn)</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      closeAllReportDropdowns()
                      setIsReportBranchDropdownOpen(!isReportBranchDropdownOpen)
                    }}
                    className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                  >
                    <span className="text-sm text-black">{reportBranch || 'Tất cả ngành'}</span>
                    <svg className={`w-[9px] h-[18px] text-black transition-transform ${isReportBranchDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 9 18" fill="none">
                      <path d="M4.935 5.5L4.14 6.296L8.473 10.63C8.542 10.7 8.625 10.756 8.716 10.793C8.807 10.831 8.904 10.851 9.003 10.851C9.101 10.851 9.199 10.831 9.29 10.793C9.381 10.756 9.463 10.7 9.533 10.63L13.868 6.296L13.073 5.5L9.004 9.569L4.935 5.5Z" fill="black" transform="translate(-4, -2)" />
                    </svg>
                  </button>
                  {isReportBranchDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden max-h-[200px] overflow-y-auto">
                      <button
                        onClick={() => {
                          setReportBranch('')
                          setReportClassId('')
                          setIsReportBranchDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${!reportBranch ? 'bg-brand/10 text-brand' : 'text-black'}`}
                      >
                        Tất cả ngành
                      </button>
                      {BRANCHES.map((branch) => (
                        <button
                          key={branch}
                          onClick={() => {
                            setReportBranch(branch)
                            setReportClassId('')
                            setIsReportBranchDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${reportBranch === branch ? 'bg-brand/10 text-brand' : 'text-black'}`}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lớp */}
              <div className="flex-[1.28]">
                <label className="block text-sm font-medium text-[#666d80] mb-2">Lớp</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      closeAllReportDropdowns()
                      setIsReportClassDropdownOpen(!isReportClassDropdownOpen)
                    }}
                    className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                  >
                    <span className="text-sm text-black">{reportClassId ? getReportClassName(reportClassId) : 'Chọn lớp'}</span>
                    <svg className={`w-[9px] h-[18px] text-black transition-transform ${isReportClassDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 9 18" fill="none">
                      <path d="M4.935 5.5L4.14 6.296L8.473 10.63C8.542 10.7 8.625 10.756 8.716 10.793C8.807 10.831 8.904 10.851 9.003 10.851C9.101 10.851 9.199 10.831 9.29 10.793C9.381 10.756 9.463 10.7 9.533 10.63L13.868 6.296L13.073 5.5L9.004 9.569L4.935 5.5Z" fill="black" transform="translate(-4, -2)" />
                    </svg>
                  </button>
                  {isReportClassDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden max-h-[300px] overflow-y-auto">
                      {getClassesByBranch(reportBranch).map((cls) => (
                        <button
                          key={cls.id}
                          onClick={() => {
                            setReportClassId(cls.id)
                            setIsReportClassDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${reportClassId === cls.id ? 'bg-brand/10 text-brand' : 'text-black'}`}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Năm học */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-2">Năm học</label>
                <div className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full">
                  <span className="text-sm text-black">{schoolYear?.name || 'Năm học hiện tại'}</span>
                  <svg className="w-[9px] h-[18px] text-black" viewBox="0 0 9 18" fill="none">
                    <path d="M4.935 5.5L4.14 6.296L8.473 10.63C8.542 10.7 8.625 10.756 8.716 10.793C8.807 10.831 8.904 10.851 9.003 10.851C9.101 10.851 9.199 10.831 9.29 10.793C9.381 10.756 9.463 10.7 9.533 10.63L13.868 6.296L13.073 5.5L9.004 9.569L4.935 5.5Z" fill="black" transform="translate(-4, -2)" />
                  </svg>
                </div>
              </div>

              {/* Loại điểm danh - chỉ hiển thị khi báo cáo điểm danh */}
              {reportType === 'attendance' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#666d80] mb-2">Loại điểm danh</label>
                  <div className="relative">
                    <button
                      onClick={() => {
                        closeAllReportDropdowns()
                        setIsReportAttendanceTypeDropdownOpen(!isReportAttendanceTypeDropdownOpen)
                      }}
                      className="flex items-center justify-between w-full h-[52px] px-5 bg-white rounded-full"
                    >
                      <span className="text-sm text-black">
                        {reportAttendanceType === 'all' ? 'Tất cả' : reportAttendanceType === 'thu5' ? 'Thứ 5' : 'Chủ nhật'}
                      </span>
                      <svg className={`w-[9px] h-[18px] text-black transition-transform ${isReportAttendanceTypeDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 9 18" fill="none">
                        <path d="M4.935 5.5L4.14 6.296L8.473 10.63C8.542 10.7 8.625 10.756 8.716 10.793C8.807 10.831 8.904 10.851 9.003 10.851C9.101 10.851 9.199 10.831 9.29 10.793C9.381 10.756 9.463 10.7 9.533 10.63L13.868 6.296L13.073 5.5L9.004 9.569L4.935 5.5Z" fill="black" transform="translate(-4, -2)" />
                      </svg>
                    </button>
                    {isReportAttendanceTypeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden">
                        {[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'thu5', label: 'Thứ 5' },
                          { value: 'cn', label: 'Chủ nhật' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setReportAttendanceType(option.value as AttendanceTypeFilter)
                              setIsReportAttendanceTypeDropdownOpen(false)
                            }}
                            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${reportAttendanceType === option.value ? 'bg-brand/10 text-brand' : 'text-black'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Score columns selection - chỉ hiển thị khi báo cáo điểm số */}
            {reportType === 'score' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#666d80] mb-3">
                  Chọn cột điểm số để xuất ảnh (để trống sẽ xuất tất cả)
                </label>
                <div className="grid grid-cols-5 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.diLeT5}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, diLeT5: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">Đi Lễ T5</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.hocGL}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, hocGL: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">Học GL</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.diemTB}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, diemTB: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">Điểm TB</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.score45HK1}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, score45HK1: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">45&apos; HKI</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.scoreExamHK1}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, scoreExamHK1: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">Thi HKI</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.score45HK2}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, score45HK2: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">45&apos; HKII</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.scoreExamHK2}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, scoreExamHK2: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">Thi HKII</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreColumns.diemTong}
                      onChange={(e) => setScoreColumns(prev => ({ ...prev, diemTong: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-black">Điểm Tổng</span>
                  </label>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[#e5e1dc] mb-6" />

            {/* Action Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={generateReport}
                disabled={reportLoading}
                className="h-[49px] px-6 bg-brand border border-white/60 rounded-full flex items-center gap-1 text-lg text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
              >
                {reportLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-6 h-6" />
                    <span>Tạo báo cáo</span>
                  </>
                )}
              </button>
            </div>

            {/* Report Result Section */}
            {isReportGenerated && (
              <div className="bg-white rounded-[24px] p-6 overflow-hidden">
                {/* Report Preview Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Eye Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.0001 12C15.0793 12 18.0179 13.8185 20.1133 17.1592C20.8187 18.2839 20.8187 19.7161 20.1133 20.8408C18.0179 24.1815 15.0793 26 12.0001 26C8.92077 26 5.98224 24.1815 3.88678 20.8408C3.18144 19.7161 3.18144 18.2839 3.88678 17.1592C5.98224 13.8185 8.92077 12 12.0001 12ZM12.0001 14C9.77455 14 7.40822 15.3088 5.58112 18.2217C5.28324 18.6966 5.28324 19.3034 5.58112 19.7783C7.40822 22.6912 9.77455 24 12.0001 24C14.2256 24 16.5919 22.6912 18.419 19.7783C18.7169 19.3034 18.7169 18.6966 18.419 18.2217C16.5919 15.3088 14.2256 14 12.0001 14ZM12.0001 15C14.2092 15 16.0001 16.7909 16.0001 19C16.0001 21.2091 14.2092 23 12.0001 23C9.79092 23 8.00006 21.2091 8.00006 19C8.00006 16.7909 9.79092 15 12.0001 15ZM11.9141 17.0039C11.9687 17.1594 12.0001 17.3259 12.0001 17.5C12.0001 18.3284 11.3285 19 10.5001 19C10.326 19 10.1594 18.9686 10.004 18.9141C10.0028 18.9426 10.0001 18.9712 10.0001 19C10.0001 20.1046 10.8955 21 12.0001 21C13.1046 21 14.0001 20.1045 14.0001 19C14.0001 17.8955 13.1046 17 12.0001 17C11.9713 17 11.9426 17.0027 11.9141 17.0039Z" fill="#8A8C90" transform="translate(0, -7)"/>
                    </svg>
                    <span className="text-sm text-[#666D80]">
                      Xem trước báo cáo: <span className="font-medium text-black">{reportType === 'attendance' ? 'Báo cáo điểm danh' : 'Báo cáo điểm số'}</span>
                    </span>
                    {reportClassId && (
                      <span className="h-[26px] px-4 bg-[#8A8C90] rounded-[13px] text-xs font-medium text-white uppercase flex items-center">
                        LỚP {getReportClassName(reportClassId)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportImage}
                      className="h-[38px] px-4 border border-brand rounded-[19px] flex items-center gap-2 text-sm text-brand hover:bg-brand/5 transition-colors"
                    >
                      <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M18 0V17H0V4H2V15H16V2H12V0H18ZM5 0C7.68925 0 9.88225 2.1223 9.99625 4.78305L10 5L10 8.5852L12.293 6.2929L13.707 7.7071L9 12.4142L4.293 7.707L5.707 6.2928L8 8.5852V5C8 3.4023 6.75075 2.0963 5.176 2.0051L5 2H-1V0H5Z" fill="#FA865E"/>
                      </svg>
                      Xuất ảnh
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="h-[38px] px-4 border border-brand rounded-[19px] flex items-center gap-2 text-sm text-brand hover:bg-brand/5 transition-colors"
                    >
                      <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M18 0V17H0V4H2V15H16V2H12V0H18ZM5 0C7.68925 0 9.88225 2.1223 9.99625 4.78305L10 5L10 8.5852L12.293 6.2929L13.707 7.7071L9 12.4142L4.293 7.707L5.707 6.2928L8 8.5852V5C8 3.4023 6.75075 2.0963 5.176 2.0051L5 2H-1V0H5Z" fill="#FA865E"/>
                      </svg>
                      Xuất Excel
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                {reportType === 'attendance' ? (
                  <div className="flex items-stretch gap-[3px] mb-6">
                    {/* Có mặt thứ 5 */}
                    <div className="flex-1 h-[130px] bg-brand rounded-[15px] px-4 py-4 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">Có mặt 5</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white/10 backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="white" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-white leading-none">{reportStats.presentThu5}</span>
                      </div>
                    </div>

                    {/* Có mặt chủ nhật */}
                    <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-black/80">Có mặt chủ nhật</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-black leading-none">{reportStats.presentCn}</span>
                      </div>
                    </div>

                    {/* Học sinh chưa điểm danh */}
                    <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-black/80">Thiếu nhi chưa điểm danh</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-black leading-none">{reportStats.notChecked}</span>
                      </div>
                    </div>

                    {/* Tổng lượt điểm danh */}
                    <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-black/80">Tổng lượt điểm danh</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-black leading-none">{reportStats.totalAttendance}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-stretch gap-[3px] mb-6">
                    {/* TB HK1 */}
                    <div className="flex-1 h-[130px] bg-brand rounded-[15px] px-4 py-4 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">TB HK1</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white/10 backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="white" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-white leading-none">{reportScoreStats.averageHK1}</span>
                      </div>
                    </div>

                    {/* TB HK2 */}
                    <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-black/80">TB HK2</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-black leading-none">{reportScoreStats.averageHK2}</span>
                      </div>
                    </div>

                    {/* TB cả năm */}
                    <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-black/80">TB cả năm</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-black leading-none">{reportScoreStats.averageYear}</span>
                      </div>
                    </div>

                    {/* Tổng số học sinh */}
                    <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-black/80">Tổng học sinh</span>
                        <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[40px] font-bold text-black leading-none">{reportScoreStats.totalStudents}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Table */}
                {reportType === 'attendance' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: `${550 + reportDates.length * 90}px` }}>
                      <thead>
                        <tr className="bg-[#E5E1DC] h-[38px]">
                          <th className="text-left px-4 text-[16px] font-medium text-[#666d80] w-[100px] whitespace-nowrap">STT</th>
                          <th className="text-left px-4 text-[16px] font-medium text-[#666d80] w-[300px] whitespace-nowrap">Tên thánh</th>
                          <th className="text-left px-4 text-[16px] font-medium text-[#666d80] whitespace-nowrap" colSpan={2}>Họ và tên</th>
                          {reportDates.length === 0 ? (
                            <th className="text-center px-4 text-[16px] text-[#666d80]">Không có dữ liệu</th>
                          ) : (
                            reportDates.map((date) => (
                              <th key={date} className="text-center px-2 text-[14px] font-medium text-[#666d80] whitespace-nowrap min-w-[70px]">
                                {formatShortDate(date)}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {reportStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4 + reportDates.length} className="py-12 text-center text-[16px] text-[#666d80]">
                              Không có học sinh trong lớp này
                            </td>
                          </tr>
                        ) : (
                          reportStudents.map((student, index) => {
                            const nameParts = student.full_name.split(' ')
                            const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
                            const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
                            return (
                            <tr key={student.id} className="h-[56px] border-b border-[#8A8C90]">
                              <td className="px-4 text-[14px] font-medium text-black">{index + 1}</td>
                              <td className="px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-[36px] h-[36px] rounded-[10px] bg-[#F3F3F3] flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {student.avatar_url ? (
                                      <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
                                    ) : null}
                                  </div>
                                  <span className="text-[14px] font-medium text-black whitespace-nowrap">{student.saint_name || '-'}</span>
                                </div>
                              </td>
                              <td className="px-2 text-[14px] font-semibold text-[#8A8C90] whitespace-nowrap w-[300px]">{familyMiddleName}</td>
                              <td className="px-2 text-[14px] font-semibold text-black whitespace-nowrap w-[105px]">{givenName}</td>
                              {reportDates.map((date) => (
                                <td key={date} className={`text-center border-l border-[#8A8C90] ${student.attendance[date] === 'present' ? 'bg-[#F5D5D5]' : ''}`}>
                                  {student.attendance[date] === 'present' ? (
                                    <span className="text-[#8A8C90] text-[16px]">×</span>
                                  ) : student.attendance[date] === 'absent' ? (
                                    <div className="w-[24px] h-[24px] rounded-full bg-[#22C55E] flex items-center justify-center mx-auto">
                                      <Check className="w-4 h-4 text-white" />
                                    </div>
                                  ) : (
                                    <span className="text-[#666d80]">-</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Score Table */}
                    {(() => {
                      // Check if any column is selected
                      const anySelected = Object.values(scoreColumns).some(v => v)
                      // If none selected, show all columns
                      const showAll = !anySelected
                      const showDiLeT5 = showAll || scoreColumns.diLeT5
                      const showHocGL = showAll || scoreColumns.hocGL
                      const show45HK1 = showAll || scoreColumns.score45HK1
                      const showExamHK1 = showAll || scoreColumns.scoreExamHK1
                      const show45HK2 = showAll || scoreColumns.score45HK2
                      const showExamHK2 = showAll || scoreColumns.scoreExamHK2
                      const showDiemTong = showAll || scoreColumns.diemTong
                      // Count visible columns for colSpan
                      const visibleScoreCols = [showDiLeT5, showHocGL, show45HK1, showExamHK1, show45HK2, showExamHK2, showDiemTong].filter(Boolean).length

                      return (
                        <table className="w-full">
                          <thead>
                            <tr className="bg-[#E5E1DC] h-[38px]">
                              <th className="text-left px-4 text-[14px] font-medium text-[#666d80] w-[60px]">STT</th>
                              <th className="text-left px-4 text-[14px] font-medium text-[#666d80] w-[120px]">Tên thánh</th>
                              <th className="text-left px-4 text-[14px] font-medium text-[#666d80] w-[180px]">Họ và tên</th>
                              {showDiLeT5 && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">Đi Lễ T5</th>}
                              {showHocGL && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">Học GL</th>}
                              {show45HK1 && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">45p HK1</th>}
                              {showExamHK1 && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">Thi HK1</th>}
                              {(show45HK1 || showExamHK1) && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">TB HK1</th>}
                              {show45HK2 && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">45p HK2</th>}
                              {showExamHK2 && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">Thi HK2</th>}
                              {(show45HK2 || showExamHK2) && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">TB HK2</th>}
                              {showDiemTong && <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[80px]">TB Năm</th>}
                              <th className="text-center px-2 text-[14px] font-medium text-[#666d80] w-[100px]">Xếp loại</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportScoreStudents.length === 0 ? (
                              <tr>
                                <td colSpan={4 + visibleScoreCols + ((show45HK1 || showExamHK1) ? 1 : 0) + ((show45HK2 || showExamHK2) ? 1 : 0)} className="py-12 text-center text-[16px] text-[#666d80]">
                                  Không có học sinh trong lớp này
                                </td>
                              </tr>
                            ) : (
                              reportScoreStudents.map((student, index) => {
                                let classification = '-'
                                let classColor = 'text-[#666d80]'
                                if (student.average_year !== null) {
                                  if (student.average_year >= 8.0) {
                                    classification = 'Giỏi'
                                    classColor = 'text-green-600 font-semibold'
                                  } else if (student.average_year >= 6.5) {
                                    classification = 'Khá'
                                    classColor = 'text-blue-600 font-semibold'
                                  } else if (student.average_year >= 5.0) {
                                    classification = 'TB'
                                    classColor = 'text-yellow-600 font-semibold'
                                  } else {
                                    classification = 'Yếu'
                                    classColor = 'text-red-600 font-semibold'
                                  }
                                }

                                return (
                                  <tr key={student.id} className="border-b border-[#E5E1DC] h-[52px] hover:bg-gray-50">
                                    <td className="px-4 text-[14px] text-black">{index + 1}</td>
                                    <td className="px-4 text-[14px] text-black">{student.saint_name || '-'}</td>
                                    <td className="px-4 text-[14px] font-medium text-black">{student.full_name}</td>
                                    {showDiLeT5 && <td className="text-center px-2 text-[14px] text-black">{student.score_di_le_t5 !== null ? student.score_di_le_t5 : '-'}</td>}
                                    {showHocGL && <td className="text-center px-2 text-[14px] text-black">{student.score_hoc_gl !== null ? student.score_hoc_gl : '-'}</td>}
                                    {show45HK1 && <td className="text-center px-2 text-[14px] text-black">{student.score_45_hk1 !== null ? student.score_45_hk1 : '-'}</td>}
                                    {showExamHK1 && <td className="text-center px-2 text-[14px] text-black">{student.score_exam_hk1 !== null ? student.score_exam_hk1 : '-'}</td>}
                                    {(show45HK1 || showExamHK1) && <td className="text-center px-2 text-[14px] font-semibold text-brand">{student.average_hk1 !== null ? student.average_hk1 : '-'}</td>}
                                    {show45HK2 && <td className="text-center px-2 text-[14px] text-black">{student.score_45_hk2 !== null ? student.score_45_hk2 : '-'}</td>}
                                    {showExamHK2 && <td className="text-center px-2 text-[14px] text-black">{student.score_exam_hk2 !== null ? student.score_exam_hk2 : '-'}</td>}
                                    {(show45HK2 || showExamHK2) && <td className="text-center px-2 text-[14px] font-semibold text-brand">{student.average_hk2 !== null ? student.average_hk2 : '-'}</td>}
                                    {showDiemTong && <td className="text-center px-2 text-[14px] font-bold text-brand">{student.average_year !== null ? student.average_year : '-'}</td>}
                                    <td className={`text-center px-2 text-[14px] ${classColor}`}>{classification}</td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      )
                    })()}

                    {/* Classification Summary */}
                    {reportScoreStudents.length > 0 && (
                      <div className="mt-6 flex items-center gap-6 text-sm">
                        <span className="text-[#666d80]">Phân loại:</span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-green-600"></span>
                          <span className="text-green-600 font-medium">Giỏi: {reportScoreStats.excellentCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                          <span className="text-blue-600 font-medium">Khá: {reportScoreStats.goodCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-yellow-600"></span>
                          <span className="text-yellow-600 font-medium">TB: {reportScoreStats.averageCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-red-600"></span>
                          <span className="text-red-600 font-medium">Yếu: {reportScoreStats.belowAverageCount}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden Report Export Template */}
      <div className="fixed left-[-9999px] top-0">
        {isReportGenerated && reportType === 'attendance' && (
          <ReportExportTemplate
            ref={reportExportRef}
            type="attendance"
            students={reportStudents}
            dates={reportDates}
            className={getReportClassName(reportClassId)}
            fromDate={reportTimeFilterMode === 'week' ? reportWeekStart : reportFromDate}
            toDate={reportTimeFilterMode === 'week' ? reportWeekEnd : reportToDate}
          />
        )}
        {isReportGenerated && reportType === 'score' && (
          <ReportExportTemplate
            ref={reportExportRef}
            type="score"
            students={reportScoreStudents}
            className={getReportClassName(reportClassId)}
            schoolYear={schoolYear?.name || ''}
            scoreColumns={scoreColumns}
          />
        )}
      </div>

      {/* QR Attendance Modal */}
      <QRAttendanceModal
        isOpen={isQRModalOpen}
        onClose={closeQRModal}
        onManualAttendance={handleManualAttendanceFromModal}
        studentName={selectedStudentForQR ? `${selectedStudentForQR.saint_name || ''} ${selectedStudentForQR.full_name}`.trim() : undefined}
        studentCode={selectedStudentForQR?.student_code}
      />

      {/* Attendance Confirmation Modal */}
      {selectedStudentForConfirm && dayType && (
        <AttendanceConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={closeConfirmModal}
          onConfirm={handleConfirmAttendance}
          studentName={`${selectedStudentForConfirm.saint_name || ''} ${selectedStudentForConfirm.full_name}`.trim()}
          studentCode={selectedStudentForConfirm.student_code}
          studentAvatar={selectedStudentForConfirm.avatar_url}
          dateOfBirth={selectedStudentForConfirm.date_of_birth}
          attendanceDate={selectedDate}
          dayType={dayType}
          isLoading={saving === selectedStudentForConfirm.id}
        />
      )}

      {/* Import Excel Modal */}
      {dayType && (
        <ImportExcelModal
          isOpen={isImportExcelModalOpen}
          onClose={closeImportExcelModal}
          onImport={handleImportExcel}
          selectedDate={selectedDate}
          dayType={dayType}
        />
      )}

      {/* Export Success Modal */}
      <ExportSuccessModal
        isOpen={isExportSuccessModalOpen}
        onClose={() => setIsExportSuccessModalOpen(false)}
        message={exportSuccessMessage}
      />
    </div>
  )
}
