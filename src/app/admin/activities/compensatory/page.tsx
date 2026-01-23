'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, ThieuNhiProfile, Class, BRANCHES, SchoolYear } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Search, Calendar, Check, X, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import CustomCalendar from '@/components/ui/CustomCalendar'
import QRAttendanceModal from '@/components/QRAttendanceModal'

interface StudentWithCompensatoryStatus extends ThieuNhiProfile {
  class_name?: string
  has_thursday_attendance?: boolean // Already attended on Thursday
  has_compensatory_attendance?: boolean // Already has make-up attendance for this week
  existing_attendance_date?: string // Date of existing attendance
}

export default function CompensatoryAttendancePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<StudentWithCompensatoryStatus[]>([])
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // QR modal states
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<StudentWithCompensatoryStatus | null>(null)

  // Filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // Get day of week from date for display
  const getDayOfWeekDisplay = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Chu nhat', 'Thu hai', 'Thu ba', 'Thu tu', 'Thu nam', 'Thu sau', 'Thu bay']
    return days[date.getDay()]
  }

  // Check if the selected date is valid for compensatory attendance (Mon-Wed, Fri-Sat)
  const isValidCompensatoryDay = (dateString: string): boolean => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    // 1=Monday, 2=Tuesday, 3=Wednesday, 5=Friday, 6=Saturday
    return [1, 2, 3, 5, 6].includes(dayIndex)
  }

  // Get the Thursday of the week for a given date
  const getThursdayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    // Thursday = 4
    // Calculate days to Thursday
    let daysToThursday = 4 - dayIndex
    // If it's Sunday (0), we need to go back to the Thursday of the previous week
    if (dayIndex === 0) {
      daysToThursday = -3 // Go back 3 days from Sunday to Thursday
    }
    const thursday = new Date(date)
    thursday.setDate(date.getDate() + daysToThursday)
    return thursday.toISOString().split('T')[0]
  }

  // Get the start of the week (Monday) for a given date
  const getWeekStart = (dateString: string): string => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    // Monday = 1, Sunday = 0
    const daysToMonday = dayIndex === 0 ? -6 : 1 - dayIndex
    const monday = new Date(date)
    monday.setDate(date.getDate() + daysToMonday)
    return monday.toISOString().split('T')[0]
  }

  // Get the end of the week (Sunday) for a given date
  const getWeekEnd = (dateString: string): string => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    // Sunday = 0
    const daysToSunday = dayIndex === 0 ? 0 : 7 - dayIndex
    const sunday = new Date(date)
    sunday.setDate(date.getDate() + daysToSunday)
    return sunday.toISOString().split('T')[0]
  }

  const dayOfWeek = getDayOfWeekDisplay(selectedDate)
  const isValidDay = isValidCompensatoryDay(selectedDate)
  const thursdayOfWeek = getThursdayOfWeek(selectedDate)
  const weekStart = getWeekStart(selectedDate)
  const weekEnd = getWeekEnd(selectedDate)

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

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

  // Fetch students and check their compensatory status for the week
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId || !isValidDay) {
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
        showNotification('error', 'Khong the tai danh sach thieu nhi')
        return
      }

      // Get class name
      const selectedClass = classes.find(c => c.id === selectedClassId)

      // Fetch attendance records for this week (to check existing Thursday and compensatory attendance)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .in('student_id', (studentsData || []).map(s => s.id))
        .gte('attendance_date', weekStart)
        .lte('attendance_date', weekEnd)

      if (attendanceError) {
        console.warn('Could not fetch attendance records:', attendanceError.message)
      }

      // Also check for compensatory attendance that compensates for this week's Thursday
      const { data: compensatoryData } = await supabase
        .from('attendance_records')
        .select('*')
        .in('student_id', (studentsData || []).map(s => s.id))
        .eq('is_compensatory', true)
        .eq('compensated_for_date', thursdayOfWeek)

      // Map attendance records to students
      const studentsWithStatus: StudentWithCompensatoryStatus[] = (studentsData || []).map(student => {
        // Check if student has Thursday attendance this week
        const thursdayAttendance = attendanceData?.find(
          record => record.student_id === student.id &&
                    record.attendance_date === thursdayOfWeek &&
                    record.day_type === 'thu5' &&
                    record.status === 'present' &&
                    !record.is_compensatory
        )

        // Check if student has compensatory attendance for this week's Thursday
        const compensatoryAttendance = compensatoryData?.find(
          record => record.student_id === student.id &&
                    record.status === 'present'
        ) || attendanceData?.find(
          record => record.student_id === student.id &&
                    record.is_compensatory === true &&
                    record.compensated_for_date === thursdayOfWeek &&
                    record.status === 'present'
        )

        return {
          ...student,
          class_name: selectedClass?.name,
          has_thursday_attendance: !!thursdayAttendance,
          has_compensatory_attendance: !!compensatoryAttendance,
          existing_attendance_date: thursdayAttendance?.attendance_date || compensatoryAttendance?.attendance_date
        }
      })

      setStudents(studentsWithStatus)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Da co loi xay ra')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, isValidDay, classes, thursdayOfWeek, weekStart, weekEnd])

  useEffect(() => {
    fetchClasses()
    fetchSchoolYear()
  }, [fetchClasses, fetchSchoolYear])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

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
    return cls?.name || 'Chon lop'
  }

  // Filter students by search query
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      student.full_name.toLowerCase().includes(searchLower) ||
      student.saint_name?.toLowerCase().includes(searchLower) ||
      student.student_code?.toLowerCase().includes(searchLower)
    )
  })

  // Stats
  const totalStudents = filteredStudents.length
  const alreadyAttendedCount = filteredStudents.filter(s => s.has_thursday_attendance || s.has_compensatory_attendance).length
  const canCompensateCount = filteredStudents.filter(s => !s.has_thursday_attendance && !s.has_compensatory_attendance).length

  // Handle compensatory attendance marking
  const markCompensatoryAttendance = async (studentId: string) => {
    if (!isValidDay) {
      showNotification('error', 'Chi bo sung diem danh vao Thu 2, 3, 4, 6, 7')
      return
    }

    const student = students.find(s => s.id === studentId)
    if (!student) return

    if (student.has_thursday_attendance) {
      showNotification('error', 'Thieu nhi nay da diem danh vao Thu 5 tuan nay')
      return
    }

    if (student.has_compensatory_attendance) {
      showNotification('error', 'Thieu nhi nay da bo sung diem danh cho Thu 5 tuan nay roi')
      return
    }

    setSaving(studentId)
    try {
      const now = new Date()
      const checkInTime = now.toTimeString().substring(0, 8)

      // Insert compensatory attendance record
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          student_id: studentId,
          class_id: selectedClassId,
          school_year_id: schoolYear?.id,
          attendance_date: selectedDate,
          day_type: 'thu5', // Counts as Thursday attendance
          status: 'present',
          check_in_time: checkInTime,
          check_in_method: 'manual',
          is_compensatory: true,
          compensated_for_date: thursdayOfWeek,
          notes: `Bo sung diem danh cho Thu 5 ngay ${thursdayOfWeek}`,
          created_by: user?.id,
        })

      if (error) {
        console.error('Error saving compensatory attendance:', error)
        if (error.code === '23505') {
          showNotification('error', 'Da co ban ghi diem danh cho ngay nay')
        } else {
          showNotification('error', 'Khong the luu diem danh: ' + error.message)
        }
        return
      }

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              has_compensatory_attendance: true,
              existing_attendance_date: selectedDate
            }
          : s
      ))

      showNotification('success', `Da bo sung diem danh cho ${student.full_name}`)
    } catch (error) {
      console.error('Error:', error)
      showNotification('error', 'Da co loi xay ra')
    } finally {
      setSaving(null)
    }
  }

  // Open QR modal for a student
  const openQRModal = (student: StudentWithCompensatoryStatus) => {
    setSelectedStudentForQR(student)
    setIsQRModalOpen(true)
  }

  // Handle manual attendance from QR modal
  const handleManualAttendanceFromModal = () => {
    if (selectedStudentForQR) {
      markCompensatoryAttendance(selectedStudentForQR.id)
    }
    setIsQRModalOpen(false)
    setSelectedStudentForQR(null)
  }

  // Close QR modal
  const closeQRModal = () => {
    setIsQRModalOpen(false)
    setSelectedStudentForQR(null)
  }

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/activities"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bo sung diem danh Thu 5</h1>
          <p className="text-sm text-gray-500">
            Diem danh bu cho thieu nhi khong the di vao Thu 5
          </p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Quy dinh bo sung diem danh:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Thieu nhi co the diem danh bu vao Thu 2, 3, 4, 6, 7</li>
              <li>Moi tuan chi duoc bo sung <strong>1 lan</strong> cho Thu 5 cua tuan do</li>
              <li>Neu da diem danh Thu 5 hoac da bo sung roi thi khong the bo sung them</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Class selector */}
          <div className="relative">
            <button
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 min-w-[180px]"
            >
              <span className="text-sm text-gray-700">{selectedClassId ? getClassName(selectedClassId) : 'Chon lop'}</span>
              <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isClassDropdownOpen && (
              <div className="absolute z-50 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {Object.entries(classesGroupedByBranch).map(([branch, branchClasses]) => (
                  <div key={branch}>
                    <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      {branch}
                    </div>
                    {branchClasses.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.id)
                          setIsClassDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          selectedClassId === cls.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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

          {/* Date selector */}
          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 min-w-[200px] ${
                !isValidDay ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <Calendar className={`w-4 h-4 ${!isValidDay ? 'text-red-500' : 'text-gray-400'}`} />
              <span className={`text-sm ${!isValidDay ? 'text-red-700' : 'text-gray-700'}`}>
                {dayOfWeek}, {new Date(selectedDate).toLocaleDateString('vi-VN')}
              </span>
            </button>

            {isDatePickerOpen && (
              <div className="absolute z-50 mt-2">
                <CustomCalendar
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date)
                    setIsDatePickerOpen(false)
                  }}
                  onClose={() => setIsDatePickerOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tim kiem thieu nhi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Invalid day warning */}
        {!isValidDay && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <X className="w-4 h-4" />
              Ngay {dayOfWeek} khong hop le. Chi co the bo sung diem danh vao Thu 2, 3, 4, 6, 7.
            </p>
          </div>
        )}

        {/* Week info */}
        {isValidDay && selectedClassId && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Tuan:</span> {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Bo sung cho:</span> {formatDate(thursdayOfWeek)}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedClassId && isValidDay && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-sm text-gray-500">Tong so thieu nhi</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-2xl font-bold text-green-600">{alreadyAttendedCount}</p>
            <p className="text-sm text-gray-500">Da diem danh/bu</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-2xl font-bold text-blue-600">{canCompensateCount}</p>
            <p className="text-sm text-gray-500">Chua diem danh</p>
          </div>
        </div>
      )}

      {/* Students list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500 text-sm">Dang tai...</p>
            </div>
          </div>
        ) : !selectedClassId ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Vui long chon lop de xem danh sach thieu nhi</p>
          </div>
        ) : !isValidDay ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Vui long chon ngay hop le (Thu 2, 3, 4, 6, 7)</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Khong co thieu nhi nao</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStudents.map((student) => (
              <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-sm font-medium">
                        {student.full_name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <p className="font-medium text-gray-900">
                      {student.saint_name && <span className="text-gray-500">{student.saint_name} </span>}
                      {student.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {student.student_code && <span className="mr-2">MS: {student.student_code}</span>}
                      {student.class_name}
                    </p>
                  </div>
                </div>

                {/* Status and action */}
                <div className="flex items-center gap-3">
                  {student.has_thursday_attendance ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Da di Thu 5</span>
                    </div>
                  ) : student.has_compensatory_attendance ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Da bo sung</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* QR Scan Icon */}
                      <button
                        onClick={() => openQRModal(student)}
                        disabled={saving === student.id}
                        className="flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50"
                        title="Quét QR điểm danh"
                      >
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15.2915 19.0834V17.1667H18.1665V14.2917H20.0832V17.6459C20.0832 18.0292 19.8915 18.3167 19.604 18.6042C19.3165 18.8917 18.9332 19.0834 18.6457 19.0834H15.2915ZM5.70825 19.0834H2.354C1.97067 19.0834 1.68317 18.8917 1.39567 18.6042C1.10817 18.3167 0.916504 17.9334 0.916504 17.6459V14.2917H2.83317V17.1667H5.70825V19.0834ZM15.2915 0.916748H18.6457C19.029 0.916748 19.3165 1.10841 19.604 1.39591C19.8915 1.68341 20.0832 1.97091 20.0832 2.35425V5.70841H18.1665V2.83341H15.2915V0.916748ZM5.70825 0.916748V2.83341H2.83317V5.70841H0.916504V2.35425C0.916504 1.97091 1.10817 1.68341 1.39567 1.39591C1.68317 1.10841 1.97067 0.916748 2.354 0.916748H5.70825ZM17.2082 9.54175H3.79159V11.4584H17.2082V9.54175Z" fill="#FA865E"/>
                        </svg>
                      </button>
                      {/* Manual attendance button */}
                      <button
                        onClick={() => markCompensatoryAttendance(student.id)}
                        disabled={saving === student.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving === student.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm">Dang luu...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Bo sung</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
    </div>
  )
}
