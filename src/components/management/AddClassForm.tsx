'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { supabase, BRANCHES, Branch } from '@/lib/supabase'

interface AddClassFormProps {
  onBack: () => void
  onSuccess: () => void
}

interface FormData {
  name: string
  branch: Branch | ''
}

export default function AddClassForm({ onBack, onSuccess }: AddClassFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    branch: '',
  })
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

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
      const { error } = await supabase.from('classes').insert({
        name: formData.name,
        branch: formData.branch,
        display_order: 0,
        status: 'ACTIVE',
      })

      if (error) {
        console.error('Error creating class:', error)
        alert(`Lỗi tạo lớp: ${error.message}`)
        return
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

  return (
    <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 rounded-2xl p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-1.5 py-0.5">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-primary-3 hover:text-black dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-xs">Quay trở lại</span>
        </button>

        {/* Title */}
        <h1 className="text-[40px] font-bold text-black dark:text-white leading-none">Thêm lớp mới</h1>

        {/* Subtitle */}
        <p className="text-sm text-primary-1">
          Quản lý thông tin lớp và phân công giáo lý viên
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4 mt-2">
        {/* Divider */}
        <div className="h-px bg-[#E5E1DC] dark:bg-white/10 w-full" />

        {/* Form Fields Row */}
        <div className="flex gap-3">
          {/* Class Name Input */}
          <div className="flex flex-col gap-1.5 w-[511px]">
            <label className="text-sm font-medium text-black dark:text-white">Tên lớp</label>
            <div
              className={`h-[43px] px-4 bg-white dark:bg-white/10 rounded-full flex items-center ${
                errors.name ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="VD: Chiên 1"
                className="flex-1 text-xs text-black dark:text-white placeholder:text-black dark:placeholder:text-gray-500 bg-transparent border-none focus:outline-none"
              />
            </div>
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Branch Dropdown */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-black dark:text-white">Ngành</label>
            <div className="relative">
              <button
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className={`w-full h-[43px] px-4 bg-white dark:bg-white/10 rounded-[25px] text-xs flex items-center justify-between ${
                  errors.branch ? 'ring-2 ring-red-500' : ''
                } ${formData.branch ? 'text-black dark:text-white' : 'text-black dark:text-white'}`}
              >
                <span>{formData.branch || 'Chọn ngành'}</span>
                <ChevronDown
                  className={`w-[18px] h-[9px] transition-transform text-black dark:text-white ${
                    isBranchDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isBranchDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#1a1a1a] border border-[#E5E1DC] dark:border-white/10 rounded-xl shadow-lg z-10 overflow-hidden">
                  {BRANCHES.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        handleInputChange('branch', branch)
                        setIsBranchDropdownOpen(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/10 ${
                        formData.branch === branch ? 'bg-brand/10 text-brand' : 'text-black dark:text-white'
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
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mt-28">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="h-[49px] w-[131px] bg-[#E5E1DC] dark:bg-white/10 rounded-full text-base font-semibold text-black dark:text-white hover:bg-[#D5D1CC] dark:hover:bg-white/20 transition-colors disabled:opacity-50"
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
          Tạo mới
        </button>
      </div>
    </div>
  )
}
