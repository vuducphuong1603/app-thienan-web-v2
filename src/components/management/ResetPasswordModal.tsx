'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'

interface ResetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  userName?: string
}

export default function ResetPasswordModal({ isOpen, onClose, onConfirm }: ResetPasswordModalProps) {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error resetting password:', error)
    } finally {
      setIsResetting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[400px] overflow-hidden shadow-xl">
        {/* Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-brand" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-black mb-2">Reset mat khau?</h2>

          {/* Description */}
          <p className="text-sm text-primary-3 text-center mb-6">
            Ban chac chan muon reset mat khau cua nguoi dung ve 123456?
          </p>

          {/* Buttons */}
          <div className="w-full flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isResetting}
              className="flex-1 h-[44px] bg-white border border-[#E5E1DC] rounded-xl text-sm font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Huy
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex-1 h-[44px] bg-brand rounded-xl text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResetting && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isResetting ? 'Dang reset...' : 'Reset mat khau'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
