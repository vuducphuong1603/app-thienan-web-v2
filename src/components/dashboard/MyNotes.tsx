'use client'

import { Plus, MoreHorizontal } from 'lucide-react'

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

export default function MyNotes() {
  // Progress bars - 26 bars total, first 17 filled (65%)
  const totalBars = 26
  const filledBars = 17

  return (
    <div className="bg-white rounded-[15px] p-4 border border-gray-100 h-full">
      {/* Header - Ghi chú của tôi */}
      <div className="flex items-center justify-between h-10 mb-3">
        <h3 className="text-base font-semibold text-black">Ghi chú của tôi</h3>
        <button className="w-12 h-12 bg-[#F6F6F6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-[22px] h-[22px] text-black/40" />
        </button>
      </div>

      {/* Cards Row */}
      <div className="flex gap-2 mb-3">
        {/* Add Card */}
        <div className="w-[100px] h-[110px] bg-[#F6F6F6] rounded-2xl flex items-center justify-center border border-dashed border-black/20 hover:border-brand hover:bg-brand/5 cursor-pointer transition-all flex-shrink-0">
          <Plus className="w-5 h-5 text-black/40" />
        </div>

        {/* Class Card - Lớp đang dạy */}
        <div className="flex-1 h-[110px] bg-[#F6F6F6] rounded-[20px] p-3">
          <div className="w-6 h-6">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 4.875C10.3 4.875 8.125 7.05 8.125 9.75C8.125 12.45 10.3 14.625 13 14.625C15.7 14.625 17.875 12.45 17.875 9.75C17.875 7.05 15.7 4.875 13 4.875Z" fill="#FA865E"/>
              <path d="M20.5833 19.5C20.5833 16.1167 17.1958 13.4167 13 13.4167C8.80416 13.4167 5.41666 16.1167 5.41666 19.5V21.125H20.5833V19.5Z" fill="#FA865E" fillOpacity="0.4"/>
            </svg>
          </div>
          <p className="text-sm font-light text-black/40">Lớp đang dạy</p>
          <p className="text-2xl font-medium text-black leading-[1.2]">
            8 <span className="text-base font-normal text-black/40">lớp</span>
          </p>
          <p className="text-xs text-black">240 thiếu nhi</p>
        </div>

        {/* Activity Card - Tham gia hoạt động */}
        <div className="flex-1 h-[110px] bg-[#F6F6F6] rounded-2xl p-3">
          <div className="w-6 h-6">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 22.75L11.3425 21.2475C5.85 16.26 2.16666 12.935 2.16666 8.9375C2.16666 5.6125 4.78749 3.25 8.11249 3.25C9.94583 3.25 11.7 4.095 13 5.4925C14.3 4.095 16.0542 3.25 17.8875 3.25C21.2125 3.25 23.8333 5.6125 23.8333 8.9375C23.8333 12.935 20.15 16.26 14.6575 21.2475L13 22.75Z" fill="#FA865E"/>
            </svg>
          </div>
          <p className="text-sm font-light text-black/40">Tham gia hoạt động</p>
          <p className="text-[22px] font-semibold text-black leading-tight">20/10</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#DF1C41]">Tại nhà thờ</span>
            <span className="text-black">14:00</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-[#F6F6F6] rounded-3xl p-4 h-[106px] mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-[11px]">
            {/* Fire icon in white circle */}
            <div className="w-[49px] h-[49px] bg-white rounded-3xl flex items-center justify-center">
              <span className="text-[22px]">🔥</span>
            </div>
            <span className="text-sm font-medium text-black">Hoàn thành</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[24px] font-medium text-black">65</span>
            <span className="text-sm text-black/20">%</span>
          </div>
        </div>

        {/* Progress pills */}
        <div className="flex gap-1">
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-[14px] rounded-[6px] ${
                i < filledBars ? 'bg-brand' : 'bg-[#E5E1DC]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Kế hoạch hoạt động hôm nay */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-black">Kế hoạch hoạt động hôm nay</h3>
        <div className="flex items-center gap-[15px] w-[60px]">
          {/* Filter/Sort icon */}
          <button className="hover:opacity-70 transition-opacity">
            <svg width="23" height="23" viewBox="0 0 23 23" fill="none">
              <path d="M2.875 6.70833H20.125M5.75 11.5H17.25M8.625 16.2917H14.375" stroke="black" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Menu icon */}
          <button className="hover:opacity-70 transition-opacity">
            <MoreHorizontal className="w-[22px] h-[22px] text-black/40" />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-[15px]"
          >
            {/* Round Image */}
            <div className="w-[79px] h-[79px] rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
              <img
                src="/images/teaching.jpg"
                alt={activity.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="79" height="79" viewBox="0 0 79 79"%3E%3Crect fill="%23E5E7EB" width="79" height="79"/%3E%3Cpath d="M39.5 22c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 20c-8.3 0-16 5.6-16 12.5v3.5h32v-3.5c0-6.9-7.7-12.5-16-12.5z" fill="%239CA3AF"/%3E%3C/svg%3E'
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-black mb-[6px]">{activity.title}</h4>

              {/* Time, Class, Location with separators */}
              <div className="flex items-center gap-[15px] text-xs text-black/40 mb-[8px]">
                <div className="flex items-center gap-[3px]">
                  {/* Clock icon */}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1.25C4.05 1.25 1.25 4.05 1.25 7.5C1.25 10.95 4.05 13.75 7.5 13.75C10.95 13.75 13.75 10.95 13.75 7.5C13.75 4.05 10.95 1.25 7.5 1.25ZM7.5 12.5C4.7375 12.5 2.5 10.2625 2.5 7.5C2.5 4.7375 4.7375 2.5 7.5 2.5C10.2625 2.5 12.5 4.7375 12.5 7.5C12.5 10.2625 10.2625 12.5 7.5 12.5ZM7.8125 4.375H6.875V8.125L10.1562 10.0937L10.625 9.325L7.8125 7.65625V4.375Z" fill="currentColor"/>
                  </svg>
                  <span>{activity.time}</span>
                </div>
                <div className="w-px h-[19px] bg-black/20" />
                <span>{activity.className}</span>
                <div className="w-px h-[19px] bg-black/20" />
                <span>{activity.location}</span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-[8px]">
                {/* Barbell/Dumbbell icon */}
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M19.25 9.16667H18.3333V8.25C18.3333 7.51667 17.7833 6.875 16.9583 6.875C16.225 6.875 15.5833 7.425 15.5833 8.25V9.16667H6.41667V8.25C6.41667 7.51667 5.775 6.875 5.04167 6.875C4.21667 6.875 3.66667 7.425 3.66667 8.25V9.16667H2.75C2.29167 9.16667 1.83333 9.625 1.83333 10.0833V11.9167C1.83333 12.375 2.29167 12.8333 2.75 12.8333H3.66667V13.75C3.66667 14.4833 4.21667 15.125 5.04167 15.125C5.775 15.125 6.41667 14.575 6.41667 13.75V12.8333H15.5833V13.75C15.5833 14.4833 16.225 15.125 16.9583 15.125C17.7833 15.125 18.3333 14.575 18.3333 13.75V12.8333H19.25C19.7083 12.8333 20.1667 12.375 20.1667 11.9167V10.0833C20.1667 9.625 19.7083 9.16667 19.25 9.16667Z" fill="#FA865E"/>
                </svg>
                <span className="text-xs text-brand">Đang thực hiện</span>
              </div>
            </div>

            {/* Action Button */}
            <button className="w-[70px] h-[50px] bg-brand text-white text-sm font-medium rounded-[28px] hover:bg-brand/90 transition-colors flex-shrink-0 flex items-center justify-center">
              HỦY
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
