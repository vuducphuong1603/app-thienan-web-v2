'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, UserProfile, UserRole } from './supabase'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>
  deleteAvatar: () => Promise<{ success: boolean; error?: string }>
  isAdmin: boolean
  isGiaoLyVien: boolean
  isPhanDoanTruong: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem('thien_an_user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as UserProfile
        setUser(parsedUser)

        // Auto redirect if on login page and already logged in
        if (pathname === '/login') {
          redirectBasedOnRole(parsedUser.role)
        }
      } catch {
        localStorage.removeItem('thien_an_user')
      }
    } else {
      // Redirect to login if not on public route
      if (!publicRoutes.includes(pathname || '')) {
        router.push('/login')
      }
    }
    setLoading(false)
  }, [pathname, router])

  // Redirect user based on their role
  const redirectBasedOnRole = (role: UserRole) => {
    if (role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // Normalize identifier (remove whitespace)
      const normalizedIdentifier = identifier.trim().replace(/\s/g, '')

      // Try to find user by phone or by username/id
      let data = null
      let error = null

      // First try by phone
      const phoneResult = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedIdentifier)
        .eq('password', password)
        .maybeSingle()

      if (phoneResult.data) {
        data = phoneResult.data
      } else {
        // Try by email if phone didn't work
        const emailResult = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedIdentifier)
          .eq('password', password)
          .maybeSingle()

        if (emailResult.data) {
          data = emailResult.data
        } else {
          // Try by username column if exists
          const usernameResult = await supabase
            .from('users')
            .select('*')
            .eq('username', normalizedIdentifier)
            .eq('password', password)
            .maybeSingle()

          if (usernameResult.data) {
            data = usernameResult.data
          } else {
            error = 'User not found'
          }
        }
      }

      if (error || !data) {
        return { success: false, error: 'Ten dang nhap hoac mat khau khong dung' }
      }

      // Check account status
      if (data.status === 'INACTIVE') {
        return { success: false, error: 'Tai khoan cua ban da bi vo hieu hoa. Vui long lien he Ban dieu hanh.' }
      }

      const userProfile: UserProfile = {
        id: data.id,
        username: data.username || data.phone,
        email: data.email,
        full_name: data.full_name || 'Nguoi dung',
        saint_name: data.saint_name,
        phone: data.phone,
        address: data.address,
        role: data.role || 'giao_ly_vien',
        status: data.status,
        class_id: data.class_id,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      setUser(userProfile)
      localStorage.setItem('thien_an_user', JSON.stringify(userProfile))

      // Redirect based on role
      redirectBasedOnRole(userProfile.role)

      return { success: true }
    } catch (err) {
      console.error('Login error:', err)
      return { success: false, error: 'Da co loi xay ra. Vui long thu lai.' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (
    username: string,
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // Check if username already exists
      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle()

      if (existingUsername) {
        return { success: false, error: 'Tên đăng nhập đã tồn tại' }
      }

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      if (existingEmail) {
        return { success: false, error: 'Email đã được sử dụng' }
      }

      // Create new user
      const { error } = await supabase
        .from('users')
        .insert({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password: password, // Note: In production, this should be hashed
          full_name: fullName?.trim() || username.trim(),
          role: 'giao_ly_vien', // Default role for new users
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Register error:', error)
        return { success: false, error: 'Đăng ký thất bại. Vui lòng thử lại.' }
      }

      return { success: true }
    } catch (err) {
      console.error('Register error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('thien_an_user')
    router.push('/login')
  }

  const updateProfile = async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Bạn chưa đăng nhập' }
    }

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          saint_name: data.saint_name,
          phone: data.phone,
          address: data.address,
          avatar_url: data.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('Update profile error:', error)
        return { success: false, error: 'Cập nhật thông tin thất bại' }
      }

      // Update local state and localStorage
      const updatedUser = { ...user, ...data }
      setUser(updatedUser)
      localStorage.setItem('thien_an_user', JSON.stringify(updatedUser))

      return { success: true }
    } catch (err) {
      console.error('Update profile error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra' }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Bạn chưa đăng nhập' }
    }

    try {
      // Verify current password
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .single()

      if (verifyError || !userData) {
        return { success: false, error: 'Không thể xác minh mật khẩu' }
      }

      if (userData.password !== currentPassword) {
        return { success: false, error: 'Mật khẩu hiện tại không đúng' }
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Change password error:', updateError)
        return { success: false, error: 'Đổi mật khẩu thất bại' }
      }

      return { success: true }
    } catch (err) {
      console.error('Change password error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra' }
    }
  }

  const uploadAvatar = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Bạn chưa đăng nhập' }
    }

    try {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Ảnh phải nhỏ hơn 5MB' }
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Chỉ hỗ trợ định dạng JPG, PNG, GIF, WEBP' }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Delete old avatar if exists
      if (user.avatar_url) {
        const oldPath = user.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`avatars/${oldPath}`])
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return { success: false, error: 'Tải ảnh lên thất bại' }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = urlData.publicUrl

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Update avatar URL error:', updateError)
        return { success: false, error: 'Cập nhật ảnh đại diện thất bại' }
      }

      // Update local state
      const updatedUser = { ...user, avatar_url: avatarUrl }
      setUser(updatedUser)
      localStorage.setItem('thien_an_user', JSON.stringify(updatedUser))

      return { success: true, url: avatarUrl }
    } catch (err) {
      console.error('Upload avatar error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra' }
    }
  }

  const deleteAvatar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Bạn chưa đăng nhập' }
    }

    try {
      // Delete from storage if exists
      if (user.avatar_url) {
        const urlParts = user.avatar_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        if (fileName) {
          await supabase.storage.from('avatars').remove([`avatars/${fileName}`])
        }
      }

      // Update user profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Delete avatar error:', updateError)
        return { success: false, error: 'Xóa ảnh đại diện thất bại' }
      }

      // Update local state
      const updatedUser = { ...user, avatar_url: undefined }
      setUser(updatedUser)
      localStorage.setItem('thien_an_user', JSON.stringify(updatedUser))

      return { success: true }
    } catch (err) {
      console.error('Delete avatar error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra' }
    }
  }

  const isAdmin = user?.role === 'admin'
  const isGiaoLyVien = user?.role === 'giao_ly_vien'
  const isPhanDoanTruong = user?.role === 'phan_doan_truong'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      uploadAvatar,
      deleteAvatar,
      isAdmin,
      isGiaoLyVien,
      isPhanDoanTruong
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
