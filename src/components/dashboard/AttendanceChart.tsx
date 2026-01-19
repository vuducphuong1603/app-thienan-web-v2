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

  // Calculate bar height based on value (max height 80px, min 35px)
  const getBarHeight = (value: number) => {
    const minHeight = 35
    const maxHeight = 80
    return Math.max(minHeight, (value / maxValue) * maxHeight)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 w-full h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-medium text-gray-900 leading-tight">Điểm danh</h3>
          <p className="text-2xl font-medium text-gray-900 leading-tight">7 ngày qua</p>
        </div>
        <button className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Chart Area */}
      <div className="grid grid-cols-2 gap-4">
        {data.map((day, index) => (
          <div key={index}>
            {/* Day Label */}
            <p className="text-xs font-medium text-gray-900 mb-1.5">{day.label}</p>

            {/* Bars Container */}
            <div className="flex gap-1.5 items-end h-[90px]">
              {/* Present Bar - Orange */}
              <div
                className="flex-1 bg-brand rounded-lg p-2 flex flex-col justify-start"
                style={{ height: `${getBarHeight(day.present)}px` }}
              >
                <p className="text-[11px] font-medium text-white">{day.present}</p>
                <p className="text-[10px] text-white/90">Có mặt</p>
              </div>

              {/* Absent Bar - Gray */}
              <div
                className="flex-1 bg-gray-100 rounded-lg p-2 flex flex-col justify-start"
                style={{ height: `${getBarHeight(day.absent)}px` }}
              >
                <p className="text-[11px] font-medium text-gray-900">{day.absent}</p>
                <p className="text-[10px] text-gray-500">Vắng mặt</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
