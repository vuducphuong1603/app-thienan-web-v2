'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, ThieuNhiProfile, Class, BRANCHES, AttendanceRecord, SchoolYear } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Check, X, List, FileText, Loader2, Plus, Calendar } from 'lucide-react'
import QRAttendanceModal from '@/components/QRAttendanceModal'
import AttendanceConfirmModal from '@/components/AttendanceConfirmModal'
import ImportExcelModal from '@/components/ImportExcelModal'
import ExportSuccessModal from '@/components/ExportSuccessModal'

// Report related interfaces
interface ReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  avatar_url?: string
  attendance: Record<string, 'present' | 'absent' | null> // date -> status
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
}

type TabType = 'attendance' | 'report'

export default function ActivitiesPage() {
  const { user } = useAuth()
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

      // Fetch attendance records for this class on selected date
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

      // Map attendance records to students
      const attendanceMap = new Map<string, AttendanceRecord & { created_by_user?: { full_name: string } }>()
      if (attendanceData) {
        attendanceData.forEach(record => {
          attendanceMap.set(record.student_id, record)
        })
      }

      // Combine students with attendance data
      const studentsWithAttendance: StudentWithAttendance[] = (studentsData || []).map(student => {
        const attendance = attendanceMap.get(student.id)
        return {
          ...student,
          class_name: selectedClass?.name,
          attendance_status: attendance?.status || null,
          attendance_time: attendance?.check_in_time?.substring(0, 5) || undefined,
          attendance_by: attendance?.created_by_user?.full_name || undefined,
          attendance_record_id: attendance?.id || undefined,
        }
      })

      setStudents(studentsWithAttendance)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, selectedDate, classes])

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

  // Handle attendance marking - save to database
  const markAttendance = async (studentId: string, status: 'present' | 'absent') => {
    if (!dayType) {
      showNotification('error', 'Chỉ điểm danh vào Thứ 5 hoặc Chủ nhật')
      return
    }

    setSaving(studentId)
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

      showNotification('success', status === 'present' ? 'Đã điểm danh có mặt' : 'Đã điểm danh vắng mặt')
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
    } finally {
      setSaving(null)
    }
  }

  // Handle mark all present - bulk save to database
  const markAllPresent = async () => {
    if (!dayType) {
      showNotification('error', 'Chỉ điểm danh vào Thứ 5 hoặc Chủ nhật')
      return
    }

    const studentsToMark = students.filter(s => s.attendance_status === null)
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

      showNotification('success', `Đã điểm danh ${studentsToMark.length} thiếu nhi`)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
    } finally {
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

      showNotification('success', 'Đã xóa điểm danh')
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Đã có lỗi xảy ra')
    } finally {
      setSaving(null)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }

  // Open QR modal for a student
  const openQRModal = (student: StudentWithAttendance) => {
    setSelectedStudentForQR(student)
    setIsQRModalOpen(true)
  }

  // Handle manual attendance from QR modal
  const handleManualAttendanceFromModal = () => {
    if (selectedStudentForQR) {
      markAttendance(selectedStudentForQR.id, 'present')
    }
    setIsQRModalOpen(false)
    setSelectedStudentForQR(null)
  }

  // Close QR modal
  const closeQRModal = () => {
    setIsQRModalOpen(false)
    setSelectedStudentForQR(null)
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

  // Generate report (placeholder - to be implemented with actual data fetching)
  const generateReport = async () => {
    if (!reportClassId) {
      showNotification('error', 'Vui lòng chọn lớp')
      return
    }

    setReportLoading(true)
    try {
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

      // Count not checked
      reportStudentsData.forEach(student => {
        sortedDates.forEach(date => {
          if (student.attendance[date] === null) {
            notChecked++
          }
        })
      })

      setReportStats({
        presentThu5,
        presentCn,
        notChecked,
        totalAttendance,
      })

      setIsReportGenerated(true)
      showNotification('success', 'Đã tạo báo cáo thành công')
    } catch (error) {
      console.error('Error generating report:', error)
      showNotification('error', 'Không thể tạo báo cáo')
    } finally {
      setReportLoading(false)
    }
  }

  // Export image (placeholder)
  const handleExportImage = () => {
    setExportSuccessMessage('Đã xuất ảnh!')
    setIsExportSuccessModalOpen(true)
    setTimeout(() => setIsExportSuccessModalOpen(false), 2000)
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
      <div className="flex-1 bg-[#F6F6F6] border border-white rounded-2xl min-h-[768px]">
        {activeTab === 'attendance' ? (
          <>
            {/* Header Section */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[26px] font-semibold text-black">Điểm danh</h1>
                <p className="text-sm font-medium text-[#666d80]">
                  {selectedClassId ? `LỚP ${getClassName(selectedClassId).toUpperCase()}` : 'Chọn lớp để bắt đầu điểm danh'}
                  {!dayType && selectedClassId && (
                    <span className="text-orange-500 ml-2">(Chỉ điểm danh Thứ 5 hoặc Chủ nhật)</span>
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
                    <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 p-4">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value)
                          setIsDatePickerOpen(false)
                        }}
                        className="px-4 py-3 border border-[#E5E1DC] rounded-lg text-base focus:outline-none focus:border-brand"
                      />
                    </div>
                  )}
                </div>

                {/* Day Badge */}
                <div className={`h-[52px] px-8 border border-[#F6F6F6] rounded-full flex items-center justify-center flex-1 ${
                  dayType ? 'bg-[#E5E1DC]' : 'bg-orange-100'
                }`}>
                  <span className={`text-base ${dayType ? 'text-black' : 'text-orange-600'}`}>
                    Buổi: {dayOfWeek.toLowerCase()} {!dayType && '(không điểm danh)'}
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
                      {/* Có mặt Card */}
                      <div className="h-[130px] flex-1 bg-brand rounded-[18px] p-5 flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-white/80">Có mặt</span>
                          </div>
                          {/* Chart icon in circle */}
                          <div className="w-[48px] h-[48px] rounded-full bg-white/10 backdrop-blur-[4.24px] flex items-center justify-center border border-white/20">
                            <svg className="w-[26px] h-[26px] text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7.074 24.4631L12.295 29.6514C13 30.3528 13.353 30.7035 13.791 30.7035C14.228 30.7034 14.581 30.3526 15.287 29.6511L15.456 29.4827C16.162 28.7805 16.515 28.4294 16.953 28.4296C17.391 28.4297 17.744 28.7811 18.45 29.4838L21.222 32.2441M7.074 24.4631V28.3861M7.074 24.4631H11.023" transform="translate(-5, -20)" stroke="white" strokeWidth="1.27" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[48px] font-bold text-white leading-none">{presentCount}</span>
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
                            <span className="text-sm text-black/80">Chưa điểm danh</span>
                            <span className="text-xs text-[#666d80]">Ngày {formatDate(selectedDate)}</span>
                          </div>
                          {/* Moon icon */}
                          <div className="w-[48px] h-[48px] rounded-full bg-black/[0.03] flex items-center justify-center">
                            <svg className="w-[24px] h-[24px]" viewBox="0 0 20 20" fill="none">
                              <path d="M17.672 9.879L17.129 9.5508V9.5508L17.672 9.879ZM10.121 2.3278L9.793 1.7847V1.7847L10.121 2.3278ZM18.462 10.0001H17.827C17.827 14.3228 14.323 17.827 10 17.827V18.4617V19.0963C15.024 19.0963 19.096 15.0238 19.096 10.0001H18.462ZM10 18.4617V17.827C5.677 17.827 2.173 14.3228 2.173 10.0001H1.539H0.904C0.904 15.0238 4.976 19.0963 10 19.0963V18.4617ZM1.539 10.0001H2.173C2.173 5.6774 5.677 2.1732 10 2.1732V1.5386V0.904C4.976 0.904 0.904 4.9764 0.904 10.0001H1.539ZM12.962 12.5386V11.904C10.275 11.904 8.096 9.7257 8.096 7.0386H7.462H6.827C6.827 10.4266 9.574 13.1732 12.962 13.1732V12.5386ZM17.672 9.879L17.129 9.5508C16.276 10.9625 14.729 11.904 12.962 11.904V12.5386V13.1732C15.191 13.1732 17.142 11.9834 18.216 10.2072L17.672 9.879ZM7.462 7.0386H8.096C8.096 5.2717 9.038 3.724 10.449 2.871L10.121 2.3278L9.793 1.7847C8.017 2.858 6.827 4.809 6.827 7.0386H7.462ZM10 1.5386V2.1732C9.925 2.1732 9.837 2.1394 9.774 2.0731C9.72 2.0169 9.707 1.9637 9.704 1.9422C9.701 1.9159 9.702 1.8394 9.793 1.7847L10.121 2.3278L10.449 2.871C10.875 2.6137 11.012 2.1427 10.962 1.7723C10.91 1.3873 10.606 0.904 10 0.904V1.5386ZM17.672 9.879L18.216 10.2072C18.161 10.2978 18.084 10.2995 18.058 10.296C18.037 10.2931 17.983 10.2805 17.927 10.2265C17.861 10.1628 17.827 10.075 17.827 10.0001H18.462H19.096C19.096 9.3937 18.613 9.0902 18.228 9.0382C17.858 8.9881 17.386 9.1251 17.129 9.5508L17.672 9.879Z" fill="black"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-[48px] font-bold text-black leading-none">{notCheckedCount}</span>
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
                      ) : (
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
                                student.attendance_status === null
                                  ? 'text-brand'
                                  : 'text-[#00a86b]'
                              }`}>
                                {student.attendance_status === null ? 'Chưa điểm danh' : 'Đã điểm danh'}
                              </span>
                            </div>

                            {/* Attendance Badge Column */}
                            <div className="w-[120px]">
                              {student.attendance_status === null ? (
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
                              {student.attendance_status !== null ? (
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
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 p-3">
                          <input
                            type="date"
                            value={reportFromDate}
                            onChange={(e) => {
                              setReportFromDate(e.target.value)
                              setIsReportFromDatePickerOpen(false)
                            }}
                            className="w-full px-3 py-2 border border-[#E5E1DC] rounded-lg text-sm"
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
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 p-3">
                          <input
                            type="date"
                            value={reportToDate}
                            onChange={(e) => {
                              setReportToDate(e.target.value)
                              setIsReportToDatePickerOpen(false)
                            }}
                            className="w-full px-3 py-2 border border-[#E5E1DC] rounded-lg text-sm"
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
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 p-3">
                        <p className="text-xs text-[#666d80] mb-2">Chọn ngày bắt đầu tuần:</p>
                        <input
                          type="date"
                          value={reportWeekStart}
                          onChange={(e) => {
                            const start = new Date(e.target.value)
                            const end = new Date(start)
                            end.setDate(start.getDate() + 6)
                            setReportWeekStart(e.target.value)
                            setReportWeekEnd(end.toISOString().split('T')[0])
                            setIsReportWeekPickerOpen(false)
                          }}
                          className="w-full px-3 py-2 border border-[#E5E1DC] rounded-lg text-sm"
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

              {/* Loại điểm danh */}
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
            </div>

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
              <div className="bg-white rounded-[24px] p-6">
                {/* Report Preview Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Eye Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.0001 12C15.0793 12 18.0179 13.8185 20.1133 17.1592C20.8187 18.2839 20.8187 19.7161 20.1133 20.8408C18.0179 24.1815 15.0793 26 12.0001 26C8.92077 26 5.98224 24.1815 3.88678 20.8408C3.18144 19.7161 3.18144 18.2839 3.88678 17.1592C5.98224 13.8185 8.92077 12 12.0001 12ZM12.0001 14C9.77455 14 7.40822 15.3088 5.58112 18.2217C5.28324 18.6966 5.28324 19.3034 5.58112 19.7783C7.40822 22.6912 9.77455 24 12.0001 24C14.2256 24 16.5919 22.6912 18.419 19.7783C18.7169 19.3034 18.7169 18.6966 18.419 18.2217C16.5919 15.3088 14.2256 14 12.0001 14ZM12.0001 15C14.2092 15 16.0001 16.7909 16.0001 19C16.0001 21.2091 14.2092 23 12.0001 23C9.79092 23 8.00006 21.2091 8.00006 19C8.00006 16.7909 9.79092 15 12.0001 15ZM11.9141 17.0039C11.9687 17.1594 12.0001 17.3259 12.0001 17.5C12.0001 18.3284 11.3285 19 10.5001 19C10.326 19 10.1594 18.9686 10.004 18.9141C10.0028 18.9426 10.0001 18.9712 10.0001 19C10.0001 20.1046 10.8955 21 12.0001 21C13.1046 21 14.0001 20.1045 14.0001 19C14.0001 17.8955 13.1046 17 12.0001 17C11.9713 17 11.9426 17.0027 11.9141 17.0039Z" fill="#8A8C90" transform="translate(0, -7)"/>
                    </svg>
                    <span className="text-sm text-[#666D80]">
                      Xem trước báo cáo: <span className="font-medium text-black">Báo cáo điểm danh</span>
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
                    {/* Trend lines decoration */}
                    <svg className="absolute right-4 bottom-3" width="88" height="45" viewBox="0 0 88 45" fill="none">
                      <path d="M0 35C36 -12 36 88.5 62 55C66.6 49 78 41.5 88 57" stroke="url(#trendGrad1)" strokeWidth="2.6" strokeLinecap="round"/>
                      <path d="M0 52.5C33 23 26 10 56 56C60 64 72 70.5 88 47.5" stroke="url(#trendGrad2)" strokeWidth="2.6" strokeLinecap="round"/>
                      <circle cx="22" cy="35" r="3" fill="#FA865E" stroke="white"/>
                      <defs>
                        <linearGradient id="trendGrad1" x1="0" y1="50" x2="88" y2="50" gradientUnits="userSpaceOnUse">
                          <stop stopColor="white" stopOpacity="0"/>
                          <stop offset="0.26" stopColor="white"/>
                          <stop offset="0.79" stopColor="white"/>
                          <stop offset="1" stopColor="white" stopOpacity="0"/>
                        </linearGradient>
                        <linearGradient id="trendGrad2" x1="0" y1="50" x2="88" y2="50" gradientUnits="userSpaceOnUse">
                          <stop stopColor="white" stopOpacity="0"/>
                          <stop offset="0.6" stopColor="white"/>
                          <stop offset="1" stopColor="white" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                    </svg>
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
                      {/* Bar chart decoration */}
                      <div className="flex items-end gap-[1px]">
                        <div className="w-[11px] h-[3px] bg-[#E5E1DC] rounded-full"></div>
                        <div className="w-[11px] h-[6px] bg-[#E5E1DC] rounded-[3px]"></div>
                        <div className="w-[11px] h-[9px] bg-[#E5E1DC] rounded-[4.6px]"></div>
                        <div className="w-[11px] h-[17px] bg-brand rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[25px] bg-brand rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[15px] bg-brand rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[10px] bg-[#E5E1DC] rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[3px] bg-[#E5E1DC] rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Học sinh chưa điểm danh */}
                  <div className="flex-1 h-[130px] bg-[#F3F3F3] rounded-[15px] px-4 py-4 flex flex-col justify-between border border-white/60">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-black/80">Học sinh chưa điểm danh</span>
                      <div className="w-[44px] h-[44px] rounded-full bg-white backdrop-blur-[4px] flex items-center justify-center border border-white/20">
                        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.41474 12.0253L6.63484 6.83699C7.34056 6.13558 7.69341 5.78487 8.13109 5.78492C8.56876 5.78497 8.92153 6.13576 9.62709 6.83734L9.79639 7.00569C10.5026 7.70788 10.8557 8.05898 11.2936 8.05882C11.7316 8.05866 12.0844 7.7073 12.7901 7.00459L15.562 4.24427M1.41474 12.0253L1.41474 8.10235M1.41474 12.0253L5.36335 12.0253" stroke="black" strokeWidth="1.27325" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-[40px] font-bold text-black leading-none">{reportStats.notChecked}</span>
                      {/* Bar chart decoration */}
                      <div className="flex items-end gap-[1px]">
                        <div className="w-[11px] h-[3px] bg-[#E5E1DC] rounded-full"></div>
                        <div className="w-[11px] h-[6px] bg-[#E5E1DC] rounded-[3px]"></div>
                        <div className="w-[11px] h-[9px] bg-[#E5E1DC] rounded-[4.6px]"></div>
                        <div className="w-[11px] h-[17px] bg-brand rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[25px] bg-brand rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[15px] bg-brand rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[10px] bg-[#E5E1DC] rounded-[4.8px]"></div>
                        <div className="w-[11px] h-[3px] bg-[#E5E1DC] rounded-full"></div>
                      </div>
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
                      {/* Attendance bars decoration */}
                      <div className="flex items-end gap-[1px]">
                        <div className="w-[2.6px] flex flex-col gap-[2px]">
                          <div className="h-[4px] bg-white rounded-full"></div>
                          <div className="h-[15px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-brand rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[6px] bg-white rounded-full"></div>
                          <div className="h-[12px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-brand rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-brand rounded-full"></div>
                          <div className="h-[15px] bg-white rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-white rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-white rounded-full"></div>
                          <div className="h-[16px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-brand rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-brand rounded-full"></div>
                          <div className="h-[15px] bg-white rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-white rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-white rounded-full"></div>
                          <div className="h-[16px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-brand rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-brand rounded-full"></div>
                          <div className="h-[15px] bg-white rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-white rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-white rounded-full"></div>
                          <div className="h-[15px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-white rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[6px] bg-white rounded-full"></div>
                          <div className="h-[12px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-brand rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[3px] bg-brand rounded-full"></div>
                          <div className="h-[15px] bg-white rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-white rounded-full -ml-[0.7px]"></div>
                        </div>
                        <div className="w-[2.6px] flex flex-col gap-[2px] ml-[6px]">
                          <div className="h-[8px] bg-white rounded-full"></div>
                          <div className="h-[10px] bg-brand rounded-full"></div>
                          <div className="w-[4px] h-[4px] bg-brand rounded-full -ml-[0.7px]"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="overflow-hidden relative">
                  {/* Table Header */}
                  <div className="relative h-[38px] bg-[#E5E1DC] rounded-[15px] border border-white/60">
                    <span className="absolute left-[30px] top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#666d80]">STT</span>
                    <span className="absolute left-[150px] top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#666d80]">Tên thánh</span>
                    <span className="absolute left-[350px] top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#666d80]">Họ và tên</span>
                    {reportDates.map((date, idx) => (
                      <span
                        key={date}
                        className="absolute top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#666d80]"
                        style={{ right: `${(reportDates.length - 1 - idx) * 134 + 40}px` }}
                      >
                        {formatShortDate(date)}
                      </span>
                    ))}
                    {reportDates.length === 0 && (
                      <span className="absolute right-[40px] top-1/2 -translate-y-1/2 text-[16px] text-[#666d80]">Không có dữ liệu</span>
                    )}
                  </div>

                  {/* Table Body */}
                  {reportStudents.length === 0 ? (
                    <div className="py-12 text-center text-[16px] text-[#666d80]">
                      Không có học sinh trong lớp này
                    </div>
                  ) : (
                    reportStudents.map((student, index) => {
                      // Split name: last word is "Tên" (given name), rest is "Họ và tên đệm"
                      const nameParts = student.full_name.split(' ')
                      const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
                      const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''

                      return (
                        <div key={student.id} className="relative h-[56px]">
                          {/* STT */}
                          <span className="absolute left-[37px] top-1/2 -translate-y-1/2 text-[14px] font-medium text-black">{index + 1}</span>
                          {/* Avatar placeholder */}
                          <div className="absolute left-[90px] top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-[12px] bg-[#F3F3F3] flex items-center justify-center overflow-hidden">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          {/* Tên thánh */}
                          <span className="absolute left-[150px] top-1/2 -translate-y-1/2 text-[14px] font-medium text-black">{student.saint_name || '-'}</span>
                          {/* Họ và tên đệm */}
                          <span className="absolute left-[350px] top-1/2 -translate-y-1/2 w-[150px] text-[14px] font-semibold text-[#8A8C90]">{familyMiddleName}</span>
                          {/* Tên - positioned at center of table */}
                          <span className="absolute left-[700px] top-1/2 -translate-y-1/2 text-[14px] font-semibold text-black">{givenName}</span>

                          {/* Date columns - positioned from right */}
                          {reportDates.map((date, dateIndex) => {
                            const rightPosition = (reportDates.length - 1 - dateIndex) * 134
                            return (
                              <div key={date} className="absolute top-0 h-[56px]" style={{ right: `${rightPosition}px`, width: '134px' }}>
                                {/* Vertical separator on left */}
                                <div className="absolute left-0 top-0 w-[1px] h-full bg-[#8A8C90]" />
                                <div className="w-full h-full flex items-center justify-center">
                                  {student.attendance[date] === 'present' ? (
                                    <div className="w-full h-full bg-[rgba(250,134,94,0.2)] flex items-center justify-center">
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.5369 0.251055C10.8717 -0.083685 11.4143 -0.083685 11.749 0.251055C12.0837 0.585795 12.0837 1.12839 11.749 1.46313L7.2121 6.00002L11.749 10.5369C12.0837 10.8717 12.0837 11.4143 11.749 11.749C11.4143 12.0837 10.8717 12.0837 10.5369 11.749L6.00002 7.2121L1.46313 11.749C1.12839 12.0837 0.585795 12.0837 0.251055 11.749C-0.083685 11.4143 -0.083685 10.8717 0.251055 10.5369L4.78795 6.00002L0.251055 1.46313C-0.083685 1.12839 -0.083685 0.585795 0.251055 0.251055C0.585795 -0.083685 1.12839 -0.083685 1.46313 0.251055L6.00002 4.78795L10.5369 0.251055Z" fill="#8A8C90"/>
                                      </svg>
                                    </div>
                                  ) : student.attendance[date] === 'absent' ? (
                                    <div className="w-full h-full bg-[rgba(250,134,94,0.2)] flex items-center justify-center">
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.5369 0.251055C10.8717 -0.083685 11.4143 -0.083685 11.749 0.251055C12.0837 0.585795 12.0837 1.12839 11.749 1.46313L7.2121 6.00002L11.749 10.5369C12.0837 10.8717 12.0837 11.4143 11.749 11.749C11.4143 12.0837 10.8717 12.0837 10.5369 11.749L6.00002 7.2121L1.46313 11.749C1.12839 12.0837 0.585795 12.0837 0.251055 11.749C-0.083685 11.4143 -0.083685 10.8717 0.251055 10.5369L4.78795 6.00002L0.251055 1.46313C-0.083685 1.12839 -0.083685 0.585795 0.251055 0.251055C0.585795 -0.083685 1.12839 -0.083685 1.46313 0.251055L6.00002 4.78795L10.5369 0.251055Z" fill="#8A8C90"/>
                                      </svg>
                                    </div>
                                  ) : (
                                    <span className="text-[#666d80]">-</span>
                                  )}
                                </div>
                                {/* Vertical separator on right */}
                                <div className="absolute right-0 top-0 w-[1px] h-full bg-[#8A8C90]" />
                              </div>
                            )
                          })}
                          {/* Bottom separator line */}
                          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#8A8C90]" />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
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
