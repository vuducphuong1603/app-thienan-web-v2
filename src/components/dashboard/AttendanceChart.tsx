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
  const maxValue = Math.max(...data.flatMap(d => [d.present, d.absent]))

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Điểm danh</h3>
          <p className="text-2xl font-bold text-gray-900">7 ngày qua</p>
        </div>
        <button className="w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-center gap-12 mt-4">
        {data.map((day, index) => (
          <div key={index} className="flex flex-col items-center">
            {/* Day Label - Top */}
            <span className="text-sm font-semibold text-gray-700 mb-3">{day.label}</span>

            {/* Bars */}
            <div className="flex items-end gap-3 h-28">
              {/* Present Bar */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-brand mb-1">{day.present}</span>
                <div
                  className="w-14 bg-brand rounded-lg"
                  style={{ height: `${(day.present / maxValue) * 90}px` }}
                />
                <span className="text-[10px] text-gray-500 mt-2">Có mặt</span>
              </div>

              {/* Absent Bar */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-brand/50 mb-1">{day.absent}</span>
                <div
                  className="w-14 bg-brand/30 rounded-lg"
                  style={{ height: `${(day.absent / maxValue) * 90}px` }}
                />
                <span className="text-[10px] text-gray-500 mt-2">Vắng mặt</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
