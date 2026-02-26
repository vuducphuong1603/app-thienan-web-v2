'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface DayData {
  label: string
  present: number
  absent: number
}

export default function AttendanceChart() {
  const router = useRouter()
  const [data, setData] = useState<DayData[]>([
    { label: 'Thứ 5', present: 0, absent: 0 },
    { label: 'Chúa nhật', present: 0, absent: 0 },
  ])
  const [loading, setLoading] = useState(true)

  const fetchAttendanceData = useCallback(async () => {
    try {
      // Get total active students
      const { count: totalStudents } = await supabase
        .from('thieu_nhi')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')

      const total = totalStudents || 0

      // Find the most recent Thursday and Sunday within the last 7 days
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)

      let lastThursday: string | null = null
      let lastSunday: string | null = null

      for (let i = 0; i <= 7; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const dayIndex = d.getDay()
        if (dayIndex === 4 && !lastThursday) {
          lastThursday = d.toISOString().split('T')[0]
        }
        if (dayIndex === 0 && !lastSunday) {
          lastSunday = d.toISOString().split('T')[0]
        }
        if (lastThursday && lastSunday) break
      }

      // Fetch Thursday attendance (present count)
      let thu5Present = 0
      if (lastThursday) {
        const { count } = await supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_date', lastThursday)
          .eq('day_type', 'thu5')
          .eq('status', 'present')

        thu5Present = count || 0
      }

      // Fetch Sunday attendance (present count)
      let cnPresent = 0
      if (lastSunday) {
        const { count } = await supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_date', lastSunday)
          .eq('day_type', 'cn')
          .eq('status', 'present')

        cnPresent = count || 0
      }

      setData([
        { label: 'Thứ 5', present: thu5Present, absent: total - thu5Present },
        { label: 'Chúa nhật', present: cnPresent, absent: total - cnPresent },
      ])
    } catch (error) {
      console.error('Error fetching attendance data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  // Calculate max value for scaling bars
  const maxValue = Math.max(...data.flatMap(d => [d.present, d.absent]), 1)

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
        <button
          onClick={() => router.push('/admin/performance')}
          className="w-8 h-8 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          title="Xem so sánh hiệu suất"
        >
          <ArrowUpRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Chart Area */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full"></div>
          </div>
        ) : (
          data.map((day, index) => (
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
          ))
        )}
      </div>
    </div>
  )
}
