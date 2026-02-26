'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import { useDashboardStats } from '@/lib/queries'
import {
  DashboardHeader,
  StatsCard,
  WeeklyCalendar,
  MyNotes,
  AttendanceChart,
  AlertsSection,
  ClassStats,
} from '@/components/dashboard'

export default function AdminDashboard() {
  const { user, loading, isAdmin, logout } = useAuth()

  const { data: stats, isLoading: loadingStats } = useDashboardStats(!!user && isAdmin)

  if (!user && !loading) {
    return null
  }

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
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="overview"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

      {/* Main Content */}
      <main className="p-5">
        <div className="space-y-5">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-[#666D80] dark:text-gray-300 mb-1">Chúc ngày tốt lành</p>
              <h1 className="text-[40px] font-bold text-black dark:text-white leading-tight">
                Chào mừng, {firstName}. <span className="inline-block animate-wave">👋</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Date Display */}
              <div className="flex items-center gap-3">
                <div className="w-[57px] h-[57px] rounded-full border border-[#E5E1DC] bg-white dark:bg-white/10 flex items-center justify-center">
                  <span className="text-[28px] font-bold text-black dark:text-white">{dayOfMonth}</span>
                </div>
                <div>
                  <p className="text-base font-medium text-black dark:text-white">{formattedDayOfWeek},</p>
                  <p className="text-base text-black dark:text-gray-300">{month}</p>
                </div>
              </div>
              {/* Separator */}
              <div className="w-px h-[34px] bg-black dark:bg-white/40" />
              {/* Notification Button */}
              <button className="flex items-center gap-2 px-8 py-3.5 bg-[#FA865E] text-white rounded-full hover:bg-[#e8764f] transition-colors shadow-[0px_0px_14px_rgba(110,98,229,0.04)]">
                <span className="text-base font-medium">Xem thông báo</span>
              </button>
              {/* Calendar Button */}
              <button className="w-[54px] h-[54px] bg-white dark:bg-white/10 border border-white/60 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
                <Calendar className="w-5 h-5 text-black dark:text-gray-300" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatsCard
              title="Tổng số ngành"
              value={loadingStats ? '...' : stats?.totalBranches ?? 0}
              icon="branch"
              variant="primary"
              chart="line"
            />
            <StatsCard
              title="Tổng số lớp"
              value={loadingStats ? '...' : stats?.totalClasses ?? 0}
              icon="class"
              chart="bar"
              href="/admin/management/classes"
            />
            <StatsCard
              title="Tổng thiếu nhi"
              value={loadingStats ? '...' : stats?.totalThieuNhi ?? 0}
              icon="student"
              chart="people"
              href="/admin/management/students"
            />
            <StatsCard
              title="Giáo lý viên"
              value={loadingStats ? '...' : stats?.totalGiaoLyVien ?? 0}
              icon="teacher"
              chart="wave"
              href="/admin/management/users"
            />
          </div>

          {/* Middle & Bottom Section - 3 columns, 2 rows layout */}
          <div className="grid grid-cols-3 grid-rows-[1.4fr_1fr] gap-4">
            {/* Row 1, Col 1 - Notes */}
            <div className="space-y-4">
              <MyNotes />
            </div>
            {/* Row 1, Col 2 - Weekly Calendar */}
            <WeeklyCalendar currentWeek={3} activitiesCount={3} />
            {/* Row 1-2, Col 3 - Class Stats spans 2 rows */}
            <div className="row-span-2">
              <ClassStats />
            </div>
            {/* Row 2, Col 1 - Attendance Chart */}
            <AttendanceChart />
            {/* Row 2, Col 2 - Alerts Section */}
            <AlertsSection />
          </div>
        </div>
      </main>
    </div>
  )
}
