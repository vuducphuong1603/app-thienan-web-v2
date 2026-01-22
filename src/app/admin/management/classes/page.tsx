'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Class, BRANCHES, Branch } from '@/lib/supabase'
import { Search, ChevronDown, Plus, Edit2, Eye, Trash2 } from 'lucide-react'
import AddClassForm from '@/components/management/AddClassForm'
import EditClassForm from '@/components/management/EditClassForm'

interface ClassWithDetails extends Class {
  teachers?: string[]
  student_count?: number
}

type FilterBranch = 'all' | Branch

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState<FilterBranch>('all')
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [showAddClassForm, setShowAddClassForm] = useState(false)
  const [showEditClassForm, setShowEditClassForm] = useState(false)
  const [classToEdit, setClassToEdit] = useState<ClassWithDetails | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<ClassWithDetails | null>(null)

  // Fetch classes from Supabase
  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('display_order', { ascending: true })

      if (classesError) {
        console.error('Error fetching classes:', classesError)
        return
      }

      // Fetch teachers for each class
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, saint_name, class_id, class_name')
        .eq('role', 'giao_ly_vien')

      // Fetch student count per class from thieu_nhi table
      // Note: Supabase has server-side row limit, need to paginate
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

      // Count students per class_id
      const studentCountByClass: Record<string, number> = {}
      let totalWithClassId = 0
      let totalWithoutClassId = 0
      allStudents.forEach((student) => {
        if (student.class_id) {
          studentCountByClass[student.class_id] = (studentCountByClass[student.class_id] || 0) + 1
          totalWithClassId++
        } else {
          totalWithoutClassId++
        }
      })
      console.log('DEBUG Classes page:')
      console.log('- Total students fetched:', allStudents.length)
      console.log('- Students with class_id:', totalWithClassId)
      console.log('- Students without class_id:', totalWithoutClassId)
      console.log('- Student count by class:', studentCountByClass)

      // Map teachers and student counts to classes
      const classesWithDetails: ClassWithDetails[] = (classesData || []).map((cls) => {
        const classTeachers = (usersData || [])
          .filter((user) => user.class_id === cls.id || user.class_name === cls.name)
          .map((user) => `${user.saint_name || ''} ${user.full_name}`.trim())

        return {
          ...cls,
          teachers: classTeachers,
          student_count: studentCountByClass[cls.id] || 0,
        }
      })

      setClasses(classesWithDetails)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Filter classes based on search and branch filter
  const filteredClasses = classes.filter((cls) => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      searchQuery === '' ||
      cls.name.toLowerCase().includes(searchLower) ||
      cls.branch.toLowerCase().includes(searchLower)

    const matchesBranch = filterBranch === 'all' || cls.branch === filterBranch

    return matchesSearch && matchesBranch
  })

  // Group classes by branch
  const groupedClasses = BRANCHES.reduce((acc, branch) => {
    const branchClasses = filteredClasses.filter((cls) => cls.branch === branch)
    if (branchClasses.length > 0) {
      acc[branch] = branchClasses
    }
    return acc
  }, {} as Record<Branch, ClassWithDetails[]>)

  // Stats
  const totalClasses = classes.length
  const totalBranches = BRANCHES.length
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0)

  // Handle delete class
  const handleOpenDeleteModal = (cls: ClassWithDetails) => {
    setClassToDelete(cls)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteClass = async () => {
    if (!classToDelete) return

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classToDelete.id)

    if (error) {
      console.error('Error deleting class:', error)
      return
    }

    setIsDeleteModalOpen(false)
    setClassToDelete(null)
    fetchClasses()
  }

  // Handle edit class
  const handleOpenEditForm = (cls: ClassWithDetails) => {
    setClassToEdit(cls)
    setShowEditClassForm(true)
  }

  // Show Edit Class Form
  if (showEditClassForm && classToEdit) {
    return (
      <EditClassForm
        classData={classToEdit}
        onBack={() => {
          setShowEditClassForm(false)
          setClassToEdit(null)
        }}
        onSuccess={fetchClasses}
      />
    )
  }

  // Show Add Class Form
  if (showAddClassForm) {
    return (
      <AddClassForm
        onBack={() => setShowAddClassForm(false)}
        onSuccess={fetchClasses}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Actions Bar */}
      <div className="flex items-center justify-between">
        {/* Search Input */}
        <div className="flex items-center gap-2 h-[42px] px-3 bg-white border border-[#E5E1DC] rounded-xl w-[320px]">
          <Search className="w-5 h-5 text-primary-3" />
          <input
            type="text"
            placeholder="Tìm kiếm lớp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-full bg-transparent text-sm text-black placeholder:text-primary-3 border-none focus:outline-none"
          />
        </div>

        {/* Filter and Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Branch Filter */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex items-center justify-between gap-2 h-[42px] px-4 bg-white border border-[#E5E1DC] rounded-xl min-w-[160px] text-sm text-primary-3 hover:bg-gray-50 transition-colors"
            >
              <span>{filterBranch === 'all' ? 'Tất cả ngành' : filterBranch}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isBranchDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => {
                    setFilterBranch('all')
                    setIsBranchDropdownOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterBranch === 'all' ? 'bg-brand/10 text-brand' : 'text-black'}`}
                >
                  Tất cả ngành
                </button>
                {BRANCHES.map((branch) => (
                  <button
                    key={branch}
                    onClick={() => {
                      setFilterBranch(branch)
                      setIsBranchDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterBranch === branch ? 'bg-brand/10 text-brand' : 'text-black'}`}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Class Button */}
          <button
            onClick={() => setShowAddClassForm(true)}
            className="flex items-center gap-2 h-[42px] px-4 bg-brand rounded-xl text-sm font-medium text-white hover:bg-orange-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm lớp
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1DC] rounded-xl">
          <span className="text-sm font-semibold text-brand">{totalClasses}</span>
          <span className="text-sm text-primary-3">lớp</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1DC] rounded-xl">
          <span className="text-sm font-semibold text-brand">{totalBranches}</span>
          <span className="text-sm text-primary-3">ngành</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E1DC] rounded-xl">
          <span className="text-sm font-semibold text-brand">{totalStudents}</span>
          <span className="text-sm text-primary-3">thiếu nhi</span>
        </div>
      </div>

      {/* Classes List by Branch */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : Object.keys(groupedClasses).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-primary-3">
          <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm">Không tìm thấy lớp nào</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedClasses).map(([branch, branchClasses]) => (
            <div key={branch} className="bg-white border border-[#E5E1DC] rounded-2xl overflow-hidden">
              {/* Branch Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF8F5] border-b border-[#E5E1DC]">
                <h3 className="text-base font-bold text-brand uppercase">Ngành {branch}</h3>
                <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-medium rounded-full">
                  {branchClasses.length} lớp
                </span>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[1fr_1.5fr_100px_120px] gap-4 px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E1DC]">
                <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Tên lớp</div>
                <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Giáo lý viên</div>
                <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider text-center">Thiếu nhi</div>
                <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider text-center">Thao tác</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-[#E5E1DC]">
                {branchClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="grid grid-cols-[1fr_1.5fr_100px_120px] gap-4 px-4 py-3 items-center hover:bg-[#FAFAFA] transition-colors"
                  >
                    {/* Class Name */}
                    <div className="text-sm font-medium text-black">{cls.name}</div>

                    {/* Teachers */}
                    <div className="flex flex-col text-sm text-primary-3">
                      {cls.teachers && cls.teachers.length > 0 ? (
                        cls.teachers.slice(0, 3).map((teacher, index) => (
                          <span key={index}>{teacher}</span>
                        ))
                      ) : (
                        <span className="text-gray-400">Chưa có giáo lý viên</span>
                      )}
                      {cls.teachers && cls.teachers.length > 3 && (
                        <span className="text-brand text-xs">+{cls.teachers.length - 3} người khác</span>
                      )}
                    </div>

                    {/* Student Count */}
                    <div className="flex justify-center">
                      <span className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-medium">
                        {cls.student_count || 0}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditForm(cls)}
                        className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4 text-primary-3" />
                      </button>
                      <button
                        className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4 text-primary-3" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(cls)}
                        className="w-8 h-8 rounded-lg bg-[#FFEBEE] flex items-center justify-center hover:bg-red-100 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4 text-[#C62828]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Class Modal */}
      {isDeleteModalOpen && classToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-[400px] mx-4 flex flex-col items-center">
            {/* Trash Icon */}
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-brand" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-black mb-2">Xóa lớp?</h3>

            {/* Subtitle */}
            <p className="text-sm text-primary-3 text-center mb-8">
              Bạn chắc chắn muốn xóa lớp học này?
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setClassToDelete(null)
                }}
                className="flex-1 h-[49px] bg-[#E5E1DC] rounded-full text-base font-semibold text-black hover:bg-[#D5D1CC] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteClass}
                className="flex-1 h-[49px] bg-brand rounded-full text-base font-semibold text-white hover:bg-orange-500 transition-colors"
              >
                Xóa lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
