'use client'

import { useMemo, useState } from 'react'
import { Phone, Search, Users } from 'lucide-react'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/supabase'
import { useTeacherDirectory } from '@/lib/queries'
import {
  buildTeacherDirectory,
  filterTeacherDirectory,
  telHref,
  type DirectoryUser,
} from '@/lib/teacher-directory'

function TeacherCard({ user, subtitle }: { user: DirectoryUser; subtitle?: string }) {
  const href = telHref(user.phone)
  const name = `${user.saint_name ? `${user.saint_name} ` : ''}${user.full_name}`
  return (
    <div className="flex items-center gap-3 p-3 bg-[#F6F6F6] dark:bg-white/5 rounded-2xl">
      <div className="w-11 h-11 rounded-full bg-[#E5E1DC] overflow-hidden flex items-center justify-center flex-shrink-0">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-primary-3">{user.full_name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-black dark:text-white truncate">{name}</p>
        {subtitle && <p className="text-[11px] text-[#8B8685] truncate">{subtitle}</p>}
        {href ? (
          <a
            href={href}
            className="inline-flex items-center gap-1 text-xs text-brand font-medium hover:underline"
            aria-label={`Gọi ${name}`}
          >
            <Phone className="w-3 h-3 flex-shrink-0" />
            {user.phone}
          </a>
        ) : (
          <p className="text-xs text-[#666d80]">Chưa có số điện thoại</p>
        )}
      </div>
      {href && (
        <a
          href={href}
          className="sm:hidden w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0"
          aria-label={`Gọi ${name}`}
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}

export default function TeacherDirectoryPage() {
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')
  const { data, isLoading, error, refetch } = useTeacherDirectory()

  const directory = useMemo(
    () => (data ? buildTeacherDirectory(data.classes, data.users, user) : null),
    [data, user]
  )
  const visible = useMemo(
    () => (directory ? filterTeacherDirectory(directory, search) : null),
    [directory, search]
  )

  if (!user) return null
  const firstName = user.full_name?.split(' ').pop() || user.full_name
  const teacherCount = data ? data.users.length : 0

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <DashboardHeader
        userName={firstName || 'Người dùng'}
        userRole={ROLE_LABELS[user.role]}
        activeTab="directory"
        userAvatar={user.avatar_url}
        onLogout={logout}
      />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-[1104px] flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-[22px] font-semibold text-black dark:text-white">Danh bạ giáo lý viên</h1>
              <p className="text-sm text-[#666d80] mt-1">
                Ai đang dạy lớp nào và số điện thoại liên hệ. Bấm vào số để gọi.
              </p>
            </div>
            <div className="flex items-center gap-2 h-[45px] px-3 bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full sm:w-[320px]">
              <Search className="w-4 h-4 text-[#8B8685] flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm lớp, tên GLV hoặc số điện thoại"
                className="flex-1 h-full bg-transparent text-sm text-black dark:text-white placeholder:text-[#8B8685] border-none focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-white/10 rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600 mb-3">Không tải được danh bạ.</p>
              <button onClick={() => refetch()} className="px-4 py-2 rounded-full bg-brand text-white text-sm">
                Thử lại
              </button>
            </div>
          ) : visible && (
            <>
              <div className="flex items-center gap-2 text-sm text-[#666d80]">
                <Users className="w-4 h-4" />
                {teacherCount} người đang hoạt động
              </div>

              {visible.executives.length > 0 && (
                <section className="bg-white dark:bg-white/10 border border-[#E5E1DC] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF8F5] border-b border-[#E5E1DC]">
                    <h2 className="text-base font-bold text-brand uppercase">Ban điều hành</h2>
                    <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-medium rounded-full">
                      {visible.executives.length} người
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {visible.executives.map((u) => (
                      <TeacherCard key={u.id} user={u} subtitle={u.class_name ? `Kiêm GLV lớp ${u.class_name}` : undefined} />
                    ))}
                  </div>
                </section>
              )}

              {visible.branches.map((group) => (
                <section key={group.branch} className="bg-white dark:bg-white/10 border border-[#E5E1DC] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF8F5] border-b border-[#E5E1DC]">
                    <h2 className="text-base font-bold text-brand uppercase">Ngành {group.branch}</h2>
                    <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-medium rounded-full">
                      {group.classes.length} lớp
                    </span>
                  </div>

                  {group.leaders.length > 0 && (
                    <div className="px-4 py-3 border-b border-[#E5E1DC] bg-[#FAFAFA] dark:bg-white/5">
                      <p className="text-xs font-semibold text-primary-3 uppercase tracking-wider mb-2">Phân đoàn trưởng</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {group.leaders.map((u) => <TeacherCard key={u.id} user={u} />)}
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-[#E5E1DC]">
                    {group.classes.length === 0 ? (
                      <p className="text-sm text-primary-3 py-6 text-center">Không có lớp phù hợp</p>
                    ) : group.classes.map((cls) => (
                      <div key={cls.id} className="px-4 py-3 flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                        <div className="md:w-[160px] flex-shrink-0">
                          <p className="text-sm font-semibold text-black dark:text-white">{cls.name}</p>
                          <p className="text-xs text-[#8B8685]">{cls.teachers.length} giáo lý viên</p>
                        </div>
                        {cls.teachers.length === 0 ? (
                          <p className="text-sm text-primary-3 py-2">Chưa phân công giáo lý viên</p>
                        ) : (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {cls.teachers.map((u) => <TeacherCard key={u.id} user={u} />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
