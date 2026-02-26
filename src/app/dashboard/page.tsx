'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import {
  DashboardHeader,
  StatsCard,
  WeeklyCalendar,
  MyNotes,
  AttendanceChart,
  AlertsSection,
  ClassStats,
} from '@/components/dashboard'

export default function UserDashboard() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  // Get current date info
  const today = new Date()
  const dayOfMonth = today.getDate()
  const dayOfWeek = today.toLocaleDateString('vi-VN', { weekday: 'long' })
  const month = today.toLocaleDateString('vi-VN', { month: 'long' })

  // Format weekday to capitalize first letter
  const formattedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)

  // Get first name for greeting
  const firstName = user.full_name?.split(' ').pop() || user.full_name

  return (
    <div className="min-h-screen">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'User'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="overview"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

      {/* Main Content */}
      <main className="p-4">
        <div className="space-y-4">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chúc ngày tốt lành</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Chào mừng, {firstName}. <span className="inline-block animate-wave">👋</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Display */}
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{dayOfMonth}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formattedDayOfWeek},</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{month}</p>
                </div>
              </div>
              {/* Notification Button */}
              <button className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl hover:bg-orange-500 transition-colors">
                <span className="text-sm font-medium">Xem thông báo</span>
              </button>
              {/* Calendar Button */}
              <button className="w-10 h-10 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-white" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <StatsCard
              title="Tổng số ngành"
              value={4}
              icon="branch"
              variant="primary"
              chart="line"
            />
            <StatsCard
              title="Tổng số lớp"
              value={42}
              icon="class"
              chart="bar"
            />
            <StatsCard
              title="Tổng thiếu nhi"
              value={1364}
              icon="student"
              chart="people"
            />
            <StatsCard
              title="Giáo lý viên"
              value={87}
              icon="teacher"
              chart="wave"
            />
          </div>

          {/* Middle & Bottom Section */}
          <div className="grid grid-cols-[1fr_1fr_320px] grid-rows-[310px_auto] gap-3">
            {/* Row 1: MyNotes, WeeklyCalendar */}
            <MyNotes />
            <WeeklyCalendar currentWeek={3} activitiesCount={3} />
            {/* ClassStats spans 2 rows */}
            <div className="row-span-2">
              <ClassStats />
            </div>
            {/* Row 2: AttendanceChart, AlertsSection */}
            <AttendanceChart />
            <AlertsSection />
          </div>
        </div>
      </main>
    </div>
  )
}
