'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, supabase } from '@/lib/supabase'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Plus,
  Flame,
  Inbox,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard'
import { useAllNotifications, useInvalidateQueries } from '@/lib/queries'
import { NotificationAdminItem } from '@/components/notifications/NotificationItem'
import CreateNotificationModal from '@/components/notifications/CreateNotificationModal'
import DeleteNotificationModal from '@/components/notifications/DeleteNotificationModal'

// Stats Card Component
function AlertStatsCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: number
  icon: 'total' | 'high' | 'week' | 'all-sent'
  variant?: 'primary' | 'default'
}) {
  const getIcon = () => {
    switch (icon) {
      case 'total':
        return <Flame className="w-4 h-4 text-white" />
      case 'all-sent':
        return <Inbox className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'week':
        return <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
    }
  }

  const bars = Array.from({ length: 9 }, () => Math.random() * 100)

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

export default function AlertsPage() {
  const { user, logout } = useAuth()
  const { data: notifications, isLoading } = useAllNotifications()
  const { invalidateNotifications } = useInvalidateQueries()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  if (!user) return null

  const firstName = user.full_name?.split(' ').pop() || user.full_name
  const allNotifications = notifications || []

  // Stats
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const stats = {
    total: allNotifications.length,
    allSent: allNotifications.length,
    high: allNotifications.filter(n => n.priority === 'high').length,
    thisWeek: allNotifications.filter(n => new Date(n.created_at) >= oneWeekAgo).length,
  }

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
        activeTab="overview"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

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
          <div className="flex items-center justify-between">
            <h1 className="text-[40px] font-bold text-black dark:text-white">Quản lý thông báo</h1>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-full hover:bg-orange-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Tạo thông báo</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <AlertStatsCard title="Tổng thông báo" value={stats.total} icon="total" variant="primary" />
          <AlertStatsCard title="Đã gửi" value={stats.allSent} icon="all-sent" />
          <AlertStatsCard title="Mức độ cao" value={stats.high} icon="high" />
          <AlertStatsCard title="Trong tuần" value={stats.thisWeek} icon="week" />
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Bell className="w-7 h-7 text-[#8a8c90] mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#8a8c90]">Chưa có thông báo nào</p>
              <p className="text-xs text-[#8a8c90] mt-1">Nhấn &ldquo;Tạo thông báo&rdquo; để bắt đầu</p>
            </div>
          ) : (
            allNotifications.map(notification => (
              <NotificationAdminItem
                key={notification.id}
                notification={notification}
                onDelete={(id) => setDeleteTarget({ id, title: notification.title })}
              />
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateNotificationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <DeleteNotificationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        notificationTitle={deleteTarget?.title}
      />
    </div>
  )
}
