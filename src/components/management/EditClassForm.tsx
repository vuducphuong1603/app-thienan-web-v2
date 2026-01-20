'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ChevronDown, Search, UserMinus } from 'lucide-react'
import { supabase, Class, BRANCHES, Branch } from '@/lib/supabase'

interface EditClassFormProps {
  classData: Class
  onBack: () => void
  onSuccess: () => void
}

interface FormData {
  name: string
  branch: Branch | ''
}

interface Teacher {
  id: string
  full_name: string
  saint_name: string | null
  role: string
  class_id: string | null
  class_name: string | null
  teacher_role?: 'main' | 'assistant' | null
}

export default function EditClassForm({ classData, onBack, onSuccess }: EditClassFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: classData.name,
    branch: classData.branch,
  })
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  // Teacher assignment states
  const [searchQuery, setSearchQuery] = useState('')
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([])
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    setLoadingTeachers(true)
    try {
      const { data: allTeachers, error } = await supabase
        .from('users')
        .select('id, full_name, saint_name, role, class_id, class_name')
        .eq('role', 'giao_ly_vien')

      if (error) {
        console.error('Error fetching teachers:', error)
        return
      }

      const assigned = (allTeachers || []).filter(
        (t) => t.class_id === classData.id || t.class_name === classData.name
      )
      const available = (allTeachers || []).filter(
        (t) => !t.class_id && !t.class_name
      )

      setAssignedTeachers(assigned)
      setAvailableTeachers(available)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingTeachers(false)
    }
  }, [classData.id, classData.name])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên lớp'
    if (!formData.branch) newErrors.branch = 'Vui lòng chọn ngành'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name,
          branch: formData.branch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', classData.id)

      if (error) {
        console.error('Error updating class:', error)
        alert(`Lỗi cập nhật lớp: ${error.message}`)
        return
      }

      // Update class_name in users table if class name changed
      if (formData.name !== classData.name) {
        await supabase
          .from('users')
          .update({ class_name: formData.name })
          .eq('class_id', classData.id)
      }

      onSuccess()
      onBack()
    } catch (err) {
      console.error('Error:', err)
      alert('Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Assign teacher to class
  const handleAssignTeacher = async (teacher: Teacher, role: 'main' | 'assistant') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          class_id: classData.id,
          class_name: formData.name,
        })
        .eq('id', teacher.id)

      if (error) {
        console.error('Error assigning teacher:', error)
        return
      }

      // Move from available to assigned
      setAvailableTeachers((prev) => prev.filter((t) => t.id !== teacher.id))
      setAssignedTeachers((prev) => [...prev, { ...teacher, teacher_role: role }])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // Remove teacher from class
  const handleRemoveTeacher = async (teacher: Teacher) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          class_id: null,
          class_name: null,
        })
        .eq('id', teacher.id)

      if (error) {
        console.error('Error removing teacher:', error)
        return
      }

      // Move from assigned to available
      setAssignedTeachers((prev) => prev.filter((t) => t.id !== teacher.id))
      setAvailableTeachers((prev) => [...prev, { ...teacher, teacher_role: null }])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  // Filter available teachers by search
  const filteredAvailableTeachers = availableTeachers.filter((teacher) => {
    const fullName = `${teacher.saint_name || ''} ${teacher.full_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Class Info Card */}
      <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-1.5 py-0.5">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-brand hover:text-orange-600 transition-colors w-fit"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-xs">Quay trở lại</span>
          </button>

          {/* Title */}
          <h1 className="text-[40px] font-bold text-black leading-none">Chỉnh sửa lớp học</h1>

          {/* Subtitle */}
          <p className="text-sm text-primary-1">
            Quản lý thông tin lớp và phân công giáo lý viên
          </p>
        </div>

        {/* Form Fields Row */}
        <div className="flex gap-3 mt-4">
          {/* Class Name Input */}
          <div className="flex flex-col gap-1.5 w-[400px]">
            <label className="text-sm font-medium text-black">Tên lớp</label>
            <div
              className={`h-[43px] px-4 bg-white rounded-full flex items-center ${
                errors.name ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="VD: Ấu 2A"
                className="flex-1 text-xs text-black placeholder:text-black bg-transparent border-none focus:outline-none"
              />
            </div>
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Branch Dropdown */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-black">Ngành</label>
            <div className="relative">
              <button
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className={`w-full h-[43px] px-4 bg-white rounded-[25px] text-xs flex items-center justify-between ${
                  errors.branch ? 'ring-2 ring-red-500' : ''
                } text-black`}
              >
                <span>{formData.branch || 'Chọn ngành'}</span>
                <ChevronDown
                  className={`w-[18px] h-[9px] transition-transform text-black ${
                    isBranchDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isBranchDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
                  {BRANCHES.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        handleInputChange('branch', branch)
                        setIsBranchDropdownOpen(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                        formData.branch === branch ? 'bg-brand/10 text-brand' : 'text-black'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.branch && <p className="text-xs text-red-500">{errors.branch}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="h-[49px] w-[131px] bg-[#E5E1DC] rounded-full text-base font-semibold text-black hover:bg-[#D5D1CC] transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-[49px] w-[164px] bg-brand rounded-full text-base font-semibold text-[#F6F6F6] hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-4 w-4"
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
            )}
            Cập nhật
          </button>
        </div>
      </div>

      {/* Teacher Assignment Card */}
      <div className="bg-white border border-[#E5E1DC] rounded-2xl p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-black">Phân công giáo lý viên</h2>
          <p className="text-sm text-primary-3">Tìm kiếm và phân công giáo lý viên cho lớp này</p>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 h-[43px] px-4 bg-[#F6F6F6] rounded-full mb-6">
          <Search className="w-5 h-5 text-primary-3" />
          <input
            type="text"
            placeholder="Tìm kiếm giáo lý viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-full bg-transparent text-sm text-black placeholder:text-primary-3 border-none focus:outline-none"
          />
        </div>

        {/* Two Column Layout */}
        <div className="flex gap-6">
          {/* Assigned Teachers Column */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-black mb-3">
              Giáo lý viên đã phân công ({assignedTeachers.length})
            </h3>
            <div className="flex flex-col gap-2">
              {loadingTeachers ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : assignedTeachers.length === 0 ? (
                <p className="text-sm text-primary-3 py-4 text-center">Chưa có giáo lý viên nào được phân công</p>
              ) : (
                assignedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 bg-[#F6F6F6] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar Placeholder */}
                      <div className="w-10 h-10 rounded-full bg-[#E5E1DC] flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-3">
                          {teacher.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">
                          {teacher.saint_name} {teacher.full_name}
                        </p>
                        <p className="text-xs text-primary-3">admin</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTeacher(teacher)}
                      className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center hover:bg-brand/20 transition-colors"
                    >
                      <UserMinus className="w-4 h-4 text-brand" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Teachers Column */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-black mb-3">Giáo lý viên khả dụng</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {loadingTeachers ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : filteredAvailableTeachers.length === 0 ? (
                <p className="text-sm text-primary-3 py-4 text-center">
                  {searchQuery ? 'Không tìm thấy giáo lý viên' : 'Không có giáo lý viên khả dụng'}
                </p>
              ) : (
                filteredAvailableTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 bg-[#F6F6F6] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar Placeholder */}
                      <div className="w-10 h-10 rounded-full bg-[#E5E1DC] flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-3">
                          {teacher.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">
                          {teacher.saint_name} {teacher.full_name}
                        </p>
                        <p className="text-xs text-primary-3">Đang dạy: Nghĩa 1D</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAssignTeacher(teacher, 'assistant')}
                        className="h-8 px-4 bg-white border border-[#E5E1DC] rounded-full text-xs font-medium text-black hover:bg-gray-50 transition-colors"
                      >
                        Phụ
                      </button>
                      <button
                        onClick={() => handleAssignTeacher(teacher, 'main')}
                        className="h-8 px-4 bg-brand rounded-full text-xs font-medium text-white hover:bg-orange-500 transition-colors"
                      >
                        Chính
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
