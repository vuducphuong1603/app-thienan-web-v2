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
    <header className="bg-transparent px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="w-[52px] h-[52px] rounded-full overflow-hidden flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Giáo Xứ Thiên Ân"
              width={52}
              height={52}
              className="object-cover"
            />
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-2">
            {navTabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-[22px] py-[12px] rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand text-white'
                    : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Search + Actions + User */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-4 h-[45px] px-1 bg-white border border-gray-200 rounded-full w-[324px]">
            <div className="w-[41px] h-[41px] bg-[#f6f6f6] rounded-full flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-black" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="flex-1 h-full pr-4 bg-transparent text-xs text-black placeholder:text-black border-none focus:outline-none"
            />
          </div>

          {/* Add Button */}
          <button className="w-[45px] h-[45px] bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0">
            <Plus className="w-5 h-5 text-black" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-[45px] h-[45px] rounded-full overflow-hidden flex items-center justify-center bg-orange-100 flex-shrink-0">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName} width={45} height={45} className="object-cover" />
              ) : (
                <svg className="w-7 h-7 text-brand" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            {/* Name and Role */}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-black">{userName}</p>
              <p className="text-xs text-black/40">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
