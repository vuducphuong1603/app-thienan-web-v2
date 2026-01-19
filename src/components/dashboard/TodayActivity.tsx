'use client'

import { X, MoreHorizontal, Clock, MapPin, Users } from 'lucide-react'
import Image from 'next/image'

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
    image: '/images/teaching.jpg',
  },
]

export default function TodayActivity() {
  const getStatusBadge = (status: Activity['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Chờ thực hiện
          </span>
        )
      case 'in_progress':
        return (
          <span className="flex items-center gap-1.5 text-xs text-brand font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            Đang thực hiện
          </span>
        )
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Hoàn thành
          </span>
        )
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Kế hoạch hoạt động hôm nay</h3>
        <div className="flex items-center gap-0.5">
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
          >
            {/* Image/Icon */}
            <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {activity.image ? (
                <Image
                  src={activity.image}
                  alt={activity.title}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    // Fallback to icon if image fails
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{activity.title}</h4>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Users className="w-3 h-3" />
                  {activity.className}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <MapPin className="w-3 h-3" />
                  {activity.location}
                </span>
              </div>
              <div className="mt-1.5">
                {getStatusBadge(activity.status)}
              </div>
            </div>

            {/* Action */}
            <button className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand/90 transition-colors flex-shrink-0">
              HỦY
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
