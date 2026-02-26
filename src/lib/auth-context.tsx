'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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

// Convert phone number to email format used in Supabase Auth
function phoneToEmail(phone: string): string {
  // Remove whitespace and normalize
  let normalized = phone.trim().replace(/\s/g, '')
  // Remove +84 prefix and add leading 0
  if (normalized.startsWith('+84')) {
    normalized = '0' + normalized.slice(3)
  }
  // Remove 84 prefix (without +)
  if (normalized.startsWith('84') && normalized.length === 11) {
    normalized = '0' + normalized.slice(2)
  }
  return `${normalized}@thienan.app`
}

// Fetch user profile from public.users table
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    username: data.username || data.phone,
    email: data.email,
    full_name: data.full_name || 'Người dùng',
    saint_name: data.saint_name,
    phone: data.phone,
    address: data.address,
    role: data.role || 'giao_ly_vien',
    status: data.status,
    class_id: data.class_id,
    class_name: data.class_name,
    branch: data.branch,
    avatar_url: data.avatar_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize user from localStorage cache for instant UI render
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem('thien_an_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    return !localStorage.getItem('thien_an_user')
  })
  const router = useRouter()
  const pathname = usePathname()

  // Redirect user based on their role
  const redirectBasedOnRole = useCallback((role: UserRole) => {
    if (role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
  }, [router])

  // Auth initialization - runs ONCE on mount, not on every pathname change
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          if (profile && profile.status === 'ACTIVE') {
            setUser(profile)
            localStorage.setItem('thien_an_user', JSON.stringify(profile))
          } else {
            await supabase.auth.signOut()
            setUser(null)
            localStorage.removeItem('thien_an_user')
          }
        } else {
          setUser(null)
          localStorage.removeItem('thien_an_user')
        }
      } catch {
        setUser(null)
        localStorage.removeItem('thien_an_user')
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        localStorage.removeItem('thien_an_user')
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        if (profile && profile.status === 'ACTIVE') {
          setUser(profile)
          localStorage.setItem('thien_an_user', JSON.stringify(profile))
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Route protection - separate from auth init, lightweight check
  useEffect(() => {
    if (loading) return
    const isPublic = publicRoutes.includes(pathname || '')
    if (!user && !isPublic) {
      router.push('/login')
    }
    if (user && pathname === '/login') {
      redirectBasedOnRole(user.role)
    }
  }, [user, loading, pathname, router, redirectBasedOnRole])

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // Normalize identifier
      const normalizedIdentifier = identifier.trim().replace(/\s/g, '')

      // Convert phone/identifier to email format for Supabase Auth
      const email = phoneToEmail(normalizedIdentifier)

      // Sign in via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        return { success: false, error: 'Số điện thoại hoặc mật khẩu không đúng' }
      }

      // Fetch user profile from public.users table
      const profile = await fetchUserProfile(authData.user.id)

      if (!profile) {
        await supabase.auth.signOut()
        return { success: false, error: 'Không tìm thấy thông tin tài khoản' }
      }

      if (profile.status === 'INACTIVE') {
        await supabase.auth.signOut()
        return { success: false, error: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Ban điều hành.' }
      }

      setUser(profile)
      localStorage.setItem('thien_an_user', JSON.stringify(profile))

      // Redirect based on role
      redirectBasedOnRole(profile.role)

      return { success: true }
    } catch (err) {
      console.error('Login error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }
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

      // Check if username already exists in public.users
      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle()

      if (existingUsername) {
        return { success: false, error: 'Tên đăng nhập đã tồn tại' }
      }

      // Sign up via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || username.trim(),
            role: 'giao_ly_vien',
          },
        },
      })

      if (authError || !authData.user) {
        console.error('Register auth error:', authError)
        if (authError?.message?.includes('already registered')) {
          return { success: false, error: 'Email đã được sử dụng' }
        }
        return { success: false, error: 'Đăng ký thất bại. Vui lòng thử lại.' }
      }

      // Create profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username: username.trim(),
          email: email.trim().toLowerCase(),
          full_name: fullName?.trim() || username.trim(),
          role: 'giao_ly_vien',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (profileError) {
        console.error('Register profile error:', profileError)
        return { success: false, error: 'Đăng ký thất bại. Vui lòng thử lại.' }
      }

      // Sign out after register so user goes to login page
      await supabase.auth.signOut()

      return { success: true }
    } catch (err) {
      console.error('Register error:', err)
      return { success: false, error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
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
      // Verify current password by trying to sign in
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        return { success: false, error: 'Không thể xác minh phiên đăng nhập' }
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })

      if (verifyError) {
        return { success: false, error: 'Mật khẩu hiện tại không đúng' }
      }

      // Update password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

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
