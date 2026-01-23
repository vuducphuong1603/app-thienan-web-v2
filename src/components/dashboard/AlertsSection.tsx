'use client'

import { ArrowUpRight, Sparkles, Clock, User, Check, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Alert {
  id: string
  title: string
  time: string
  source: string
  status: 'pending' | 'resolved'
  priority: 'low' | 'high'
}

const alerts: Alert[] = [
  {
    id: '1',
    title: 'Báo cáo tuần 2 đã sẵn sàng',
    time: '2 giờ trước',
    source: 'System',
    status: 'pending',
    priority: 'low',
  },
  {
    id: '2',
    title: 'Báo cáo tuần 1 đã sẵn sàng',
    time: '2 tuần trước',
    source: 'System',
    status: 'resolved',
    priority: 'high',
  },
]

export default function AlertsSection() {
  return (
    <div className="bg-white dark:bg-white/10 rounded-[15px] border border-white/60 dark:border-white/10 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-sm font-semibold text-black dark:text-white">Hệ thống cảnh báo</h3>
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
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-[#f6f6f6] dark:bg-white/5 rounded-[15px] p-3"
          >
            {/* Top Row - Badges */}
            <div className="flex items-center gap-2 mb-2">
              {/* Checkbox */}
              <div
                className={`w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 ${alert.status === 'resolved'
                    ? 'bg-[#FA865E]'
                    : 'border-2 border-gray-300 bg-white'
                  }`}
              >
                {alert.status === 'resolved' && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-[#e5e1dc] dark:bg-white/10 rounded-md px-1.5 py-0.5">
                <span className="text-[10px] text-black dark:text-white">
                  {alert.status === 'pending' ? 'Chưa xử lý' : 'Đã xử lý'}
                </span>
              </div>

              {/* Priority Badge */}
              <div className="flex items-center gap-1 bg-[#e5e1dc] dark:bg-white/10 rounded-md px-1.5 py-0.5">
                <AlertTriangle className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                <span className="text-[10px] text-black dark:text-white">
                  Mức độ: {alert.priority === 'high' ? 'Cao' : 'Thấp'}
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
                <span className="text-[10px] text-black dark:text-white">{alert.time}</span>
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
        ))}
      </div>
    </div>
  )
}
