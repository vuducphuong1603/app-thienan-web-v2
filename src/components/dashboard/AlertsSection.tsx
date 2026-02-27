'use client'

import { ArrowUpRight, Sparkles, Clock, User, Check, AlertTriangle, Bell } from 'lucide-react'
import Link from 'next/link'
import { useDashboardAlerts } from '@/lib/queries'
import { ALERT_SEVERITY_LABELS } from '@/lib/supabase'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} ngày trước`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks} tuần trước`
}

export default function AlertsSection() {
  const { data: alerts, isLoading } = useDashboardAlerts()

  return (
    <div className="bg-white dark:bg-white/10 rounded-[15px] border border-white/60 dark:border-white/10 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-black dark:text-white">Hệ thống cảnh báo</h3>
        </div>
        <Link
          href="/admin/alerts"
          className="w-8 h-8 bg-[#f6f6f6] dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        >
          <ArrowUpRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Link>
      </div>

      {/* Alerts List */}
      <div className="px-3 pb-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <svg className="animate-spin w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Bell className="w-5 h-5 text-[#8a8c90] mb-1" strokeWidth={1.5} />
            <p className="text-[10px] text-[#8a8c90]">Không có cảnh báo</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isResolved = alert.status === 'resolved' || alert.status === 'dismissed'
            const statusLabel = alert.status === 'unread' ? 'Chưa đọc' : alert.status === 'read' ? 'Đã đọc' : alert.status === 'resolved' ? 'Đã xử lý' : 'Đã bỏ qua'

            return (
              <div
                key={alert.id}
                className="bg-[#f6f6f6] dark:bg-white/5 rounded-[15px] p-3"
              >
                {/* Top Row - Badges */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Checkbox */}
                  <div
                    className={`w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 ${
                      isResolved
                        ? 'bg-[#FA865E]'
                        : 'border-2 border-gray-300 bg-white'
                    }`}
                  >
                    {isResolved && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 bg-[#e5e1dc] dark:bg-white/10 rounded-md px-1.5 py-0.5">
                    <span className="text-[10px] text-black dark:text-white">
                      {statusLabel}
                    </span>
                  </div>

                  {/* Priority Badge */}
                  <div className="flex items-center gap-1 bg-[#e5e1dc] dark:bg-white/10 rounded-md px-1.5 py-0.5">
                    <AlertTriangle className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    <span className="text-[10px] text-black dark:text-white">
                      Mức độ: {ALERT_SEVERITY_LABELS[alert.severity] || alert.severity}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <p className="text-xs text-black dark:text-white mb-1.5 font-medium">{alert.title}</p>

                {/* Divider */}
                <div className="w-full h-px bg-gray-200 dark:bg-white/10 mb-1.5" />

                {/* Meta Info */}
                <div className="flex items-center gap-4">
                  {/* Time */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-[#8a8c90]" />
                      <span className="text-[10px] text-[#8a8c90]">Thời gian</span>
                    </div>
                    <span className="text-[10px] text-black dark:text-white">{timeAgo(alert.created_at)}</span>
                  </div>

                  {/* Source */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <User className="w-3 h-3 text-[#8a8c90]" />
                      <span className="text-[10px] text-[#8a8c90]">Nguồn</span>
                    </div>
                    <span className="text-[10px] text-black dark:text-white">{alert.source}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
