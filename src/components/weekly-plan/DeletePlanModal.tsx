'use client'

import { useState, useEffect } from 'react'

interface DeletePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  planTitle?: string
}

export default function DeletePlanModal({ isOpen, onClose, onConfirm, planTitle }: DeletePlanModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setError(null)
    }
  }, [isOpen])

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: unknown) {
      console.error('Error deleting plan:', err)
      setError((err as { message?: string })?.message || 'Có lỗi xảy ra khi xóa')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-[400px] overflow-hidden shadow-xl">
        <div className="p-6 flex flex-col items-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-xl font-bold text-black dark:text-white mb-2">Xóa kế hoạch?</h2>

          <p className="text-sm text-primary-3 text-center mb-4">
            Bạn chắc chắn muốn xóa kế hoạch <span className="font-medium text-black dark:text-white">{planTitle}</span>?
          </p>

          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="w-full flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 h-[44px] bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/20 rounded-xl text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 h-[44px] bg-red-500 rounded-xl text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
