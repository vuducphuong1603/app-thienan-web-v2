'use client'

import { MoreHorizontal } from 'lucide-react'

interface Activity {
  id: string
  title: string
  time: string
  location: string
  className: string
  status: 'pending' | 'in_progress' | 'completed'
  image?: string
}

const activities: Activity[] = [
  {
    id: '1',
    title: 'Dạy Giáo Lý',
    time: '3:00',
    location: 'Phòng A2',
    className: 'Lớp Ấu nhi',
    status: 'in_progress',
  },
]

export default function TodayActivity() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Kế hoạch hoạt động hôm nay</h3>
        <div className="flex items-center gap-2">
          {/* Filter/Sort icon */}
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2.5 5.83333H17.5M5 10H15M7.5 14.1667H12.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Menu icon */}
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-3"
          >
            {/* Round Image */}
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
              <img
                src="/images/teaching.jpg"
                alt={activity.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70"%3E%3Crect fill="%23E5E7EB" width="70" height="70"/%3E%3Cpath d="M35 20c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 18c-7.3 0-14 4.9-14 11v3h28v-3c0-6.1-6.7-11-14-11z" fill="%239CA3AF"/%3E%3C/svg%3E'
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 mb-1">{activity.title}</h4>

              {/* Time, Class, Location with separators */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                <div className="flex items-center gap-1">
                  {/* Clock icon */}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1.25C4.05 1.25 1.25 4.05 1.25 7.5C1.25 10.95 4.05 13.75 7.5 13.75C10.95 13.75 13.75 10.95 13.75 7.5C13.75 4.05 10.95 1.25 7.5 1.25ZM7.5 12.5C4.7375 12.5 2.5 10.2625 2.5 7.5C2.5 4.7375 4.7375 2.5 7.5 2.5C10.2625 2.5 12.5 4.7375 12.5 7.5C12.5 10.2625 10.2625 12.5 7.5 12.5ZM7.8125 4.375H6.875V8.125L10.1562 10.0937L10.625 9.325L7.8125 7.65625V4.375Z" fill="currentColor"/>
                  </svg>
                  <span>{activity.time}</span>
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <span>{activity.className}</span>
                <div className="w-px h-4 bg-gray-200" />
                <span>{activity.location}</span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                {/* Barbell/Dumbbell icon */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17.5 8.33333H16.6667V7.5C16.6667 6.83333 16.1667 6.25 15.4167 6.25C14.75 6.25 14.1667 6.75 14.1667 7.5V8.33333H5.83333V7.5C5.83333 6.83333 5.25 6.25 4.58333 6.25C3.83333 6.25 3.33333 6.75 3.33333 7.5V8.33333H2.5C2.08333 8.33333 1.66667 8.75 1.66667 9.16667V10.8333C1.66667 11.25 2.08333 11.6667 2.5 11.6667H3.33333V12.5C3.33333 13.1667 3.83333 13.75 4.58333 13.75C5.25 13.75 5.83333 13.25 5.83333 12.5V11.6667H14.1667V12.5C14.1667 13.1667 14.75 13.75 15.4167 13.75C16.1667 13.75 16.6667 13.25 16.6667 12.5V11.6667H17.5C17.9167 11.6667 18.3333 11.25 18.3333 10.8333V9.16667C18.3333 8.75 17.9167 8.33333 17.5 8.33333Z" fill="#FA865E"/>
                </svg>
                <span className="text-xs font-normal text-brand">Đang thực hiện</span>
              </div>
            </div>

            {/* Action Button */}
            <button className="px-4 py-3 bg-brand text-white text-sm font-medium rounded-full hover:bg-brand/90 transition-colors flex-shrink-0">
              HỦY
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
