'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
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
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    // Redirect admin to admin dashboard
    if (!loading && user?.role === 'admin') {
      router.push('/admin/dashboard')
    }
  }, [user, loading, router])

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
              <p className="text-sm text-gray-500 mb-1">Chúc ngày tốt lành</p>
              <h1 className="text-2xl font-bold text-gray-900">
                Chào mừng, {firstName}. <span className="inline-block animate-wave">👋</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Display */}
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-gray-900">{dayOfMonth}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{formattedDayOfWeek},</p>
                  <p className="text-sm text-gray-500">{month}</p>
                </div>
              </div>
              {/* Notification Button */}
              <button className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl hover:bg-orange-500 transition-colors">
                <span className="text-sm font-medium">Xem thông báo</span>
              </button>
              {/* Calendar Button */}
              <button className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Calendar className="w-5 h-5 text-gray-600" />
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
