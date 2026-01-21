'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Lock,
  History,
  Clock,
  Monitor,
  AlertTriangle,
  ChevronDown,
  Flame,
  Inbox,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard'

// Types
interface Alert {
  id: string
  title: string
  description: string
  time: string
  source: string
  status: 'pending' | 'resolved' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  type: 'system' | 'report' | 'notification'
  progress: number
  createdAt: Date
}

type TabType = 'alerts' | 'rules' | 'history'
type FilterStatus = 'all' | 'pending' | 'resolved' | 'cancelled'
type FilterPriority = 'all' | 'low' | 'medium' | 'high'
type FilterType = 'all' | 'system' | 'report' | 'notification'
type FilterTime = '7days' | '30days' | '90days' | 'all'

// Mock data - empty by default as no alerts/rules created yet
const mockAlerts: Alert[] = []

// Stats Card Component
function AlertStatsCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: number
  icon: 'total' | 'unread' | 'high' | 'resolved'
  variant?: 'primary' | 'default'
}) {
  const getIcon = () => {
    switch (icon) {
      case 'total':
        return <Flame className="w-4 h-4 text-white" />
      case 'unread':
        return <Inbox className="w-4 h-4 text-gray-600" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-gray-600" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-gray-600" />
    }
  }

  // Generate random bars for the mini chart
  const bars = Array.from({ length: 9 }, () => Math.random() * 100)

  return (
    <div
      className={`relative rounded-[15px] p-4 h-[147px] overflow-hidden ${
        variant === 'primary'
          ? 'bg-brand text-white'
          : 'bg-white border border-white/60'
      }`}
    >
      {/* Title */}
      <p
        className={`text-[22px] font-semibold ${
          variant === 'primary' ? 'text-white' : 'text-black opacity-80'
        }`}
      >
        {title}
      </p>

      {/* Icon */}
      <div
        className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          variant === 'primary'
            ? 'bg-white/10 border border-white/20'
            : 'bg-black/[0.03]'
        }`}
      >
        {getIcon()}
      </div>

      {/* Value */}
      <p
        className={`text-[40px] font-bold absolute bottom-4 left-4 ${
          variant === 'primary' ? 'text-white' : 'text-black'
        }`}
      >
        {value}
      </p>

      {/* Mini Chart */}
      <div className="absolute bottom-4 right-4 flex items-end gap-1.5 h-[46px]">
        {bars.map((height, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div
              className={`w-1.5 rounded ${
                variant === 'primary' ? 'bg-white/20' : 'bg-brand/20'
              }`}
              style={{ height: `${46 - (height * 46) / 100}px` }}
            />
            <div
              className={`w-1.5 rounded ${
                variant === 'primary' ? 'bg-white' : 'bg-brand'
              }`}
              style={{ height: `${(height * 46) / 100}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Sidebar Tab Component
function SidebarTab({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-5 pl-[7px] pr-4 py-2 rounded-full transition-all ${
        active
          ? 'bg-brand text-white shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)]'
          : 'bg-[#f6f6f6] text-black shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] hover:bg-gray-100'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          active ? 'bg-white/20' : 'bg-brand/20'
        }`}
      >
        {icon}
      </div>
      <span className="text-base font-semibold opacity-80">{label}</span>
      {count !== undefined && (
        <div
          className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm ${
            active ? 'bg-white/20' : 'bg-black/10'
          }`}
        >
          <span className="text-xs">{count}</span>
        </div>
      )}
    </button>
  )
}

// Filter Button Component
function FilterButton({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 h-[38px] px-4 bg-white border border-white/60 rounded-full hover:shadow-sm transition-all"
    >
      <span className="text-sm font-medium text-black">{label}</span>
      <ChevronDown className="w-4 h-4 text-black" />
    </button>
  )
}

// Alert Item Component
function AlertItem({
  alert,
  onProcess,
  onCancel,
}: {
  alert: Alert
  onProcess: (id: string) => void
  onCancel: (id: string) => void
}) {
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Mức độ cao'
      case 'medium':
        return 'Mức độ trung bình'
      case 'low':
        return 'Mức độ thấp'
      default:
        return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chưa xử lý'
      case 'resolved':
        return 'Đã xử lý'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return status
    }
  }

  return (
    <div className="bg-white rounded-[25px] p-3.5 flex items-center gap-4">
      {/* Thumbnail */}
      <div className="w-[178px] h-[90px] bg-[#e5e1dc] rounded-[20px] flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Status & Priority */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[#6e62e5]">{getStatusLabel(alert.status)}</span>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-black" />
            <span className="text-xs text-black">{getPriorityLabel(alert.priority)}</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-black mb-0.5">{alert.title}</h4>

        {/* Description */}
        <p className="text-sm text-black/40 font-light mb-2">{alert.description}</p>

        {/* Meta Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-black/40" />
            <span className="text-xs text-black/40">Thời gian: {alert.time}</span>
          </div>
          <div className="w-px h-4 bg-black" />
          <div className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-black/40" />
            <span className="text-xs text-black/40">Nguồn: {alert.source}</span>
          </div>
        </div>
      </div>

      {/* Right Section - Progress & Actions */}
      <div className="flex flex-col items-end gap-8">
        {/* Progress Bars */}
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-5 rounded ${
                i < alert.progress / 10 ? 'bg-brand' : 'bg-[#e5e1dc]'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        {alert.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => onProcess(alert.id)}
              className="px-3 py-1.5 bg-brand text-white text-xs rounded-full hover:bg-brand/90 transition-colors"
            >
              Xử lý
            </button>
            <button
              onClick={() => onCancel(alert.id)}
              className="px-3 py-1.5 bg-[#e5e1dc] text-black text-xs rounded-full hover:bg-gray-300 transition-colors"
            >
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const { user, loading, isAdmin, logout } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('alerts')
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterTime, setFilterTime] = useState<FilterTime>('7days')

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [user, loading, isAdmin, router])

  // Calculate stats
  const stats = {
    total: alerts.length,
    unread: alerts.filter((a) => a.status === 'pending').length,
    high: alerts.filter((a) => a.priority === 'high').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  }

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false
    if (filterPriority !== 'all' && alert.priority !== filterPriority) return false
    if (filterType !== 'all' && alert.type !== filterType) return false
    return true
  })

  // Handlers
  const handleProcess = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'resolved' as const } : a))
    )
  }

  const handleCancel = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a))
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-brand"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  // Get user info
  const firstName = user.full_name?.split(' ').pop() || user.full_name

  // Get current date
  const today = new Date()
  const formattedDate = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

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
        {/* Title Section */}
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[#666d80] hover:text-black transition-colors mb-1"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Quay trở lại</span>
          </Link>
          <h1 className="text-[40px] font-bold text-black">Hệ thống cảnh báo</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <AlertStatsCard
            title="Tổng cảnh báo"
            value={stats.total}
            icon="total"
            variant="primary"
          />
          <AlertStatsCard title="Chưa đọc" value={stats.unread} icon="unread" />
          <AlertStatsCard title="Mức độ cao" value={stats.high} icon="high" />
          <AlertStatsCard title="Đã xử lý" value={stats.resolved} icon="resolved" />
        </div>

        {/* Content Area */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-[208px] flex-shrink-0 space-y-2">
            <SidebarTab
              icon={<Bell className="w-5 h-5" />}
              label="Cảnh báo"
              active={activeTab === 'alerts'}
              onClick={() => setActiveTab('alerts')}
            />
            <SidebarTab
              icon={<Lock className="w-5 h-5" />}
              label="Quy tắc"
              count={3}
              active={activeTab === 'rules'}
              onClick={() => setActiveTab('rules')}
            />
            <SidebarTab
              icon={<History className="w-5 h-5" />}
              label="Lịch sử"
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Divider */}
            <div className="w-px h-full bg-[#e5e1dc] absolute left-[232px] top-[388px]" />

            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-lg text-black">{capitalizedDate}</span>
                <button className="h-[38px] px-4 bg-white border border-white/60 rounded-full text-lg text-black hover:shadow-sm transition-all">
                  Hôm nay
                </button>
              </div>
              <div className="flex items-center gap-2">
                <FilterButton label="Tất cả mức độ" />
                <FilterButton label="Tất cả trạng thái" />
                <FilterButton label="Tất cả loại" />
                <FilterButton label="7 ngày qua" />
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-2">
                    <Bell className="w-7 h-7 text-[#8a8c90]" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-[#8a8c90]">Không có cảnh báo nào</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onProcess={handleProcess}
                    onCancel={handleCancel}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
