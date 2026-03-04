'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Clock, Pencil, Trash2, Video, CalendarDays } from 'lucide-react'
import { WeeklyPlan, PlanCategory, Class } from '@/lib/supabase'

interface EventCardProps {
  plan: WeeklyPlan
  category?: PlanCategory | null
  classes?: Class[]
  onEdit: (plan: WeeklyPlan) => void
  onDelete: (plan: WeeklyPlan) => void
}

function formatTimeAMPM(time: string): string {
  const parts = time.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  if (m === 0) return `${hour12} ${ampm}`
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

const BRANCH_COLORS: Record<string, string> = {
  'Chiên Con': '#FF6B6B',
  'Ấu Nhi': '#4ECDC4',
  'Thiếu Nhi': '#45B7D1',
  'Nghĩa Sĩ': '#96CEB4',
}

const AVATAR_COLORS = ['#FA865E', '#4A90D9', '#50C878', '#FFD700', '#9B59B6']

function isOnlineEvent(plan: WeeklyPlan): boolean {
  if (!plan.location) return false
  return plan.location.startsWith('http://') || plan.location.startsWith('https://')
}

export default function EventCard({ plan, category, classes = [], onEdit, onDelete }: EventCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Determine event status
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday = plan.plan_date === todayStr
  const [startH, startM] = plan.time_start.split(':').map(Number)
  const [endH, endM] = plan.time_end.split(':').map(Number)

  let status: 'upcoming' | 'ongoing' | 'past' | null = null
  if (plan.plan_date > todayStr) {
    status = 'upcoming'
  } else if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    if (nowMinutes < startMinutes) status = 'upcoming'
    else if (nowMinutes <= endMinutes) status = 'ongoing'
    else status = 'past'
  } else {
    status = 'past'
  }

  // Build avatars from branch/class assignments
  const avatars: { label: string; color: string }[] = []
  if (plan.branch) {
    avatars.push({
      label: plan.branch.slice(0, 2),
      color: BRANCH_COLORS[plan.branch] || '#FA865E',
    })
  } else if (plan.class_ids?.length) {
    plan.class_ids.slice(0, 4).forEach((id, i) => {
      const cls = classes.find(c => c.id === id)
      avatars.push({
        label: cls?.name?.slice(0, 2) || '?',
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      })
    })
  }

  const categoryColor = category?.color || '#9CA3AF'
  const online = isOnlineEvent(plan)

  return (
    <div className="bg-[#f6f6f6] dark:bg-[#2a2a2a] rounded-[11px] border border-white dark:border-white/10 p-3 flex flex-col gap-[9px]">
      {/* Header: Category Icon + Menu */}
      <div className="flex items-center justify-between">
        <div
          className="w-[47px] h-[47px] rounded-full border border-white dark:border-white/10 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#E5E1DC' }}
        >
          {online ? (
            <Video className="w-[22px] h-[22px] text-brand" />
          ) : (
            <CalendarDays className="w-[22px] h-[22px]" style={{ color: categoryColor }} />
          )}
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-[22px] h-[22px] flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <MoreHorizontal className="w-[22px] h-[22px] text-[#8a8c90]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-36 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(plan) }}
                className="w-full px-3.5 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 flex items-center gap-2 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(plan) }}
                className="w-full px-3.5 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xoá
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Event Details */}
      <div className="flex flex-col gap-1">
        {/* Title */}
        <h4 className="text-[12px] font-normal text-black dark:text-white leading-normal line-clamp-2">
          {plan.title}
        </h4>

        {/* Time */}
        <div className="flex items-center gap-1">
          <Clock className="w-[22px] h-[22px] text-[#8a8c90] flex-shrink-0" />
          <span className="text-[10px] text-black dark:text-gray-400">
            {formatTimeAMPM(plan.time_start)} - {formatTimeAMPM(plan.time_end)}
          </span>
        </div>
      </div>

      {/* Avatar Group */}
      {avatars.length > 0 && (
        <div className="flex -space-x-[9px]">
          {avatars.map((av, i) => (
            <div
              key={i}
              className="w-[29px] h-[29px] rounded-full border-2 border-[#f6f6f6] dark:border-[#2a2a2a] flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: av.color }}
              title={av.label}
            >
              {av.label}
            </div>
          ))}
          {plan.class_ids && plan.class_ids.length > 4 && (
            <div className="w-[29px] h-[29px] rounded-full border-2 border-[#f6f6f6] dark:border-[#2a2a2a] flex items-center justify-center text-[9px] font-bold text-gray-500 bg-gray-200 dark:bg-white/10">
              +{plan.class_ids.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Bottom: Online → Join Meeting button, Offline → Status text */}
      {online ? (
        <a
          href={plan.location || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 h-[30px] bg-brand rounded-[11px] w-full px-[27px] justify-center"
        >
          <Video className="w-[22px] h-[22px] text-white" />
          <span className="text-[11px] font-light text-white whitespace-nowrap">Tham gia họp</span>
        </a>
      ) : (
        <>
          {status === 'upcoming' && (
            <span className="text-[14px] font-medium text-brand">Sắp tới</span>
          )}
          {status === 'ongoing' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand rounded-[11px] w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] font-semibold text-white">Đang diễn ra</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
