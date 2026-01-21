'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { supabase, ThieuNhiProfile, SchoolYear } from '@/lib/supabase'

interface StudentWithClass extends ThieuNhiProfile {
  class_name?: string
}

export default function StudentAttendancePage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentWithClass | null>(null)
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch student and school year data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch student
      const { data: studentData, error: studentError } = await supabase
        .from('thieu_nhi')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError) {
        console.error('Error fetching student:', studentError)
        return
      }

      // Fetch class info if student has class_id
      let className = ''
      if (studentData?.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', studentData.class_id)
          .single()
        className = classData?.name || ''
      }

      setStudent({
        ...studentData,
        class_name: className
      })

      // Fetch current school year
      const { data: schoolYearData } = await supabase
        .from('school_years')
        .select('*')
        .eq('is_current', true)
        .single()

      setSchoolYear(schoolYearData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl p-8">
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl p-8">
        <div className="text-center py-16 text-primary-3">
          Không tìm thấy thiếu nhi
        </div>
      </div>
    )
  }

  const totalWeeks = schoolYear?.total_weeks || 37
  const attendanceThu5 = student.attendance_thu5 || 0
  const attendanceCn = student.attendance_cn || 0

  // Generate week grid data
  const generateWeekGrid = (attendedCount: number, total: number) => {
    const weeks = []
    for (let i = 1; i <= total; i++) {
      weeks.push({
        week: i,
        attended: i <= attendedCount
      })
    }
    return weeks
  }

  const thu5Weeks = generateWeekGrid(attendanceThu5, totalWeeks)
  const cnWeeks = generateWeekGrid(attendanceCn, totalWeeks)

  // Rows of 10 weeks each
  const getWeeksRows = (weeks: { week: number; attended: boolean }[]) => {
    const rows = []
    for (let i = 0; i < weeks.length; i += 10) {
      rows.push(weeks.slice(i, i + 10))
    }
    return rows
  }

  const thu5Rows = getWeeksRows(thu5Weeks)
  const cnRows = getWeeksRows(cnWeeks)

  // Week cell component
  const WeekCell = ({ week, attended }: { week: number; attended: boolean }) => (
    <div
      className={`flex flex-col items-center justify-center h-[68px] rounded-[10px] ${
        attended
          ? 'bg-[rgba(250,134,94,0.2)] border-[0.5px] border-[#fa865e]'
          : 'bg-[#f6f6f6]'
      }`}
    >
      <span className={`text-xs ${attended ? 'text-black' : 'text-[#666d80]'}`}>Tuần {week}</span>
      {attended ? (
        <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#fa865e] flex items-center justify-center mt-1">
          <Check className="w-2.5 h-2.5 text-[#fa865e]" strokeWidth={3} />
        </div>
      ) : (
        <span className="text-xs text-[#666d80] mt-1">--</span>
      )}
    </div>
  )

  // Calendar icon component
  const CalendarIcon = () => (
    <svg className="w-[23px] h-[23px] text-black" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
    </svg>
  )

  // Clock icon component
  const ClockIcon = () => (
    <svg className="w-[17px] h-[17px] text-[#666d80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  )

  return (
    <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl">
      {/* Header */}
      <div className="px-6 py-5">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/management/students')}
          className="flex items-center gap-2 text-sm text-[#8B8685] hover:text-black transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay trở lại</span>
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold text-black">
          Điểm danh thiếu nhi
        </h1>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Student Info */}
        <div className="bg-white rounded-[25px] p-6 mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-[81px] h-[81px] rounded-full bg-[#f5eaf6] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-[0px_0px_26px_0px_rgba(110,98,229,0.04)]">
              {student.avatar_url ? (
                <img
                  src={student.avatar_url}
                  alt={student.full_name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-2xl font-medium text-[#8B8685]">
                  {student.full_name.charAt(0)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-0.5">
              <p className="text-base leading-relaxed">
                <span className="text-black font-medium">Thiếu nhi:</span>
                <span className="text-[#fa865e]">&nbsp;</span>
                <span className="text-[#fa865e] font-bold">
                  {student.saint_name && `${student.saint_name} `}{student.full_name}
                </span>
                {student.student_code && (
                  <span className="text-[#fa865e]"> ({student.student_code})</span>
                )}
              </p>
              <p className="text-xs text-black/40">
                Lớp: {student.class_name || 'Chưa phân lớp'} | Năm học: {schoolYear?.name || '2025-2026'}
              </p>
            </div>
          </div>
        </div>

        {/* Tiến độ điểm danh - Container chung */}
        <div className="bg-white rounded-[25px] p-6 mb-6">
          {/* Thứ năm */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-black">Tiến độ điểm danh</h3>
                <p className="text-sm font-medium text-[#666d80]">Hiển thị theo tuần của năm học {schoolYear?.name || '2025-2026'}</p>
              </div>

              {/* Tab and Counter */}
              <div className="flex items-center gap-4">
                <button className="h-[52px] w-[143px] rounded-[50px] text-lg bg-brand text-white border border-white/60 flex items-center justify-center">
                  Thứ năm
                </button>
                <div className="h-[52px] w-[144px] rounded-[50px] text-lg bg-[#e5e1dc] text-black border border-white/60 flex items-center justify-center">
                  {attendanceThu5}/{totalWeeks} buổi
                </div>
              </div>
            </div>

            {/* Weeks Grid */}
            <div className="grid grid-cols-10 gap-2">
              {thu5Weeks.map((week) => (
                <WeekCell key={week.week} week={week.week} attended={week.attended} />
              ))}
            </div>
          </div>

          {/* Chủ nhật */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-black">Tiến độ điểm danh</h3>
                <p className="text-sm font-medium text-[#666d80]">Hiển thị theo tuần của năm học {schoolYear?.name || '2025-2026'}</p>
              </div>

              {/* Tab and Counter */}
              <div className="flex items-center gap-4">
                <button className="h-[52px] w-[143px] rounded-[50px] text-lg bg-brand text-white border border-white/60 flex items-center justify-center">
                  Chủ nhật
                </button>
                <div className="h-[52px] w-[144px] rounded-[50px] text-lg bg-[#e5e1dc] text-black border border-white/60 flex items-center justify-center">
                  {attendanceCn}/{totalWeeks} buổi
                </div>
              </div>
            </div>

            {/* Weeks Grid */}
            <div className="grid grid-cols-10 gap-2">
              {cnWeeks.map((week) => (
                <WeekCell key={week.week} week={week.week} attended={week.attended} />
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Records - Thứ 5 */}
        <div className="bg-[rgba(250,134,94,0.2)] rounded-[25px] p-6 mb-4">
          {/* Section Header */}
          <div className="flex items-center mb-4">
            <span className="bg-brand text-white px-4 py-1 rounded-[7px] flex items-center gap-1">
              <span className="text-lg font-bold">Thứ 5</span>
              <span className="text-xs font-normal">({attendanceThu5})</span>
            </span>
          </div>

          {/* Records Grid */}
          {attendanceThu5 > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: Math.min(attendanceThu5, 6) }).map((_, index) => (
                <div key={index} className="bg-white rounded-[14px] p-4 h-[104px]">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarIcon />
                    <span className="text-sm font-medium text-black">27/11/2025</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon />
                    <span className="text-sm font-light text-[#666d80]">Điểm danh lúc: 18:36</span>
                  </div>
                  <p className="text-xs text-[#666d80]">
                    &quot;QR Scan - {student.saint_name && `${student.saint_name} `}{student.full_name}&quot;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[#666d80] text-sm">
              Chưa có dữ liệu điểm danh Thứ 5
            </div>
          )}
        </div>

        {/* Detailed Records - Chủ nhật */}
        <div className="bg-[rgba(250,134,94,0.2)] rounded-[25px] p-6">
          {/* Section Header */}
          <div className="flex items-center mb-4">
            <span className="bg-brand text-white px-4 py-1 rounded-[7px] flex items-center gap-1">
              <span className="text-lg font-bold">Chủ nhật</span>
              <span className="text-xs font-normal">({attendanceCn})</span>
            </span>
          </div>

          {/* Records Grid */}
          {attendanceCn > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: Math.min(attendanceCn, 6) }).map((_, index) => (
                <div key={index} className="bg-white rounded-[14px] p-4 h-[104px]">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarIcon />
                    <span className="text-sm font-medium text-black">27/11/2025</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon />
                    <span className="text-sm font-light text-[#666d80]">Điểm danh lúc: 18:36</span>
                  </div>
                  <p className="text-xs text-[#666d80]">
                    &quot;QR Scan - {student.saint_name && `${student.saint_name} `}{student.full_name}&quot;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[#666d80] text-sm">
              Chưa có dữ liệu điểm danh Chủ nhật
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
