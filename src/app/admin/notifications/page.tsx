'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, supabase } from '@/lib/supabase'
import { useAllNotifications, useInvalidateQueries } from '@/lib/queries'
import { DashboardHeader } from '@/components/dashboard'
import { NotificationAdminItem } from '@/components/notifications/NotificationItem'
import CreateNotificationModal from '@/components/notifications/CreateNotificationModal'
import DeleteNotificationModal from '@/components/notifications/DeleteNotificationModal'
import {
  ArrowLeft,
  Bell,
  Plus,
  Flame,
  AlertCircle,
  Inbox,
  Send,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'

// ============ Stats Card Component (matching alerts page) ============
function NotifStatsCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: number
  icon: 'total' | 'high' | 'normal' | 'sent'
  variant?: 'primary' | 'default'
}) {
  const getIcon = () => {
    switch (icon) {
      case 'total':
        return <Flame className="w-4 h-4 text-white" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'normal':
        return <Inbox className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'sent':
        return <Send className="w-4 h-4 text-gray-600 dark:text-gray-300" />
    }
  }

  const bars = useMemo(() => Array.from({ length: 9 }, () => Math.random() * 100), [])

  return (
    <div
      className={`relative rounded-[15px] p-4 h-[147px] overflow-hidden ${
        variant === 'primary'
          ? 'bg-brand text-white'
          : 'bg-white dark:bg-white/10 border border-white/60 dark:border-white/10'
      }`}
    >
      <p
        className={`text-[22px] font-semibold ${
          variant === 'primary' ? 'text-white' : 'text-black dark:text-white opacity-80'
        }`}
      >
        {title}
      </p>
      <div
        className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          variant === 'primary'
            ? 'bg-white/10 border border-white/20'
            : 'bg-black/[0.03] dark:bg-white/10'
        }`}
      >
        {getIcon()}
      </div>
      <p
        className={`text-[40px] font-bold absolute bottom-4 left-4 ${
          variant === 'primary' ? 'text-white' : 'text-black dark:text-white'
        }`}
      >
        {value}
      </p>
      {icon === 'high' ? (
        <svg className="absolute bottom-4 right-4 w-[132px] h-[56px]" viewBox="0 0 132 56" fill="none">
          <rect x="0" y="3" width="6" height="53" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="0" y="19" width="6" height="37" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="0" y="38" width="6" height="18" rx="3" fill="#FA865E" />
          <rect x="14" y="26" width="6" height="30" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="14" y="41" width="6" height="15" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="14" y="48" width="6" height="8" rx="3" fill="#FA865E" />
          <rect x="28" y="24" width="6" height="32" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="28" y="29" width="6" height="27" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="28" y="39" width="6" height="17" rx="3" fill="#FA865E" />
          <rect x="42" y="42" width="6" height="14" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="42" y="47" width="6" height="9" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="42" y="50" width="6" height="6" rx="3" fill="#FA865E" />
          <rect x="56" y="28" width="6" height="28" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="56" y="37" width="6" height="19" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="56" y="43" width="6" height="13" rx="3" fill="#FA865E" />
          <rect x="70" y="26" width="6" height="30" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="70" y="33" width="6" height="23" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="70" y="38" width="6" height="18" rx="3" fill="#FA865E" />
          <rect x="84" y="38" width="6" height="18" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="84" y="43" width="6" height="13" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="84" y="51" width="6" height="5" rx="3" fill="#FA865E" />
          <rect x="98" y="33" width="6" height="23" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="98" y="39" width="6" height="17" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="98" y="46" width="6" height="10" rx="3" fill="#FA865E" />
          <rect x="112" y="37" width="6" height="19" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="112" y="42" width="6" height="14" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="112" y="46" width="6" height="10" rx="3" fill="#FA865E" />
          <rect x="126" y="46" width="6" height="10" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="126" y="50" width="6" height="6" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="126" y="53" width="6" height="3" rx="3" fill="#FA865E" />
        </svg>
      ) : icon === 'normal' ? (
        <svg className="absolute bottom-4 right-4 w-[144px] h-[44px]" viewBox="0 0 144 44" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient-normal" x1="72" y1="0" x2="72" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FA865E" stopOpacity="0.14" />
              <stop offset="1" stopColor="#FA865E" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 2L8 7L16 0L23.5 15.5L30 21L37 12L43 10L55 21L61 19L68 28L74 16L80 12L91 19H99L106.5 28H113L123 19L131 33L144 44H0V2Z" fill="url(#gradient-normal)" />
          <path d="M0 2L8 7L16 0L23.5 15.5L30 21L37 12L43 10L55 21L61 19L68 28L74 16L80 12L91 19H99L106.5 28H113L123 19L131 33L144 44" stroke="#FA865E" strokeWidth="1" fill="none" />
        </svg>
      ) : icon === 'sent' ? (
        <svg className="absolute bottom-4 right-4 w-[152px] h-[60px]" viewBox="0 0 152 60" fill="none">
          <rect x="0" y="0" width="4" height="50" rx="2" fill="#E5E1DC" />
          <rect x="0" y="52" width="4" height="8" rx="2" fill="#FA865E" />
          <rect x="12" y="0" width="4" height="18" rx="2" fill="#E5E1DC" />
          <rect x="12" y="20" width="4" height="40" rx="2" fill="#FA865E" />
          <rect x="24" y="0" width="4" height="23" rx="2" fill="#E5E1DC" />
          <rect x="24" y="24" width="4" height="26" rx="2" fill="#FA865E" />
          <rect x="24" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="36" y="0" width="4" height="25" rx="2" fill="#FA865E" />
          <rect x="36" y="27" width="4" height="11" rx="2" fill="#E5E1DC" />
          <rect x="36" y="40" width="4" height="20" rx="2" fill="#E5E1DC" />
          <rect x="48" y="0" width="4" height="30" rx="2" fill="#E5E1DC" />
          <rect x="48" y="32" width="4" height="18" rx="2" fill="#FA865E" />
          <rect x="48" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="60" y="0" width="4" height="10" rx="2" fill="#E5E1DC" />
          <rect x="60" y="12" width="4" height="27" rx="2" fill="#FA865E" />
          <rect x="60" y="41" width="4" height="19" rx="2" fill="#E5E1DC" />
          <rect x="72" y="0" width="4" height="36" rx="2" fill="#E5E1DC" />
          <rect x="72" y="38" width="4" height="12" rx="2" fill="#FA865E" />
          <rect x="72" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="84" y="0" width="4" height="10" rx="2" fill="#E5E1DC" />
          <rect x="84" y="12" width="4" height="31" rx="2" fill="#FA865E" />
          <rect x="84" y="45" width="4" height="15" rx="2" fill="#E5E1DC" />
          <rect x="96" y="0" width="4" height="50" rx="2" fill="#FA865E" />
          <rect x="96" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="108" y="0" width="4" height="24" rx="2" fill="#E5E1DC" />
          <rect x="108" y="26" width="4" height="34" rx="2" fill="#FA865E" />
          <rect x="120" y="0" width="4" height="7" rx="2" fill="#FA865E" />
          <rect x="120" y="9" width="4" height="51" rx="2" fill="#E5E1DC" />
          <rect x="132" y="0" width="4" height="26" rx="2" fill="#E5E1DC" />
          <rect x="132" y="28" width="4" height="22" rx="2" fill="#FA865E" />
          <rect x="132" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="144" y="0" width="4" height="50" rx="2" fill="#E5E1DC" />
          <rect x="144" y="52" width="4" height="8" rx="2" fill="#FA865E" />
        </svg>
      ) : (
        <div className="absolute bottom-4 right-4 flex items-end gap-1.5 h-[46px]">
          {bars.map((height, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div
                className={`w-1.5 rounded ${variant === 'primary' ? 'bg-white/20' : 'bg-brand/20'}`}
                style={{ height: `${46 - (height * 46) / 100}px` }}
              />
              <div
                className={`w-1.5 rounded ${variant === 'primary' ? 'bg-white' : 'bg-brand'}`}
                style={{ height: `${(height * 46) / 100}px` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Filter Dropdown (matching alerts page) ============
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLabel = options.find(o => o.value === value)?.label || label

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-[38px] px-4 bg-white dark:bg-white/10 border border-white/60 dark:border-white/10 rounded-full hover:shadow-sm transition-all"
      >
        <span className="text-sm font-medium text-black dark:text-white">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-black dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 min-w-[160px] bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-20 py-1">
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${
                value === option.value ? 'text-brand font-medium' : 'text-black dark:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Main Page ============
export default function NotificationManagementPage() {
  const router = useRouter()
  const { user, loading, isAdmin, logout } = useAuth()
  const { data: notifications, isLoading } = useAllNotifications()
  const { invalidateNotifications } = useInvalidateQueries()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterTarget, setFilterTarget] = useState('all')

  // Redirect non-admin
  if (!loading && (!user || !isAdmin)) {
    router.push('/dashboard')
    return null
  }

  if (!user) return null

  const firstName = user.full_name?.split(' ').pop() || user.full_name

  // Compute stats
  const totalCount = notifications?.length || 0
  const highCount = (notifications || []).filter(n => n.priority === 'high').length
  const normalCount = (notifications || []).filter(n => n.priority === 'normal').length
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisWeekCount = (notifications || []).filter(n => new Date(n.created_at) >= weekAgo).length

  // Apply filters
  const filtered = (notifications || []).filter(n => {
    if (filterPriority !== 'all' && n.priority !== filterPriority) return false
    if (filterTarget !== 'all' && n.target_type !== filterTarget) return false
    return true
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) throw error
    invalidateNotifications()
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="activities"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

      <main className="px-6 pb-6">
        {/* Title Section */}
        <div className="mb-6">
          <Link
            href="/admin/activities"
            className="inline-flex items-center gap-1.5 text-xs text-[#666d80] dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Quay trở lại</span>
          </Link>
          <h1 className="text-[40px] font-bold text-black dark:text-white">Quản lý thông báo</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <NotifStatsCard title="Tổng thông báo" value={totalCount} icon="total" variant="primary" />
          <NotifStatsCard title="Mức độ cao" value={highCount} icon="high" />
          <NotifStatsCard title="Bình thường" value={normalCount} icon="normal" />
          <NotifStatsCard title="Gửi trong tuần" value={thisWeekCount} icon="sent" />
        </div>

        {/* Filters + Create Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FilterDropdown
              label="Tất cả mức độ"
              value={filterPriority}
              onChange={setFilterPriority}
              options={[
                { value: 'all', label: 'Tất cả mức độ' },
                { value: 'high', label: 'Cao' },
                { value: 'normal', label: 'Bình thường' },
                { value: 'low', label: 'Thấp' },
              ]}
            />
            <FilterDropdown
              label="Tất cả đối tượng"
              value={filterTarget}
              onChange={setFilterTarget}
              options={[
                { value: 'all', label: 'Tất cả đối tượng' },
                { value: 'role', label: 'Vai trò' },
                { value: 'branch', label: 'Ngành' },
                { value: 'class', label: 'Lớp' },
                { value: 'student', label: 'Thiếu nhi' },
              ]}
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 h-[38px] px-4 bg-brand text-white rounded-full hover:bg-brand/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Tạo thông báo mới
          </button>
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Bell className="w-7 h-7 text-[#8a8c90] mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#8a8c90]">
                {filterPriority !== 'all' || filterTarget !== 'all'
                  ? 'Không tìm thấy thông báo phù hợp'
                  : 'Chưa có thông báo nào'}
              </p>
              <p className="text-xs text-[#8a8c90] mt-1">
                {filterPriority === 'all' && filterTarget === 'all'
                  ? 'Tạo thông báo mới để bắt đầu gửi đến người dùng'
                  : 'Thử thay đổi bộ lọc để xem thêm'}
              </p>
            </div>
          ) : (
            filtered.map(notification => (
              <NotificationAdminItem
                key={notification.id}
                notification={notification}
                onDelete={(id) => setDeleteTarget({ id, title: notification.title })}
              />
            ))
          )}
        </div>
      </main>

      {/* Create Modal */}
      <CreateNotificationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Delete Modal */}
      <DeleteNotificationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        notificationTitle={deleteTarget?.title}
      />
    </div>
  )
}
