'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Clock, MapPin, Users, Pencil, Trash2 } from 'lucide-react'
import { WeeklyPlan, PlanCategory, Class } from '@/lib/supabase'
import CategoryBadge from './CategoryBadge'

interface EventCardProps {
  plan: WeeklyPlan
  category?: PlanCategory | null
  classes?: Class[]
  onEdit: (plan: WeeklyPlan) => void
  onDelete: (plan: WeeklyPlan) => void
}

function formatTime(time: string) {
  // time is HH:MM:SS or HH:MM, return HH:MM
  return time.slice(0, 5)
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

  const assignmentLabel = (() => {
    if (plan.branch) return plan.branch
    if (plan.class_ids && plan.class_ids.length > 0) {
      const classNames = plan.class_ids
        .map(id => classes.find(c => c.id === id)?.name)
        .filter(Boolean)
      if (classNames.length > 0) return classNames.join(', ')
    }
    return null
  })()

  return (
    <div
      className="bg-white dark:bg-[#2a2a2a] rounded-xl p-3 shadow-[0px_1px_4px_rgba(0,0,0,0.06)] border border-gray-50 dark:border-white/5 flex flex-col gap-1.5"
      style={{ borderLeft: `3px solid ${category?.color || '#9CA3AF'}` }}
    >
      {/* Top: category + menu */}
      <div className="flex items-start justify-between">
        <CategoryBadge category={category} />
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors -mr-1 -mt-0.5"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-32 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(plan) }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 flex items-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" /> Sửa
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(plan) }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">
        {plan.title}
      </h4>

      {/* Time */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
          {formatTime(plan.time_start)} - {formatTime(plan.time_end)}
        </span>
      </div>

      {/* Location */}
      {plan.location && (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
            {plan.location}
          </span>
        </div>
      )}

      {/* Assignment */}
      {assignmentLabel && (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
            {assignmentLabel}
          </span>
        </div>
      )}
    </div>
  )
}
