'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard'
import { WeeklyPlanCalendar } from '@/components/weekly-plan'

export default function WeeklyPlanPage() {
  const { user, loading, isAdmin, logout } = useAuth()
  const router = useRouter()
  const [currentDate] = useState(new Date())

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [user, loading, isAdmin, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  // Format current date in Vietnamese
  const dayOfWeek = currentDate.toLocaleDateString('vi-VN', { weekday: 'long' })
  const formattedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)
  const formattedDate = `${formattedDayOfWeek}, ${currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  // Week range for display
  const startOfWeek = new Date(currentDate)
  const dayNum = currentDate.getDay()
  const diff = dayNum === 0 ? -6 : 1 - dayNum
  startOfWeek.setDate(currentDate.getDate() + diff)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const weekRange = `${startOfWeek.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${endOfWeek.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  const firstName = user.full_name?.split(' ').pop() || user.full_name

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
        {/* Back Button */}
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay trở lại</span>
        </Link>

        {/* Title */}
        <h1 className="text-[40px] font-bold italic text-gray-900 dark:text-white mb-5 leading-tight">
          Kế hoạch tuần này
        </h1>

        {/* Controls Row */}
        <div className="flex items-center justify-between mb-5">
          {/* Left: Date + Today Button */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formattedDate}
            </span>
            <button className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
              Hôm nay
            </button>
          </div>

          {/* Right: View Toggle + Date Range + Add Button */}
          <div className="flex items-center gap-3">
            {/* Week View Toggle */}
            <button className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
              Tuần
            </button>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-white">
                {weekRange}
              </span>
            </div>

            {/* Add Plan Button */}
            <button className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-[#e8764f] transition-colors">
              <Plus className="w-4 h-4" />
              Thêm kế hoạch
            </button>
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        <WeeklyPlanCalendar />
      </main>
    </div>
  )
}
