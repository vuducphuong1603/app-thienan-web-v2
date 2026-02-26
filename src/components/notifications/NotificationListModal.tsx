'use client'

import { useState } from 'react'
import { X, Bell, Inbox } from 'lucide-react'
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
  const totalCount = notifications?.length || 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-[920px] max-h-[88vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200/50 dark:border-white/10">
        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-brand/5 to-transparent dark:from-brand/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/15 flex items-center justify-center">
              <Bell className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">Thông báo của tôi</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {totalCount} thông báo
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-brand text-white text-xs font-bold rounded-full">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-7 py-3.5 border-b border-gray-200 dark:border-white/10 flex items-center gap-2.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              filter === 'all'
                ? 'bg-brand text-white shadow-md shadow-brand/25'
                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              filter === 'unread'
                ? 'bg-brand text-white shadow-md shadow-brand/25'
                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-5 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-brand mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải thông báo...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {filter === 'unread' ? 'Bạn đã đọc hết thông báo rồi!' : 'Thông báo mới sẽ hiển thị tại đây'}
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
        <div className="px-7 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
          <button
            onClick={onClose}
            className="w-full h-12 bg-gray-900 dark:bg-white/15 rounded-xl text-sm font-bold text-white hover:bg-gray-800 dark:hover:bg-white/20 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
