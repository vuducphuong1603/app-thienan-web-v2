'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CustomDatePickerProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: string
  maxDate?: string
}

const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư',
  'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám',
  'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
]

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  className = '',
  disabled = false,
  minDate,
  maxDate,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number)
      return { year, month: month - 1 }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update viewDate when value changes
  useEffect(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number)
      setViewDate({ year, month: month - 1 })
    }
  }, [value])

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    // Convert Sunday (0) to 6, and shift others back by 1 (Monday = 0)
    return day === 0 ? 6 : day - 1
  }

  const generateCalendarDays = () => {
    const { year, month } = viewDate
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const daysInPrevMonth = getDaysInMonth(year, month - 1)

    const days: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean }> = []

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      days.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      })
    }

    // Next month days
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      days.push({
        day: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      })
    }

    return days
  }

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isSelected = (year: number, month: number, day: number) => {
    return value === formatDateString(year, month, day)
  }

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const isInSelectedWeek = (year: number, month: number, day: number) => {
    if (!value) return false

    const selectedDate = new Date(value)
    const checkDate = new Date(year, month, day)

    // Get the Monday of the selected week
    const selectedDay = selectedDate.getDay()
    const mondayOffset = selectedDay === 0 ? -6 : 1 - selectedDay
    const monday = new Date(selectedDate)
    monday.setDate(selectedDate.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    // Get the Sunday of the selected week
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return checkDate >= monday && checkDate <= sunday
  }

  const isDateDisabled = (year: number, month: number, day: number) => {
    const dateStr = formatDateString(year, month, day)
    if (minDate && dateStr < minDate) return true
    if (maxDate && dateStr > maxDate) return true
    return false
  }

  const handleDateSelect = (year: number, month: number, day: number) => {
    if (isDateDisabled(year, month, day)) return
    onChange(formatDateString(year, month, day))
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 }
      }
      return { ...prev, month: prev.month - 1 }
    })
  }

  const handleNextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 }
      }
      return { ...prev, month: prev.month + 1 }
    })
  }

  const formatDisplayValue = () => {
    if (!value) return ''
    const [year, month, day] = value.split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }

  const days = generateCalendarDays()
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input field */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-[#FA865E] focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20'}
          transition-colors duration-200`}
      >
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {value ? formatDisplayValue() : placeholder}
        </span>
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div
          ref={calendarRef}
          className="absolute z-50 mt-2 bg-white dark:bg-[#1a1a1a] rounded-[15px] border border-[#E5E1DC] dark:border-white/10 shadow-[1px_3px_4px_rgba(0,0,0,0.25)]"
          style={{ width: '297px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-4 pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white font-['Inter_Tight']">
              {MONTHS_VI[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>

          {/* Days header */}
          <div className="px-3">
            <div className="flex justify-between">
              {DAYS_EN.map((day) => (
                <div
                  key={day}
                  className="w-10 py-2 text-center text-[10px] text-gray-500 dark:text-gray-400 font-['Inter_Tight']"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="px-3 pb-2 flex flex-col gap-[5px]">
            {weeks.map((week, weekIndex) => {
              // Check if any day in this week is selected
              const weekHasSelected = week.some(d => isSelected(d.year, d.month, d.day))

              return (
                <div
                  key={weekIndex}
                  className={`flex justify-between items-center rounded-xl ${
                    weekHasSelected ? 'bg-[#FA865E]/20' : ''
                  }`}
                >
                  {week.map((dayInfo, dayIndex) => {
                    const selected = isSelected(dayInfo.year, dayInfo.month, dayInfo.day)
                    const today = isToday(dayInfo.year, dayInfo.month, dayInfo.day)
                    const inSelectedWeek = isInSelectedWeek(dayInfo.year, dayInfo.month, dayInfo.day)
                    const isDisabled = isDateDisabled(dayInfo.year, dayInfo.month, dayInfo.day)

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => handleDateSelect(dayInfo.year, dayInfo.month, dayInfo.day)}
                        disabled={isDisabled}
                        className={`w-10 py-2 rounded-xl text-center transition-colors font-['Inter_Tight']
                          ${selected
                            ? 'bg-[#FA865E] text-white font-medium text-sm'
                            : today
                              ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium text-sm'
                              : inSelectedWeek && dayInfo.isCurrentMonth
                                ? 'text-[#8A8C90] font-medium text-sm hover:bg-[#FA865E]/10'
                                : dayInfo.isCurrentMonth
                                  ? 'text-[#8A8C90] text-xs hover:bg-gray-100 dark:hover:bg-white/10'
                                  : 'text-[#D1D5DB] text-xs hover:bg-gray-50 dark:hover:bg-white/5'
                          }
                          ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        `}
                      >
                        {dayInfo.day}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Confirm button */}
          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-[#FA865E] text-white text-sm font-bold rounded-[56px]
                hover:bg-[#e97a54] transition-colors font-['Inter_Tight']"
            >
              Chọn lịch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
