'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCcw, UserPlus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { StoredAccount } from '@/lib/account-manager'

interface SwitchAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SwitchAccountModal({ isOpen, onClose }: SwitchAccountModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { user, storedAccounts, switchAccount, removeAccount, logout } = useAuth()
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleSwitch = async (account: StoredAccount) => {
    if (account.userId === user?.id) return
    setError(null)
    setSwitchingUserId(account.userId)

    const result = await switchAccount(account.userId)
    if (!result.success) {
      setError(result.error || 'Lỗi chuyển tài khoản')
    } else {
      onClose()
    }
    setSwitchingUserId(null)
  }

  const handleRemove = (userId: string) => {
    if (userId === user?.id) return
    removeAccount(userId)
    setError(null)
  }

  const handleAddAccount = () => {
    onClose()
    // Must logout first — otherwise route protection blocks /login since user is still logged in
    // Stored accounts persist across logout, so old account stays in the list
    logout()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-[#1a1a1a] rounded-[16px] w-[360px] max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 pb-3 flex items-center gap-3">
          <div className="flex items-start p-2.5 rounded-full bg-gradient-to-b from-[rgba(250,134,94,0.16)] to-transparent border border-[#fff0f3]">
            <RefreshCcw className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Chuyển đổi tài khoản</h2>
            <p className="text-xs text-black/40 dark:text-white/60">Chọn tài khoản để chuyển sang</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Account list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          <div className="flex flex-col gap-2">
            {storedAccounts.map((account) => {
              const isCurrent = account.userId === user?.id
              const isSwitching = switchingUserId === account.userId

              return (
                <div
                  key={account.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-brand/5 border border-brand/20'
                      : 'bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eeeeee] dark:hover:bg-white/10'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-orange-100 flex items-center justify-center">
                    {account.avatarUrl ? (
                      <Image
                        src={account.avatarUrl}
                        alt={account.fullName}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">
                      {account.fullName}
                    </p>
                    <p className="text-xs text-black/40 dark:text-white/60 truncate">
                      {ROLE_LABELS[account.role]} {account.phone ? `- ${account.phone}` : ''}
                    </p>
                  </div>

                  {/* Action */}
                  {isCurrent ? (
                    <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleSwitch(account)}
                        disabled={!!switchingUserId}
                        className="px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-full hover:bg-brand/90 transition-colors disabled:opacity-50"
                      >
                        {isSwitching ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Chuyển'
                        )}
                      </button>
                      <button
                        onClick={() => handleRemove(account.userId)}
                        disabled={!!switchingUserId}
                        className="p-1.5 text-black/30 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {storedAccounts.length === 0 && (
              <p className="text-xs text-black/40 dark:text-white/60 text-center py-4">
                Chưa có tài khoản nào được lưu
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 border-t border-[#e5e1dc] dark:border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-[38px] px-4 py-2 bg-[#f6f6f6] dark:bg-white/10 rounded-full text-sm font-medium text-black dark:text-white hover:bg-[#e5e1dc] dark:hover:bg-white/20 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleAddAccount}
            className="flex-1 h-[38px] px-4 py-2 bg-brand rounded-full text-sm font-medium text-white hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Thêm tài khoản
          </button>
        </div>
      </div>
    </div>
  )
}
