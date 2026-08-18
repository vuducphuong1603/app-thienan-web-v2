'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import DashboardHeader from '@/components/dashboard/DashboardHeader'

export default function GLVManagementLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  if (!user) return null

  const firstName = user.full_name?.split(' ').pop() || user.full_name

  return (
    <div className="min-h-screen">
      <DashboardHeader
        userName={firstName || 'User'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="management"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />
      <main className="px-4 sm:px-6 pb-6">
        {children}
      </main>
    </div>
  )
}
