'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useUnreadNotifications, useInvalidateQueries } from '@/lib/queries'
import NotificationItem from './NotificationItem'

export default function NotificationPopup() {
  const { user } = useAuth()
  const { data: unreadNotifications, isLoading } = useUnreadNotifications(user?.id)
  const { invalidateNotifications } = useInvalidateQueries()
  const [isOpen, setIsOpen] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [hasDismissed, setHasDismissed] = useState(false)

  // Auto-open when unread notifications exist (only once per session)
  useEffect(() => {
    if (!isLoading && unreadNotifications && unreadNotifications.length > 0 && !hasDismissed) {
      setIsOpen(true)
    }
  }, [unreadNotifications, isLoading, hasDismissed])

  const handleClose = async () => {
    if (!unreadNotifications || unreadNotifications.length === 0) {
      setIsOpen(false)
      setHasDismissed(true)
      return
    }

    setIsMarking(true)
    try {
      // Mark all unread as read
      const recipientIds = unreadNotifications.map(n => n.recipient_id)
      const { error } = await supabase
        .from('notification_recipients')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', recipientIds)

      if (error) throw error

      invalidateNotifications()
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    } finally {
      setIsMarking(false)
      setIsOpen(false)
      setHasDismissed(true)
    }
  }

  if (!isOpen || !unreadNotifications || unreadNotifications.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-[880px] max-h-[88vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200/50 dark:border-white/10">
        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-200 dark:border-white/10 flex items-center gap-4 bg-gradient-to-r from-brand/5 to-transparent dark:from-brand/10">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-brand/15 flex items-center justify-center">
              <Bell className="w-6 h-6 text-brand" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#1a1a1a]">
              {unreadNotifications.length}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">Thông báo mới</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Bạn có <span className="text-brand font-bold">{unreadNotifications.length}</span> thông báo chưa đọc
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-5 overflow-y-auto flex-1 space-y-3">
          {unreadNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              showReadStatus={false}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
          <button
            onClick={handleClose}
            disabled={isMarking}
            className="w-full h-12 bg-brand rounded-xl text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand/25"
          >
            {isMarking && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isMarking ? 'Đang đánh dấu đã đọc...' : 'Đánh dấu đã đọc & Đóng'}
          </button>
        </div>
      </div>
    </div>
  )
}
