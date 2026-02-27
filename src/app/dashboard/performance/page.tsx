'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useGLVClassTrend, useGLVPerStudentStats, useGLVDashboardStats } from '@/lib/queries'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  Users,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import DashboardHeader from '@/components/dashboard/DashboardHeader'

type ViewType = 'trend' | 'per-student' | 't5-vs-cn' | 'top-absent'

// Avatar color palette (same as AbsentStudentsList)
const avatarPalette: [string, string][] = [
  ['#FEE2E2', '#DC2626'],
  ['#DBEAFE', '#2563EB'],
  ['#D1FAE5', '#059669'],
  ['#EDE9FE', '#7C3AED'],
  ['#FEF3C7', '#D97706'],
  ['#CFFAFE', '#0891B2'],
  ['#FCE7F3', '#DB2777'],
  ['#E0E7FF', '#4F46E5'],
]

function getAvatarColor(name: string): [string, string] {
  const code = name?.charCodeAt(0) || 0
  return avatarPalette[code % avatarPalette.length]
}

// Sidebar Button Component (copied from admin performance)
function SidebarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 h-14 rounded-full transition-all shadow-sm ${active
        ? 'bg-brand text-white'
        : 'bg-[#F6F6F6] dark:bg-white/10 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'
        }`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-brand/10'
          }`}
      >
        {icon}
      </div>
      <span className="text-sm font-medium leading-tight text-left pr-3">{label}</span>
    </button>
  )
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    </div>
  )
}

// View 1: Trend Chart - 3 week attendance bars with T5/CN toggle
function TrendChart({
  trendData,
  totalStudents,
}: {
  trendData: { thu5Weeks: { date: string; displayDate: string; presentCount: number; rate: number }[]; cnWeeks: { date: string; displayDate: string; presentCount: number; rate: number }[] }
  totalStudents: number
}) {
  const [dayFilter, setDayFilter] = useState<'thu5' | 'cn'>('cn')
  const weeks = dayFilter === 'thu5' ? trendData.thu5Weeks : trendData.cnWeeks
  const maxRate = 100
  const chartHeight = 260

  return (
    <div className="bg-white dark:bg-white/10 rounded-[20px] p-6 border border-gray-100 dark:border-white/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-black dark:text-white">Xu hướng 3 tuần gần nhất</h3>
          <p className="text-sm text-[#666D80] mt-1">Tỷ lệ đi lễ của lớp ({totalStudents} thiếu nhi)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDayFilter('thu5')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${dayFilter === 'thu5' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
          >
            Thứ 5
          </button>
          <button
            onClick={() => setDayFilter('cn')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${dayFilter === 'cn' ? 'bg-[#FA865E] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
          >
            Chúa nhật
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex">
        {/* Y-axis */}
        <div className="flex flex-col justify-between pr-3 text-right" style={{ height: `${chartHeight}px` }}>
          {[100, 75, 50, 25, 0].map(v => (
            <span key={v} className="text-xs text-[#8A8C90]">{v}%</span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 relative">
          <div className="relative border-l border-[#E5E1DC] dark:border-white/10" style={{ height: `${chartHeight}px` }}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(p => (
              <div key={p} className="absolute left-0 right-0 border-t border-[#E5E1DC] dark:border-white/10" style={{ top: `${p}%` }} />
            ))}

            {/* Bar group */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end px-8">
              {weeks.map((w, i) => {
                const barH = (w.rate / maxRate) * chartHeight
                const barColor = dayFilter === 'thu5' ? '#3B82F6' : '#FA865E'
                return (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-black dark:text-white mb-1">{w.rate}%</span>
                    <span className="text-[10px] text-[#666D80] mb-1">{w.presentCount}/{totalStudents}</span>
                    <div
                      className="rounded-t-lg transition-all duration-500"
                      style={{ width: '72px', height: `${Math.max(barH, 4)}px`, backgroundColor: barColor }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* X labels */}
          <div className="flex justify-around mt-3 px-8">
            {weeks.map((w, i) => (
              <span key={i} className="text-xs text-[#8A8C90] w-[72px] text-center">{w.displayDate}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// View 2: Per-Student Chart - horizontal bars
function PerStudentChart({
  students,
  effectiveThu5Days,
  effectiveCnDays,
}: {
  students: { id: string; full_name: string; saint_name?: string; overallRate: number; thu5Rate: number; cnRate: number }[]
  effectiveThu5Days: number
  effectiveCnDays: number
}) {
  const sorted = [...students].sort((a, b) => b.overallRate - a.overallRate)

  const getColor = (rate: number) => {
    if (rate >= 80) return '#22C55E'
    if (rate >= 50) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="bg-white dark:bg-white/10 rounded-[20px] p-6 border border-gray-100 dark:border-white/10">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-black dark:text-white">Thống kê từng em</h3>
        <p className="text-sm text-[#666D80] mt-1">
          Tỉ lệ đi lễ tổng cộng (T5: {effectiveThu5Days} buổi, CN: {effectiveCnDays} buổi)
        </p>
        {/* Legend */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22C55E' }} />
            <span className="text-xs text-[#666D80]">&ge;80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
            <span className="text-xs text-[#666D80]">50-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <span className="text-xs text-[#666D80]">&lt;50%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {sorted.map(s => {
          const displayName = s.saint_name ? `${s.saint_name} ${s.full_name}` : s.full_name
          const color = getColor(s.overallRate)
          return (
            <div key={s.id} className="flex items-center gap-3">
              {/* Name */}
              <span className="text-sm text-black dark:text-white w-[160px] truncate flex-shrink-0" title={displayName}>
                {displayName}
              </span>
              {/* Bar */}
              <div className="flex-1 h-6 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(s.overallRate, 3)}%`, backgroundColor: color }}
                >
                  {s.overallRate >= 15 && (
                    <span className="text-[10px] font-bold text-white">{s.overallRate}%</span>
                  )}
                </div>
              </div>
              {s.overallRate < 15 && (
                <span className="text-xs font-semibold text-black dark:text-white w-10 text-right">{s.overallRate}%</span>
              )}
            </div>
          )
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Không có dữ liệu</p>
        )}
      </div>
    </div>
  )
}

// View 3: T5 vs CN comparison chart
function T5VsCNChart({
  trendData,
  totalStudents,
}: {
  trendData: { thu5Weeks: { date: string; displayDate: string; presentCount: number; rate: number }[]; cnWeeks: { date: string; displayDate: string; presentCount: number; rate: number }[] }
  totalStudents: number
}) {
  const chartHeight = 260
  const maxRate = 100

  // Merge by week index (0,1,2)
  const weekLabels = trendData.cnWeeks.map((w, i) => {
    const thu5 = trendData.thu5Weeks[i]
    const cnDate = w.date.slice(5) // MM-DD
    const t5Date = thu5?.date.slice(5) || ''
    return `T5 ${t5Date} / CN ${cnDate}`
  })

  return (
    <div className="bg-white dark:bg-white/10 rounded-[20px] p-6 border border-gray-100 dark:border-white/10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-black dark:text-white">So sánh Thứ 5 vs Chúa nhật</h3>
          <p className="text-sm text-[#666D80] mt-1">Tỷ lệ đi lễ 3 tuần gần nhất ({totalStudents} thiếu nhi)</p>
        </div>
        {/* Legend */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: '#3B82F6' }} />
            <span className="text-xs text-[#666D80]">Thứ 5</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: '#FA865E' }} />
            <span className="text-xs text-[#666D80]">Chúa nhật</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex">
        {/* Y-axis */}
        <div className="flex flex-col justify-between pr-3 text-right" style={{ height: `${chartHeight}px` }}>
          {[100, 75, 50, 25, 0].map(v => (
            <span key={v} className="text-xs text-[#8A8C90]">{v}%</span>
          ))}
        </div>

        <div className="flex-1 relative">
          <div className="relative border-l border-[#E5E1DC] dark:border-white/10" style={{ height: `${chartHeight}px` }}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(p => (
              <div key={p} className="absolute left-0 right-0 border-t border-[#E5E1DC] dark:border-white/10" style={{ top: `${p}%` }} />
            ))}

            {/* Grouped bars */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end px-4">
              {[0, 1, 2].map(i => {
                const t5 = trendData.thu5Weeks[i]
                const cn = trendData.cnWeeks[i]
                const t5H = ((t5?.rate || 0) / maxRate) * chartHeight
                const cnH = ((cn?.rate || 0) / maxRate) * chartHeight
                return (
                  <div key={i} className="flex items-end gap-1">
                    {/* T5 bar */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-[#3B82F6] mb-1">{t5?.rate || 0}%</span>
                      <div
                        className="rounded-t-md transition-all duration-500"
                        style={{ width: '36px', height: `${Math.max(t5H, 4)}px`, backgroundColor: '#3B82F6' }}
                      />
                    </div>
                    {/* CN bar */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-[#FA865E] mb-1">{cn?.rate || 0}%</span>
                      <div
                        className="rounded-t-md transition-all duration-500"
                        style={{ width: '36px', height: `${Math.max(cnH, 4)}px`, backgroundColor: '#FA865E' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X labels */}
          <div className="flex justify-around mt-3 px-4">
            {weekLabels.map((label, i) => (
              <span key={i} className="text-[10px] text-[#8A8C90] text-center">{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// View 4: Top Absent List
function TopAbsentList({
  students,
  effectiveThu5Days,
  effectiveCnDays,
}: {
  students: { id: string; full_name: string; saint_name?: string; totalAbsent: number; overallRate: number; thu5Count: number; cnCount: number }[]
  effectiveThu5Days: number
  effectiveCnDays: number
}) {
  const sorted = [...students].sort((a, b) => b.totalAbsent - a.totalAbsent)
  const totalDays = effectiveThu5Days + effectiveCnDays

  const getBadge = (rate: number) => {
    if (rate < 50) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Nguy hiểm' }
    if (rate < 70) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Cảnh báo' }
    return { bg: 'bg-gray-100 dark:bg-white/10', text: 'text-gray-600 dark:text-gray-400', label: 'Bình thường' }
  }

  return (
    <div className="bg-white dark:bg-white/10 rounded-[20px] p-6 border border-gray-100 dark:border-white/10">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-black dark:text-white">Top vắng nhiều nhất</h3>
        <p className="text-sm text-[#666D80] mt-1">
          Tổng buổi: {totalDays} (T5: {effectiveThu5Days}, CN: {effectiveCnDays})
        </p>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {sorted.map((s, idx) => {
          const displayName = s.saint_name ? `${s.saint_name} ${s.full_name}` : s.full_name
          const initial = s.full_name?.charAt(0) || '?'
          const [bgColor, textColor] = getAvatarColor(s.full_name)
          const badge = getBadge(s.overallRate)

          return (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              {/* Rank */}
              <span className="text-sm font-bold text-[#8A8C90] w-6 text-center">{idx + 1}</span>

              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                {initial}
              </div>

              {/* Name + detail */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-[#8A8C90]">
                  Vắng {s.totalAbsent} buổi | T5: {s.thu5Count}/{effectiveThu5Days} | CN: {s.cnCount}/{effectiveCnDays}
                </p>
              </div>

              {/* Rate + Badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-black dark:text-white">{s.overallRate}%</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Không có dữ liệu</p>
        )}
      </div>
    </div>
  )
}

export default function GLVPerformancePage() {
  const { user, loading, logout } = useAuth()
  const [activeView, setActiveView] = useState<ViewType>('trend')

  const classId = user?.class_id
  const { data: glvStats } = useGLVDashboardStats(user)
  const { data: trendData, isLoading: trendLoading } = useGLVClassTrend(classId, !!classId)
  const { data: perStudentData, isLoading: perStudentLoading } = useGLVPerStudentStats(classId, !!classId)

  if (!user && !loading) return null

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  const firstName = user.full_name?.split(' ').pop() || user.full_name
  const className = glvStats?.className || 'lớp của bạn'

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
      <main className="px-6 pb-6">
        {/* Title Section */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[#666d80] hover:text-black dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay trở lại</span>
          </Link>
          <h1 className="text-[32px] font-bold text-black dark:text-white">Hiệu suất lớp {className}</h1>
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="flex gap-4">
          {/* Left Sidebar */}
          <div className="w-[280px] flex-shrink-0 space-y-2">
            <SidebarButton
              icon={<TrendingUp className={`w-5 h-5 ${activeView === 'trend' ? 'text-white' : 'text-brand'}`} />}
              label="Xu hướng 3 tuần"
              active={activeView === 'trend'}
              onClick={() => setActiveView('trend')}
            />
            <SidebarButton
              icon={<Users className={`w-5 h-5 ${activeView === 'per-student' ? 'text-white' : 'text-brand'}`} />}
              label="Thống kê từng em"
              active={activeView === 'per-student'}
              onClick={() => setActiveView('per-student')}
            />
            <SidebarButton
              icon={<BarChart3 className={`w-5 h-5 ${activeView === 't5-vs-cn' ? 'text-white' : 'text-brand'}`} />}
              label="So sánh T5 vs CN"
              active={activeView === 't5-vs-cn'}
              onClick={() => setActiveView('t5-vs-cn')}
            />
            <SidebarButton
              icon={<AlertTriangle className={`w-5 h-5 ${activeView === 'top-absent' ? 'text-white' : 'text-brand'}`} />}
              label="Top vắng nhiều"
              active={activeView === 'top-absent'}
              onClick={() => setActiveView('top-absent')}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeView === 'trend' && (
              trendLoading || !trendData
                ? <LoadingSpinner />
                : <TrendChart trendData={trendData} totalStudents={trendData.totalStudents} />
            )}

            {activeView === 'per-student' && (
              perStudentLoading || !perStudentData
                ? <LoadingSpinner />
                : <PerStudentChart
                    students={perStudentData.students}
                    effectiveThu5Days={perStudentData.effectiveThu5Days}
                    effectiveCnDays={perStudentData.effectiveCnDays}
                  />
            )}

            {activeView === 't5-vs-cn' && (
              trendLoading || !trendData
                ? <LoadingSpinner />
                : <T5VsCNChart trendData={trendData} totalStudents={trendData.totalStudents} />
            )}

            {activeView === 'top-absent' && (
              perStudentLoading || !perStudentData
                ? <LoadingSpinner />
                : <TopAbsentList
                    students={perStudentData.students}
                    effectiveThu5Days={perStudentData.effectiveThu5Days}
                    effectiveCnDays={perStudentData.effectiveCnDays}
                  />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
