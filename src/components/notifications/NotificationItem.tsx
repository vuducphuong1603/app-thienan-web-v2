'use client'

import { useState } from 'react'
import { Clock, User, AlertTriangle, ArrowUp, Minus, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
import { NotificationWithStatus, NotificationPriority } from '@/lib/supabase'

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'Vừa xong'
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const config = {
    high: { label: 'Ưu tiên cao', icon: ArrowUp, className: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 ring-1 ring-red-200 dark:ring-red-800/40' },
    normal: { label: 'Bình thường', icon: Minus, className: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800/40' },
    low: { label: 'Thấp', icon: ArrowDown, className: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-white/10 ring-1 ring-gray-200 dark:ring-white/10' },
  }
  const { label, icon: Icon, className } = config[priority]

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

interface NotificationItemProps {
  notification: NotificationWithStatus
  showReadStatus?: boolean
  compact?: boolean
}

export default function NotificationItem({ notification, showReadStatus = true, compact = false }: NotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isUnread = !notification.is_read && showReadStatus

  return (
    <div
      className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
        isUnread
          ? 'bg-brand/5 dark:bg-brand/10 ring-2 ring-brand/40 hover:ring-brand/60 hover:bg-brand/8 dark:hover:bg-brand/15'
          : 'bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eeeeee] dark:hover:bg-white/8'
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Unread accent bar */}
      {isUnread && (
        <div className="absolute left-0 top-4 bottom-4 w-1 bg-brand rounded-full" />
      )}

      {/* Top Row - Badges */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {showReadStatus && (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
              notification.is_read
                ? 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                : 'bg-brand text-white'
            }`}>
              <div className={`w-2 h-2 rounded-full ${notification.is_read ? 'bg-gray-400' : 'bg-white animate-pulse'}`} />
              <span className="text-xs">
                {notification.is_read ? 'Đã đọc' : 'Chưa đọc'}
              </span>
            </div>
          )}
          <PriorityBadge priority={notification.priority} />
        </div>
        {!compact && (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            isExpanded ? 'bg-brand/10 dark:bg-brand/20' : 'bg-gray-100 dark:bg-white/10'
          }`}>
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-brand" />
              : <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            }
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className={`text-black dark:text-white font-bold mb-1.5 leading-snug ${compact ? 'text-sm' : 'text-base'}`}>
        {notification.title}
      </h3>

      {/* Content */}
      {!compact && (
        <p className={`text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap leading-relaxed ${
          isExpanded ? '' : 'line-clamp-2'
        }`}>
          {notification.content}
        </p>
      )}

      {/* Divider */}
      <div className="w-full h-px bg-gray-200 dark:bg-white/10 mb-2.5" />

      {/* Meta Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatTimeAgo(notification.created_at)}</span>
        </div>
        {notification.creator_name && (
          <>
            <div className="w-px h-4 bg-gray-300 dark:bg-white/15" />
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{notification.creator_name}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Simplified version for admin management page
export function NotificationAdminItem({
  notification,
  onDelete,
}: {
  notification: {
    id: string
    title: string
    content: string
    target_type: string
    target_values: string[]
    priority: string
    created_at: string
    creator_name?: string
  }
  onDelete: (id: string) => void
}) {
  const targetLabel = {
    all: 'Tất cả',
    role: 'Vai trò',
    branch: 'Ngành',
    class: 'Lớp',
    student: 'Thiếu nhi',
  }[notification.target_type] || notification.target_type

  return (
    <div className="bg-white dark:bg-white/10 rounded-[25px] p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-1.5">
          <PriorityBadge priority={notification.priority as NotificationPriority} />
          <div className="flex items-center gap-1 bg-[#e5e1dc] dark:bg-white/10 rounded-md px-1.5 py-0.5">
            <AlertTriangle className="w-3 h-3 text-gray-600 dark:text-gray-300" />
            <span className="text-[10px] text-black dark:text-white">
              {targetLabel}: {notification.target_type === 'all' ? 'Tất cả' : notification.target_values.join(', ')}
            </span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-black dark:text-white mb-0.5">{notification.title}</h4>

        {/* Content */}
        <p className="text-sm text-black/40 dark:text-white/40 font-light mb-2 line-clamp-2">{notification.content}</p>

        {/* Meta */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/40 dark:text-white/40">{formatTimeAgo(notification.created_at)}</span>
          </div>
          {notification.creator_name && (
            <>
              <div className="w-px h-4 bg-black/20 dark:bg-white/20" />
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
                <span className="text-xs text-black/40 dark:text-white/40">{notification.creator_name}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(notification.id)}
        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
      >
        Xoá
      </button>
    </div>
  )
}
