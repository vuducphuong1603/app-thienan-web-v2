'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface CustomDateRangePickerProps {
  startDate: string // YYYY-MM-DD format
  endDate: string // YYYY-MM-DD format
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư',
  'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám',
  'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
]

export default function CustomDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  placeholder = 'Chọn khoảng thời gian',
  className = '',
  disabled = false,
}: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectingStart, setSelectingStart] = useState(true)
  const [viewDate, setViewDate] = useState(() => {
    if (startDate) {
      const [year, month] = startDate.split('-').map(Number)
      return { year, month: month - 1 }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const generateCalendarDays = () => {
    const { year, month } = viewDate
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const daysInPrevMonth = getDaysInMonth(year, month - 1)

    const days: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean }> = []

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

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      })
    }

    const remainingDays = 42 - days.length
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

  const isStartDate = (year: number, month: number, day: number) => {
    return startDate === formatDateString(year, month, day)
  }

  const isEndDate = (year: number, month: number, day: number) => {
    return endDate === formatDateString(year, month, day)
  }

  const isInRange = (year: number, month: number, day: number) => {
    if (!startDate || !endDate) return false
    const dateStr = formatDateString(year, month, day)
    return dateStr > startDate && dateStr < endDate
  }

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const handleDateSelect = (year: number, month: number, day: number) => {
    const dateStr = formatDateString(year, month, day)

    if (selectingStart) {
      onStartDateChange(dateStr)
      if (endDate && dateStr > endDate) {
        onEndDateChange('')
      }
      setSelectingStart(false)
    } else {
      if (dateStr < startDate) {
        onStartDateChange(dateStr)
        setSelectingStart(false)
      } else {
        onEndDateChange(dateStr)
        setSelectingStart(true)
      }
    }
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
    if (!startDate && !endDate) return ''
    const formatDate = (date: string) => {
      if (!date) return '...'
      const [year, month, day] = date.split('-').map(Number)
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  const days = generateCalendarDays()
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex items-center gap-2
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-[#FA865E] focus:border-[#FA865E] focus:ring-2 focus:ring-[#FA865E]/20'}
          transition-colors duration-200`}
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className={startDate || endDate ? 'text-gray-900' : 'text-gray-400'}>
          {startDate || endDate ? formatDisplayValue() : placeholder}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 bg-white rounded-[15px] border border-[#E5E1DC] shadow-[1px_3px_4px_rgba(0,0,0,0.25)]"
          style={{ width: '297px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-4 pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <span className="text-sm font-bold text-gray-900 font-['Inter_Tight']">
              {MONTHS_VI[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Selection indicator */}
          <div className="px-3 pb-2 text-center">
            <span className="text-xs text-gray-500 font-['Inter_Tight']">
              {selectingStart ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
            </span>
          </div>

          {/* Days header */}
          <div className="px-3">
            <div className="flex justify-between">
              {DAYS_EN.map((day) => (
                <div
                  key={day}
                  className="w-10 py-2 text-center text-[10px] text-gray-500 font-['Inter_Tight']"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="px-3 pb-2 flex flex-col gap-[5px]">
            {weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="flex justify-between items-center"
              >
                {week.map((dayInfo, dayIndex) => {
                  const isStart = isStartDate(dayInfo.year, dayInfo.month, dayInfo.day)
                  const isEnd = isEndDate(dayInfo.year, dayInfo.month, dayInfo.day)
                  const inRange = isInRange(dayInfo.year, dayInfo.month, dayInfo.day)
                  const today = isToday(dayInfo.year, dayInfo.month, dayInfo.day)

                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => handleDateSelect(dayInfo.year, dayInfo.month, dayInfo.day)}
                      className={`w-10 py-2 rounded-xl text-center transition-colors font-['Inter_Tight']
                        ${isStart || isEnd
                          ? 'bg-[#FA865E] text-white font-medium text-sm'
                          : inRange
                            ? 'bg-[#FA865E]/20 text-[#8A8C90] font-medium text-sm'
                            : today
                              ? 'bg-gray-100 text-gray-900 font-medium text-sm'
                              : dayInfo.isCurrentMonth
                                ? 'text-[#8A8C90] text-xs hover:bg-gray-100'
                                : 'text-[#D1D5DB] text-xs hover:bg-gray-50'
                        }
                        cursor-pointer
                      `}
                    >
                      {dayInfo.day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Confirm button */}
          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-[#FA865E] text-white text-sm font-bold rounded-[56px]
                hover:bg-[#e97a54] transition-colors font-['Inter_Tight']"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
