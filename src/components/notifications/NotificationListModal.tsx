'use client'

import { useState } from 'react'
import { X, Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useMyNotifications } from '@/lib/queries'
import NotificationItem from './NotificationItem'

interface NotificationListModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationListModal({ isOpen, onClose }: NotificationListModalProps) {
  const { user } = useAuth()
  const { data: notifications, isLoading } = useMyNotifications(user?.id)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  if (!isOpen) return null

  const filtered = filter === 'unread'
    ? (notifications || []).filter(n => !n.is_read)
    : (notifications || [])

  const unreadCount = (notifications || []).filter(n => !n.is_read).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-[520px] max-h-[80vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E1DC] dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">Thông báo của tôi</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {notifications?.length || 0} thông báo{unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f6f6f6] dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-[#E5E1DC] dark:border-white/10 flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-brand text-white'
                : 'bg-[#f6f6f6] dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              filter === 'unread'
                ? 'bg-brand text-white'
                : 'bg-[#f6f6f6] dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="w-7 h-7 text-[#8a8c90] mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#8a8c90]">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </p>
            </div>
          ) : (
            filtered.map(notification => (
              <NotificationItem
                key={notification.recipient_id}
                notification={notification}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E1DC] dark:border-white/10">
          <button
            onClick={onClose}
            className="w-full h-[44px] bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/20 rounded-xl text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
