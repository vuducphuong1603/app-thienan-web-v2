'use client'

import { ArrowUpRight, Sparkles, Clock, User, Check, AlertTriangle } from 'lucide-react'

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
    <div className="bg-white rounded-[15px] border border-white/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gray-700" />
          <h3 className="text-base font-semibold text-black">Hệ thống cảnh báo</h3>
        </div>
        <button className="w-12 h-12 bg-[#f6f6f6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Alerts List */}
      <div className="px-4 pb-4 space-y-2.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-[#f6f6f6] rounded-[20px] p-4"
          >
            {/* Top Row - Badges */}
            <div className="flex items-center gap-2 mb-3">
              {/* Checkbox */}
              <div
                className={`w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 ${
                  alert.status === 'resolved'
                    ? 'bg-[#FA865E]'
                    : 'border-2 border-gray-300 bg-white'
                }`}
              >
                {alert.status === 'resolved' && (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-[#e5e1dc] rounded-md px-2 py-1">
                <span className="text-[10px] text-black">
                  {alert.status === 'pending' ? 'Chưa xử lý' : 'Đã xử lý'}
                </span>
              </div>

              {/* Priority Badge */}
              <div className="flex items-center gap-1 bg-[#e5e1dc] rounded-md px-1.5 py-1">
                <AlertTriangle className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-[10px] text-black">
                  Mức độ: {alert.priority === 'high' ? 'Cao' : 'Thấp'}
                </span>
              </div>
            </div>

            {/* Title */}
            <p className="text-xs text-black mb-1.5">{alert.title}</p>

            {/* Divider */}
            <div className="w-44 h-px bg-gray-300 mb-1.5" />

            {/* Meta Info */}
            <div className="flex items-center gap-5">
              {/* Time */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3 text-[#8a8c90]" />
                  <span className="text-[10px] text-[#8a8c90]">Thời gian</span>
                </div>
                <span className="text-[10px] text-black">{alert.time}</span>
              </div>

              {/* Source */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  <User className="w-3 h-3 text-[#8a8c90]" />
                  <span className="text-[10px] text-[#8a8c90]">Nguồn</span>
                </div>
                <span className="text-[10px] text-black">{alert.source}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
