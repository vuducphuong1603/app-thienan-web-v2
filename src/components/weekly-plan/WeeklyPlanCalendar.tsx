'use client'

import { WeeklyPlan, PlanCategory, Class } from '@/lib/supabase'
import EventCard from './EventCard'

interface WeeklyPlanCalendarProps {
  weekStart: Date
  plans: WeeklyPlan[]
  categories: PlanCategory[]
  classes: Class[]
  onEditPlan?: (plan: WeeklyPlan) => void
  onDeletePlan?: (plan: WeeklyPlan) => void
}

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

const TIME_BANDS = [
  { label: '8 AM', hourEnd: 12 },
  { label: '1 PM', hourEnd: 16 },
  { label: '5 PM', hourEnd: 24 },
]

function formatDateShort(date: Date) {
  return String(date.getDate()).padStart(2, '0')
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTimeBandIndex(timeStart: string): number {
  const hour = parseInt(timeStart.split(':')[0], 10)
  if (hour < 12) return 0
  if (hour < 16) return 1
  return 2
}

export default function WeeklyPlanCalendar({
  weekStart,
  plans,
  categories,
  classes,
  onEditPlan,
  onDeletePlan,
}: WeeklyPlanCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const categoryMap = new Map(categories.map(c => [c.id, c]))

  // Group plans by date
  const plansByDate = new Map<string, WeeklyPlan[]>()
  for (const plan of plans) {
    const key = plan.plan_date
    const existing = plansByDate.get(key) || []
    existing.push(plan)
    plansByDate.set(key, existing)
  }

  // Sort each day's plans by time_start
  plansByDate.forEach((dayPlans, key) => {
    plansByDate.set(key, dayPlans.sort((a, b) => a.time_start.localeCompare(b.time_start)))
  })

  function getPlansByDateAndBand(dateStr: string, bandIndex: number): WeeklyPlan[] {
    const dayPlans = plansByDate.get(dateStr) || []
    return dayPlans.filter(p => getTimeBandIndex(p.time_start) === bandIndex)
  }

  const hasAnyPlans = plans.length > 0

  return (
    <div className="bg-white dark:bg-white/5 rounded-[20px] border border-[#E5E1DC] dark:border-white/10 overflow-hidden">
      {/* Header Row: GMT+7 + Day columns */}
      <div className="grid grid-cols-[72px_repeat(7,1fr)]">
        {/* Timezone cell */}
        <div className="px-3 py-3.5 border-b border-r border-[#E5E1DC] dark:border-white/10 bg-[#FAFAF8] dark:bg-transparent flex items-center">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-wide">GMT +7</span>
        </div>
        {/* Day columns header */}
        {days.map((day, index) => {
          const isToday = isSameDay(day, today)
          return (
            <div
              key={index}
              className={`px-3 py-3.5 border-b border-[#E5E1DC] dark:border-white/10 ${
                index < 6 ? 'border-r' : ''
              } ${isToday ? 'bg-brand/5' : 'bg-[#FAFAF8] dark:bg-transparent'}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-semibold ${isToday ? 'text-brand' : 'text-gray-700 dark:text-white'}`}>
                  {DAY_LABELS[index]},
                </span>
                {isToday ? (
                  <span className="bg-brand text-white w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold leading-none">
                    {formatDateShort(day)}
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-gray-400 dark:text-gray-500">
                    {formatDateShort(day)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time Band Rows */}
      {hasAnyPlans ? (
        <>
          {TIME_BANDS.map((band, bandIdx) => (
            <div key={bandIdx} className="grid grid-cols-[72px_repeat(7,1fr)]">
              {/* Time label */}
              <div className={`px-3 pt-4 pb-2 border-r border-[#E5E1DC] dark:border-white/10 ${
                bandIdx < TIME_BANDS.length - 1 ? 'border-b border-[#E5E1DC] dark:border-white/10' : ''
              } bg-[#FAFAF8] dark:bg-transparent`}>
                <span className="text-[12px] font-semibold text-gray-400 dark:text-gray-500">
                  {band.label}
                </span>
              </div>
              {/* Day cells for this time band */}
              {days.map((day, dayIdx) => {
                const isToday = isSameDay(day, today)
                const dateStr = toDateString(day)
                const cellPlans = getPlansByDateAndBand(dateStr, bandIdx)
                return (
                  <div
                    key={dayIdx}
                    className={`p-2 min-h-[200px] ${
                      dayIdx < 6 ? 'border-r' : ''
                    } ${
                      bandIdx < TIME_BANDS.length - 1 ? 'border-b' : ''
                    } border-[#E5E1DC] dark:border-white/10 ${
                      isToday ? 'bg-brand/[0.02]' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-2.5">
                      {cellPlans.map(plan => (
                        <EventCard
                          key={plan.id}
                          plan={plan}
                          category={categoryMap.get(plan.category_id || '')}
                          classes={classes}
                          onEdit={onEditPlan}
                          onDelete={onDeletePlan}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      ) : (
        <div className="grid grid-cols-[72px_repeat(7,1fr)]">
          {/* Time label for empty state */}
          <div className="border-r border-[#E5E1DC] dark:border-white/10 bg-[#FAFAF8] dark:bg-transparent">
            {TIME_BANDS.map((band, i) => (
              <div key={i} className={`px-3 pt-4 pb-2 min-h-[140px] ${
                i < TIME_BANDS.length - 1 ? 'border-b border-[#E5E1DC] dark:border-white/10' : ''
              }`}>
                <span className="text-[12px] font-semibold text-gray-400 dark:text-gray-500">{band.label}</span>
              </div>
            ))}
          </div>
          {/* Empty state spanning all day columns */}
          <div className="col-span-7 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                <path d="M16 2V6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 2V6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 10H21" stroke="#9CA3AF" strokeWidth="2"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Chưa có kế hoạch nào trong tuần này
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Nhấn &quot;Thêm kế hoạch&quot; để bắt đầu
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
