'use client'

import { useEffect, useRef } from 'react'
import { LogOut } from 'lucide-react'

interface LogoutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-[#1a1a1a] rounded-[16px] p-8 w-[320px] flex flex-col gap-4 items-center"
      >
        {/* Icon */}
        <div className="flex items-start p-4 rounded-full bg-gradient-to-b from-[rgba(250,134,94,0.16)] to-transparent border border-[#fff0f3]">
          <div className="flex items-center justify-center p-3.5 rounded-full border border-brand/40 shadow-[0px_2px_4px_0px_rgba(223,28,65,0.04)]">
            <LogOut className="w-6 h-6 text-brand" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 text-center w-full">
          <h2 className="text-[22px] font-semibold text-black dark:text-white">Đăng xuất</h2>
          <p className="text-xs text-black/40 dark:text-white/60">
            Bạn chắc chắn muốn đăng xuất Giáo xứ Thiên Ân?
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 w-full">
          <button
            onClick={onClose}
            className="flex-1 h-[38px] px-4 py-2 bg-[#f6f6f6] dark:bg-white/10 rounded-full text-base font-semibold text-black dark:text-white hover:bg-[#e5e1dc] dark:hover:bg-white/20 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-[38px] px-4 py-2 bg-brand rounded-full text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] hover:bg-brand/90 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
