import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Roles từ database
export type UserRole = 'admin' | 'phan_doan_truong' | 'giao_ly_vien'

// Role labels để hiển thị
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Ban điều hành',
  phan_doan_truong: 'Phân đoàn trưởng',
  giao_ly_vien: 'Giáo lý viên',
}

export interface UserProfile {
  id: string
  username?: string
  email?: string
  full_name: string
  saint_name?: string
  phone: string
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE'
  class_id?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
}

// Thiếu nhi profile (đối tượng được quản lý)
export interface ThieuNhiProfile {
  id: string
  full_name: string
  saint_name?: string
  date_of_birth?: string
  gender?: 'male' | 'female'
  address?: string
  parent_name?: string
  parent_phone?: string
  class_id?: string
  status: 'ACTIVE' | 'INACTIVE'
  avatar_url?: string
  notes?: string
  created_at: string
  updated_at?: string
}
