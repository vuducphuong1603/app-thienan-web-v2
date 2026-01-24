'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { HelpCircle, Moon, RefreshCcw, LogOut, CheckCircle } from 'lucide-react'
import LogoutModal from './LogoutModal'

interface UserDropdownProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  userRole: string
  userEmail: string
  userAvatar?: string
  onLogout: () => void
  onHelp?: () => void
  onThemeToggle?: () => void
  onSwitchAccount?: () => void
}

export default function UserDropdown({
  isOpen,
  onClose,
  userName,
  userRole,
  userEmail,
  userAvatar,
  onLogout,
  onHelp,
  onThemeToggle,
  onSwitchAccount,
}: UserDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true)
  }

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false)
    onClose()
    onLogout()
  }

  const handleLogoutCancel = () => {
    setIsLogoutModalOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const menuItems = [
    {
      icon: HelpCircle,
      label: 'Trợ giúp và hỗ trợ',
      onClick: onHelp,
    },
    {
      icon: Moon,
      label: 'Màn hình và trợ năng',
      onClick: onThemeToggle,
    },
    {
      icon: RefreshCcw,
      label: 'Chuyển đổi tài khoản',
      onClick: onSwitchAccount,
    },
    {
      icon: LogOut,
      label: 'Đăng xuất',
      onClick: handleLogoutClick,
    },
  ]

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-[310px] bg-white dark:bg-[#1a1a1a] dark:border-white/10 border border-[#e5e1dc] rounded-[15px] shadow-[2px_3px_4px_0px_rgba(0,0,0,0.25)] z-50"
    >
      <div className="p-4">
        {/* Header */}
        <p className="text-xs text-black dark:text-white mb-4">Đang đăng nhập</p>

        {/* User Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-[63px] h-[63px] rounded-full overflow-hidden flex-shrink-0 border-2 border-brand">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={63}
                  height={63}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-brand" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* User Details */}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-black dark:text-white">{userName}</p>
              <p className="text-xs text-black/40 dark:text-white/60">{userRole}</p>
              <p className="text-xs text-black/40 dark:text-white/60">{userEmail}</p>
            </div>
          </div>

          {/* Checkmark */}
          <CheckCircle className="w-7 h-7 text-black/60 dark:text-white/60" />
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#666d80] dark:bg-white/20 mb-4" />

        {/* Menu Items */}
        <div className="flex flex-col gap-3">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="flex items-center gap-3 w-full px-1 py-2 hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg transition-colors text-left"
            >
              <item.icon className="w-[18px] h-[18px] text-black dark:text-white" />
              <span className="text-xs text-black dark:text-white">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  )
}
