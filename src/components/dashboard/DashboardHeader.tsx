'use client'

import { Search, Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface DashboardHeaderProps {
  userName: string
  userRole: string
  activeTab?: string
  userAvatar?: string
}

const navTabs = [
  { id: 'overview', label: 'Tổng quan', href: '/dashboard' },
  { id: 'management', label: 'Quản lý', href: '/dashboard/management' },
  { id: 'activities', label: 'Hoạt động', href: '/dashboard/activities' },
  { id: 'system', label: 'Hệ thống', href: '/dashboard/system' },
]

export default function DashboardHeader({ userName, userRole, activeTab = 'overview', userAvatar }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand to-orange-400 shadow-sm">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L4 7V12C4 16.42 7.42 20.74 12 22C16.58 20.74 20 16.42 20 12V7L12 2Z"
                fill="white"
              />
              <path
                d="M12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6ZM12 16C14.7 16 17.8 17.29 18 18H6C6.23 17.28 9.31 16 12 16Z"
                fill="#FA865E"
              />
            </svg>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-gray-50 rounded-full p-1">
            {navTabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Search + Actions + User */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="w-[180px] h-10 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>

          {/* Add Button */}
          <button className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors border border-gray-100">
            <Plus className="w-5 h-5 text-gray-600" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-3 ml-1 border-l border-gray-200">
            {/* Avatar */}
            <div className="w-10 h-10 bg-orange-100 rounded-full overflow-hidden flex items-center justify-center">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName} width={40} height={40} className="object-cover" />
              ) : (
                <svg className="w-6 h-6 text-brand" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            {/* Name and Role */}
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
