'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { DashboardHeader } from '@/components/dashboard'

interface ActivitiesLayoutProps {
  children: React.ReactNode
}

export default function ActivitiesLayout({ children }: ActivitiesLayoutProps) {
  const { user, loading, logout } = useAuth()

  if (!user && !loading) {
    return null
  }

  if (!user) {
    return null
  }

  const firstName = user.full_name?.split(' ').pop() || user.full_name

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-transparent">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        activeTab="activities"
        userAvatar={user.avatar_url}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex-1 px-5 pb-5">
        {children}
      </div>
    </div>
  )
}
