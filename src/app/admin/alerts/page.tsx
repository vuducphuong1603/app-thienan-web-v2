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
        return <Inbox className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
    }
  }

  // Generate random bars for the mini chart (not for unread)
  const bars = Array.from({ length: 9 }, () => Math.random() * 100)

  return (
    <div
      className={`relative rounded-[15px] p-4 h-[147px] overflow-hidden ${
        variant === 'primary'
          ? 'bg-brand text-white'
          : 'bg-white dark:bg-white/10 border border-white/60 dark:border-white/10'
      }`}
    >
      {/* Title */}
      <p
        className={`text-[22px] font-semibold ${
          variant === 'primary' ? 'text-white' : 'text-black dark:text-white opacity-80'
        }`}
      >
        {title}
      </p>

      {/* Icon */}
      <div
        className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          variant === 'primary'
            ? 'bg-white/10 border border-white/20'
            : 'bg-black/[0.03] dark:bg-white/10'
        }`}
      >
        {getIcon()}
      </div>

      {/* Value */}
      <p
        className={`text-[40px] font-bold absolute bottom-4 left-4 ${
          variant === 'primary' ? 'text-white' : 'text-black dark:text-white'
        }`}
      >
        {value}
      </p>

      {/* Mini Chart - Different styles based on icon type */}
      {icon === 'unread' ? (
        // Line chart for unread
        <svg
          className="absolute bottom-4 right-4 w-[144px] h-[44px]"
          viewBox="0 0 144 44"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradient-unread" x1="72" y1="0" x2="72" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FA865E" stopOpacity="0.14" />
              <stop offset="1" stopColor="#FA865E" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Gradient fill area */}
          <path
            d="M0 2L8 7L16 0L23.5 15.5L30 21L37 12L43 10L55 21L61 19L68 28L74 16L80 12L91 19H99L106.5 28H113L123 19L131 33L144 44H0V2Z"
            fill="url(#gradient-unread)"
          />
          {/* Line stroke */}
          <path
            d="M0 2L8 7L16 0L23.5 15.5L30 21L37 12L43 10L55 21L61 19L68 28L74 16L80 12L91 19H99L106.5 28H113L123 19L131 33L144 44"
            stroke="#FA865E"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      ) : icon === 'high' ? (
        // Stacked bar chart for high priority
        <svg
          className="absolute bottom-4 right-4 w-[132px] h-[56px]"
          viewBox="0 0 132 56"
          fill="none"
        >
          {/* Bar 1 */}
          <rect x="0" y="3" width="6" height="53" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="0" y="19" width="6" height="37" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="0" y="38" width="6" height="18" rx="3" fill="#FA865E" />
          {/* Bar 2 */}
          <rect x="14" y="26" width="6" height="30" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="14" y="41" width="6" height="15" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="14" y="48" width="6" height="8" rx="3" fill="#FA865E" />
          {/* Bar 3 */}
          <rect x="28" y="24" width="6" height="32" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="28" y="29" width="6" height="27" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="28" y="39" width="6" height="17" rx="3" fill="#FA865E" />
          {/* Bar 4 */}
          <rect x="42" y="42" width="6" height="14" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="42" y="47" width="6" height="9" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="42" y="50" width="6" height="6" rx="3" fill="#FA865E" />
          {/* Bar 5 */}
          <rect x="56" y="28" width="6" height="28" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="56" y="37" width="6" height="19" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="56" y="43" width="6" height="13" rx="3" fill="#FA865E" />
          {/* Bar 6 */}
          <rect x="70" y="26" width="6" height="30" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="70" y="33" width="6" height="23" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="70" y="38" width="6" height="18" rx="3" fill="#FA865E" />
          {/* Bar 7 */}
          <rect x="84" y="38" width="6" height="18" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="84" y="43" width="6" height="13" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="84" y="51" width="6" height="5" rx="3" fill="#FA865E" />
          {/* Bar 8 */}
          <rect x="98" y="33" width="6" height="23" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="98" y="39" width="6" height="17" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="98" y="46" width="6" height="10" rx="3" fill="#FA865E" />
          {/* Bar 9 */}
          <rect x="112" y="37" width="6" height="19" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="112" y="42" width="6" height="14" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="112" y="46" width="6" height="10" rx="3" fill="#FA865E" />
          {/* Bar 10 */}
          <rect x="126" y="46" width="6" height="10" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="126" y="50" width="6" height="6" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="126" y="53" width="6" height="3" rx="3" fill="#FA865E" />
        </svg>
      ) : icon === 'resolved' ? (
        // Segmented bar chart for resolved
        <svg
          className="absolute bottom-4 right-4 w-[152px] h-[60px]"
          viewBox="0 0 152 60"
          fill="none"
        >
          {/* Bar 1 */}
          <rect x="0" y="0" width="4" height="50" rx="2" fill="#E5E1DC" />
          <rect x="0" y="52" width="4" height="8" rx="2" fill="#FA865E" />
          {/* Bar 2 */}
          <rect x="12" y="0" width="4" height="18" rx="2" fill="#E5E1DC" />
          <rect x="12" y="20" width="4" height="40" rx="2" fill="#FA865E" />
          {/* Bar 3 */}
          <rect x="24" y="0" width="4" height="23" rx="2" fill="#E5E1DC" />
          <rect x="24" y="24" width="4" height="26" rx="2" fill="#FA865E" />
          <rect x="24" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          {/* Bar 4 */}
          <rect x="36" y="0" width="4" height="25" rx="2" fill="#FA865E" />
          <rect x="36" y="27" width="4" height="11" rx="2" fill="#E5E1DC" />
          <rect x="36" y="40" width="4" height="20" rx="2" fill="#E5E1DC" />
          {/* Bar 5 */}
          <rect x="48" y="0" width="4" height="30" rx="2" fill="#E5E1DC" />
          <rect x="48" y="32" width="4" height="18" rx="2" fill="#FA865E" />
          <rect x="48" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          {/* Bar 6 */}
          <rect x="60" y="0" width="4" height="10" rx="2" fill="#E5E1DC" />
          <rect x="60" y="12" width="4" height="27" rx="2" fill="#FA865E" />
          <rect x="60" y="41" width="4" height="19" rx="2" fill="#E5E1DC" />
          {/* Bar 7 */}
          <rect x="72" y="0" width="4" height="36" rx="2" fill="#E5E1DC" />
          <rect x="72" y="38" width="4" height="12" rx="2" fill="#FA865E" />
          <rect x="72" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          {/* Bar 8 */}
          <rect x="84" y="0" width="4" height="10" rx="2" fill="#E5E1DC" />
          <rect x="84" y="12" width="4" height="31" rx="2" fill="#FA865E" />
          <rect x="84" y="45" width="4" height="15" rx="2" fill="#E5E1DC" />
          {/* Bar 9 */}
          <rect x="96" y="0" width="4" height="50" rx="2" fill="#FA865E" />
          <rect x="96" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          {/* Bar 10 */}
          <rect x="108" y="0" width="4" height="24" rx="2" fill="#E5E1DC" />
          <rect x="108" y="26" width="4" height="34" rx="2" fill="#FA865E" />
          {/* Bar 11 */}
          <rect x="120" y="0" width="4" height="7" rx="2" fill="#FA865E" />
          <rect x="120" y="9" width="4" height="51" rx="2" fill="#E5E1DC" />
          {/* Bar 12 */}
          <rect x="132" y="0" width="4" height="26" rx="2" fill="#E5E1DC" />
          <rect x="132" y="28" width="4" height="22" rx="2" fill="#FA865E" />
          <rect x="132" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          {/* Bar 13 */}
          <rect x="144" y="0" width="4" height="50" rx="2" fill="#E5E1DC" />
          <rect x="144" y="52" width="4" height="8" rx="2" fill="#FA865E" />
        </svg>
      ) : (
        // Default bar chart for others (total)
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
      )}
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
          : 'bg-[#f6f6f6] dark:bg-white/10 text-black dark:text-white shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] hover:bg-gray-100 dark:hover:bg-white/20'
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
            active ? 'bg-white/20' : 'bg-black/10 dark:bg-white/20'
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
      className="flex items-center gap-2 h-[38px] px-4 bg-white dark:bg-white/10 border border-white/60 dark:border-white/10 rounded-full hover:shadow-sm transition-all"
    >
      <span className="text-sm font-medium text-black dark:text-white">{label}</span>
      <ChevronDown className="w-4 h-4 text-black dark:text-white" />
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
    <div className="bg-white dark:bg-white/10 rounded-[25px] p-3.5 flex items-center gap-4">
      {/* Thumbnail */}
      <div className="w-[178px] h-[90px] bg-[#e5e1dc] dark:bg-white/10 rounded-[20px] flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Status & Priority */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[#6e62e5]">{getStatusLabel(alert.status)}</span>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-black dark:text-white" />
            <span className="text-xs text-black dark:text-white">{getPriorityLabel(alert.priority)}</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-black dark:text-white mb-0.5">{alert.title}</h4>

        {/* Description */}
        <p className="text-sm text-black/40 dark:text-white/40 font-light mb-2">{alert.description}</p>

        {/* Meta Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/40 dark:text-white/40">Thời gian: {alert.time}</span>
          </div>
          <div className="w-px h-4 bg-black dark:bg-white/40" />
          <div className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/40 dark:text-white/40">Nguồn: {alert.source}</span>
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
                i < alert.progress / 10 ? 'bg-brand' : 'bg-[#e5e1dc] dark:bg-white/20'
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
              className="px-3 py-1.5 bg-[#e5e1dc] dark:bg-white/20 text-black dark:text-white text-xs rounded-full hover:bg-gray-300 dark:hover:bg-white/30 transition-colors"
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterStatus, _setFilterStatus] = useState<FilterStatus>('all')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterPriority, _setFilterPriority] = useState<FilterPriority>('all')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterType, _setFilterType] = useState<FilterType>('all')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_filterTime, _setFilterTime] = useState<FilterTime>('7days')

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
          <p className="text-gray-500 dark:text-gray-300 text-sm">Đang tải...</p>
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
            className="inline-flex items-center gap-1.5 text-xs text-[#666d80] dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Quay trở lại</span>
          </Link>
          <h1 className="text-[40px] font-bold text-black dark:text-white">Hệ thống cảnh báo</h1>
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
            <div className="w-px h-full bg-[#e5e1dc] dark:bg-white/10 absolute left-[232px] top-[388px]" />

            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-lg text-black dark:text-white">{capitalizedDate}</span>
                <button className="h-[38px] px-4 bg-white dark:bg-white/10 border border-white/60 dark:border-white/10 rounded-full text-lg text-black dark:text-white hover:shadow-sm transition-all">
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
