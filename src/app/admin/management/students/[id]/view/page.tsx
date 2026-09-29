'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, User } from 'lucide-react'
import { supabase, Class, Holiday } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/queries'
import { attendanceScores, effectiveSessionDays, fmtScore, scoreSummary } from '@/lib/score-summary'
import { useAuth } from '@/lib/auth-context'
import { isManagerRole, inScope } from '@/lib/branch-scope'

interface StudentData {
  id: string
  student_code: string | null
  class_id: string | null
  saint_name: string | null
  full_name: string
  date_of_birth: string | null
  gender: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_phone_2: string | null
  address: string | null
  notes: string | null
  baptism_date: string | null
  confirmation_date: string | null
  score_45_hk1: number | null
  score_exam_hk1: number | null
  score_45_hk2: number | null
  score_exam_hk2: number | null
  attendance_thu5: number | null
  attendance_cn: number | null
  avatar_url: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

const STATUS_BADGE_STYLES = {
  ACTIVE: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Đang học' },
  INACTIVE: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Nghỉ học' },
}

export default function ViewStudentPage() {
  const params = useParams()
  const studentId = params.id as string
  const router = useRouter()
  const { user, scope } = useAuth()
  // GLV quay về danh sách lớp của mình, admin về trang quản lý chung
  const studentsListHref = isManagerRole(user?.role) ? '/admin/management/students' : '/dashboard/management'
  const [student, setStudent] = useState<StudentData | null>(null)

  // GLV chỉ xem chi tiết thiếu nhi thuộc lớp mình phụ trách
  useEffect(() => {
    if (student && user?.role === 'giao_ly_vien' && student.class_id !== user.class_id) {
      alert('Bạn chỉ được xem thiếu nhi thuộc lớp mình phụ trách')
      router.replace('/dashboard/management')
    }
  }, [student, user, router])
  const [classes, setClasses] = useState<Class[]>([])
  // Phân đoàn trưởng chỉ xem thiếu nhi thuộc ngành mình
  useEffect(() => {
    if (!student || scope.all || classes.length === 0) return
    const cls = classes.find((c) => c.id === student.class_id)
    if (!inScope(scope, cls?.branch)) {
      alert('Thiếu nhi này không thuộc phân đoàn của bạn')
      router.replace('/admin/management/students')
    }
  }, [student, classes, scope, router])
  const [isLoading, setIsLoading] = useState(true)
  const [effectiveDays, setEffectiveDays] = useState({ thu5: 40, cn: 40 })
  const [attendanceCounts, setAttendanceCounts] = useState({ thu5: 0, cn: 0, cnLe: 0 })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch current school year
        const { data: schoolYearData } = await supabase
          .from('school_years')
          .select('id, start_date, end_date')
          .eq('is_current', true)
          .single()

        let holidays: Pick<Holiday, 'day_type'>[] = []
        if (schoolYearData) {
          // Fetch holidays
          const { data: holidaysData } = await supabase
            .from('holidays')
            .select('day_type')
            .eq('school_year_id', schoolYearData.id)
          holidays = (holidaysData || []) as Pick<Holiday, 'day_type'>[]
        }
        setEffectiveDays(effectiveSessionDays(schoolYearData, holidays))

        // Fetch classes
        const { data: classesData } = await supabase
          .from('classes')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('display_order', { ascending: true })
        setClasses(classesData || [])

        // Fetch student data
        const { data: studentData, error } = await supabase
          .from('thieu_nhi')
          .select('*')
          .eq('id', studentId)
          .single()

        if (error || !studentData) {
          console.error('Error fetching student:', error)
          alert('Không tìm thấy thiếu nhi')
          router.push(studentsListHref)
          return
        }

        setStudent(studentData)

        let attendanceRecords: { day_type: string }[] = []
        try {
          attendanceRecords = await fetchAllRows<{ day_type: string }>((from, to) => {
            let query = supabase
              .from('attendance_records')
              .select('day_type')
              .eq('student_id', studentId)
              .eq('status', 'present')
              .order('attendance_date', { ascending: true })
              .range(from, to)
            if (schoolYearData) {
              query = query
                .gte('attendance_date', schoolYearData.start_date)
                .lte('attendance_date', schoolYearData.end_date)
            }
            return query
          })
        } catch (attendanceError) {
          console.error('Error fetching attendance:', attendanceError)
        }

        const counts = attendanceRecords.reduce(
          (result, record) => {
            if (record.day_type === 'thu5') result.thu5 += 1
            else if (record.day_type === 'cn') result.cn += 1
            else if (record.day_type === 'cn_le') result.cnLe += 1
            return result
          },
          { thu5: 0, cn: 0, cnLe: 0 },
        )
        setAttendanceCounts(counts)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [studentId, router])

  // Get class info
  const getClassInfo = (classId: string | null) => {
    if (!classId) return { name: 'Chưa phân lớp', branch: '' }
    const cls = classes.find((c) => c.id === classId)
    return cls ? { name: cls.name, branch: cls.branch } : { name: 'Chưa phân lớp', branch: '' }
  }

  // Calculate age
  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN')
  }

  // Calculate averages
  const calculateAverages = () => {
    const attendance = attendanceScores(attendanceCounts, effectiveDays)
    const summary = scoreSummary({
      score_45_hk1: student?.score_45_hk1,
      score_exam_hk1: student?.score_exam_hk1,
      score_45_hk2: student?.score_45_hk2,
      score_exam_hk2: student?.score_exam_hk2,
      t5: attendance.diem_t5,
      cn: attendance.diem_gl,
    })
    return { attendance, summary }
  }

  if (isLoading) {
    return (
      <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-brand"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-[#666d80]">Đang tải...</span>
        </div>
      </div>
    )
  }

  if (!student) {
    return null
  }

  const classInfo = getClassInfo(student.class_id)
  const age = calculateAge(student.date_of_birth)
  const { attendance: attendanceSummary, summary } = calculateAverages()

  return (
    <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            {/* Back Button */}
            <button
              onClick={() => router.push(studentsListHref)}
              className="flex items-center gap-1.5 text-[#666d80] hover:text-black dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">Quay trở lại</span>
            </button>
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black dark:text-white leading-tight">Thông tin thiếu nhi</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(studentsListHref)}
              className="h-10 px-6 bg-white dark:bg-white/10 rounded-full text-sm font-bold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-white/10 mx-6 mb-6 rounded-3xl p-6">
        {/* Personal Information Section */}
        <div className="flex flex-col lg:flex-row gap-6 pb-6 border-b border-[#E5E1DC] dark:border-white/10">
          {/* Left side - Section title */}
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black dark:text-white">Thông tin cá nhân</h2>
            <p className="text-xs text-[#666d80] mt-1">
              Thông tin chi tiết về thiếu nhi
            </p>
          </div>

          {/* Right side - Content */}
          <div className="flex-1 space-y-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] rounded-full bg-[#F5EAF6] overflow-hidden flex items-center justify-center">
                {student.avatar_url ? (
                  <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-[#C4B5C7]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xl font-semibold text-black dark:text-white">
                  {student.saint_name && `${student.saint_name} `}{student.full_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary-3">{student.student_code || '-'}</span>
                  {classInfo.name !== 'Chưa phân lớp' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-brand/10 text-brand">
                      {classInfo.name}
                    </span>
                  )}
                  {age && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F6F6F6] dark:bg-white/10 text-[#8B8685]">
                      {age} tuổi
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE_STYLES[student.status].bg} ${STATUS_BADGE_STYLES[student.status].text}`}>
                    {STATUS_BADGE_STYLES[student.status].label}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 1: Mã thiếu nhi + Lớp */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Mã thiếu nhi</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.student_code || '-'}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Lớp</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {classInfo.name !== 'Chưa phân lớp' ? `${classInfo.name} (${classInfo.branch})` : 'Chưa phân lớp'}
                </div>
              </div>
            </div>

            {/* Row 2: Tên thánh + Họ và tên */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Tên thánh</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.saint_name || '-'}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Họ và tên</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.full_name}
                </div>
              </div>
            </div>

            {/* Row 3: Ngày sinh + Giới tính */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Ngày sinh</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {formatDate(student.date_of_birth)}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Giới tính</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.gender === 'male' ? 'Nam' : student.gender === 'female' ? 'Nữ' : '-'}
                </div>
              </div>
            </div>

            {/* Row 4: Ngày rửa tội + Ngày thêm sức */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Ngày rửa tội</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {formatDate(student.baptism_date)}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Ngày thêm sức</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {formatDate(student.confirmation_date)}
                </div>
              </div>
            </div>

            {/* Row 5: SĐT thiếu nhi */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">SĐT thiếu nhi</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.phone || '-'}
                </div>
              </div>
              <div className="flex-1"></div>
            </div>

            {/* Row 6: Địa chỉ */}
            <div>
              <label className="block text-sm font-medium text-[#666d80] mb-1.5">Địa chỉ</label>
              <div className="min-h-[60px] px-4 py-3 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white">
                {student.address || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="flex flex-col lg:flex-row gap-6 py-6 border-b border-[#E5E1DC] dark:border-white/10">
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black dark:text-white">Thông tin liên hệ</h2>
            <p className="text-xs text-[#666d80] mt-1">Thông tin phụ huynh</p>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">Tên phụ huynh</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.parent_name || '-'}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">SĐT phụ huynh 1</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.parent_phone || '-'}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">SĐT phụ huynh 2</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white flex items-center">
                  {student.parent_phone_2 || '-'}
                </div>
              </div>
              <div className="flex-1"></div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="flex flex-col lg:flex-row gap-6 py-6 border-b border-[#E5E1DC] dark:border-white/10">
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black dark:text-white">Ghi chú</h2>
            <p className="text-xs text-[#666d80] mt-1">Ghi chú về thiếu nhi</p>
          </div>
          <div className="flex-1">
            <div className="min-h-[80px] px-4 py-3 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-xs text-black dark:text-white">
              {student.notes || '-'}
            </div>
          </div>
        </div>

        {/* Scores Section */}
        <div className="flex flex-col lg:flex-row gap-6 pt-6">
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black dark:text-white">Điểm số giáo lý</h2>
            <div className="text-xs text-[#666d80] mt-1">
              <p>Điểm học tập và điểm danh</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {/* Học kỳ 1 Card */}
            <div className="border border-[#E5E1DC] dark:border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC] dark:border-white/10">
                <h3 className="text-base font-semibold text-black dark:text-white">Học kỳ 1</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Điểm 45 phút</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {fmtScore(student.score_45_hk1)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Điểm học kỳ (x2)</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {fmtScore(student.score_exam_hk1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Học kỳ 2 Card */}
            <div className="border border-[#E5E1DC] dark:border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC] dark:border-white/10">
                <h3 className="text-base font-semibold text-black dark:text-white">Học kỳ 2</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Điểm 45 phút</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {fmtScore(student.score_45_hk2)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Điểm học kỳ (x2)</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {fmtScore(student.score_exam_hk2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Điểm danh Card */}
            <div className="border border-[#E5E1DC] dark:border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC] dark:border-white/10">
                <h3 className="text-base font-semibold text-black dark:text-white">Điểm danh</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Số buổi thứ 5</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {attendanceCounts.thu5}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Số buổi Chúa nhật</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {attendanceCounts.cn}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">Số buổi lễ CN</label>
                    <div className="h-[43px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white flex items-center justify-center font-medium">
                      {attendanceCounts.cnLe}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Điểm trung bình Card */}
            <div className="border border-[#E5E1DC] dark:border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC] dark:border-white/10">
                <h3 className="text-base font-semibold text-black dark:text-white">Điểm trung bình</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6e62e5] mb-1.5">TB HK1</label>
                    <div className="h-[43px] px-4 bg-[#F0EEFF] rounded-xl text-lg text-[#6e62e5] flex items-center justify-center font-bold">
                      {fmtScore(summary.tbHK1)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#6e62e5] mb-1.5">TB HK2</label>
                    <div className="h-[43px] px-4 bg-[#F0EEFF] rounded-xl text-lg text-[#6e62e5] flex items-center justify-center font-bold">
                      {fmtScore(summary.tbHK2)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#E178FF] mb-1.5">TB năm</label>
                    <div className="h-[43px] px-4 bg-[#FDF0FF] rounded-xl text-lg text-[#E178FF] flex items-center justify-center font-bold">
                      {fmtScore(summary.tbNam)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666d80] mb-1.5">Điểm T5</label>
                    <div className="h-[38px] px-3 bg-[#F6F6F6] rounded-xl text-sm text-[#8B8685] flex items-center justify-center font-bold">
                      {fmtScore(attendanceSummary.diem_t5)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666d80] mb-1.5">Điểm CN</label>
                    <div className="h-[38px] px-3 bg-[#F6F6F6] rounded-xl text-sm text-[#8B8685] flex items-center justify-center font-bold">
                      {fmtScore(attendanceSummary.diem_gl)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666d80] mb-1.5">Điểm lễ CN</label>
                    <div className="h-[38px] px-3 bg-[#F6F6F6] rounded-xl text-sm text-[#8B8685] flex items-center justify-center font-bold">
                      {fmtScore(attendanceSummary.diem_le_cn)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666d80] mb-1.5">TB điểm danh</label>
                    <div className="h-[38px] px-3 bg-[#F6F6F6] rounded-xl text-sm text-[#8B8685] flex items-center justify-center font-bold">
                      {fmtScore(attendanceSummary.diem_tb)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="h-[43px] px-4 bg-[#F0EEFF] rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-[#666d80]">Xếp loại</span>
                    <span className="text-sm font-bold text-[#6e62e5]">{summary.xepLoai}</span>
                  </div>
                  <div className="h-[43px] px-4 bg-[#FDF0FF] rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-[#666d80]">Kết quả</span>
                    <span className="text-sm font-bold text-[#E178FF]">{summary.ketQua}</span>
                  </div>
                </div>
                <p className="text-xs text-[#666d80] mt-3">
                  Điểm T5/CN được tính từ bản ghi điểm danh trong năm học hiện tại.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
