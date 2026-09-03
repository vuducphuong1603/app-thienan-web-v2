'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { supabase, PlanCategory, WeeklyPlan, Class } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { scopedBranches } from '@/lib/branch-scope'
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

function formatDateVN(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatTimeDisplay(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const minute = parseInt(m, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  if (minute === 0) return `${hour12}:00 ${ampm}`
  return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
}

export default function PlanModal({ isOpen, onClose, onSuccess, mode, plan, categories, classes }: PlanModalProps) {
  // Phân đoàn trưởng chỉ gán kế hoạch cho phân đoàn / lớp thuộc ngành mình
  const { scope } = useAuth()
  const BRANCHES = scopedBranches(scope)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [planDateEnd, setPlanDateEnd] = useState('')
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
        setPlanDateEnd(plan.plan_date)
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
        setPlanDateEnd(new Date().toISOString().split('T')[0])
        setTimeStart('')
        setTimeEnd('')
        setLocation('')
        setDescription('')
        setNotes('')
        // Phân đoàn trưởng không có lựa chọn "Tất cả": mặc định gán cho ngành mình
        setAssignType(scope.all ? 'none' : 'branch')
        setSelectedBranch(scope.all ? '' : scope.branch)

        setSelectedClassIds([])
      }
    }
  }, [isOpen, mode, plan, categories])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Vui lòng nhập tên kế hoạch'
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

  const dateDisplay = planDate
    ? planDateEnd && planDateEnd !== planDate
      ? `${formatDateVN(planDate)} - ${formatDateVN(planDateEnd)}`
      : formatDateVN(planDate)
    : 'Chưa chọn'
  const timeDisplay = timeStart && timeEnd
    ? `${formatTimeDisplay(timeStart)} - ${formatTimeDisplay(timeEnd)}`
    : 'Chưa chọn'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[16px] w-full max-w-[506px] max-h-[90vh] overflow-hidden shadow-xl flex flex-col relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-[25px] pb-[10px] flex flex-col gap-[10px] items-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-[85px] h-[85px]">
            <div className="bg-gradient-to-b from-[rgba(250,134,94,0.16)] to-transparent border border-[#fff0f3] rounded-full p-4">
              <div className="border border-[rgba(250,134,94,0.4)] rounded-full p-[14px] shadow-[0px_2px_4px_0px_rgba(223,28,65,0.04)]">
                <Plus className="w-[25px] h-[25px] text-brand" />
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="text-center w-full max-w-[442px]">
            <h2 className="text-[22px] font-semibold text-black dark:text-white">
              {mode === 'add' ? 'Thêm kế hoạch' : 'Sửa kế hoạch'}
            </h2>
            <p className="text-[12px] text-black/40 dark:text-white/40">
              Thêm công việc, kế hoạch, sự kiện trong tuần
            </p>
          </div>

          {/* Plan Name Card */}
          <div className="w-full max-w-[442px] border border-[#E5E1DC] dark:border-white/10 rounded-[16px] overflow-hidden">
            {/* Name Input */}
            <div className="border-b border-[#E5E1DC] dark:border-white/10 px-4 h-[41px] flex items-center">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Tên kế hoạch..."
                className={`w-full text-[14px] font-light bg-transparent outline-none placeholder-[#8a8c90] text-black dark:text-white ${
                  errors.title ? 'placeholder-red-400' : ''
                }`}
              />
            </div>
            {/* Date & Time Summary */}
            <div className="px-4 pt-3 pb-4 flex flex-col sm:flex-row gap-1">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-brand" />
                </div>
                <span className="text-[12px] text-black dark:text-white">Ngày: {dateDisplay}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-brand" />
                </div>
                <span className="text-[12px] text-black dark:text-white">Giờ: {timeDisplay}</span>
              </div>
            </div>
          </div>
          {errors.title && <p className="text-xs text-red-500 w-full max-w-[442px] -mt-1">{errors.title}</p>}

          {/* Date & Time Inputs (collapsible detail) */}
          <div className="w-full max-w-[442px] flex flex-col gap-[6px]">
            <p className="text-[12px] text-[#666D80]">Ngày & Giờ <span className="text-[#DF1C41]">*</span></p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <CustomDatePicker
                  value={planDate}
                  onChange={setPlanDate}
                  placeholder="Ngày bắt đầu"
                />
                {errors.planDate && <p className="text-xs text-red-500 mt-1">{errors.planDate}</p>}
              </div>
              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                  <input
                    type="time"
                    value={timeStart}
                    onChange={e => setTimeStart(e.target.value)}
                    className={`w-full h-[38px] px-4 bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] text-[12px] text-black dark:text-white outline-none ${
                      errors.timeStart ? 'ring-1 ring-red-500' : 'focus:ring-1 focus:ring-brand'
                    }`}
                  />
                </div>
                <span className="flex items-center text-[12px] text-[#8a8c90]">-</span>
                <div className="flex-1">
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={e => setTimeEnd(e.target.value)}
                    className={`w-full h-[38px] px-4 bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] text-[12px] text-black dark:text-white outline-none ${
                      errors.timeEnd ? 'ring-1 ring-red-500' : 'focus:ring-1 focus:ring-brand'
                    }`}
                  />
                </div>
              </div>
            </div>
            {(errors.timeStart || errors.timeEnd) && (
              <p className="text-xs text-red-500">{errors.timeStart || errors.timeEnd}</p>
            )}
          </div>

          {/* Category */}
          <div className="w-full max-w-[442px] flex flex-col gap-[6px]">
            <p className="text-[12px] text-[#666D80]">Loại hoạt động</p>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full h-[38px] px-4 bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] text-[12px] text-black dark:text-white outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
            >
              <option value="">Không phân loại</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Người tham dự (Assignment) */}
          <div className="w-full max-w-[442px] flex flex-col gap-[6px]">
            <p className="text-[12px]">
              <span className="text-[#666D80]">Người tham dự </span>
              <span className="text-[#DF1C41]">*</span>
            </p>
            <div className="flex items-center gap-3 mb-1">
              {scope.all && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === 'none'}
                  onChange={() => { setAssignType('none'); setSelectedBranch(''); setSelectedClassIds([]) }}
                  className="accent-[#FA865E] w-3.5 h-3.5"
                />
                <span className="text-[12px] text-black dark:text-white">Tất cả</span>
              </label>
              )}

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === 'branch'}
                  onChange={() => { setAssignType('branch'); setSelectedClassIds([]) }}
                  className="accent-[#FA865E] w-3.5 h-3.5"
                />
                <span className="text-[12px] text-black dark:text-white">Phân đoàn</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === 'class'}
                  onChange={() => { setAssignType('class'); setSelectedBranch('') }}
                  className="accent-[#FA865E] w-3.5 h-3.5"
                />
                <span className="text-[12px] text-black dark:text-white">Lớp</span>
              </label>
            </div>

            {assignType === 'branch' && (
              <div>
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className={`w-full h-[38px] px-4 bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] text-[12px] text-black dark:text-white outline-none appearance-none cursor-pointer ${
                    errors.branch ? 'ring-1 ring-red-500' : 'focus:ring-1 focus:ring-brand'
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
                <div className="bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] p-3 max-h-[120px] overflow-y-auto space-y-2">
                  {BRANCHES.map(branch => {
                    const branchClasses = classesByBranch[branch]
                    if (!branchClasses || branchClasses.length === 0) return null
                    return (
                      <div key={branch}>
                        <p className="text-[10px] font-semibold text-[#8a8c90] mb-1">{branch}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {branchClasses.map(cls => (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => toggleClassId(cls.id)}
                              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                                selectedClassIds.includes(cls.id)
                                  ? 'bg-brand text-white border-brand'
                                  : 'bg-white dark:bg-white/10 text-black dark:text-white border-[#E5E1DC] dark:border-white/20 hover:border-brand'
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

          {/* Mô tả */}
          <div className="w-full max-w-[442px] flex flex-col gap-[6px]">
            <p className="text-[12px] text-[#666D80]">Mô tả</p>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả kế hoạch..."
              className="w-full h-[38px] px-4 bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] text-[12px] text-black dark:text-white outline-none placeholder-[#8a8c90] focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Link đính kèm */}
          <div className="w-full max-w-[442px] flex flex-col gap-[6px]">
            <p className="text-[12px] text-[#666D80]">Link đính kèm</p>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="https://..."
              className="w-full h-[38px] px-4 bg-[#f6f6f6] dark:bg-white/10 rounded-[12px] text-[12px] text-black dark:text-white outline-none placeholder-[#8a8c90] focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="w-full max-w-[442px] p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[12px]">
              <p className="text-[12px] text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 w-full max-w-[442px] cursor-pointer pt-1 pb-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-[38px] bg-[#f6f6f6] dark:bg-white/10 rounded-full text-[14px] font-bold text-black dark:text-white hover:bg-[#eee] dark:hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-[38px] bg-brand rounded-full text-[14px] font-bold text-white hover:bg-[#e8764f] transition-colors shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Đang lưu...' : mode === 'add' ? 'Tạo kế hoạch' : 'Lưu kế hoạch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
