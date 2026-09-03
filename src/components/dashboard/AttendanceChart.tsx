'use client'

import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { sundayFullyPresentIds } from '@/lib/sunday-attendance'
import { supabase } from '@/lib/supabase'

interface DayData {
  label: string
  present: number
  absent: number
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface AttendanceChartProps {
  classId?: string
  /** Giới hạn theo phân đoàn (phân đoàn trưởng). Bỏ qua nếu đã có classId. */
  branch?: string
}

export default function AttendanceChart({ classId, branch }: AttendanceChartProps) {
  const router = useRouter()

  const { data = [
    { label: 'Thứ 5', present: 0, absent: 0 },
    { label: 'Chúa nhật', present: 0, absent: 0 },
  ], isLoading: loading, isError, refetch } = useQuery<DayData[]>({
    queryKey: ['attendanceChart7Days', classId || (branch ? `branch:${branch}` : 'all')],
    queryFn: async () => {
      // Phạm vi phân đoàn: lấy id các lớp trong ngành để lọc
      let branchClassIds: string[] | null = null
      if (!classId && branch) {
        const { data: branchClasses, error: bcErr } = await supabase
          .from('classes').select('id').eq('branch', branch).eq('status', 'ACTIVE')
        if (bcErr) throw bcErr
        branchClassIds = (branchClasses || []).map((c) => c.id)
        if (branchClassIds.length === 0) branchClassIds = ['__none__']
      }
      // Find most recent Thursday (day 4) and Sunday (day 0) within last 7 days
      function getRecentDay(targetDay: number): string | null {
        const today = new Date()
        for (let i = 0; i <= 7; i++) {
          const d = new Date(today)
          d.setDate(today.getDate() - i)
          if (d.getDay() === targetDay) {
            return toLocalDateString(d)
          }
        }
        return null
      }

      const lastThu5 = getRecentDay(4) // Thursday
      const lastCN = getRecentDay(0)    // Sunday

      // Count total students and present counts for each specific date
      const totalStudentsQuery = classId
        ? supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).eq('class_id', classId).eq('status', 'ACTIVE')
        : branchClassIds
          ? supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).in('class_id', branchClassIds).eq('status', 'ACTIVE')
          : supabase.from('thieu_nhi').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE')

      const buildPresentQuery = (date: string, dayType: string) => {
        let q = supabase.from('attendance_records').select('*', { count: 'exact', head: true })
          .eq('attendance_date', date)
          .eq('day_type', dayType)
          .eq('status', 'present')
        if (classId) q = q.eq('class_id', classId)
        else if (branchClassIds) q = q.in('class_id', branchClassIds)
        return q
      }

      // Chủ nhật: có mặt = đủ cả học giáo lý ('cn') lẫn đi lễ ('cn_le')
      const buildSundayQuery = (date: string) => {
        let q = supabase.from('attendance_records').select('student_id, day_type')
          .eq('attendance_date', date)
          .in('day_type', ['cn', 'cn_le'])
          .eq('status', 'present')
        if (classId) q = q.eq('class_id', classId)
        else if (branchClassIds) q = q.in('class_id', branchClassIds)
        return q
      }

      const [totalRes
, thu5PresentRes, cnRowsRes] = await Promise.all([
        totalStudentsQuery,
        lastThu5 ? buildPresentQuery(lastThu5, 'thu5') : Promise.resolve({ count: 0, error: null }),
        lastCN ? buildSundayQuery(lastCN) : Promise.resolve({ data: [] as { student_id: string; day_type: string }[], error: null }),
      ])

      if (totalRes.error) throw totalRes.error
      if (thu5PresentRes.error) throw thu5PresentRes.error
      if (cnRowsRes.error) throw cnRowsRes.error

      const totalStudents = totalRes.count || 0
      const thu5Present = thu5PresentRes.count || 0
      const cnPresent = sundayFullyPresentIds(cnRowsRes.data || []).size

      return [
        { label: 'Thứ 5', present: thu5Present, absent: totalStudents - thu5Present },
        { label: 'Chúa nhật', present: cnPresent, absent: totalStudents - cnPresent },
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
              <div className="flex gap-1 items-end flex-1 min-h-[120px]">
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
