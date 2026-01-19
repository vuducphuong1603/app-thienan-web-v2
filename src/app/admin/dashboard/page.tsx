'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DashboardHeader,
  StatsCard,
  WeeklyCalendar,
  MyNotes,
  TodayActivity,
  AttendanceChart,
  AlertsSection,
  ClassStats,
} from '@/components/dashboard'

interface Stats {
  totalBranches: number
  totalClasses: number
  totalThieuNhi: number
  totalGiaoLyVien: number
}

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalBranches: 4,
    totalClasses: 0,
    totalThieuNhi: 0,
    totalGiaoLyVien: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch users stats
        const { data: usersData } = await supabase
          .from('users')
          .select('role')

        // Fetch thieu_nhi count
        const { count: thieuNhiCount } = await supabase
          .from('thieu_nhi')
          .select('*', { count: 'exact', head: true })

        // Fetch classes count
        const { count: classesCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })

        if (usersData) {
          const totalGiaoLyVien = usersData.filter(u => u.role === 'giao_ly_vien').length

          setStats({
            totalBranches: 4,
            totalClasses: classesCount || 0,
            totalThieuNhi: thieuNhiCount || 0,
            totalGiaoLyVien,
          })
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setLoadingStats(false)
      }
    }

    if (user && isAdmin) {
      fetchStats()
    }
  }, [user, isAdmin])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        activeTab="overview"
      />

      {/* Main Content */}
      <main className="p-5">
        <div className="flex gap-5">
          {/* Left Content - Main Area */}
          <div className="flex-1 space-y-5 min-w-0">
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
            <div className="grid grid-cols-4 gap-4">
              <StatsCard
                title="Tổng số ngành"
                value={loadingStats ? '...' : stats.totalBranches}
                icon="branch"
                variant="primary"
                chart="line"
              />
              <StatsCard
                title="Tổng số lớp"
                value={loadingStats ? '...' : stats.totalClasses}
                icon="class"
                chart="bar"
              />
              <StatsCard
                title="Tổng thiếu nhi"
                value={loadingStats ? '...' : stats.totalThieuNhi}
                icon="student"
                chart="people"
              />
              <StatsCard
                title="Giáo lý viên"
                value={loadingStats ? '...' : stats.totalGiaoLyVien}
                icon="teacher"
                chart="wave"
              />
            </div>

            {/* Main Content - Flex layout with sidebar */}
            <div className="flex gap-4 items-start">
              {/* Main 2-column grid */}
              <div className="flex-1 grid grid-cols-[1.2fr_0.8fr] gap-4 items-start">
                {/* Left Column - Notes, Activity, Attendance stacked */}
                <div className="space-y-4">
                  <MyNotes />
                  <TodayActivity />
                  <AttendanceChart />
                </div>

                {/* Right Column - Calendar and Alerts stacked */}
                <div className="space-y-4">
                  <WeeklyCalendar currentWeek={3} activitiesCount={3} />
                  <AlertsSection />
                </div>
              </div>

              {/* Right Sidebar - Class Stats */}
              <div className="w-[500px] flex-shrink-0">
                <ClassStats />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
