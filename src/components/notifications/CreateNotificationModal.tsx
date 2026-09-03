'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, ROLE_LABELS, UserRole, NotificationTargetType, NotificationPriority } from '@/lib/supabase'
import { useActiveClasses, useInvalidateQueries } from '@/lib/queries'
import { useAuth } from '@/lib/auth-context'
import { scopedBranches, filterByClassId } from '@/lib/branch-scope'

interface CreateNotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateNotificationModal({ isOpen, onClose }: CreateNotificationModalProps) {
  const { user, scope } = useAuth()
  const { invalidateNotifications } = useInvalidateQueries()
  const { data: activeClasses } = useActiveClasses()
  // Phân đoàn trưởng: chỉ gửi cho ngành / lớp / thiếu nhi thuộc ngành mình
  const BRANCHES = scopedBranches(scope)
  const targetTypes: NotificationTargetType[] = scope.all ? ['all', 'role', 'branch', 'class', 'student'] : ['branch', 'class', 'student']
  const defaultTargetType: NotificationTargetType = scope.all ? 'all' : 'branch'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<NotificationPriority>('normal')
  const [targetType, setTargetType] = useState<NotificationTargetType>('all')
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState<{ id: string; full_name: string; saint_name?: string; class_id?: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group classes by branch
  const classesByBranch: Record<string, typeof activeClasses> = {}
  if (activeClasses) {
    for (const cls of activeClasses) {
      const branch = cls.branch || 'Khác'
      if (!classesByBranch[branch]) classesByBranch[branch] = []
      classesByBranch[branch]!.push(cls)
    }
  }

  // Fetch students for student target type
  useEffect(() => {
    if (targetType === 'student') {
      supabase
        .from('thieu_nhi')
        .select('id, full_name, saint_name, class_id')
        .eq('status', 'ACTIVE')
        .order('full_name')
        .then(({ data }) => {
          setStudents(filterByClassId(data || [], activeClasses || [], scope))
        })
    }
  }, [targetType, activeClasses, scope])

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setContent('')
      setPriority('normal')
      setTargetType(defaultTargetType)
      setSelectedValues([])
      setStudentSearch('')
      setError(null)
    }
  }, [isOpen])

  const toggleValue = (value: string) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const filteredStudents = students.filter(s => {
    const name = `${s.saint_name || ''} ${s.full_name}`.toLowerCase()
    return name.includes(studentSearch.toLowerCase())
  })

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề')
      return
    }
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung')
      return
    }
    if (targetType !== 'all' && selectedValues.length === 0) {
      setError('Vui lòng chọn đối tượng nhận')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Insert notification
      const { data: notification, error: insertError } = await supabase
        .from('notifications')
        .insert({
          title: title.trim(),
          content: content.trim(),
          target_type: targetType,
          target_values: targetType === 'all' ? [] : selectedValues,
          priority,
          created_by: user?.id,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // 2. Resolve recipients
      let recipientUserIds: string[] = []

      if (targetType === 'all') {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('status', 'ACTIVE')
        recipientUserIds = (data || []).map(u => u.id)
      } else if (targetType === 'role') {
        const { data } = await supabase
          .from('users')
          .select('id')
          .in('role', selectedValues)
          .eq('status', 'ACTIVE')
        recipientUserIds = (data || []).map(u => u.id)
      } else if (targetType === 'branch') {
        const { data } = await supabase
          .from('users')
          .select('id')
          .in('branch', selectedValues)
          .eq('status', 'ACTIVE')
        recipientUserIds = (data || []).map(u => u.id)
      } else if (targetType === 'class') {
        const { data } = await supabase
          .from('users')
          .select('id')
          .in('class_id', selectedValues)
          .eq('status', 'ACTIVE')
        recipientUserIds = (data || []).map(u => u.id)
      } else if (targetType === 'student') {
        // Get class_ids from selected students
        const selectedStudents = students.filter(s => selectedValues.includes(s.id))
        const classIds = Array.from(new Set(selectedStudents.map(s => s.class_id).filter(Boolean))) as string[]
        if (classIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .in('class_id', classIds)
            .eq('status', 'ACTIVE')
          recipientUserIds = (data || []).map(u => u.id)
        }
      }

      // Deduplicate
      recipientUserIds = Array.from(new Set(recipientUserIds))

      // 3. Bulk insert recipients
      if (recipientUserIds.length > 0) {
        const recipients = recipientUserIds.map(userId => ({
          notification_id: notification.id,
          user_id: userId,
        }))

        // Insert in batches of 500 to avoid payload limits
        for (let i = 0; i < recipients.length; i += 500) {
          const batch = recipients.slice(i, i + 500)
          const { error: recipientError } = await supabase
            .from('notification_recipients')
            .insert(batch)
          if (recipientError) throw recipientError
        }
      }

      invalidateNotifications()
      onClose()
    } catch (err: unknown) {
      console.error('Error creating notification:', err)
      setError((err as { message?: string })?.message || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const roles: UserRole[] = ['admin', 'phan_doan_truong', 'giao_ly_vien']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-[520px] max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E1DC] dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black dark:text-white">Tạo thông báo mới</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f6f6f6] dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề thông báo..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nhập nội dung thông báo..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mức độ
            </label>
            <div className="flex items-center gap-4">
              {(['low', 'normal', 'high'] as const).map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="accent-[#FA865E]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {p === 'low' ? 'Thấp' : p === 'normal' ? 'Bình thường' : 'Cao'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Đối tượng nhận
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {targetTypes.map(t => (

                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === t}
                    onChange={() => { setTargetType(t); setSelectedValues([]) }}
                    className="accent-[#FA865E]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t === 'all' ? 'Tất cả' : t === 'role' ? 'Vai trò' : t === 'branch' ? 'Ngành' : t === 'class' ? 'Lớp' : 'Thiếu nhi'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Target Values Selection */}
          {targetType === 'all' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Gửi đến tất cả người dùng trong hệ thống
            </p>
          )}

          {targetType === 'role' && (
            <div className="border border-gray-300 dark:border-white/20 rounded-lg p-3 space-y-2">
              {roles.map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(role)}
                    onChange={() => toggleValue(role)}
                    className="accent-[#FA865E] w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          )}

          {targetType === 'branch' && (
            <div className="border border-gray-300 dark:border-white/20 rounded-lg p-3 space-y-2">
              {BRANCHES.map(branch => (
                <label key={branch} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(branch)}
                    onChange={() => toggleValue(branch)}
                    className="accent-[#FA865E] w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{branch}</span>
                </label>
              ))}
            </div>
          )}

          {targetType === 'class' && (
            <div className="border border-gray-300 dark:border-white/20 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-3">
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
                          onClick={() => toggleValue(cls.id)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                            selectedValues.includes(cls.id)
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
          )}

          {targetType === 'student' && (
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                Thông báo sẽ được gửi đến Giáo lý viên phụ trách lớp của thiếu nhi đã chọn.
              </p>
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Tìm kiếm thiếu nhi..."
                className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20 transition-colors"
              />
              <div className="border border-gray-300 dark:border-white/20 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">Không tìm thấy</p>
                ) : (
                  filteredStudents.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(s.id)}
                        onChange={() => toggleValue(s.id)}
                        className="accent-[#FA865E] w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {s.saint_name ? `${s.saint_name} ` : ''}{s.full_name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
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
            className="flex-1 h-[44px] bg-brand rounded-xl text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Đang gửi...' : 'Gửi thông báo'}
          </button>
        </div>
      </div>
    </div>
  )
}
