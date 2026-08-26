'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useGLVDashboardStats } from '@/lib/queries'
import { Calendar } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import StatsCard from '@/components/dashboard/StatsCard'
import WeeklyCalendar from '@/components/dashboard/WeeklyCalendar'
import MyNotes from '@/components/dashboard/MyNotes'
import AttendanceChart from '@/components/dashboard/AttendanceChart'
import AlertsSection from '@/components/dashboard/AlertsSection'
import AbsentStudentsList from '@/components/dashboard/AbsentStudentsList'
import NotificationPopup from '@/components/notifications/NotificationPopup'
import NotificationListModal from '@/components/notifications/NotificationListModal'

export default function UserDashboard() {
  const { user, logout } = useAuth()
  const [isNotificationListOpen, setIsNotificationListOpen] = useState(false)
  const { data: glvStats } = useGLVDashboardStats(user)

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chúc ngày tốt lành</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Chào mừng, Trưởng {firstName}. <span className="inline-block animate-wave">👋</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Display */}
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{dayOfMonth}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formattedDayOfWeek},</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{month}</p>
                </div>
              </div>
              {/* Notification Button */}
              <button
                onClick={() => setIsNotificationListOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl hover:bg-orange-500 transition-colors"
              >
                <span className="text-sm font-medium">Xem thông báo</span>
              </button>
              {/* Calendar Button */}
              <button className="w-10 h-10 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-white" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatsCard
              title="Ngành"
              value={glvStats?.branchName || '...'}
              icon="branch"
              variant="primary"
              chart="line"
            />
            <StatsCard
              title="Tổng thiếu nhi"
              value={glvStats?.studentCount ?? '...'}
              icon="student"
              chart="people"
              href="/dashboard/management"
            />
            <StatsCard
              title="Tỉ lệ đi lễ thứ 5"
              value={glvStats ? `${glvStats.thu5Rate}%` : '...'}
              icon="class"
              chart="bar"
            />
            <StatsCard
              title="Tỉ lệ đi lễ chủ nhật"
              value={glvStats ? `${glvStats.cnRate}%` : '...'}
              icon="teacher"
              chart="wave"
            />
          </div>

          {/* Middle & Bottom Section - 3 columns, 2 rows layout (same as admin) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[1.4fr_1fr] gap-4 lg:h-[calc(100vh-310px)]">
            {/* Row 1, Col 1 - Notes */}
            <div className="space-y-4">
              <MyNotes />
            </div>
            {/* Row 1, Col 2 - Weekly Calendar */}
            <WeeklyCalendar currentWeek={3} activitiesCount={3} />
            {/* Row 1-2, Col 3 - AbsentStudentsList spans 2 rows, overflow hidden so list scrolls internally */}
            <div className="lg:row-span-2 min-h-0 overflow-hidden h-[480px] lg:h-auto">
              <AbsentStudentsList
                classId={user.class_id}
                className={glvStats?.className}
              />
            </div>
            {/* Row 2, Col 1 - Attendance Chart */}
            <AttendanceChart classId={user.class_id} />
            {/* Row 2, Col 2 - Alerts Section */}
            <AlertsSection />
          </div>
        </div>
      </main>

      {/* Notification Popup (auto-show unread) */}
      <NotificationPopup />

      {/* Notification List Modal */}
      <NotificationListModal
        isOpen={isNotificationListOpen}
        onClose={() => setIsNotificationListOpen(false)}
      />
    </div>
  )
}
