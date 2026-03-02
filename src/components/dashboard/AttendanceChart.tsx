'use client'

import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DayData {
  label: string
  present: number
  absent: number
}

function getRecentDays() {
  const today = new Date()
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
  return { lastThursday, lastSunday }
}

interface AttendanceChartProps {
  classId?: string
}

export default function AttendanceChart({ classId }: AttendanceChartProps) {
  const router = useRouter()

  const { data = [
    { label: 'Thứ 5', present: 0, absent: 0 },
    { label: 'Chúa nhật', present: 0, absent: 0 },
  ], isLoading: loading, isError, refetch } = useQuery<DayData[]>({
    queryKey: ['attendanceChart7Days', classId || 'all'],
    queryFn: async () => {
      const { lastThursday, lastSunday } = getRecentDays()

      // Build total students query (optionally filtered by class)
      let totalQuery = supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      if (classId) totalQuery = totalQuery.eq('class_id', classId)

      // Build attendance queries (optionally filtered by class)
      const buildAttendanceQuery = (date: string, dayType: string) => {
        let q = supabase.from('attendance_records').select('*', { count: 'exact', head: true })
          .eq('attendance_date', date).eq('day_type', dayType).eq('status', 'present')
        if (classId) q = q.eq('class_id', classId)
        return q
      }

      // Fetch all counts in parallel
      const [totalRes, thu5Res, cnRes] = await Promise.all([
        totalQuery,
        lastThursday
          ? buildAttendanceQuery(lastThursday, 'thu5')
          : Promise.resolve({ count: 0 }),
        lastSunday
          ? buildAttendanceQuery(lastSunday, 'cn')
          : Promise.resolve({ count: 0 }),
      ])

      const total = totalRes.count || 0
      const thu5Present = thu5Res.count || 0
      const cnPresent = cnRes.count || 0

      return [
        { label: 'Thứ 5', present: thu5Present, absent: total - thu5Present },
        { label: 'Chúa nhật', present: cnPresent, absent: total - cnPresent },
      ]
    },
  })

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
          onClick={() => router.push(classId ? '/dashboard/performance' : '/admin/activities')}
          className="w-8 h-8 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-white/20"
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
        ) : isError ? (
          <div className="col-span-2 flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Không tải được dữ liệu</p>
            <button onClick={() => refetch()} className="text-xs text-brand hover:underline">Thử lại</button>
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
