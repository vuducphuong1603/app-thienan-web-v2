'use client'

import { Plus, MoreHorizontal } from 'lucide-react'

export default function MyNotes() {
  // Progress bars - 26 bars total, first 17 filled (65%)
  const totalBars = 26
  const filledBars = 17

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Ghi chú của tôi</h3>
        <button className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Cards Row */}
      <div className="flex gap-2 mb-3">
        {/* Add Card */}
        <div className="w-[100px] h-[110px] bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-brand hover:bg-brand/5 cursor-pointer transition-all flex-shrink-0">
          <Plus className="w-5 h-5 text-gray-400" />
        </div>

        {/* Class Card - Lớp đang dạy */}
        <div className="flex-1 bg-gray-100 rounded-2xl p-3 min-h-[110px]">
          <div className="w-6 h-6 mb-1">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 4.875C10.3 4.875 8.125 7.05 8.125 9.75C8.125 12.45 10.3 14.625 13 14.625C15.7 14.625 17.875 12.45 17.875 9.75C17.875 7.05 15.7 4.875 13 4.875Z" fill="#FA865E"/>
              <path d="M20.5833 19.5C20.5833 16.1167 17.1958 13.4167 13 13.4167C8.80416 13.4167 5.41666 16.1167 5.41666 19.5V21.125H20.5833V19.5Z" fill="#FA865E" fillOpacity="0.4"/>
            </svg>
          </div>
          <p className="text-sm text-gray-400 mb-0.5">Lớp đang dạy</p>
          <p className="text-2xl font-medium text-gray-900 leading-tight">
            8 <span className="text-base font-normal text-gray-400">lớp</span>
          </p>
          <p className="text-xs text-gray-900">240 thiếu nhi</p>
        </div>

        {/* Activity Card - Tham gia hoạt động */}
        <div className="flex-1 bg-gray-100 rounded-2xl p-3 min-h-[110px]">
          <div className="w-6 h-6 mb-1">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 22.75L11.3425 21.2475C5.85 16.26 2.16666 12.935 2.16666 8.9375C2.16666 5.6125 4.78749 3.25 8.11249 3.25C9.94583 3.25 11.7 4.095 13 5.4925C14.3 4.095 16.0542 3.25 17.8875 3.25C21.2125 3.25 23.8333 5.6125 23.8333 8.9375C23.8333 12.935 20.15 16.26 14.6575 21.2475L13 22.75Z" fill="#FA865E"/>
            </svg>
          </div>
          <p className="text-sm text-gray-400 mb-0.5">Tham gia hoạt động</p>
          <p className="text-[22px] font-semibold text-gray-900 leading-tight">20/10</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-red-500">Tại nhà thờ</span>
            <span className="text-gray-900">14:00</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Fire icon in white circle */}
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
            <span className="text-sm font-medium text-gray-900">Hoàn thành</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">65</span>
            <span className="text-sm text-gray-300">%</span>
          </div>
        </div>

        {/* Progress pills */}
        <div className="flex gap-[4px]">
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-[14px] rounded-md ${
                i < filledBars ? 'bg-brand' : 'bg-[#E5E1DC]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
