'use client'

import { useState } from 'react'
import { Calendar, Plus, List, FileText, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { WeeklyPlanCalendar } from '@/components/weekly-plan'

export default function WeeklyPlanPage() {
  const [currentDate] = useState(new Date())

  // Format current date in Vietnamese
  const dayOfWeek = currentDate.toLocaleDateString('vi-VN', { weekday: 'long' })
  const formattedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)
  const formattedDate = `${formattedDayOfWeek}, ${currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  // Week range for display
  const startOfWeek = new Date(currentDate)
  const dayNum = currentDate.getDay()
  const diff = dayNum === 0 ? -6 : 1 - dayNum
  startOfWeek.setDate(currentDate.getDate() + diff)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const weekRange = `${startOfWeek.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${endOfWeek.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  return (
    <div className="flex gap-5">
      {/* Left Sidebar - Tab Navigation */}
      <div className="w-[208px] flex flex-col gap-2">
        {/* Điểm danh Tab */}
        <Link
          href="/admin/activities"
          className="h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <List className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">
            Điểm danh
          </span>
        </Link>

        {/* Báo cáo Tab */}
        <Link
          href="/admin/activities"
          className="h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <FileText className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">
            Báo cáo
          </span>
        </Link>

        {/* Kế hoạch Tab - Active */}
        <div
          className="h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] bg-brand"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-white/20">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold text-white">
            Kế hoạch
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h1 className="text-[40px] font-bold italic text-gray-900 dark:text-white mb-5 leading-tight">
          Kế hoạch tuần này
        </h1>

        {/* Controls Row */}
        <div className="flex items-center justify-between mb-5">
          {/* Left: Date + Today Button */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formattedDate}
            </span>
            <button className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
              Hôm nay
            </button>
          </div>

          {/* Right: View Toggle + Date Range + Add Button */}
          <div className="flex items-center gap-3">
            {/* Week View Toggle */}
            <button className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
              Tuần
            </button>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-white">
                {weekRange}
              </span>
            </div>

            {/* Add Plan Button */}
            <button className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-[#e8764f] transition-colors">
              <Plus className="w-4 h-4" />
              Thêm kế hoạch
            </button>
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        <WeeklyPlanCalendar />
      </div>
    </div>
  )
}
