'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, ThieuNhiProfile, Class, BRANCHES } from '@/lib/supabase'
import { Search, ChevronDown, Plus } from 'lucide-react'

interface StudentWithDetails extends ThieuNhiProfile {
  class_name?: string
  class_branch?: string
  age?: number
  student_code?: string
  parent_phone_2?: string
  // Score fields
  score_45_hk1?: number
  score_exam_hk1?: number
  score_45_hk2?: number
  score_exam_hk2?: number
  avg_catechism?: number
  attendance_thu5?: number
  attendance_cn?: number
  avg_attendance?: number
  total_avg?: number
}

type FilterClass = 'all' | string
type FilterStatus = 'all' | 'ACTIVE' | 'INACTIVE'

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClass, setFilterClass] = useState<FilterClass>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch classes first
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('display_order', { ascending: true })

      setClasses(classesData || [])

      // Fetch students (thieu_nhi table)
      const { data: studentsData, error: studentsError } = await supabase
        .from('thieu_nhi')
        .select('*')
        .order('full_name', { ascending: true })

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        return
      }

      // Map students with class details
      const studentsWithDetails: StudentWithDetails[] = (studentsData || []).map((student, index) => {
        const studentClass = (classesData || []).find((c) => c.id === student.class_id)
        const birthDate = student.date_of_birth ? new Date(student.date_of_birth) : null
        const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined

        // Generate student code like HA172336
        const code = `HA${String(172336 + index).padStart(6, '0')}`

        return {
          ...student,
          class_name: studentClass?.name || undefined,
          class_branch: studentClass?.branch || undefined,
          age,
          student_code: code,
          // Placeholder scores - will be replaced with actual data from scores table
          score_45_hk1: 0,
          score_exam_hk1: 0,
          score_45_hk2: 0,
          score_exam_hk2: 0,
          avg_catechism: 0,
          attendance_thu5: 0,
          attendance_cn: 0,
          avg_attendance: 0,
          total_avg: 0,
        }
      })

      setStudents(studentsWithDetails)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter students
  const filteredStudents = students.filter((student) => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      searchQuery === '' ||
      student.full_name.toLowerCase().includes(searchLower) ||
      (student.saint_name && student.saint_name.toLowerCase().includes(searchLower)) ||
      (student.student_code && student.student_code.toLowerCase().includes(searchLower))

    const matchesClass = filterClass === 'all' || student.class_id === filterClass
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus

    return matchesSearch && matchesClass && matchesStatus
  })

  // Get class name by id
  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId)
    return cls?.name || 'Chưa phân lớp'
  }

  // Group classes by branch for dropdown
  const classesGroupedByBranch = BRANCHES.reduce((acc, branch) => {
    const branchClasses = classes.filter((c) => c.branch === branch)
    if (branchClasses.length > 0) {
      acc[branch] = branchClasses
    }
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl">
      {/* Header with Search and Filters */}
      <div className="px-6 py-4 border-b border-[#E5E1DC]">
        <div className="flex items-center justify-between">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary-3" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã thiếu nhi,..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[280px] h-[38px] bg-transparent text-sm text-black placeholder:text-primary-3 border-none focus:outline-none"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-2">
            {/* Class Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsClassDropdownOpen(!isClassDropdownOpen)
                  setIsStatusDropdownOpen(false)
                }}
                className="flex items-center justify-between gap-2 h-9 px-4 bg-white rounded-full text-sm text-black hover:bg-gray-50 transition-colors"
              >
                <span>{filterClass === 'all' ? 'Tất cả lớp' : getClassName(filterClass)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isClassDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-[200px] bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden max-h-[300px] overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilterClass('all')
                      setIsClassDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterClass === 'all' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                  >
                    Tất cả lớp
                  </button>
                  {Object.entries(classesGroupedByBranch).map(([branch, branchClasses]) => (
                    <div key={branch}>
                      <div className="px-4 py-2 text-xs font-semibold text-primary-3 uppercase bg-gray-50">
                        {branch}
                      </div>
                      {branchClasses.map((cls) => (
                        <button
                          key={cls.id}
                          onClick={() => {
                            setFilterClass(cls.id)
                            setIsClassDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterClass === cls.id ? 'bg-brand/10 text-brand' : 'text-black'}`}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen)
                  setIsClassDropdownOpen(false)
                }}
                className="flex items-center justify-between gap-2 h-9 px-4 bg-white rounded-full text-sm text-black hover:bg-gray-50 transition-colors"
              >
                <span>
                  {filterStatus === 'all' ? 'Tất cả trạng thái' : filterStatus === 'ACTIVE' ? 'Đang học' : 'Nghỉ học'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      setFilterStatus('all')
                      setIsStatusDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterStatus === 'all' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                  >
                    Tất cả trạng thái
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('ACTIVE')
                      setIsStatusDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterStatus === 'ACTIVE' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                  >
                    Đang học
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('INACTIVE')
                      setIsStatusDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterStatus === 'INACTIVE' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                  >
                    Nghỉ học
                  </button>
                </div>
              )}
            </div>

            {/* Import Button - Solid orange background */}
            <button className="flex items-center gap-2 h-[38px] px-5 bg-brand rounded-full text-sm font-medium text-white hover:bg-orange-500 transition-colors">
              {/* Custom Upload Icon */}
              <svg width="18" height="18" viewBox="0 0 27 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M26.276 0V24.816H0V5.84H2.92V21.896H23.356V2.92H17.516V0H26.276ZM9.299 0C13.224 0 16.425 3.098 16.591 6.982L16.598 7.299V12.532L19.945 9.186L22.01 11.25L15.138 18.122L8.267 11.25L10.331 9.186L13.678 12.532V7.299C13.678 4.967 11.855 3.06 9.556 2.927L9.299 2.92H0.54V0H9.299Z" fill="currentColor"/>
              </svg>
              Import
            </button>

            {/* Add Button - White with orange border */}
            <button className="flex items-center gap-2 h-[37px] px-5 bg-white border border-brand rounded-full text-sm font-medium text-brand hover:bg-brand/5 transition-colors">
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#E5E1DC]">
              <th className="px-4 py-3 text-left bg-white">
                <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">
                  TÊN THÁNH / HỌ
                </span>
              </th>
              <th className="px-3 py-3 text-left bg-white">
                <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">TÊN</span>
              </th>
              <th className="px-3 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">LỚP/</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">TUỔI</span>
                </div>
              </th>
              <th className="px-3 py-3 text-left bg-white">
                <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">LIÊN HỆ</span>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">45&apos;</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">HK1</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">THI</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">HK1</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">45&apos;</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">HK2</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">THI</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">HK2</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-brand uppercase tracking-wide">TB</span>
                  <span className="text-[11px] font-semibold text-brand uppercase tracking-wide">GIÁO LÝ</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">ĐIỂM</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">DANH T5</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">ĐIỂM</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">DANH CN</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">TB ĐIỂM</span>
                  <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">DANH</span>
                </div>
              </th>
              <th className="px-2 py-3 text-center bg-white border-l border-[#E5E1DC]">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-brand uppercase tracking-wide">TỔNG</span>
                  <span className="text-[11px] font-semibold text-brand uppercase tracking-wide">TB</span>
                </div>
              </th>
              <th className="px-3 py-3 text-left bg-white border-l border-[#E5E1DC]">
                <span className="text-[11px] font-semibold text-[#8B8685] uppercase tracking-wide">THAO TÁC</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="py-16 text-center bg-white">
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-8 w-8 text-brand"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-16 text-center bg-white">
                  <div className="flex flex-col items-center text-[#8B8685]">
                    {/* Empty state icon */}
                    <svg className="w-12 h-12 mb-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="24" cy="16" r="8" stroke="#D4D4D4" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="18" r="5" stroke="#D4D4D4" strokeWidth="2" fill="none"/>
                      <circle cx="36" cy="18" r="5" stroke="#D4D4D4" strokeWidth="2" fill="none"/>
                      <path d="M4 40c0-6 5-10 12-10h16c7 0 12 4 12 10" stroke="#D4D4D4" strokeWidth="2" fill="none"/>
                    </svg>
                    <p className="text-sm italic">Không tìm thấy thiếu nhi nào</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-[#E5E1DC] hover:bg-white/80 transition-colors">
                  {/* Student Info - Avatar + Name + Code */}
                  <td className="px-4 py-3 bg-white">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#E8E8E8] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt={student.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-[#8B8685]">
                            {student.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      {/* Name and Code */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-black leading-tight">
                          {student.saint_name && `${student.saint_name} `}
                          {student.full_name.split(' ').slice(0, -1).join(' ')}
                        </span>
                        <span className="text-xs text-[#8B8685]">{student.student_code}</span>
                      </div>
                    </div>
                  </td>

                  {/* First Name */}
                  <td className="px-3 py-3 bg-white">
                    <span className="text-[13px] text-black">
                      {student.full_name.split(' ').slice(-1)[0]}
                    </span>
                  </td>

                  {/* Class and Age */}
                  <td className="px-3 py-3 bg-white">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[13px] font-medium text-black">{student.class_name || '-'}</span>
                      {student.age && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-brand/15 text-[11px] font-medium text-brand">
                          {student.age} tuổi
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Contact - Two phone numbers */}
                  <td className="px-3 py-3 bg-white">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-black">{student.parent_phone || '-'}</span>
                      <span className="text-[13px] text-[#8B8685]">{student.parent_phone_2 || student.parent_phone || '-'}</span>
                    </div>
                  </td>

                  {/* Scores - No border-l for data rows */}
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.score_45_hk1?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.score_exam_hk1?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.score_45_hk2?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.score_exam_hk2?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] font-semibold text-brand">{student.avg_catechism?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.attendance_thu5?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.attendance_cn?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] text-[#8B8685]">{student.avg_attendance?.toFixed(1) || '0.0'}</span>
                  </td>
                  <td className="px-2 py-3 text-center bg-white">
                    <span className="text-[13px] font-semibold text-brand">{student.total_avg?.toFixed(1) || '0.0'}</span>
                  </td>

                  {/* Actions - 5 icons matching Figma */}
                  <td className="px-3 py-3 bg-white">
                    <div className="flex items-center gap-1">
                      {/* View Profile Icon */}
                      <button
                        className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Xem hồ sơ"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 10C12.0711 10 13.75 8.32107 13.75 6.25C13.75 4.17893 12.0711 2.5 10 2.5C7.92893 2.5 6.25 4.17893 6.25 6.25C6.25 8.32107 7.92893 10 10 10Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3.75 17.5V15.625C3.75 14.7962 4.07924 14.0013 4.66529 13.4153C5.25134 12.8292 6.0462 12.5 6.875 12.5H13.125C13.9538 12.5 14.7487 12.8292 15.3347 13.4153C15.9208 14.0013 16.25 14.7962 16.25 15.625V17.5" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Calendar Icon */}
                      <button
                        className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Lịch học"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15.8333 3.33334H4.16667C3.24619 3.33334 2.5 4.07954 2.5 5.00001V16.6667C2.5 17.5872 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5872 17.5 16.6667V5.00001C17.5 4.07954 16.7538 3.33334 15.8333 3.33334Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13.3333 1.66666V5.00001" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6.66667 1.66666V5.00001" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2.5 8.33334H17.5" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Attendance/Clipboard Icon */}
                      <button
                        className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Điểm danh"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.5 2.5H14.1667C14.6087 2.5 15.0326 2.67559 15.3452 2.98816C15.6577 3.30072 15.8333 3.72464 15.8333 4.16667V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V4.16667C4.16667 3.72464 4.34226 3.30072 4.65482 2.98816C4.96738 2.67559 5.39131 2.5 5.83333 2.5H7.5" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M11.6667 1.66666H8.33333C7.8731 1.66666 7.5 2.03976 7.5 2.5V3.33333C7.5 3.79357 7.8731 4.16666 8.33333 4.16666H11.6667C12.1269 4.16666 12.5 3.79357 12.5 3.33333V2.5C12.5 2.03976 12.1269 1.66666 11.6667 1.66666Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Edit Icon */}
                      <button
                        className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.1667 2.5C14.3856 2.28113 14.6454 2.10752 14.9314 1.98906C15.2173 1.87061 15.5238 1.80965 15.8333 1.80965C16.1429 1.80965 16.4493 1.87061 16.7353 1.98906C17.0213 2.10752 17.2811 2.28113 17.5 2.5C17.7189 2.71887 17.8925 2.97871 18.0109 3.26468C18.1294 3.55064 18.1904 3.85714 18.1904 4.16667C18.1904 4.4762 18.1294 4.78269 18.0109 5.06866C17.8925 5.35462 17.7189 5.61446 17.5 5.83333L6.25 17.0833L1.66667 18.3333L2.91667 13.75L14.1667 2.5Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Delete Icon - Red/Pink */}
                      <button
                        className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center hover:bg-red-200 transition-colors"
                        title="Xóa"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 5H4.16667H17.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
