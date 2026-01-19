'use client'

import { MoreHorizontal, Clock } from 'lucide-react'

interface WeeklyCalendarProps {
  currentWeek?: number
  activitiesCount?: number
}

const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const dates = [21, 22, 23, 24, 25, 26, 27]
const today = 2 // T3 (index 2)

export default function WeeklyCalendar({ currentWeek = 3, activitiesCount = 3 }: WeeklyCalendarProps) {
  // Calculate donut chart segments
  const completedPercent = 100
  const inProgressPercent = 50
  const pendingPercent = 0

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Kế hoạch tuần này</h3>
        <button className="p-1 hover:bg-gray-100 rounded-lg">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Days Row */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center">
            <span className="text-xs text-gray-400 font-medium">{day}</span>
          </div>
        ))}
      </div>

      {/* Dates Row */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {dates.map((date, index) => (
          <div
            key={date}
            className={`h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium cursor-pointer transition-colors ${
              index === today
                ? 'bg-brand text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {date}
          </div>
        ))}
      </div>

      {/* Donut Chart Section */}
      <div className="flex items-center gap-5 flex-1">
        {/* Donut Chart */}
        <div className="relative w-36 h-36 flex-shrink-0">
          {/* Date Badge */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-teal-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              T3 23
            </div>
          </div>

          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="10"
            />
            {/* Completed segment (green) - 100% means full circle but we show partial */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#22c55e"
              strokeWidth="10"
              strokeDasharray="119.38 238.76"
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* In progress segment (orange) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#FA865E"
              strokeWidth="10"
              strokeDasharray="59.69 238.76"
              strokeDashoffset="-119.38"
              strokeLinecap="round"
            />
            {/* Pending segment (gray) - 0% so none shown */}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-gray-500 mb-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Tuần {currentWeek}</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{activitiesCount} hoạt động</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Hoàn thành</span>
            </div>
            <span className="text-sm font-bold text-green-500">{completedPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand" />
              <span className="text-sm text-gray-600">Đang thực hiện</span>
            </div>
            <span className="text-sm font-bold text-brand">{inProgressPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              <span className="text-sm text-gray-600">Chờ thực hiện</span>
            </div>
            <span className="text-sm font-bold text-gray-400">{pendingPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
