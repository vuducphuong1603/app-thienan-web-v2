'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, User } from 'lucide-react'
import Image from 'next/image'
import { supabase, UserProfile, ROLE_LABELS } from '@/lib/supabase'

const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-[#FFF0EB]', text: 'text-brand' },
  giao_ly_vien: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
  phan_doan_truong: { bg: 'bg-[#FFF0EB]', text: 'text-brand' },
}

const STATUS_BADGE_STYLES = {
  ACTIVE: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Hoạt động' },
  INACTIVE: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Ngưng hoạt động' },
}

interface UserWithDetails extends UserProfile {
  class_name?: string
}

export default function ViewUserPage() {
  const params = useParams()
  const userId = params.id as string
  const router = useRouter()
  const [user, setUser] = useState<UserWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (error || !data) {
          console.error('Error fetching user:', error)
          alert('Không tìm thấy người dùng')
          router.push('/admin/management/users')
          return
        }

        setUser(data)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId, router])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center py-20">
          <svg
            className="animate-spin h-8 w-8 text-brand"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/admin/management/users')}
            className="flex items-center gap-2 text-primary-3 hover:text-black transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Quay trở lại</span>
          </button>
          <h1 className="text-4xl font-bold text-black">Thông tin người dùng</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/management/users')}
            className="h-[40px] px-6 bg-white border border-[#E5E1DC] rounded-full text-sm font-bold text-black hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl p-6">
        {/* User Info Section */}
        <div className="flex gap-6 pb-6 border-b border-[#E5E1DC]">
          {/* Left Label */}
          <div className="w-[300px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Thông tin tài khoản</h2>
            <p className="text-sm text-primary-3">Thông tin chi tiết người dùng</p>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-[#F5EAF6] flex items-center justify-center flex-shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-brand" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xl font-semibold text-black">
                  {user.saint_name} {user.full_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${ROLE_BADGE_STYLES[user.role]?.bg || 'bg-gray-100'} ${ROLE_BADGE_STYLES[user.role]?.text || 'text-gray-600'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE_STYLES[user.status].bg} ${STATUS_BADGE_STYLES[user.status].text}`}>
                    {STATUS_BADGE_STYLES[user.status].label}
                  </span>
                </div>
              </div>
            </div>

            {/* Username & Role */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Tên đăng nhập</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {user.username || '-'}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Vai trò</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {ROLE_LABELS[user.role] || user.role}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E5E1DC] my-2" />

            {/* Saint Name & Full Name */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Tên thánh</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {user.saint_name || '-'}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Họ và tên</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {user.full_name || '-'}
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Email</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {user.email || '-'}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Số điện thoại</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {user.phone || '-'}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-primary-3">Địa chỉ</label>
              <div className="min-h-[80px] px-4 py-3 bg-[#F6F6F6] rounded-xl text-sm text-black">
                {user.address || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div className="flex gap-6 pt-6">
          {/* Left Label */}
          <div className="w-[300px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Phân công & phụ trách</h2>
            <p className="text-sm text-primary-3">Thông tin ngành và lớp phụ trách</p>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Branch & Class */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Ngành phụ trách</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-brand font-medium flex items-center">
                  {user.branch || 'Chưa có ngành'}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">Lớp phụ trách</label>
                <div className="h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center">
                  {user.class_name || 'Chưa có lớp'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
