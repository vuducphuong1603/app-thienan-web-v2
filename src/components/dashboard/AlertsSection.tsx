'use client'

import { ArrowUpRight, Sparkles, Check, Clock, User } from 'lucide-react'

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
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-gray-900">Hệ thống cảnh báo</h3>
        </div>
        <button className="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
          >
            {/* Checkbox */}
            <button
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                alert.status === 'resolved'
                  ? 'bg-green-500 text-white'
                  : 'border-2 border-gray-300 hover:border-brand'
              }`}
            >
              {alert.status === 'resolved' && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Status & Priority Badges */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  alert.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {alert.status === 'pending' ? 'Chưa xử lý' : 'Đã xử lý'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  alert.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Mức độ: {alert.priority === 'high' ? 'Cao' : 'Thấp'}
                </span>
              </div>

              {/* Title */}
              <p className="text-sm text-gray-900 mb-1.5">{alert.title}</p>

              {/* Meta */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  Thời gian: {alert.time}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <User className="w-3 h-3" />
                  Nguồn: {alert.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
