'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ThieuNhiProfile } from '@/lib/supabase'
import { Search } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useStudentsWithDetails, useInvalidateQueries } from '@/lib/queries'

interface StudentWithDetails extends ThieuNhiProfile {
  class_name?: string
  class_branch?: string
  age?: number
  student_code?: string
  parent_phone_2?: string
  score_45_hk1?: number
  score_exam_hk1?: number
  score_45_hk2?: number
  score_exam_hk2?: number
  avg_catechism?: number
  attendance_thu5?: number
  attendance_cn?: number
  score_thu5?: number
  score_cn?: number
  avg_attendance?: number
  total_avg?: number
}

interface EditingScores {
  score_45_hk1: string
  score_exam_hk1: string
  score_45_hk2: string
  score_exam_hk2: string
}

type FilterStatus = 'all' | 'ACTIVE' | 'INACTIVE'

export default function GLVManagementPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)

  // Edit mode state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editingScores, setEditingScores] = useState<EditingScores>({
    score_45_hk1: '',
    score_exam_hk1: '',
    score_45_hk2: '',
    score_exam_hk2: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const { data: queryData, isLoading: loading, isError, error } = useStudentsWithDetails()
  const allStudents = queryData?.students || []
  const { invalidateStudents } = useInvalidateQueries()

  // Auto-filter by user's class_id
  const classId = user?.class_id
  const students = allStudents.filter((s) => s.class_id === classId)
  const className = students.length > 0 ? students[0].class_name : ''

  // Filter students
  const filteredStudents = students.filter((student) => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      searchQuery === '' ||
      student.full_name.toLowerCase().includes(searchLower) ||
      (student.saint_name && student.saint_name.toLowerCase().includes(searchLower)) ||
      (student.student_code && student.student_code.toLowerCase().includes(searchLower))

    const matchesStatus = filterStatus === 'all' || student.status === filterStatus

    return matchesSearch && matchesStatus
  })

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

      cancelEditing()
      invalidateStudents()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle score input change
  const handleScoreChange = (field: keyof EditingScores, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditingScores((prev) => ({ ...prev, [field]: value }))
    }
  }

  if (!user?.class_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-12 h-12 mb-3 text-[#D4D4D4]" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M4 40c0-6 5-10 12-10h16c7 0 12 4 12 10" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <p className="text-sm font-medium text-[#8B8685]">Bạn chưa được phân công lớp nào</p>
        <p className="text-xs text-[#8B8685] mt-1">Liên hệ Admin để được phân lớp phụ trách</p>
      </div>
    )
  }

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[40px] font-bold text-black dark:text-white">Quản lý Thiếu nhi</h1>
        <p className="text-sm font-medium text-[#666d80]">
          LỚP {(className || '').toUpperCase()} — {filteredStudents.length} thiếu nhi
        </p>
      </div>

      {/* Table Container */}
      <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 rounded-2xl">
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
                className="w-[280px] h-[38px] bg-transparent text-sm text-black dark:text-white placeholder:text-primary-3 border-none focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center justify-between gap-2 h-9 px-4 bg-white dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                <span>
                  {filterStatus === 'all' ? 'Tất cả trạng thái' : filterStatus === 'ACTIVE' ? 'Đang học' : 'Nghỉ học'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-[#1a1a1a] border border-[#E5E1DC] dark:border-white/10 rounded-xl shadow-lg z-20 overflow-hidden">
                  {(['all', 'ACTIVE', 'INACTIVE'] as FilterStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status)
                        setIsStatusDropdownOpen(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/10 ${filterStatus === status ? 'bg-brand/10 text-brand' : 'text-black dark:text-white'}`}
                    >
                      {status === 'all' ? 'Tất cả trạng thái' : status === 'ACTIVE' ? 'Đang học' : 'Nghỉ học'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-6 pb-4">
          {/* Header Bar */}
          <div className="bg-[#E5E1DC] rounded-[15px] h-12 border border-white/60 flex items-center">
            <div className="w-[18%] min-w-[200px] px-4 flex items-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">TÊN THÁNH / HỌ</span>
            </div>
            <div className="w-[7%] min-w-[70px] px-2 flex items-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">TÊN</span>
            </div>
            <div className="w-[10%] min-w-[110px] px-2 flex items-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">LIÊN HỆ</span>
            </div>
            <div className="w-[6%] min-w-[60px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">45&apos;</span>
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK1</span>
            </div>
            <div className="w-[6%] min-w-[60px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">THI</span>
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK1</span>
            </div>
            <div className="w-[6%] min-w-[60px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">45&apos;</span>
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK2</span>
            </div>
            <div className="w-[6%] min-w-[60px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">THI</span>
              <span className="text-xs font-semibold text-[#8a8c90] uppercase tracking-wide leading-tight">HK2</span>
            </div>
            <div className="w-[7%] min-w-[70px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#6e62e5] uppercase tracking-wide leading-tight">TB</span>
              <span className="text-xs font-semibold text-[#6e62e5] uppercase tracking-wide leading-tight">GIÁO LÝ</span>
            </div>
            <div className="w-[7%] min-w-[70px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">ĐIỂM</span>
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">DANH T5</span>
            </div>
            <div className="w-[7%] min-w-[70px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">ĐIỂM</span>
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">DANH CN</span>
            </div>
            <div className="w-[7%] min-w-[70px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">TB ĐIỂM</span>
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide leading-tight">DANH</span>
            </div>
            <div className="w-[6%] min-w-[60px] px-1 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#E178FF] uppercase tracking-wide leading-tight">TỔNG</span>
              <span className="text-xs font-semibold text-[#E178FF] uppercase tracking-wide leading-tight">TB</span>
            </div>
            <div className="flex-1 min-w-[100px] px-3 flex items-center justify-center">
              <span className="text-xs font-semibold text-[#8B8685] uppercase tracking-wide">THAO TÁC</span>
            </div>
          </div>

          {/* Table Body */}
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col />
            </colgroup>
            <thead className="sr-only">
              <tr>
                <th>Tên thánh / Họ</th>
                <th>Tên</th>
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

            <tbody>
              {isError ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center bg-white dark:bg-white/10">
                    <div className="flex flex-col items-center gap-3 text-red-500">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <p className="text-sm">{(error as Error)?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.'}</p>
                      <button onClick={() => window.location.reload()} className="px-4 py-2 text-xs bg-brand text-white rounded-lg hover:opacity-90">Tải lại trang</button>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center bg-white dark:bg-white/10">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center bg-white dark:bg-white/10">
                    <div className="flex flex-col items-center text-[#8B8685]">
                      <svg className="w-12 h-12 mb-3" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="16" r="8" stroke="#D4D4D4" strokeWidth="2" fill="none"/>
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
                      {/* Student Info */}
                      <td className={`py-3 ${rowBgClass} ${isEditing ? 'border-l-4 border-l-brand pl-3' : 'pl-4'}`}>
                        <div
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => router.push(`/admin/management/students/${student.id}/view`)}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#E8E8E8] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-medium text-[#8B8685]">{student.full_name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-black leading-tight hover:text-brand transition-colors">
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

                      {/* Contact */}
                      <td className={`px-2 py-3 ${rowBgClass}`}>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-black">{student.parent_phone || '-'}</span>
                          <span className="text-xs text-[#8B8685]">{student.parent_phone_2 || student.parent_phone || '-'}</span>
                        </div>
                      </td>

                      {/* Score: 45' HK1 */}
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

                      {/* TB Giáo Lý */}
                      <td className="px-1 py-3 text-center bg-[#F6F6F6]" style={{ borderRight: '0.5px solid #E5E1DC' }}>
                        <span className="text-sm font-medium text-[#6e62e5]">{student.avg_catechism?.toFixed(1) || '0.0'}</span>
                      </td>

                      {/* Điểm danh T5 */}
                      <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                        <span className="text-sm text-[#8B8685]">{student.score_thu5?.toFixed(1) || '0.0'}</span>
                      </td>

                      {/* Điểm danh CN */}
                      <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                        <span className="text-sm text-[#8B8685]">{student.score_cn?.toFixed(1) || '0.0'}</span>
                      </td>

                      {/* TB Điểm danh */}
                      <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                        <span className="text-sm text-[#8B8685]">{student.avg_attendance?.toFixed(1) || '0.0'}</span>
                      </td>

                      {/* Tổng TB */}
                      <td className={`px-1 py-3 text-center ${rowBgClass}`}>
                        <span className="text-sm font-semibold text-[#E178FF]">{student.total_avg?.toFixed(1) || '0.0'}</span>
                      </td>

                      {/* Actions - Edit scores + Edit info (no add/delete) */}
                      <td className={`px-3 py-3 ${rowBgClass}`}>
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveScores}
                                disabled={isSaving}
                                className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center hover:bg-orange-500 transition-colors disabled:opacity-50"
                                title="Lưu"
                              >
                                {isSaving ? (
                                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M17 21V13H7V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M7 3V8H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50"
                                title="Hủy"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <path d="M18 6L6 18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M6 6L18 18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Edit scores */}
                              <button
                                onClick={() => startEditing(student)}
                                className="w-9 h-9 rounded-lg bg-[#F6F6F6] dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                title="Chỉnh sửa điểm"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="8" r="6" stroke="#8B8685" strokeWidth="1.5"/>
                                  <path d="M15.477 12.89L17 22L12 19L7 22L8.523 12.89" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              {/* Edit student info */}
                              <button
                                onClick={() => router.push(`/admin/management/students/${student.id}/edit`)}
                                className="w-9 h-9 rounded-lg bg-[#F6F6F6] dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                title="Chỉnh sửa thông tin"
                              >
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                  <path d="M14.1667 2.5C14.3856 2.28113 14.6454 2.10752 14.9314 1.98906C15.2173 1.87061 15.5238 1.80965 15.8333 1.80965C16.1429 1.80965 16.4493 1.87061 16.7353 1.98906C17.0213 2.10752 17.2811 2.28113 17.5 2.5C17.7189 2.71887 17.8925 2.97871 18.0109 3.26468C18.1294 3.55064 18.1904 3.85714 18.1904 4.16667C18.1904 4.4762 18.1294 4.78269 18.0109 5.06866C17.8925 5.35462 17.7189 5.61446 17.5 5.83333L6.25 17.0833L1.66667 18.3333L2.91667 13.75L14.1667 2.5Z" stroke="#8B8685" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
      </div>
    </div>
  )
}
