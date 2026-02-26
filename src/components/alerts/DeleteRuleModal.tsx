'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DeleteRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  ruleId: string
  ruleName: string
}

export default function DeleteRuleModal({ isOpen, onClose, onConfirm, ruleId, ruleName }: DeleteRuleModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const { error: err } = await supabase.from('alert_rules').delete().eq('id', ruleId)
      if (err) throw err
      onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1a1a2e] rounded-[20px] w-full max-w-[400px] p-6 shadow-xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-semibold text-center text-black dark:text-white mb-2">
          Xóa quy tắc cảnh báo
        </h3>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-5">
          Bạn có chắc muốn xóa quy tắc &quot;{ruleName}&quot;? Hành động này không thể hoàn tác.
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-10 bg-gray-100 dark:bg-white/10 text-black dark:text-white text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 h-10 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}
