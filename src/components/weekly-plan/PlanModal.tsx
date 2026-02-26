'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, PlanCategory, WeeklyPlan, Class, BRANCHES } from '@/lib/supabase'
import CustomDatePicker from '@/components/ui/CustomDatePicker'

interface PlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode: 'add' | 'edit'
  plan?: WeeklyPlan | null
  categories: PlanCategory[]
  classes: Class[]
}

type AssignType = 'none' | 'branch' | 'class'

export default function PlanModal({ isOpen, onClose, onSuccess, mode, plan, categories, classes }: PlanModalProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [assignType, setAssignType] = useState<AssignType>('none')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrors({})
      setSubmitError(null)
      if (mode === 'edit' && plan) {
        setTitle(plan.title)
        setCategoryId(plan.category_id || '')
        setPlanDate(plan.plan_date)
        setTimeStart(plan.time_start.slice(0, 5))
        setTimeEnd(plan.time_end.slice(0, 5))
        setLocation(plan.location || '')
        setDescription(plan.description || '')
        setNotes(plan.notes || '')
        if (plan.branch) {
          setAssignType('branch')
          setSelectedBranch(plan.branch)
          setSelectedClassIds([])
        } else if (plan.class_ids && plan.class_ids.length > 0) {
          setAssignType('class')
          setSelectedBranch('')
          setSelectedClassIds(plan.class_ids)
        } else {
          setAssignType('none')
          setSelectedBranch('')
          setSelectedClassIds([])
        }
      } else {
        setTitle('')
        setCategoryId(categories[0]?.id || '')
        setPlanDate(new Date().toISOString().split('T')[0])
        setTimeStart('')
        setTimeEnd('')
        setLocation('')
        setDescription('')
        setNotes('')
        setAssignType('none')
        setSelectedBranch('')
        setSelectedClassIds([])
      }
    }
  }, [isOpen, mode, plan, categories])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề'
    if (!planDate) newErrors.planDate = 'Vui lòng chọn ngày'
    if (!timeStart) newErrors.timeStart = 'Vui lòng chọn giờ bắt đầu'
    if (!timeEnd) newErrors.timeEnd = 'Vui lòng chọn giờ kết thúc'
    if (timeStart && timeEnd && timeEnd <= timeStart) {
      newErrors.timeEnd = 'Giờ kết thúc phải sau giờ bắt đầu'
    }
    if (assignType === 'branch' && !selectedBranch) {
      newErrors.branch = 'Vui lòng chọn phân đoàn'
    }
    if (assignType === 'class' && selectedClassIds.length === 0) {
      newErrors.classIds = 'Vui lòng chọn ít nhất một lớp'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    const payload = {
      title: title.trim(),
      category_id: categoryId || null,
      plan_date: planDate,
      time_start: timeStart + ':00',
      time_end: timeEnd + ':00',
      location: location.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      branch: assignType === 'branch' ? selectedBranch : null,
      class_ids: assignType === 'class' ? selectedClassIds : [],
    }

    try {
      if (mode === 'edit' && plan) {
        const { error } = await supabase
          .from('weekly_plans')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', plan.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('weekly_plans')
          .insert(payload)
        if (error) throw error
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('Error saving plan:', err)
      setSubmitError((err as { message?: string })?.message || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleClassId = (classId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    )
  }

  if (!isOpen) return null

  const classesByBranch = BRANCHES.reduce((acc, branch) => {
    acc[branch] = classes.filter(c => c.branch === branch && c.status === 'ACTIVE')
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-[520px] max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E1DC] dark:border-white/10">
          <h2 className="text-lg font-bold text-black dark:text-white">
            {mode === 'add' ? 'Thêm kế hoạch' : 'Sửa kế hoạch'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề kế hoạch"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20'
              }`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loại hoạt động
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors"
            >
              <option value="">Không phân loại</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ngày <span className="text-red-500">*</span>
            </label>
            <CustomDatePicker
              value={planDate}
              onChange={setPlanDate}
              placeholder="Chọn ngày"
            />
            {errors.planDate && <p className="text-xs text-red-500 mt-1">{errors.planDate}</p>}
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Giờ bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={timeStart}
                onChange={e => setTimeStart(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white transition-colors ${
                  errors.timeStart ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20'
                }`}
              />
              {errors.timeStart && <p className="text-xs text-red-500 mt-1">{errors.timeStart}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Giờ kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={timeEnd}
                onChange={e => setTimeEnd(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white transition-colors ${
                  errors.timeEnd ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20'
                }`}
              />
              {errors.timeEnd && <p className="text-xs text-red-500 mt-1">{errors.timeEnd}</p>}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Địa điểm
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Nhập địa điểm"
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors resize-none"
            />
          </div>

          {/* Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phân công
            </label>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === 'none'}
                  onChange={() => { setAssignType('none'); setSelectedBranch(''); setSelectedClassIds([]) }}
                  className="accent-[#FA865E]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Không</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === 'branch'}
                  onChange={() => { setAssignType('branch'); setSelectedClassIds([]) }}
                  className="accent-[#FA865E]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Phân đoàn</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === 'class'}
                  onChange={() => { setAssignType('class'); setSelectedBranch('') }}
                  className="accent-[#FA865E]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Lớp</span>
              </label>
            </div>

            {assignType === 'branch' && (
              <div>
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white transition-colors ${
                    errors.branch ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20'
                  }`}
                >
                  <option value="">Chọn phân đoàn</option>
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.branch && <p className="text-xs text-red-500 mt-1">{errors.branch}</p>}
              </div>
            )}

            {assignType === 'class' && (
              <div>
                <div className="border border-gray-300 dark:border-white/20 rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-3">
                  {BRANCHES.map(branch => {
                    const branchClasses = classesByBranch[branch]
                    if (!branchClasses || branchClasses.length === 0) return null
                    return (
                      <div key={branch}>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{branch}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {branchClasses.map(cls => (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => toggleClassId(cls.id)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                selectedClassIds.includes(cls.id)
                                  ? 'bg-brand text-white border-brand'
                                  : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/20 hover:border-brand'
                              }`}
                            >
                              {cls.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {errors.classIds && <p className="text-xs text-red-500 mt-1">{errors.classIds}</p>}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors resize-none"
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E1DC] dark:border-white/10 flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-[44px] bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/20 rounded-xl text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 h-[44px] bg-brand rounded-xl text-sm font-medium text-white hover:bg-[#e8764f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Đang lưu...' : mode === 'add' ? 'Thêm' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
