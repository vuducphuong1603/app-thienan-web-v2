'use client'

import { ArrowUpRight } from 'lucide-react'

interface DayData {
  label: string
  present: number
  absent: number
}

const data: DayData[] = [
  { label: 'Thứ 5', present: 769, absent: 597 },
  { label: 'Chúa nhật', present: 858, absent: 408 },
]

export default function AttendanceChart() {
  // Calculate max value for scaling bars
  const maxValue = Math.max(...data.flatMap(d => [d.present, d.absent]))

  // Calculate bar height percentage
  const getBarHeightPercentage = (value: number) => {
    const minPercentage = 15 // Minimum 15% height
    return Math.max(minPercentage, (value / maxValue) * 100)
  }

  return (
    <div className="bg-white dark:bg-white/10 rounded-2xl p-3 border border-gray-100 dark:border-white/10 w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white leading-tight">Điểm danh</h3>
          <p className="text-xl font-medium text-gray-900 dark:text-white leading-tight">7 ngày qua</p>
        </div>
        <button className="w-8 h-8 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Chart Area */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {data.map((day, index) => (
          <div key={index} className="flex flex-col h-full">
            {/* Day Label */}
            <p className="text-[10px] font-medium text-gray-900 dark:text-white mb-1 flex-shrink-0">{day.label}</p>

            {/* Bars Container */}
            <div className="flex gap-1 items-end h-[150px]">
              {/* Present Bar - Orange */}
              <div
                className="flex-1 bg-brand rounded-md p-1.5 flex flex-col justify-start transition-all duration-500"
                style={{ height: `${getBarHeightPercentage(day.present)}%` }}
              >
                <p className="text-[10px] font-medium text-white">{day.present}</p>
                <p className="text-[9px] text-white/90">Có mặt</p>
              </div>

              {/* Absent Bar - Gray */}
              <div
                className="flex-1 bg-gray-100 dark:bg-white/10 rounded-md p-1.5 flex flex-col justify-start transition-all duration-500"
                style={{ height: `${getBarHeightPercentage(day.absent)}%` }}
              >
                <p className="text-[10px] font-medium text-gray-900 dark:text-white">{day.absent}</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-300">Vắng mặt</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
