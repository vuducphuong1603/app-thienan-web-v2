'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ThieuNhiProfile, Class, BRANCHES } from '@/lib/supabase'
import { Search, ChevronDown, Plus } from 'lucide-react'
import ImportStudentsModal from '@/components/management/ImportStudentsModal'
import DeleteStudentModal from '@/components/management/DeleteStudentModal'

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

interface EditingScores {
  score_45_hk1: string
  score_exam_hk1: string
  score_45_hk2: string
  score_exam_hk2: string
}

type FilterClass = 'all' | string
type FilterStatus = 'all' | 'ACTIVE' | 'INACTIVE'

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClass, setFilterClass] = useState<FilterClass>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null)

  // Edit mode state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editingScores, setEditingScores] = useState<EditingScores>({
    score_45_hk1: '',
    score_exam_hk1: '',
    score_45_hk2: '',
    score_exam_hk2: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch current school year to get total_weeks
      const { data: schoolYearData } = await supabase
        .from('school_years')
        .select('total_weeks')
        .eq('is_current', true)
        .single()

      const currentTotalWeeks = schoolYearData?.total_weeks || 40

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
      const studentsWithDetails: StudentWithDetails[] = (studentsData || []).map((student) => {
        const studentClass = (classesData || []).find((c) => c.id === student.class_id)
        const birthDate = student.date_of_birth ? new Date(student.date_of_birth) : null
        const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined

        // Calculate averages
        const score_45_hk1 = student.score_45_hk1 || 0
        const score_exam_hk1 = student.score_exam_hk1 || 0
        const score_45_hk2 = student.score_45_hk2 || 0
        const score_exam_hk2 = student.score_exam_hk2 || 0
        const attendance_thu5 = student.attendance_thu5 || 0
        const attendance_cn = student.attendance_cn || 0

        // TB Giáo lý = (45' HK1 + 45' HK2 + Thi HK1×2 + Thi HK2×2) / 6
        const avg_catechism = (score_45_hk1 + score_45_hk2 + score_exam_hk1 * 2 + score_exam_hk2 * 2) / 6
        // TB Điểm danh = (số buổi T5 × 0.4 + số buổi CN × 0.6) × (10 / tổng tuần)
        const avg_attendance = (attendance_thu5 * 0.4 + attendance_cn * 0.6) * (10 / currentTotalWeeks)
        // Tổng TB = TB Giáo lý × 0.6 + TB Điểm danh × 0.4
        const total_avg = avg_catechism * 0.6 + avg_attendance * 0.4

        return {
          ...student,
          class_name: studentClass?.name || undefined,
          class_branch: studentClass?.branch || undefined,
          age,
          score_45_hk1,
          score_exam_hk1,
          score_45_hk2,
          score_exam_hk2,
          avg_catechism,
          attendance_thu5,
          attendance_cn,
          avg_attendance,
          total_avg,
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

  // Handle delete student
  const handleDeleteStudent = async () => {
    console.log('handleDeleteStudent called')
    console.log('selectedStudent:', selectedStudent)

    if (!selectedStudent) {
      console.log('No student selected, returning')
      return
    }

    console.log('Attempting to delete student with id:', selectedStudent.id)

    const { data, error } = await supabase
      .from('thieu_nhi')
      .delete()
      .eq('id', selectedStudent.id)
      .select()

    console.log('Delete response - data:', data, 'error:', error)

    if (error) {
      console.error('Error deleting student:', error)
      alert(`Không thể xóa thiếu nhi: ${error.message}`)
      throw error
    }

    console.log('Delete successful, refreshing data...')
    // Refresh data after deletion
    await fetchData()
  }

  // Open delete modal
  const openDeleteModal = (student: StudentWithDetails) => {
    setSelectedStudent(student)
    setIsDeleteModalOpen(true)
  }

  // Start editing a student's scores
  const startEditing = (student: StudentWithDetails) => {
    setEditingStudentId(student.id)
    setEditingScores({
      score_45_hk1: (student.score_45_hk1 || 0).toString(),
      score_exam_hk1: (student.score_exam_hk1 || 0).toString(),
      score_45_hk2: (student.score_45_hk2 || 0).toString(),
      score_exam_hk2: (student.score_exam_hk2 || 0).toString(),
    })
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingStudentId(null)
    setEditingScores({
      score_45_hk1: '',
      score_exam_hk1: '',
      score_45_hk2: '',
      score_exam_hk2: '',
    })
  }

  // Save scores
  const saveScores = async () => {
    if (!editingStudentId) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('thieu_nhi')
        .update({
          score_45_hk1: parseFloat(editingScores.score_45_hk1) || 0,
          score_exam_hk1: parseFloat(editingScores.score_exam_hk1) || 0,
          score_45_hk2: parseFloat(editingScores.score_45_hk2) || 0,
          score_exam_hk2: parseFloat(editingScores.score_exam_hk2) || 0,
        })
        .eq('id', editingStudentId)

      if (error) {
        console.error('Error saving scores:', error)
        return
      }

      // Refresh data and exit edit mode
      await fetchData()
      cancelEditing()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle score input change
  const handleScoreChange = (field: keyof EditingScores, value: string) => {
    // Allow empty string or valid number format
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditingScores((prev) => ({ ...prev, [field]: value }))
    }
  }

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
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 h-[38px] px-5 bg-brand rounded-full text-sm font-medium text-white hover:bg-orange-500 transition-colors"
            >
              {/* Custom Upload Icon */}
              <svg width="18" height="18" viewBox="0 0 27 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M26.276 0V24.816H0V5.84H2.92V21.896H23.356V2.92H17.516V0H26.276ZM9.299 0C13.224 0 16.425 3.098 16.591 6.982L16.598 7.299V12.532L19.945 9.186L22.01 11.25L15.138 18.122L8.267 11.25L10.331 9.186L13.678 12.532V7.299C13.678 4.967 11.855 3.06 9.556 2.927L9.299 2.92H0.54V0H9.299Z" fill="currentColor"/>
              </svg>
              Import
            </button>

            {/* Add Button - White with orange border */}
            <button
              onClick={() => router.push('/admin/management/students/add')}
              className="flex items-center gap-2 h-[37px] px-5 bg-white border border-brand rounded-full text-sm font-medium text-brand hover:bg-brand/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-6 pb-4">
        {/* Header Bar */}
        <div className="bg-[#E5E1DC] rounded-[15px] h-12 border border-white/60 flex items-center">
          <div className="w-[15%] min-w-[180px] px-4 flex items-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">TÊN THÁNH / HỌ</span>
          </div>
          <div className="w-[5%] min-w-[60px] px-2 flex items-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">TÊN</span>
          </div>
          <div className="w-[6%] min-w-[70px] px-2 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">LỚP/</span>
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">TUỔI</span>
          </div>
          <div className="w-[9%] min-w-[110px] px-2 flex items-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">LIÊN HỆ</span>
          </div>
          <div className="w-[5%] min-w-[55px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">45&apos;</span>
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK1</span>
          </div>
          <div className="w-[5%] min-w-[55px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">THI</span>
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK1</span>
          </div>
          <div className="w-[5%] min-w-[55px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">45&apos;</span>
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK2</span>
          </div>
          <div className="w-[5%] min-w-[55px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">THI</span>
            <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK2</span>
          </div>
          <div className="w-[6%] min-w-[65px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#6e62e5] uppercase tracking-wide leading-tight">TB</span>
            <span className="text-xs font-semibold text-[#6e62e5] uppercase tracking-wide leading-tight">GIÁO LÝ</span>
          </div>
          <div className="w-[6%] min-w-[65px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">ĐIỂM</span>
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">DANH T5</span>
          </div>
          <div className="w-[6%] min-w-[70px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">ĐIỂM</span>
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">DANH CN</span>
          </div>
          <div className="w-[6%] min-w-[70px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">TB ĐIỂM</span>
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">DANH</span>
          </div>
          <div className="w-[5%] min-w-[55px] px-1 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-[#E178FF] uppercase tracking-wide leading-tight">TỔNG</span>
            <span className="text-xs font-semibold text-[#E178FF] uppercase tracking-wide leading-tight">TB</span>
          </div>
          <div className="flex-1 min-w-[140px] px-3 flex items-center justify-center">
            <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">THAO TÁC</span>
          </div>
        </div>

        {/* Table Body */}
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[9%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col />
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th>Tên thánh / Họ</th>
              <th>Tên</th>
              <th>Lớp/Tuổi</th>
              <th>Liên hệ</th>
              <th>45&apos; HK1</th>
              <th>THI HK1</th>
              <th>45&apos; HK2</th>
              <th>THI HK2</th>
              <th>TB Giáo lý</th>
              <th>Điểm danh T5</th>
              <th>Điểm danh CN</th>
              <th>TB Điểm danh</th>
              <th>Tổng TB</th>
              <th>Thao tác</th>
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
              filteredStudents.map((student) => {
                const isEditing = editingStudentId === student.id
                const rowBgClass = isEditing ? 'bg-[#FEF6EE]' : 'bg-white'

                return (
                  <tr key={student.id} className="hover:bg-[#F8F8F8] transition-colors">
                    {/* Student Info - Avatar + Name + Code */}
                    <td className={`py-3 ${rowBgClass} ${isEditing ? 'border-l-4 border-l-brand pl-3' : 'pl-4'}`}>
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
                          <span className="text-sm font-medium text-black leading-tight">
                            {student.saint_name && `${student.saint_name} `}
                            {student.full_name.split(' ').slice(0, -1).join(' ')}
                          </span>
                          <span className="text-xs text-[#8B8685]">{student.student_code}</span>
                        </div>
                      </div>
                    </td>

                    {/* First Name */}
                    <td className={`px-2 py-3 ${rowBgClass}`}>
                      <span className="text-sm font-medium text-black">
                        {student.full_name.split(' ').slice(-1)[0]}
                      </span>
                    </td>

                    {/* Class and Age */}
                    <td className={`px-2 py-3 ${rowBgClass}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-medium text-black">{student.class_name || '-'}</span>
                        {student.age && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-brand/15 text-[11px] font-medium text-brand">
                            {student.age} tuổi
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact - Two phone numbers */}
                    <td className={`px-2 py-3 ${rowBgClass}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-black">{student.parent_phone || '-'}</span>
                        <span className="text-xs text-[#8B8685]">{student.parent_phone_2 || student.parent_phone || '-'}</span>
                      </div>
                    </td>

                    {/* Score: 45' HK1 - Start of score group with #F6F6F6 background */}
                    <td className="px-1 py-3 text-center bg-[#F6F6F6]" style={{ borderLeft: '0.5px solid #E5E1DC', borderRight: '0.5px solid #E5E1DC' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingScores.score_45_hk1}
                          onChange={(e) => handleScoreChange('score_45_hk1', e.target.value)}
                          className="w-10 h-7 text-center text-sm text-[#8a8c90] border border-[#E5E1DC] rounded-md bg-white focus:outline-none focus:border-brand"
                        />
                      ) : (
                        <span className="text-sm text-[#8a8c90]">{student.score_45_hk1?.toFixed(1) || '0.0'}</span>
                      )}
                    </td>

                    {/* Score: THI HK1 */}
                    <td className="px-1 py-3 text-center bg-[#F6F6F6]" style={{ borderRight: '0.5px solid #E5E1DC' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingScores.score_exam_hk1}
                          onChange={(e) => handleScoreChange('score_exam_hk1', e.target.value)}
                          className="w-10 h-7 text-center text-sm text-[#8a8c90] border border-[#E5E1DC] rounded-md bg-white focus:outline-none focus:border-brand"
                        />
                      ) : (
                        <span className="text-sm text-[#8a8c90]">{student.score_exam_hk1?.toFixed(1) || '0.0'}</span>
                      )}
                    </td>

                    {/* Score: 45' HK2 */}
                    <td className="px-1 py-3 text-center bg-[#F6F6F6]" style={{ borderRight: '0.5px solid #E5E1DC' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingScores.score_45_hk2}
                          onChange={(e) => handleScoreChange('score_45_hk2', e.target.value)}
                          className="w-10 h-7 text-center text-sm text-[#8a8c90] border border-[#E5E1DC] rounded-md bg-white focus:outline-none focus:border-brand"
                        />
                      ) : (
                        <span className="text-sm text-[#8a8c90]">{student.score_45_hk2?.toFixed(1) || '0.0'}</span>
                      )}
                    </td>

                    {/* Score: THI HK2 */}
                    <td className="px-1 py-3 text-center bg-[#F6F6F6]" style={{ borderRight: '0.5px solid #E5E1DC' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingScores.score_exam_hk2}
                          onChange={(e) => handleScoreChange('score_exam_hk2', e.target.value)}
                          className="w-10 h-7 text-center text-sm text-[#8a8c90] border border-[#E5E1DC] rounded-md bg-white focus:outline-none focus:border-brand"
                        />
                      ) : (
                        <span className="text-sm text-[#8a8c90]">{student.score_exam_hk2?.toFixed(1) || '0.0'}</span>
                      )}
                    </td>

                    {/* TB Giáo Lý (calculated, purple) - End of score group */}
                    <td className="px-1 py-3 text-center bg-[#F6F6F6]" style={{ borderRight: '0.5px solid #E5E1DC' }}>
                      <span className="text-sm font-medium text-[#6e62e5]">{student.avg_catechism?.toFixed(1) || '0.0'}</span>
                    </td>

                    {/* Điểm danh T5 */}
                    <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                      <span className="text-sm text-[#8B8685]">{student.attendance_thu5?.toFixed(1) || '0.0'}</span>
                    </td>

                    {/* Điểm danh CN */}
                    <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                      <span className="text-sm text-[#8B8685]">{student.attendance_cn?.toFixed(1) || '0.0'}</span>
                    </td>

                    {/* TB Điểm danh (calculated) */}
                    <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                      <span className="text-sm text-[#8B8685]">{student.avg_attendance?.toFixed(1) || '0.0'}</span>
                    </td>

                    {/* Tổng TB (calculated, pink) */}
                    <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                      <span className="text-sm font-semibold text-[#E178FF]">{student.total_avg?.toFixed(1) || '0.0'}</span>
                    </td>

                    {/* Actions */}
                    <td className={`px-3 py-3 ${rowBgClass}`}>
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            {/* Save Button */}
                            <button
                              onClick={saveScores}
                              disabled={isSaving}
                              className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center hover:bg-orange-500 transition-colors disabled:opacity-50"
                              title="Lưu"
                            >
                              {isSaving ? (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M17 21V13H7V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M7 3V8H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            {/* Cancel Button */}
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="Hủy"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6 6L18 18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Medal/Award Icon - Chỉnh sửa điểm */}
                            <button
                              onClick={() => startEditing(student)}
                              className="w-9 h-9 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                              title="Chỉnh sửa điểm"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="8" r="6" stroke="#8B8685" strokeWidth="1.5"/>
                                <path d="M15.477 12.89L17 22L12 19L7 22L8.523 12.89" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            {/* Calendar Icon - Xem điểm danh */}
                            <button
                              onClick={() => router.push(`/admin/management/students/${student.id}/attendance`)}
                              className="w-9 h-9 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                              title="Xem điểm danh"
                            >
                              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.8333 3.33334H4.16667C3.24619 3.33334 2.5 4.07954 2.5 5.00001V16.6667C2.5 17.5872 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5872 17.5 16.6667V5.00001C17.5 4.07954 16.7538 3.33334 15.8333 3.33334Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M13.3333 1.66666V5.00001" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6.66667 1.66666V5.00001" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2.5 8.33334H17.5" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            {/* Edit Icon - Chỉnh sửa thiếu nhi */}
                            <button
                              onClick={() => router.push(`/admin/management/students/${student.id}/edit`)}
                              className="w-9 h-9 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                              title="Chỉnh sửa thiếu nhi"
                            >
                              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.1667 2.5C14.3856 2.28113 14.6454 2.10752 14.9314 1.98906C15.2173 1.87061 15.5238 1.80965 15.8333 1.80965C16.1429 1.80965 16.4493 1.87061 16.7353 1.98906C17.0213 2.10752 17.2811 2.28113 17.5 2.5C17.7189 2.71887 17.8925 2.97871 18.0109 3.26468C18.1294 3.55064 18.1904 3.85714 18.1904 4.16667C18.1904 4.4762 18.1294 4.78269 18.0109 5.06866C17.8925 5.35462 17.7189 5.61446 17.5 5.83333L6.25 17.0833L1.66667 18.3333L2.91667 13.75L14.1667 2.5Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            {/* Delete Icon */}
                            <button
                              onClick={() => openDeleteModal(student)}
                              className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center hover:bg-red-200 transition-colors"
                              title="Xóa"
                            >
                              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 5H4.16667H17.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      {/* Delete Modal */}
      <DeleteStudentModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedStudent(null)
        }}
        onConfirm={handleDeleteStudent}
        studentName={selectedStudent?.full_name}
      />
    </div>
  )
}
