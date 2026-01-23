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
  const { user, loading, isAdmin, logout } = useAuth()
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
              href="/admin/management/classes"
            />
            <StatsCard
              title="Tổng thiếu nhi"
              value={loadingStats ? '...' : stats.totalThieuNhi}
              icon="student"
              chart="people"
              href="/admin/management/students"
            />
            <StatsCard
              title="Giáo lý viên"
              value={loadingStats ? '...' : stats.totalGiaoLyVien}
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
