'use client'

import { useState, useEffect } from 'react'

interface DeleteStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  studentName?: string
}

export default function DeleteStudentModal({ isOpen, onClose, onConfirm, studentName }: DeleteStudentModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset error when modal opens
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
      console.error('Error deleting student:', err)
      setError((err as { message?: string })?.message || 'Có lỗi xảy ra khi xóa')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[400px] overflow-hidden shadow-xl">
        {/* Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Icon - Door/Exit icon matching Figma */}
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="#E8651A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="#E8651A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="#E8651A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-black mb-2">Xóa thiếu nhi?</h2>

          {/* Description */}
          <p className="text-sm text-primary-3 text-center mb-4">
            Bạn chắc chắn muốn xóa thiếu nhi <span className="font-medium text-black">{studentName}</span>?
          </p>

          {/* Error message */}
          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="w-full flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 h-[44px] bg-white border border-[#E5E1DC] rounded-xl text-sm font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 h-[44px] bg-brand rounded-xl text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
