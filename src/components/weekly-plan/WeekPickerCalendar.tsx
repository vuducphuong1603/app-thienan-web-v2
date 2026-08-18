'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekPickerCalendarProps {
  isOpen: boolean
  onClose: () => void
  currentWeekStart: Date
  onSelectWeek: (weekStart: Date) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_NAMES_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư',
  'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám',
  'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function getCalendarDays(year: number, month: number): Date[] {
  // Get first day of month
  const firstDay = new Date(year, month, 1)
  // Get Monday of the week containing the first day
  const startDate = getMonday(firstDay)

  const days: Date[] = []
  const current = new Date(startDate)

  // Generate 6 weeks (42 days) to fill the grid
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

export default function WeekPickerCalendar({ isOpen, onClose, currentWeekStart, onSelectWeek }: WeekPickerCalendarProps) {
  const [viewMonth, setViewMonth] = useState(currentWeekStart.getMonth())
  const [viewYear, setViewYear] = useState(currentWeekStart.getFullYear())
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(currentWeekStart)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setViewMonth(currentWeekStart.getMonth())
      setViewYear(currentWeekStart.getFullYear())
      setSelectedWeekStart(currentWeekStart)
    }
  }, [isOpen, currentWeekStart])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const calendarDays = getCalendarDays(viewYear, viewMonth)

  // Group into weeks (rows of 7)
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  // Only show weeks that contain at least one day from the current month
  const visibleWeeks = weeks.filter(week =>
    week.some(d => d.getMonth() === viewMonth)
  )

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleDayClick = (date: Date) => {
    const weekStart = getMonday(date)
    setSelectedWeekStart(weekStart)
  }

  const handleConfirm = () => {
    onSelectWeek(selectedWeekStart)
    onClose()
  }

  const selectedWeekEnd = new Date(selectedWeekStart)
  selectedWeekEnd.setDate(selectedWeekStart.getDate() + 6)

  const isInSelectedWeek = (date: Date): boolean => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const start = new Date(selectedWeekStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedWeekEnd)
    end.setHours(0, 0, 0, 0)
    return d >= start && d <= end
  }

  const isWeekStart = (date: Date): boolean => isSameDay(date, selectedWeekStart)
  const isWeekEnd = (date: Date): boolean => isSameDay(date, selectedWeekEnd)

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-[297px] max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#1a1a1a] border border-[#E5E1DC] dark:border-white/10 rounded-[15px] shadow-[1px_3px_4px_0px_rgba(0,0,0,0.25)]"
    >
      {/* Month Header */}
      <div className="flex items-center justify-center gap-2 pt-[19px] pb-[14px] px-[13px]">
        <button
          onClick={goToPrevMonth}
          className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <ChevronLeft className="w-3 h-3 text-[#111827] dark:text-white" />
        </button>
        <span className="text-[14px] font-bold text-[#111827] dark:text-white">
          {MONTH_NAMES_VI[viewMonth]} {viewYear}
        </span>
        <button
          onClick={goToNextMonth}
          className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <ChevronRight className="w-3 h-3 text-[#111827] dark:text-white" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col gap-2 px-[13px]">
        {/* Day Headers */}
        <div className="flex items-center justify-between">
          {DAY_LABELS.map(label => (
            <div key={label} className="w-[40px] flex items-center justify-center py-2">
              <span className="text-[10px] text-[#4B5563] dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Date Rows */}
        <div className="flex flex-col gap-[5px]">
          {visibleWeeks.map((week, weekIdx) => {
            const isSelectedWeekRow = week.some(d => isInSelectedWeek(d))
            return (
              <div
                key={weekIdx}
                className={`flex items-center justify-between rounded-[12px] cursor-pointer transition-colors ${
                  isSelectedWeekRow ? 'bg-[rgba(250,134,94,0.2)]' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
                onClick={() => handleDayClick(week[0])}
              >
                {week.map((date, dayIdx) => {
                  const isCurrentMonth = date.getMonth() === viewMonth
                  const inWeek = isInSelectedWeek(date)
                  const isStart = isWeekStart(date)
                  const isEnd = isWeekEnd(date)

                  return (
                    <div
                      key={dayIdx}
                      className={`w-[40px] flex items-center justify-center py-2 rounded-[12px] transition-colors ${
                        isStart || isEnd
                          ? 'bg-[#FA865E]'
                          : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDayClick(date)
                      }}
                    >
                      <span
                        className={`text-[12px] leading-normal ${
                          isStart || isEnd
                            ? 'text-white font-medium text-[14px]'
                            : inWeek
                              ? 'text-[#8a8c90] font-medium text-[14px]'
                              : isCurrentMonth
                                ? 'text-[#8a8c90]'
                                : 'text-[#D1D5DB]'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm Button */}
      <div className="px-[10px] pt-4 pb-[26px]">
        <button
          onClick={handleConfirm}
          className="w-full h-[38px] bg-[#FA865E] hover:bg-[#e8764f] text-white text-[14px] font-bold rounded-[56px] transition-colors"
        >
          Chọn lịch
        </button>
      </div>
    </div>
  )
}
