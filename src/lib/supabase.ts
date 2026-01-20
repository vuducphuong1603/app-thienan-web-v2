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
  address?: string
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE'
  branch?: string
  class_id?: string
  class_name?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
}

// Branch options (with Vietnamese diacritics)
export const BRANCHES = ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'] as const
export type Branch = typeof BRANCHES[number]

// Class interface
export interface Class {
  id: string
  name: string
  branch: Branch
  display_order: number
  status: 'ACTIVE' | 'INACTIVE'
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

// Năm học
export interface SchoolYear {
  id: string
  name: string // e.g., "2025 - 2026"
  start_date: string // e.g., "2025-09-14"
  end_date: string // e.g., "2026-05-31"
  is_current: boolean
  parish_name: string // e.g., "Giáo xứ Thiên Ân"
  total_weeks: number
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at?: string
}
