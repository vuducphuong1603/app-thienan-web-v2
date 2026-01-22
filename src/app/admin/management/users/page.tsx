'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UserProfile, UserRole, ROLE_LABELS } from '@/lib/supabase'
import { Search, ChevronDown, FileSpreadsheet, Plus, Edit2, KeyRound, Trash2, X } from 'lucide-react'
import Image from 'next/image'
import ImportUsersModal from '@/components/management/ImportUsersModal'
import DeleteUserModal from '@/components/management/DeleteUserModal'
import ResetPasswordModal from '@/components/management/ResetPasswordModal'
import AddUserForm from '@/components/management/AddUserForm'
import EditUserForm from '@/components/management/EditUserForm'

interface User extends UserProfile {
  class_name?: string
  branch_name?: string
}

type FilterRole = 'all' | UserRole
type FilterBranch = 'all' | string

const ROLE_BADGE_STYLES: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: 'bg-[#FFF0EB]', text: 'text-brand' },
  giao_ly_vien: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
  phan_doan_truong: { bg: 'bg-[#FFF0EB]', text: 'text-brand' },
}

const STATUS_BADGE_STYLES = {
  ACTIVE: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Hoạt động' },
  INACTIVE: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Ngưng hoạt động' },
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<FilterRole>('all')
  const [filterBranch, setFilterBranch] = useState<FilterBranch>('all')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null)
  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [showEditUserForm, setShowEditUserForm] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)

  // Fetch users from Supabase
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      searchQuery === '' ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchLower)

    // Role filter
    const matchesRole = filterRole === 'all' || user.role === filterRole

    return matchesSearch && matchesRole
  })

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterRole('all')
    setFilterBranch('all')
    setFilterClass('all')
  }

  // Check if any filter is active
  const hasActiveFilters = searchQuery !== '' || filterRole !== 'all' || filterBranch !== 'all' || filterClass !== 'all'

  // Handle delete user
  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userToDelete.id)

    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }

    // Refresh the users list
    fetchUsers()
  }

  // Handle reset password
  const handleOpenResetPasswordModal = (user: User) => {
    setUserToResetPassword(user)
    setIsResetPasswordModalOpen(true)
  }

  const handleResetPassword = async () => {
    if (!userToResetPassword) return

    const { error } = await supabase
      .from('users')
      .update({ password: '123456' })
      .eq('id', userToResetPassword.id)

    if (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  // Handle edit user
  const handleOpenEditForm = (user: User) => {
    setUserToEdit(user)
    setShowEditUserForm(true)
  }

  // Show Edit User Form
  if (showEditUserForm && userToEdit) {
    return (
      <EditUserForm
        user={userToEdit}
        onBack={() => {
          setShowEditUserForm(false)
          setUserToEdit(null)
        }}
        onSuccess={fetchUsers}
      />
    )
  }

  // Show Add User Form
  if (showAddUserForm) {
    return (
      <AddUserForm
        onBack={() => setShowAddUserForm(false)}
        onSuccess={fetchUsers}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Actions Bar */}
      <div className="flex items-center justify-between">
        {/* Search Input */}
        <div className="flex items-center gap-2 h-[42px] px-3 bg-white border border-[#E5E1DC] rounded-xl w-[320px]">
          <Search className="w-5 h-5 text-primary-3" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, username,..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-full bg-transparent text-sm text-black placeholder:text-primary-3 border-none focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 h-[42px] px-4 bg-white border border-[#E5E1DC] rounded-xl text-sm font-medium text-primary-3 hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={() => setShowAddUserForm(true)}
            className="flex items-center gap-2 h-[42px] px-4 bg-brand rounded-xl text-sm font-medium text-white hover:bg-orange-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm người dùng
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        {/* Role Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsRoleDropdownOpen(!isRoleDropdownOpen)
              setIsBranchDropdownOpen(false)
              setIsClassDropdownOpen(false)
            }}
            className="flex items-center justify-between gap-2 h-[42px] px-4 bg-white border border-[#E5E1DC] rounded-xl min-w-[160px] text-sm text-primary-3 hover:bg-gray-50 transition-colors"
          >
            <span>{filterRole === 'all' ? 'Tất cả vai trò' : ROLE_LABELS[filterRole]}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isRoleDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => {
                  setFilterRole('all')
                  setIsRoleDropdownOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterRole === 'all' ? 'bg-brand/10 text-brand' : 'text-black'}`}
              >
                Tất cả vai trò
              </button>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilterRole(key as UserRole)
                    setIsRoleDropdownOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterRole === key ? 'bg-brand/10 text-brand' : 'text-black'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Branch Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsBranchDropdownOpen(!isBranchDropdownOpen)
              setIsRoleDropdownOpen(false)
              setIsClassDropdownOpen(false)
            }}
            className="flex items-center justify-between gap-2 h-[42px] px-4 bg-white border border-[#E5E1DC] rounded-xl min-w-[160px] text-sm text-primary-3 hover:bg-gray-50 transition-colors"
          >
            <span>{filterBranch === 'all' ? 'Tất cả ngành' : filterBranch}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isBranchDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => {
                  setFilterBranch('all')
                  setIsBranchDropdownOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterBranch === 'all' ? 'bg-brand/10 text-brand' : 'text-black'}`}
              >
                Tất cả ngành
              </button>
              {['Ấu nhi', 'Thiếu nhi', 'Nghĩa sĩ', 'Hiệp sĩ'].map((branch) => (
                <button
                  key={branch}
                  onClick={() => {
                    setFilterBranch(branch)
                    setIsBranchDropdownOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${filterBranch === branch ? 'bg-brand/10 text-brand' : 'text-black'}`}
                >
                  {branch}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Class Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsClassDropdownOpen(!isClassDropdownOpen)
              setIsRoleDropdownOpen(false)
              setIsBranchDropdownOpen(false)
            }}
            className="flex items-center justify-between gap-2 h-[42px] px-4 bg-white border border-[#E5E1DC] rounded-xl min-w-[180px] text-sm text-primary-3 hover:bg-gray-50 transition-colors"
          >
            <span>{filterClass === 'all' ? 'Chọn ngành trước' : filterClass}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isClassDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
              <div className="px-4 py-2.5 text-sm text-primary-3">
                Vui lòng chọn ngành trước
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className={`flex items-center gap-2 h-[42px] px-4 rounded-xl text-sm font-medium transition-colors ${
            hasActiveFilters
              ? 'bg-brand text-white hover:bg-orange-500'
              : 'bg-[#F6F6F6] text-primary-3 cursor-not-allowed'
          }`}
        >
          <X className="w-4 h-4" />
          Xóa bộ lọc
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E5E1DC] rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_140px_140px_140px_100px_120px] gap-4 px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E1DC]">
          <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Người dùng</div>
          <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Vai trò</div>
          <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Ngành/ Lớp</div>
          <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Liên hệ</div>
          <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Trạng thái</div>
          <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Thao tác</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-primary-3">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E1DC]">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_140px_140px_140px_100px_120px] gap-4 px-4 py-3 items-center hover:bg-[#FAFAFA] transition-colors"
              >
                {/* User Info */}
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => router.push(`/admin/management/users/${user.id}/view`)}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center flex-shrink-0">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.full_name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-brand" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-black hover:text-brand transition-colors">{user.saint_name} {user.full_name}</span>
                    <span className="text-xs text-primary-3">{user.username || user.email}</span>
                  </div>
                </div>

                {/* Role Badge */}
                <div>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${ROLE_BADGE_STYLES[user.role].bg} ${ROLE_BADGE_STYLES[user.role].text}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>

                {/* Branch/Class */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-brand">{user.branch || 'Chưa có ngành'}</span>
                  <span className="text-xs text-primary-3">{user.class_name || 'Chưa có lớp'}</span>
                </div>

                {/* Contact */}
                <div className="text-sm text-black">{user.phone || '-'}</div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE_STYLES[user.status].bg} ${STATUS_BADGE_STYLES[user.status].text}`}>
                    {STATUS_BADGE_STYLES[user.status].label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditForm(user)}
                    className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-primary-3" />
                  </button>
                  <button
                    onClick={() => handleOpenResetPasswordModal(user)}
                    className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-primary-3" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteModal(user)}
                    className="w-8 h-8 rounded-lg bg-[#FFEBEE] flex items-center justify-center hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-[#C62828]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={handleDeleteUser}
        userName={userToDelete?.full_name}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false)
          setUserToResetPassword(null)
        }}
        onConfirm={handleResetPassword}
        userName={userToResetPassword?.full_name}
      />

      {/* Import Users Modal */}
      <ImportUsersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
