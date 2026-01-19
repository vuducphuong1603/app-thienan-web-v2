'use client'

import { Plus, MoreHorizontal, Brain, CalendarDays, Flame } from 'lucide-react'

export default function MyNotes() {
  // Progress dots - 20 dots, 13 filled (65%)
  const totalDots = 20
  const filledDots = 13
  const progressColors = ['#FA865E', '#F97316', '#FBBF24', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Ghi chú của tôi</h3>
        <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Cards Row */}
      <div className="flex gap-2 mb-3">
        {/* Add Card */}
        <div className="w-16 h-20 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-brand hover:bg-brand/5 cursor-pointer transition-all flex-shrink-0">
          <Plus className="w-5 h-5 text-gray-400" />
        </div>

        {/* Class Card */}
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl p-2.5">
          <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center mb-1.5">
            <Brain className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-[10px] text-gray-500 mb-0.5">Lớp đang dạy</p>
          <p className="text-base font-bold text-gray-900">
            8 <span className="text-[10px] font-normal text-gray-500">lớp</span>
          </p>
          <p className="text-[10px] text-gray-500">240 thiếu nhi</p>
        </div>

        {/* Activity Card */}
        <div className="flex-1 bg-gradient-to-br from-orange-50 to-orange-100/30 rounded-xl p-2.5">
          <div className="w-7 h-7 bg-brand/10 rounded-lg flex items-center justify-center mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-brand" />
          </div>
          <p className="text-[10px] text-gray-500 mb-0.5">Tham gia hoạt động</p>
          <p className="text-base font-bold text-gray-900">20/10</p>
          <p className="text-[10px] text-gray-500">Tại nhà thờ 14:00</p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-xs text-gray-600 font-medium">Hoàn thành</span>
        </div>
        <span className="text-xl font-bold text-gray-900">65</span>
        <div className="flex-1 flex items-center gap-[3px]">
          {Array.from({ length: totalDots }).map((_, i) => (
            <div
              key={i}
              className="w-[6px] h-[6px] rounded-full transition-all"
              style={{
                backgroundColor: i < filledDots
                  ? progressColors[i % progressColors.length]
                  : '#e5e7eb'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
