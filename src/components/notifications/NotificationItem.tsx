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
    high: { label: 'Cao', icon: ArrowUp, className: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    normal: { label: 'Bình thường', icon: Minus, className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    low: { label: 'Thấp', icon: ArrowDown, className: 'text-gray-600 bg-gray-100 dark:bg-white/10' },
  }
  const { label, icon: Icon, className } = config[priority]

  return (
    <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${className}`}>
      <Icon className="w-3 h-3" />
      <span className="text-[10px] font-medium">{label}</span>
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

  return (
    <div
      className={`bg-[#f6f6f6] dark:bg-white/5 rounded-[15px] p-3 cursor-pointer hover:bg-[#efefef] dark:hover:bg-white/8 transition-colors ${
        !notification.is_read && showReadStatus ? 'ring-1 ring-brand/30' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Top Row - Badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {showReadStatus && (
            <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
              notification.is_read
                ? 'bg-[#e5e1dc] dark:bg-white/10'
                : 'bg-brand/10 text-brand'
            }`}>
              <span className="text-[10px] font-medium">
                {notification.is_read ? 'Đã đọc' : 'Chưa đọc'}
              </span>
            </div>
          )}
          <PriorityBadge priority={notification.priority} />
        </div>
        {!compact && (
          isExpanded
            ? <ChevronUp className="w-4 h-4 text-[#8a8c90]" />
            : <ChevronDown className="w-4 h-4 text-[#8a8c90]" />
        )}
      </div>

      {/* Title */}
      <p className={`text-black dark:text-white font-medium mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        {notification.title}
      </p>

      {/* Content */}
      {!compact && (
        <p className={`text-xs text-black/50 dark:text-white/50 mb-2 whitespace-pre-wrap ${
          isExpanded ? '' : 'line-clamp-2'
        }`}>
          {notification.content}
        </p>
      )}

      {/* Divider */}
      <div className="w-full h-px bg-gray-200 dark:bg-white/10 mb-1.5" />

      {/* Meta Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#8a8c90]" />
          <span className="text-[10px] text-[#8a8c90]">{formatTimeAgo(notification.created_at)}</span>
        </div>
        {notification.creator_name && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#8a8c90]" />
            <span className="text-[10px] text-[#8a8c90]">{notification.creator_name}</span>
          </div>
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
