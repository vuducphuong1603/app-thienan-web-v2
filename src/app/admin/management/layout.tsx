'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard'
import Link from 'next/link'

interface ManagementLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  {
    id: 'users',
    label: 'Nguoi dung',
    href: '/admin/management/users',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M15 17.5C15 15.2909 12.7614 13.5 10 13.5C7.23858 13.5 5 15.2909 5 17.5"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="10"
          cy="7.5"
          r="3.5"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
        />
        <path
          d="M16.5 4L17.5 3M17.5 3L18.5 2M17.5 3L16.5 2M17.5 3L18.5 4"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'classes',
    label: 'Lop hoc',
    href: '/admin/management/classes',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="3"
          y="5"
          width="14"
          height="12"
          rx="2"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
        />
        <path
          d="M3 9H17"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
        />
        <path
          d="M7 5V3"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M13 5V3"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'students',
    label: 'Thieu nhi',
    href: '/admin/management/students',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="10"
          cy="10"
          r="7.5"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
        />
        <path
          d="M10 6V10L13 13"
          stroke={active ? 'white' : '#666D80'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function ManagementLayout({ children }: ManagementLayoutProps) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [user, loading, isAdmin, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500 text-sm">Dang tai...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const firstName = user.full_name?.split(' ').pop() || user.full_name

  // Determine active sidebar item
  const getActiveItem = () => {
    if (pathname?.includes('/users')) return 'users'
    if (pathname?.includes('/classes')) return 'classes'
    if (pathname?.includes('/students')) return 'students'
    return 'users'
  }

  const activeItem = getActiveItem()

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        activeTab="management"
        userAvatar={user.avatar_url}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex px-5 pb-5 gap-5">
        {/* Left Sidebar */}
        <aside className="w-[200px] flex-shrink-0">
          <nav className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const isActive = activeItem === item.id
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-brand text-white'
                      : 'bg-white text-primary-3 hover:bg-gray-50'
                  }`}
                >
                  {item.icon(isActive)}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
