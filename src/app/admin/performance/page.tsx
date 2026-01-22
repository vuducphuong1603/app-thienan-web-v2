'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, supabase, Branch } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard'

// Types
type ChartType = 'sunday' | 'thursday'
type ViewType = 'trend' | 'class'

interface WeekData {
  date: string // YYYY-MM-DD
  displayDate: string // e.g., "CN 16/11" or "T5 14/11"
  fullDisplayDate: string // e.g., "Chủ nhật 16/11" or "Thứ năm 14/11"
}

interface ChartDataItem {
  date: string
  chienCon: number
  nghiaSi: number
  thieuNhi: number
  auNhi: number
}

interface StatsDataItem {
  date: string
  value: number
  type: 'line' | 'bar' | 'progress'
}

interface BranchStatsItem {
  name: string
  value: number
  total: number
  color: 'primary' | 'default'
}

// Sidebar Button Component
function SidebarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 h-14 rounded-full transition-all shadow-sm ${active
        ? 'bg-brand text-white'
        : 'bg-[#F6F6F6] text-black hover:bg-gray-200'
        }`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-brand/10'
          }`}
      >
        {icon}
      </div>
      <span className="text-sm font-medium leading-tight text-left pr-3">{label}</span>
    </button>
  )
}

// Stats Card Component
function StatsCard({
  title,
  value,
  type,
}: {
  title: string
  value: number
  type: 'line' | 'bar' | 'progress'
}) {
  return (
    <div className="relative bg-[#F6F6F6] rounded-[15px] p-4 flex-1 min-w-[280px] h-[165px] border border-[#E5E1DC] overflow-hidden flex flex-col">
      {/* Header Row: Title + Icon */}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-black/80">{title}</p>
        {/* Icon in top right corner */}
        <div className="w-10 h-10 rounded-full bg-black/[0.03] backdrop-blur-[4px] flex items-center justify-center border border-white/20">
          {type === 'line' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {type === 'bar' && (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M7.46 8.22L12.54 16.07L15.63 10.85H19.31V9.15H14.52L12.54 13.77L7.46 5.93L4.36 11.15H0.69V12.85H5.48L7.46 8.22Z" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
          {type === 'progress' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="black" strokeWidth="1.2" />
              <path d="M12 5C15.9 5 19 8.1 19 12" stroke="black" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Value and Chart Row */}
      <div className="flex items-end justify-between flex-1 mt-auto">
        {/* Value */}
        <p className="text-[32px] font-bold text-black leading-none">{value.toLocaleString()}</p>

        {/* Mini Chart */}
        <div className="flex-shrink-0">
          {type === 'line' && (
            <svg width="88" height="32" viewBox="0 0 88 32" fill="none" className="overflow-visible">
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="16" x2="88" y2="16" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0" />
                  <stop offset="0.26" stopColor="#FA865E" />
                  <stop offset="0.53" stopColor="#FA865E" />
                  <stop offset="0.79" stopColor="#FA865E" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineGradient2" x1="0" y1="16" x2="88" y2="16" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0" />
                  <stop offset="0.6" stopColor="#FA865E" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 20C36 -48 36 88 62 20C67 13 78 5 88 23" stroke="url(#lineGradient)" strokeWidth="2.6" fill="none" />
              <path d="M0 17C33 52 27 -30 55 21C59 30 72 38 88 12" stroke="url(#lineGradient2)" strokeWidth="2.6" fill="none" />
              <circle cx="22" cy="1" r="3" fill="#FA865E" stroke="white" strokeWidth="1" />
            </svg>
          )}
          {type === 'bar' && (
            <svg width="92" height="36" viewBox="0 0 92 36" fill="none">
              <rect x="0" y="31" width="14" height="5" rx="2.4" fill="#E5E1DC" />
              <rect x="16" y="27" width="14" height="9" rx="4" fill="#E5E1DC" />
              <rect x="32" y="22" width="14" height="14" rx="4.8" fill="#E5E1DC" />
              <rect x="48" y="12" width="14" height="24" rx="4.8" fill="#FA865E" />
              <rect x="64" y="4" width="14" height="32" rx="4.8" fill="#FA865E" />
              <rect x="80" y="14" width="12" height="22" rx="4.8" fill="#FA865E" />
            </svg>
          )}
          {type === 'progress' && (
            <svg width="105" height="34" viewBox="0 0 105 34" fill="none">
              {/* 12 vertical progress bars */}
              {[
                { x: 0, top: 4, topH: 4, botH: 22, botColor: '#FA865E', dotColor: '#FA865E' },
                { x: 10, top: 4, topH: 6.5, botH: 19, botColor: '#FA865E', dotColor: '#FA865E' },
                { x: 20, top: 4, topH: 3, topColor: '#FA865E', botH: 22, botColor: '#F6F6F6', dotColor: '#F6F6F6' },
                { x: 30, top: 4, topH: 2.5, botH: 23, botColor: '#FA865E', dotColor: '#FA865E' },
                { x: 40, top: 4, topH: 3, topColor: '#FA865E', botH: 22, botColor: '#F6F6F6', dotColor: '#F6F6F6' },
                { x: 50, top: 4, topH: 2.5, botH: 23, botColor: '#FA865E', dotColor: '#FA865E' },
                { x: 60, top: 4, topH: 3, topColor: '#FA865E', botH: 22, botColor: '#F6F6F6', dotColor: '#F6F6F6' },
                { x: 70, top: 4, topH: 3, botH: 22, botColor: '#FA865E', dotColor: '#FA865E' },
                { x: 80, top: 4, topH: 6.5, botH: 19, botColor: '#FA865E', dotColor: '#FA865E' },
                { x: 90, top: 4, topH: 3, topColor: '#FA865E', botH: 22, botColor: '#F6F6F6', dotColor: '#F6F6F6' },
                { x: 100, top: 4, topH: 8.5, botH: 17, botColor: '#FA865E', dotColor: '#FA865E' },
              ].map((bar, i) => (
                <g key={i}>
                  <rect x={bar.x} y={0} width="2.5" height={bar.topH} rx="1.3" fill={bar.topColor || '#F6F6F6'} />
                  <rect x={bar.x} y={bar.topH + 1} width="2.5" height={bar.botH} rx="1.3" fill={bar.botColor} />
                  <circle cx={bar.x + 1.25} cy="32" r="1.9" fill={bar.dotColor} />
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

// Branch Card Component
function BranchCard({
  name,
  value,
  total,
  variant = 'default',
}: {
  name: string
  value: number
  total: number
  variant?: 'primary' | 'default'
}) {
  return (
    <div
      className={`relative rounded-[20px] p-4 h-[110px] flex-1 overflow-hidden ${variant === 'primary'
        ? 'bg-brand text-white'
        : 'bg-white border border-white/60'
        }`}
    >
      {/* Title */}
      <p
        className={`text-sm font-medium ${variant === 'primary' ? 'text-white/80' : 'text-black/60'
          }`}
      >
        {name}
      </p>

      {/* Value Row */}
      <div className="flex items-end justify-between mt-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-[36px] font-bold leading-none ${variant === 'primary' ? 'text-white' : 'text-black'}`}
          >
            {value}
          </span>
          <span
            className={`text-sm ${variant === 'primary' ? 'text-white/60' : 'text-black/40'}`}
          >
            -{total} HS
          </span>
        </div>

        {/* Mini Chart */}
        {variant === 'primary' ? (
          // Line chart for primary (Nghĩa sĩ)
          <svg width="80" height="35" viewBox="0 0 80 35" fill="none" className="flex-shrink-0">
            <path
              d="M0 30L10 24L20 28L30 16L40 22L50 10L60 18L70 6L80 12"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        ) : (
          // Bar chart for default
          <svg width="80" height="40" viewBox="0 0 80 40" fill="none" className="flex-shrink-0">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
              const heights = [22, 32, 18, 36, 26, 34, 20, 28, 24, 30]
              return (
                <rect
                  key={i}
                  x={i * 8}
                  y={40 - heights[i]}
                  width="5"
                  height={heights[i]}
                  rx="2"
                  fill="#FA865E"
                  fillOpacity={0.5}
                />
              )
            })}
          </svg>
        )}
      </div>

      {/* Icon in top right corner */}
      <button
        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center ${variant === 'primary' ? 'bg-white/20' : 'bg-black/[0.03]'
          }`}
      >
        <TrendingUp
          className={`w-4 h-4 ${variant === 'primary' ? 'text-white' : 'text-black/40'}`}
        />
      </button>
    </div>
  )
}

// Bar Chart Component
function BarChart({ data, chartType }: { data: ChartDataItem[], chartType: ChartType }) {
  // Fixed max value of 400
  const maxValue = 400
  const yAxisLabels = [400, 300, 200, 100, 0]

  const barColors = {
    chienCon: '#6E62E5',
    nghiaSi: '#86D4FF',
    thieuNhi: '#E178FF',
    auNhi: '#E5E1DC',
  }
  const chartHeight = 300

  const chartTitle = chartType === 'sunday' ? 'Biểu đồ Chúa nhật' : 'Biểu đồ Thứ năm'
  const dayIndicator = chartType === 'sunday' ? 'Chủ nhật' : 'Thứ năm'

  return (
    <div className="bg-white rounded-[15px] p-6 border border-white/60">
      {/* Header Row - Title + Indicator */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[26px] font-semibold text-black">{chartTitle}</h3>
          <p className="text-[14px] font-medium mt-1" style={{ color: '#666D80' }}>Số điểm danh theo ngành - 3 tuần gần nhất</p>
        </div>

        {/* Current day indicator */}
        <div className="flex items-center gap-2">
          <div className="w-[10px] h-[10px] rounded-full bg-white border-[3px] border-[#FA865E]" />
          <span className="text-[14px] font-medium" style={{ color: '#666D80' }}>{dayIndicator}</span>
        </div>
      </div>

      {/* Main Chart Area - Chart + Legend on right */}
      <div className="flex gap-6">
        {/* Left: Y-axis + Chart */}
        <div className="flex flex-1">
          {/* Y-axis */}
          <div className="flex flex-col justify-between pr-4 text-right" style={{ height: `${chartHeight}px` }}>
            {yAxisLabels.map((label) => (
              <span
                key={label}
                className="text-[12px]"
                style={{
                  color: '#8A8C90',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Chart container with grid lines */}
          <div className="flex-1 relative">
            {/* Grid area */}
            <div className="relative" style={{ height: `${chartHeight}px` }}>
              {/* Grid lines - 5 horizontal lines at 0%, 25%, 50%, 75%, 100% from bottom */}
              {[0, 25, 50, 75, 100].map((percent, index) => (
                <div
                  key={index}
                  className="absolute left-0 right-0 border-t"
                  style={{
                    bottom: `${percent}%`,
                    borderColor: '#E5E1DC',
                  }}
                />
              ))}

              {/* Left vertical line */}
              <div
                className="absolute top-0 bottom-0 border-l"
                style={{ left: 0, borderColor: '#E5E1DC' }}
              />

              {/* Right vertical line */}
              <div
                className="absolute top-0 bottom-0 border-r"
                style={{ right: 0, borderColor: '#E5E1DC' }}
              />

              {/* Bars container - positioned absolute to align with bottom */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end">
                {data.map((item, index) => (
                  <div key={index} className="flex items-end gap-[2px]">
                    {/* Chiên con */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] mb-1" style={{ color: '#666D80' }}>{item.chienCon}</span>
                      <div
                        style={{
                          width: '39px',
                          height: `${(item.chienCon / maxValue) * chartHeight}px`,
                          backgroundColor: barColors.chienCon,
                        }}
                      />
                    </div>
                    {/* Nghĩa sĩ */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] mb-1" style={{ color: '#666D80' }}>{item.nghiaSi}</span>
                      <div
                        style={{
                          width: '39px',
                          height: `${(item.nghiaSi / maxValue) * chartHeight}px`,
                          backgroundColor: barColors.nghiaSi,
                        }}
                      />
                    </div>
                    {/* Thiếu nhi */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] mb-1" style={{ color: '#666D80' }}>{item.thieuNhi}</span>
                      <div
                        style={{
                          width: '39px',
                          height: `${(item.thieuNhi / maxValue) * chartHeight}px`,
                          backgroundColor: barColors.thieuNhi,
                        }}
                      />
                    </div>
                    {/* Ấu nhi */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] mb-1" style={{ color: '#666D80' }}>{item.auNhi}</span>
                      <div
                        style={{
                          width: '39px',
                          height: `${(item.auNhi / maxValue) * chartHeight}px`,
                          backgroundColor: barColors.auNhi,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* X-axis labels - outside the grid area */}
            <div className="flex justify-around mt-3">
              {data.map((item, index) => (
                <span key={index} className="text-[12px]" style={{ color: '#8A8C90' }}>{item.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Legend */}
        <div className="flex flex-col gap-2 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-[34px] h-[16px] rounded-[4px]" style={{ backgroundColor: '#6E62E5' }} />
            <span className="text-[14px] font-medium" style={{ color: '#6E62E5' }}>Chiên con</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[34px] h-[16px] rounded-[4px]" style={{ backgroundColor: '#86D4FF' }} />
            <span className="text-[14px] font-medium" style={{ color: '#86D4FF' }}>Nghĩa sĩ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[34px] h-[16px] rounded-[4px]" style={{ backgroundColor: '#E178FF' }} />
            <span className="text-[14px] font-medium" style={{ color: '#E178FF' }}>Thiếu nhi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[34px] h-[16px] rounded-[4px]" style={{ backgroundColor: '#E5E1DC' }} />
            <span className="text-[14px] font-medium" style={{ color: '#8A8C90' }}>Ấu nhi</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get the last 3 weeks' dates for Thursday or Sunday
function getLast3Weeks(dayType: 'thu5' | 'cn'): WeekData[] {
  const weeks: WeekData[] = []
  const today = new Date()

  // Target day: 0=Sunday, 4=Thursday
  const targetDay = dayType === 'cn' ? 0 : 4
  const dayLabel = dayType === 'cn' ? 'CN' : 'T5'
  const fullDayLabel = dayType === 'cn' ? 'Chủ nhật' : 'Thứ năm'

  // Find the most recent target day (including today if it matches)
  let current = new Date(today)
  const currentDay = current.getDay()

  // Calculate days to go back to reach target day
  let daysBack = currentDay - targetDay
  if (daysBack < 0) daysBack += 7

  current.setDate(current.getDate() - daysBack)

  // Get 3 weeks
  for (let i = 0; i < 3; i++) {
    const weekDate = new Date(current)
    weekDate.setDate(weekDate.getDate() - (i * 7))

    const dateStr = weekDate.toISOString().split('T')[0]
    const day = weekDate.getDate()
    const month = weekDate.getMonth() + 1

    weeks.push({
      date: dateStr,
      displayDate: `${dayLabel} ${day}/${month}`,
      fullDisplayDate: `${fullDayLabel} ${day}/${month}`,
    })
  }

  // Reverse to get oldest first
  return weeks.reverse()
}

// Map branch name to display name
const branchDisplayNames: Record<Branch, string> = {
  'Chiên Con': 'Chiên con',
  'Ấu Nhi': 'Ấu nhi',
  'Thiếu Nhi': 'Thiếu nhi',
  'Nghĩa Sĩ': 'Nghĩa sĩ',
}

export default function PerformancePage() {
  const { user, loading, isAdmin, logout } = useAuth()
  const router = useRouter()

  const [activeView, setActiveView] = useState<ViewType>('trend')
  const [chartType, setChartType] = useState<ChartType>('sunday')
  const [dataLoading, setDataLoading] = useState(true)

  // Data states
  const [chartData, setChartData] = useState<ChartDataItem[]>([])
  const [statsData, setStatsData] = useState<StatsDataItem[]>([])
  const [branchStats, setBranchStats] = useState<BranchStatsItem[]>([])

  // Fetch attendance data from Supabase
  const fetchAttendanceData = useCallback(async () => {
    setDataLoading(true)
    try {
      const dayType: 'thu5' | 'cn' = chartType === 'sunday' ? 'cn' : 'thu5'
      const weeks = getLast3Weeks(dayType)

      // Fetch all classes to get branch info
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, branch')
        .eq('status', 'ACTIVE')

      if (classesError) throw classesError

      // Create class to branch mapping
      const classToBranch: Record<string, Branch> = {}
      classesData?.forEach(cls => {
        classToBranch[cls.id] = cls.branch as Branch
      })

      // Fetch total active students per branch
      const { data: studentsData, error: studentsError } = await supabase
        .from('thieu_nhi')
        .select('id, class_id')
        .eq('status', 'ACTIVE')

      if (studentsError) throw studentsError

      // Count students by branch
      const studentCountByBranch: Record<string, number> = {
        'Chiên Con': 0,
        'Ấu Nhi': 0,
        'Thiếu Nhi': 0,
        'Nghĩa Sĩ': 0,
      }

      studentsData?.forEach(student => {
        if (student.class_id && classToBranch[student.class_id]) {
          const branch = classToBranch[student.class_id]
          studentCountByBranch[branch] = (studentCountByBranch[branch] || 0) + 1
        }
      })

      // Fetch attendance records for the 3 weeks
      const startDate = weeks[0].date
      const endDate = weeks[weeks.length - 1].date

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, student_id, class_id, attendance_date, day_type, status')
        .eq('day_type', dayType)
        .eq('status', 'present')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)

      if (attendanceError) throw attendanceError

      // Process data for chart
      const chartDataItems: ChartDataItem[] = weeks.map(week => {
        const weekAttendance = attendanceData?.filter(
          record => record.attendance_date === week.date
        ) || []

        // Count by branch
        const countByBranch: Record<string, number> = {
          'Chiên Con': 0,
          'Ấu Nhi': 0,
          'Thiếu Nhi': 0,
          'Nghĩa Sĩ': 0,
        }

        weekAttendance.forEach(record => {
          if (record.class_id && classToBranch[record.class_id]) {
            const branch = classToBranch[record.class_id]
            countByBranch[branch] = (countByBranch[branch] || 0) + 1
          }
        })

        return {
          date: week.displayDate,
          chienCon: countByBranch['Chiên Con'],
          auNhi: countByBranch['Ấu Nhi'],
          thieuNhi: countByBranch['Thiếu Nhi'],
          nghiaSi: countByBranch['Nghĩa Sĩ'],
        }
      })

      setChartData(chartDataItems)

      // Process stats data (total attendance per week)
      const statsTypes: ('line' | 'bar' | 'progress')[] = ['line', 'bar', 'progress']
      const statsDataItems: StatsDataItem[] = weeks.map((week, index) => {
        const weekAttendance = attendanceData?.filter(
          record => record.attendance_date === week.date
        ) || []

        return {
          date: week.fullDisplayDate,
          value: weekAttendance.length,
          type: statsTypes[index],
        }
      })

      setStatsData(statsDataItems)

      // Process branch stats (most recent week)
      const mostRecentWeek = weeks[weeks.length - 1]
      const recentAttendance = attendanceData?.filter(
        record => record.attendance_date === mostRecentWeek.date
      ) || []

      const countByBranch: Record<string, number> = {
        'Chiên Con': 0,
        'Ấu Nhi': 0,
        'Thiếu Nhi': 0,
        'Nghĩa Sĩ': 0,
      }

      recentAttendance.forEach(record => {
        if (record.class_id && classToBranch[record.class_id]) {
          const branch = classToBranch[record.class_id]
          countByBranch[branch] = (countByBranch[branch] || 0) + 1
        }
      })

      // Order: Nghĩa Sĩ (primary), Thiếu Nhi, Ấu Nhi, Chiên Con
      const branchOrder: Branch[] = ['Nghĩa Sĩ', 'Thiếu Nhi', 'Ấu Nhi', 'Chiên Con']
      const branchStatsItems: BranchStatsItem[] = branchOrder.map((branch, index) => ({
        name: branchDisplayNames[branch],
        value: countByBranch[branch],
        total: studentCountByBranch[branch],
        color: index === 0 ? 'primary' : 'default',
      }))

      setBranchStats(branchStatsItems)

    } catch (error) {
      console.error('Error fetching attendance data:', error)
    } finally {
      setDataLoading(false)
    }
  }, [chartType])

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [user, loading, isAdmin, router])

  // Fetch data when chartType changes
  useEffect(() => {
    if (user && isAdmin) {
      fetchAttendanceData()
    }
  }, [user, isAdmin, chartType, fetchAttendanceData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-brand"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  // Get user info
  const firstName = user.full_name?.split(' ').pop() || user.full_name

  // Get current date
  const today = new Date()
  const formattedDate = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="overview"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

      {/* Main Content */}
      <main className="px-6 pb-6">
        {/* Title Section */}
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[#666d80] hover:text-black transition-colors mb-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay trở lại</span>
          </Link>
          <h1 className="text-[40px] font-bold text-black">So sánh hiệu suất</h1>
        </div>

        {/* Top Row: Sidebar + Stats + Refresh + Right Controls */}
        <div className="flex gap-4 mb-6">
          {/* Left Sidebar */}
          <div className="w-[280px] flex-shrink-0 space-y-2">
            <SidebarButton
              icon={<Bell className={`w-5 h-5 ${activeView === 'trend' ? 'text-white' : 'text-brand'}`} />}
              label="Xu hướng 3 tuần gần nhất"
              active={activeView === 'trend'}
              onClick={() => setActiveView('trend')}
            />
            <SidebarButton
              icon={<Clock className={`w-5 h-5 ${activeView === 'class' ? 'text-white' : 'text-brand'}`} />}
              label="Thống kê theo lớp trong ngành"
              active={activeView === 'class'}
              onClick={() => setActiveView('class')}
            />
          </div>

          {/* Main Content Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Top Stats Row */}
            <div className="flex gap-4 items-start">
              {/* Stats Cards */}
              <div className="flex-1 flex gap-3">
                {statsData.length > 0 ? (
                  statsData.map((stat, index) => (
                    <StatsCard key={index} title={stat.date} value={stat.value} type={stat.type} />
                  ))
                ) : (
                  // Default empty cards while loading
                  ['line', 'bar', 'progress'].map((type, index) => (
                    <StatsCard key={index} title="Đang tải..." value={0} type={type as 'line' | 'bar' | 'progress'} />
                  ))
                )}
              </div>

              {/* Right Controls */}
              <div className="flex flex-col gap-3 w-[280px] flex-shrink-0">
                {/* Date display - horizontal row */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-black whitespace-nowrap">{capitalizedDate}</span>
                  <button className="h-[44px] px-5 bg-[#E5E1DC] border border-white/60 rounded-full text-base text-[#8A8C90] transition-all whitespace-nowrap">
                    Hôm nay
                  </button>
                </div>

                {/* Chart type buttons - stacked vertically */}
                <button
                  onClick={() => setChartType('thursday')}
                  className={`h-[48px] w-full rounded-full text-base font-medium transition-all whitespace-nowrap border border-white/60 ${chartType === 'thursday'
                    ? 'bg-[#FA865E] text-white'
                    : 'bg-white text-black'
                    }`}
                >
                  Biểu đồ Thứ Năm
                </button>
                <button
                  onClick={() => setChartType('sunday')}
                  className={`h-[48px] w-full rounded-full text-base font-medium transition-all whitespace-nowrap border border-white/60 ${chartType === 'sunday'
                    ? 'bg-[#FA865E] text-white'
                    : 'bg-white text-black'
                    }`}
                >
                  Biểu đồ Chúa Nhật
                </button>
              </div>
            </div>

            {/* Chart Section */}
            <div>
              {dataLoading ? (
                <div className="bg-white rounded-[15px] p-6 border border-white/60 h-[400px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <svg
                      className="animate-spin h-8 w-8 text-brand"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-500 text-sm">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : (
                <BarChart data={chartData} chartType={chartType} />
              )}
            </div>

            {/* Branch Cards */}
            <div className="flex gap-4">
              {branchStats.length > 0 ? (
                branchStats.map((branch, index) => (
                  <BranchCard
                    key={index}
                    name={branch.name}
                    value={branch.value}
                    total={branch.total}
                    variant={branch.color}
                  />
                ))
              ) : (
                // Default empty cards while loading
                ['Nghĩa sĩ', 'Thiếu nhi', 'Ấu nhi', 'Chiên con'].map((name, index) => (
                  <BranchCard
                    key={index}
                    name={name}
                    value={0}
                    total={0}
                    variant={index === 0 ? 'primary' : 'default'}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
