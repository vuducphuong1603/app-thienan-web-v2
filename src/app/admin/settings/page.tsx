'use client'

import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, supabase, SchoolYear } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { DashboardHeader } from '@/components/dashboard'
import Image from 'next/image'
import { Eye, EyeOff, Check, X } from 'lucide-react'

type SettingsTab = 'personal' | 'password' | 'school-year' | 'notifications' | 'system'

const settingsTabs = [
  { id: 'personal' as SettingsTab, label: 'Thông tin cá nhân' },
  { id: 'password' as SettingsTab, label: 'Đổi mật khẩu' },
  { id: 'school-year' as SettingsTab, label: 'Năm học' },
  { id: 'notifications' as SettingsTab, label: 'Thông báo' },
  { id: 'system' as SettingsTab, label: 'Hệ thống' },
]

interface FormData {
  saintName: string
  fullName: string
  phone: string
  role: string
  address: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PrivacySettings {
  showAddress: boolean
  showOnlineStatus: boolean
}

interface NotificationSettings {
  emailNotifications: boolean
  attendanceReminder: boolean
  periodicReports: boolean
  systemReports: boolean
}

interface SystemSettings {
  darkMode: boolean
}

interface SecuritySettings {
  safeMode: boolean
  dataEncryption: boolean
  twoFactorAuth: boolean
}

interface BackupInfo {
  lastBackupDate: string | null
  version: string
  lastUpdateDate: string
}

interface SchoolYearFormData {
  name: string
  startDate: string
  endDate: string
  parishName: string
}

export default function SettingsPage() {
  const { user, loading, isAdmin, updateProfile, changePassword, uploadAvatar, deleteAvatar } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('personal')
  const [formData, setFormData] = useState<FormData>({
    saintName: '',
    fullName: '',
    phone: '',
    role: '',
    address: '',
  })
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    showAddress: false,
    showOnlineStatus: true,
  })
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    attendanceReminder: false,
    periodicReports: true,
    systemReports: true,
  })
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    darkMode: false,
  })
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    safeMode: true,
    dataEncryption: true,
    twoFactorAuth: false,
  })
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    lastBackupDate: null,
    version: 'V1.1.2',
    lastUpdateDate: '22/09/2025',
  })
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // School Year State
  const [currentSchoolYear, setCurrentSchoolYear] = useState<SchoolYear | null>(null)
  const [loadingSchoolYear, setLoadingSchoolYear] = useState(false)
  const [isEditingSchoolYear, setIsEditingSchoolYear] = useState(false)
  const [schoolYearError, setSchoolYearError] = useState<string | null>(null)
  const [schoolYearForm, setSchoolYearForm] = useState<SchoolYearFormData>({
    name: '',
    startDate: '',
    endDate: '',
    parishName: 'Giáo xứ Thiên Ân',
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (user) {
      setFormData({
        saintName: user.saint_name || '',
        fullName: user.full_name || '',
        phone: user.phone || '',
        role: ROLE_LABELS[user.role] || '',
        address: user.address || '',
      })
    }
  }, [user])

  // Load saved settings from localStorage
  useEffect(() => {
    // Dark mode
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode === 'true') {
      setSystemSettings(prev => ({ ...prev, darkMode: true }))
      document.documentElement.classList.add('dark')
    }

    // Security settings
    const savedSecuritySettings = localStorage.getItem('securitySettings')
    if (savedSecuritySettings) {
      try {
        setSecuritySettings(JSON.parse(savedSecuritySettings))
      } catch (e) {
        console.error('Failed to parse security settings', e)
      }
    }

    // Last backup date
    const savedBackupDate = localStorage.getItem('lastBackupDate')
    if (savedBackupDate) {
      setBackupInfo(prev => ({ ...prev, lastBackupDate: savedBackupDate }))
    }
  }, [])

  // Fetch current school year
  useEffect(() => {
    const fetchCurrentSchoolYear = async () => {
      if (!user || !isAdmin) return

      setLoadingSchoolYear(true)
      setSchoolYearError(null)
      try {
        const { data, error } = await supabase
          .from('school_years')
          .select('*')
          .eq('is_current', true)
          .single()

        if (error) {
          // Handle various error cases
          const errorCode = error.code
          const errorMessage = error.message?.toLowerCase() || ''
          const errorHint = ((error as { hint?: string }).hint || '').toLowerCase()

          // Table doesn't exist (various indicators)
          const isTableNotFound =
            errorCode === '42P01' || // PostgreSQL "relation does not exist"
            errorMessage.includes('does not exist') ||
            errorMessage.includes('relation') ||
            errorHint.includes('does not exist') ||
            errorMessage.includes('406') // HTTP Not Acceptable (table not in schema)

          // No rows found (expected when table exists but is empty)
          const isNoRowsFound = errorCode === 'PGRST116'

          if (isTableNotFound) {
            setSchoolYearError('TABLE_NOT_FOUND')
          } else if (!isNoRowsFound) {
            console.error('Error fetching school year:', error)
            setSchoolYearError('FETCH_ERROR')
          }
          // If isNoRowsFound, we don't set an error - table exists but is empty
        }

        if (data) {
          setCurrentSchoolYear(data)
          setSchoolYearForm({
            name: data.name,
            startDate: data.start_date,
            endDate: data.end_date,
            parishName: data.parish_name,
          })
        }
      } catch (err) {
        console.error('Error:', err)
        setSchoolYearError('TABLE_NOT_FOUND')
      } finally {
        setLoadingSchoolYear(false)
      }
    }

    fetchCurrentSchoolYear()
  }, [user, isAdmin])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordInputChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleToggle = (field: keyof PrivacySettings) => {
    setPrivacySettings(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleNotificationToggle = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSystemToggle = (field: keyof SystemSettings) => {
    setSystemSettings(prev => {
      const newSettings = { ...prev, [field]: !prev[field] }
      // Apply dark mode to document
      if (field === 'darkMode') {
        if (newSettings.darkMode) {
          document.documentElement.classList.add('dark')
          localStorage.setItem('darkMode', 'true')
        } else {
          document.documentElement.classList.remove('dark')
          localStorage.setItem('darkMode', 'false')
        }
      }
      return newSettings
    })
  }

  const handleSecurityToggle = (field: keyof SecuritySettings) => {
    setSecuritySettings(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSaveSecuritySettings = () => {
    // Save to localStorage for now (can be saved to database later)
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings))
    setIsSecurityModalOpen(false)
  }

  const handleBackupData = async () => {
    setIsBackingUp(true)
    try {
      // Fetch all data from Supabase tables
      const backupData: Record<string, unknown[]> = {}

      // Fetch school_years
      const { data: schoolYears } = await supabase.from('school_years').select('*')
      if (schoolYears) backupData.school_years = schoolYears

      // Fetch users (if accessible)
      const { data: users } = await supabase.from('users').select('*')
      if (users) backupData.users = users

      // Add metadata
      const backup = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: backupInfo.version,
          exportedBy: user?.full_name || 'Admin',
        },
        data: backupData,
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-thien-an-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update last backup date
      const now = new Date()
      const formattedDate = now.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      setBackupInfo(prev => ({ ...prev, lastBackupDate: formattedDate }))
      localStorage.setItem('lastBackupDate', formattedDate)
    } catch (error) {
      console.error('Backup error:', error)
      alert('Có lỗi xảy ra khi sao lưu dữ liệu')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleSchoolYearFormChange = (field: keyof SchoolYearFormData, value: string) => {
    setSchoolYearForm(prev => {
      const updated = { ...prev, [field]: value }

      // Auto-generate name when dates change
      if (field === 'startDate' || field === 'endDate') {
        const startYear = updated.startDate ? new Date(updated.startDate).getFullYear() : null
        const endYear = updated.endDate ? new Date(updated.endDate).getFullYear() : null
        if (startYear && endYear) {
          updated.name = `${startYear} - ${endYear}`
        }
      }

      return updated
    })
  }

  const handleSaveSchoolYear = async () => {
    if (!schoolYearForm.name || !schoolYearForm.startDate || !schoolYearForm.endDate) {
      alert('Vui lòng điền đầy đủ thông tin năm học')
      return
    }

    try {
      if (currentSchoolYear) {
        // Update existing
        const { error } = await supabase
          .from('school_years')
          .update({
            name: schoolYearForm.name,
            start_date: schoolYearForm.startDate,
            end_date: schoolYearForm.endDate,
            parish_name: schoolYearForm.parishName,
          })
          .eq('id', currentSchoolYear.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('school_years')
          .insert({
            name: schoolYearForm.name,
            start_date: schoolYearForm.startDate,
            end_date: schoolYearForm.endDate,
            parish_name: schoolYearForm.parishName,
            is_current: true,
          })

        if (error) throw error
      }

      // Refresh data
      const { data } = await supabase
        .from('school_years')
        .select('*')
        .eq('is_current', true)
        .single()

      if (data) {
        setCurrentSchoolYear(data)
      }

      setIsEditingSchoolYear(false)
    } catch (err) {
      console.error('Error saving school year:', err)
      alert('Có lỗi xảy ra khi lưu năm học')
    }
  }

  const handleCancelEditSchoolYear = () => {
    if (currentSchoolYear) {
      setSchoolYearForm({
        name: currentSchoolYear.name,
        startDate: currentSchoolYear.start_date,
        endDate: currentSchoolYear.end_date,
        parishName: currentSchoolYear.parish_name,
      })
    }
    setIsEditingSchoolYear(false)
  }

  const handleSave = async () => {
    setSaveMessage(null)
    setIsSaving(true)

    try {
      if (activeTab === 'personal') {
        // Save personal info
        const result = await updateProfile({
          full_name: formData.fullName,
          saint_name: formData.saintName,
          phone: formData.phone,
          address: formData.address,
        })

        if (result.success) {
          setSaveMessage({ type: 'success', text: 'Đã lưu thông tin cá nhân thành công!' })
        } else {
          setSaveMessage({ type: 'error', text: result.error || 'Lưu thông tin thất bại' })
        }
      } else if (activeTab === 'password') {
        // Validate password
        if (!passwordFormData.currentPassword || !passwordFormData.newPassword || !passwordFormData.confirmPassword) {
          setSaveMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' })
          return
        }

        if (passwordFormData.newPassword.length < 8) {
          setSaveMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
          return
        }

        if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
          setSaveMessage({ type: 'error', text: 'Mật khẩu mới không khớp' })
          return
        }

        const result = await changePassword(passwordFormData.currentPassword, passwordFormData.newPassword)

        if (result.success) {
          setSaveMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' })
          setPasswordFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
        } else {
          setSaveMessage({ type: 'error', text: result.error || 'Đổi mật khẩu thất bại' })
        }
      } else if (activeTab === 'school-year') {
        await handleSaveSchoolYear()
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveMessage({ type: 'error', text: 'Đã có lỗi xảy ra' })
    } finally {
      setIsSaving(false)
      // Auto hide message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleCancel = () => {
    if (activeTab === 'password') {
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } else if (activeTab === 'school-year') {
      handleCancelEditSchoolYear()
    } else if (user) {
      setFormData({
        saintName: user.saint_name || '',
        fullName: user.full_name || '',
        phone: user.phone || '',
        role: ROLE_LABELS[user.role] || '',
        address: user.address || '',
      })
    }
  }

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    setSaveMessage(null)

    try {
      const result = await uploadAvatar(file)
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Đã cập nhật ảnh đại diện!' })
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Tải ảnh lên thất bại' })
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      setSaveMessage({ type: 'error', text: 'Đã có lỗi xảy ra' })
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Auto hide message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // Handle avatar delete
  const handleAvatarDelete = async () => {
    if (!user?.avatar_url) return

    if (!confirm('Bạn có chắc muốn xóa ảnh đại diện?')) return

    setIsUploadingAvatar(true)
    setSaveMessage(null)

    try {
      const result = await deleteAvatar()
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Đã xóa ảnh đại diện!' })
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Xóa ảnh thất bại' })
      }
    } catch (error) {
      console.error('Avatar delete error:', error)
      setSaveMessage({ type: 'error', text: 'Đã có lỗi xảy ra' })
    } finally {
      setIsUploadingAvatar(false)
      // Auto hide message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Calculate total weeks
  const calculateTotalWeeks = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.ceil(diffDays / 7)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const firstName = user.full_name?.split(' ').pop() || user.full_name

  // Render Personal Info Content
  const renderPersonalInfoContent = () => (
    <>
      {/* Personal Information Section */}
      <div className="border-b border-primary-4 p-6 flex gap-6">
        {/* Section Header */}
        <div className="w-[300px] flex-shrink-0">
          <h2 className="text-lg font-bold text-black mb-2">Thông tin cá nhân</h2>
          <p className="text-xs text-primary-3 leading-relaxed">
            Xem và cập nhật chi tiết tài khoản, thông tin và nhiều hơn thế nữa
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <div className="w-[103px] h-[103px] rounded-full overflow-hidden bg-[#f5eaf6] flex-shrink-0 flex items-center justify-center relative">
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full z-10">
                  <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt="Avatar"
                  width={103}
                  height={103}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-14 h-14 text-brand/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
                >
                  Đổi ảnh đại diện
                </button>
                <div className="w-px h-2.5 bg-primary-3"></div>
                <button
                  onClick={handleAvatarDelete}
                  disabled={isUploadingAvatar || !user.avatar_url}
                  className="text-sm font-medium text-complementary-1 hover:underline disabled:opacity-50"
                >
                  Xóa
                </button>
              </div>
              <p className="text-xs text-black/40">
                Hỗ trợ JPG, PNG, GIF, WEBP. Dung lượng tối đa 5MB.
              </p>
            </div>
          </div>

          {/* Form Row 1: Saint Name + Full Name */}
          <div className="flex gap-3">
            <div className="w-[297px] flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                <span className="text-primary-3">Tên thánh </span>
                <span className="text-complementary-1">*</span>
              </label>
              <input
                type="text"
                value={formData.saintName}
                onChange={(e) => handleInputChange('saintName', e.target.value)}
                className="h-[38px] px-4 bg-[#f6f6f6] rounded-xl text-xs text-black border-none focus:ring-2 focus:ring-brand/30"
                placeholder="Nhập tên thánh"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                <span className="text-primary-3">Họ và tên </span>
                <span className="text-complementary-1">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className="h-[38px] px-3 bg-[#f6f6f6] rounded-xl text-xs text-black border-none focus:ring-2 focus:ring-brand/30"
                placeholder="Nhập họ và tên"
              />
            </div>
          </div>

          {/* Form Row 2: Phone + Role */}
          <div className="flex gap-3">
            <div className="w-[297px] flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                <span className="text-primary-3">Số điện thoại </span>
                <span className="text-complementary-1">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="h-[38px] px-4 bg-[#f6f6f6] rounded-xl text-xs text-black border-none focus:ring-2 focus:ring-brand/30"
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                <span className="text-primary-3">Vai trò </span>
                <span className="text-complementary-1">*</span>
              </label>
              <input
                type="text"
                value={formData.role}
                readOnly
                className="h-[38px] px-3 bg-[#f6f6f6] rounded-xl text-xs text-black border-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Form Row 3: Address */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              <span className="text-primary-3">Địa chỉ </span>
              <span className="text-complementary-1">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="h-[38px] px-4 bg-white border border-primary-4 rounded-xl text-xs text-black focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Nhập địa chỉ"
            />
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="p-6 flex gap-6">
        {/* Section Header */}
        <div className="w-[300px] flex-shrink-0">
          <h2 className="text-lg font-bold text-black">Quyền riêng tư</h2>
        </div>

        {/* Privacy Controls */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Address Visibility */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-black">Địa chỉ</p>
              <p className="text-xs text-black/40">Hiển thị địa chỉ công khai</p>
            </div>
            <button
              onClick={() => handleToggle('showAddress')}
              className={`w-[45px] h-[23px] rounded-full relative transition-colors ${
                privacySettings.showAddress ? 'bg-brand' : 'bg-primary-4'
              }`}
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-[19px] h-[19px] bg-white rounded-full shadow transition-all ${
                  privacySettings.showAddress ? 'right-[3px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>

          {/* Online Status */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-black">Trạng thái trực tuyến</p>
              <p className="text-xs text-black/40">
                Hiển thị trạng thái đang hoạt động khi đăng nhập vào hệ thống
              </p>
            </div>
            <button
              onClick={() => handleToggle('showOnlineStatus')}
              className={`w-[45px] h-[23px] rounded-full relative transition-colors ${
                privacySettings.showOnlineStatus ? 'bg-brand' : 'bg-primary-4'
              }`}
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-[19px] h-[19px] bg-white rounded-full shadow transition-all ${
                  privacySettings.showOnlineStatus ? 'right-[3px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  )

  // Render Password Change Content
  const renderPasswordContent = () => (
    <div className="p-6 flex gap-6">
      {/* Section Header */}
      <div className="w-[300px] flex-shrink-0">
        <h2 className="text-lg font-bold text-black mb-2">Đổi mật khẩu</h2>
        <p className="text-xs text-primary-3 leading-relaxed">
          Xem và thay đổi mật khẩu của bạn
        </p>
      </div>

      {/* Password Form */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Current Password */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            <span className="text-primary-3">Mật khẩu hiện tại </span>
            <span className="text-complementary-1">*</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordFormData.currentPassword}
              onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
              className="w-full h-[38px] px-3 pr-10 bg-white border border-primary-4 rounded-xl text-xs text-black focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder=""
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-3 hover:text-primary-1"
            >
              {showPasswords.current ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            <span className="text-primary-3">Mật khẩu mới </span>
            <span className="text-complementary-1">*</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordFormData.newPassword}
              onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
              className="w-full h-[38px] px-3 pr-10 bg-white border border-primary-4 rounded-xl text-xs text-black focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder=""
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-3 hover:text-primary-1"
            >
              {showPasswords.new ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            <span className="text-primary-3">Xác nhận mật khẩu mới </span>
            <span className="text-complementary-1">*</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordFormData.confirmPassword}
              onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
              className="w-full h-[38px] px-3 pr-10 bg-white border border-primary-4 rounded-xl text-xs text-black focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder=""
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-3 hover:text-primary-1"
            >
              {showPasswords.confirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[11px] font-light text-primary-1">
            Mật khẩu cần tối thiểu 8 ký tự
          </p>
        </div>
      </div>
    </div>
  )

  // Render School Year Content
  const renderSchoolYearContent = () => {
    const displayYear = isEditingSchoolYear ? schoolYearForm : currentSchoolYear
    const startDate = isEditingSchoolYear ? schoolYearForm.startDate : currentSchoolYear?.start_date
    const endDate = isEditingSchoolYear ? schoolYearForm.endDate : currentSchoolYear?.end_date
    const totalWeeks = startDate && endDate ? calculateTotalWeeks(startDate, endDate) : currentSchoolYear?.total_weeks || 0

    return (
      <div className="p-6 flex gap-6">
        {/* Section Header */}
        <div className="w-[300px] flex-shrink-0">
          <h2 className="text-lg font-bold text-black mb-2">Quản lý năm học</h2>
          <p className="text-xs text-primary-3 leading-relaxed">
            Xem và chỉnh sửa thông tin năm học
          </p>
        </div>

        {/* School Year Card */}
        <div className="flex-1">
          {loadingSchoolYear ? (
            <div className="flex items-center justify-center h-[189px]">
              <svg className="animate-spin h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : schoolYearError === 'TABLE_NOT_FOUND' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-amber-800 mb-1">Cần thiết lập cơ sở dữ liệu</h3>
                  <p className="text-sm text-amber-700 mb-3">
                    Bảng <code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">school_years</code> chưa được tạo trong Supabase.
                  </p>
                  <div className="bg-white/50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800 font-medium mb-2">Hướng dẫn:</p>
                    <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside">
                      <li>Truy cập <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">Supabase Dashboard</a></li>
                      <li>Mở SQL Editor</li>
                      <li>Chạy file migration: <code className="px-1 py-0.5 bg-amber-100 rounded font-mono">supabase/migrations/20250119_create_school_years.sql</code></li>
                      <li>Tải lại trang này</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-primary-4 rounded-2xl overflow-hidden">
              {/* Card Header */}
              <div className="bg-white border-b border-primary-4 p-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-black">Năm học hiện tại</h3>
                {isEditingSchoolYear ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEditSchoolYear}
                      className="h-8 px-3 bg-gray-100 border border-primary-4 rounded-full text-sm font-medium text-primary-3 hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveSchoolYear}
                      className="h-8 px-3 bg-brand rounded-full text-sm font-medium text-white hover:bg-orange-500 transition-colors flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Lưu
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingSchoolYear(true)}
                    className="h-8 px-3 bg-[#f6f6f6] border border-primary-4 rounded-full text-sm font-medium text-primary-3 hover:bg-gray-200 transition-colors"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col gap-4">
                {isEditingSchoolYear ? (
                  /* Edit Mode */
                  <div className="flex flex-col gap-4">
                    {/* Name Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-primary-3">
                        Tên năm học
                      </label>
                      <input
                        type="text"
                        value={schoolYearForm.name}
                        onChange={(e) => handleSchoolYearFormChange('name', e.target.value)}
                        className="h-[38px] px-3 bg-[#f6f6f6] rounded-xl text-sm text-black border-none focus:ring-2 focus:ring-brand/30"
                        placeholder="VD: 2025 - 2026"
                      />
                    </div>

                    {/* Parish Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-primary-3">
                        Tên giáo xứ
                      </label>
                      <input
                        type="text"
                        value={schoolYearForm.parishName}
                        onChange={(e) => handleSchoolYearFormChange('parishName', e.target.value)}
                        className="h-[38px] px-3 bg-[#f6f6f6] rounded-xl text-sm text-black border-none focus:ring-2 focus:ring-brand/30"
                        placeholder="VD: Giáo xứ Thiên Ân"
                      />
                    </div>

                    {/* Date Fields */}
                    <div className="flex gap-3">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-primary-3">
                          Ngày bắt đầu
                        </label>
                        <input
                          type="date"
                          value={schoolYearForm.startDate}
                          onChange={(e) => handleSchoolYearFormChange('startDate', e.target.value)}
                          className="h-[38px] px-3 bg-[#f6f6f6] rounded-xl text-sm text-black border-none focus:ring-2 focus:ring-brand/30"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-primary-3">
                          Ngày kết thúc
                        </label>
                        <input
                          type="date"
                          value={schoolYearForm.endDate}
                          onChange={(e) => handleSchoolYearFormChange('endDate', e.target.value)}
                          className="h-[38px] px-3 bg-[#f6f6f6] rounded-xl text-sm text-black border-none focus:ring-2 focus:ring-brand/30"
                        />
                      </div>
                    </div>

                    {/* Calculated Info */}
                    {schoolYearForm.startDate && schoolYearForm.endDate && (
                      <div className="pt-2 border-t border-primary-4 flex gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center">
                            <Check className="w-3 h-3 text-brand" />
                          </div>
                          <span className="text-xs text-black">
                            Thời gian: {formatDate(schoolYearForm.startDate)} - {formatDate(schoolYearForm.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center">
                            <Check className="w-3 h-3 text-brand" />
                          </div>
                          <span className="text-xs text-black">
                            Tổng tuần: {totalWeeks} tuần
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : currentSchoolYear ? (
                  /* Display Mode */
                  <>
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-bold text-black">{currentSchoolYear.name}</p>
                      <p className="text-sm font-medium text-primary-3">{currentSchoolYear.parish_name}</p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-primary-4" />

                    {/* Features */}
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-brand" />
                        </div>
                        <span className="text-xs text-black">
                          Thời gian: {formatDate(currentSchoolYear.start_date)} - {formatDate(currentSchoolYear.end_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-brand" />
                        </div>
                        <span className="text-xs text-black">
                          Tổng tuần: {currentSchoolYear.total_weeks} tuần
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* No Data - Show Create Form */
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-primary-3 text-center py-4">
                      Chưa có năm học nào. Hãy tạo năm học mới.
                    </p>
                    <button
                      onClick={() => setIsEditingSchoolYear(true)}
                      className="h-10 px-4 bg-brand rounded-xl text-sm font-bold text-white hover:bg-orange-500 transition-colors"
                    >
                      Tạo năm học mới
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Notifications Content
  const renderNotificationsContent = () => (
    <div className="p-6 flex gap-6">
      {/* Section Header */}
      <div className="w-[300px] flex-shrink-0">
        <h2 className="text-lg font-bold text-black mb-3">Cài đặt thông báo</h2>
        <p className="text-xs text-primary-3 leading-relaxed">
          Nhận thông báo về yêu cầu mới, cập nhật xử lý yêu cầu và các thông báo báo cáo định kỳ, báo cáo hệ thống
        </p>
      </div>

      {/* Notification Controls */}
      <div className="flex-1 flex flex-col">
        {/* Email Notifications */}
        <div className="flex items-center gap-6 py-4">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-sm font-bold text-black">Thông báo qua email</p>
            <p className="text-sm font-light text-primary-3">
              Thông báo về giáo xứ thiên ân sẽ gửi về qua email của bạn
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('emailNotifications')}
            className={`w-[44px] h-[24px] rounded-full relative transition-colors flex-shrink-0 ${
              notificationSettings.emailNotifications ? 'bg-brand' : 'bg-[#f6f6f6]'
            }`}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                notificationSettings.emailNotifications ? 'right-[2px]' : 'left-[2px]'
              }`}
            />
          </button>
        </div>

        {/* Attendance Reminder */}
        <div className="flex items-center gap-6 py-4">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-sm font-bold text-black">Nhắc nhở điểm danh</p>
            <p className="text-sm font-light text-primary-3">
              Nhắc nhở bạn điểm danh trước 30 phút hoạt động diễn ra
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('attendanceReminder')}
            className={`w-[44px] h-[24px] rounded-full relative transition-colors flex-shrink-0 ${
              notificationSettings.attendanceReminder ? 'bg-brand' : 'bg-[#f6f6f6]'
            }`}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                notificationSettings.attendanceReminder ? 'right-[2px]' : 'left-[2px]'
              }`}
            />
          </button>
        </div>

        {/* Periodic Reports */}
        <div className="flex items-center gap-6 py-4">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-sm font-bold text-black">Báo cáo định kỳ</p>
            <p className="text-sm font-light text-primary-3">
              Nhắc nhở báo cáo định kỳ hàng tuần/ hàng tháng
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('periodicReports')}
            className={`w-[44px] h-[24px] rounded-full relative transition-colors flex-shrink-0 ${
              notificationSettings.periodicReports ? 'bg-brand' : 'bg-[#f6f6f6]'
            }`}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                notificationSettings.periodicReports ? 'right-[2px]' : 'left-[2px]'
              }`}
            />
          </button>
        </div>

        {/* System Reports */}
        <div className="flex items-center gap-6 py-4">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-sm font-bold text-black">Báo cáo hệ thống</p>
            <p className="text-sm font-light text-primary-3">
              Thông báo báo cáo hệ thống
            </p>
          </div>
          <button
            onClick={() => handleNotificationToggle('systemReports')}
            className={`w-[44px] h-[24px] rounded-full relative transition-colors flex-shrink-0 ${
              notificationSettings.systemReports ? 'bg-brand' : 'bg-[#f6f6f6]'
            }`}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                notificationSettings.systemReports ? 'right-[2px]' : 'left-[2px]'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )

  // Render System Content
  const renderSystemContent = () => (
    <div className="flex flex-col">
      {/* Security Settings Modal */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[480px] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-primary-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-black">Cài đặt bảo mật</h3>
              <button
                onClick={() => setIsSecurityModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f6f6f6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-primary-3" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              {/* Safe Mode */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-black">Chế độ an toàn</p>
                  <p className="text-xs text-primary-3">Bật chế độ an toàn để bảo vệ hệ thống</p>
                </div>
                <button
                  onClick={() => handleSecurityToggle('safeMode')}
                  className={`w-[44px] h-[24px] rounded-full relative transition-colors ${
                    securitySettings.safeMode ? 'bg-brand' : 'bg-[#f6f6f6]'
                  }`}
                >
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                      securitySettings.safeMode ? 'right-[2px]' : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* Data Encryption */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-black">Mã hóa dữ liệu</p>
                  <p className="text-xs text-primary-3">Mã hóa tất cả dữ liệu trong hệ thống</p>
                </div>
                <button
                  onClick={() => handleSecurityToggle('dataEncryption')}
                  className={`w-[44px] h-[24px] rounded-full relative transition-colors ${
                    securitySettings.dataEncryption ? 'bg-brand' : 'bg-[#f6f6f6]'
                  }`}
                >
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                      securitySettings.dataEncryption ? 'right-[2px]' : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* Two Factor Auth */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-black">Xác thực 2 bước</p>
                  <p className="text-xs text-primary-3">Yêu cầu xác thực 2 bước khi đăng nhập</p>
                </div>
                <button
                  onClick={() => handleSecurityToggle('twoFactorAuth')}
                  className={`w-[44px] h-[24px] rounded-full relative transition-colors ${
                    securitySettings.twoFactorAuth ? 'bg-brand' : 'bg-[#f6f6f6]'
                  }`}
                >
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                      securitySettings.twoFactorAuth ? 'right-[2px]' : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-primary-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSecurityModalOpen(false)}
                className="h-10 px-4 bg-white border border-primary-4 rounded-full text-sm font-medium text-primary-3 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveSecuritySettings}
                className="h-10 px-4 bg-brand rounded-full text-sm font-medium text-white hover:bg-orange-500 transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <div className="p-6 flex gap-6 border-b border-primary-4">
        {/* Section Header */}
        <div className="w-[300px] flex-shrink-0">
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">Cài đặt hệ thống</h2>
          <p className="text-xs text-primary-3 leading-relaxed">
            Xem và cài đặt chế độ, thông tin bảo mật và sao lưu dữ liệu
          </p>
        </div>

        {/* System Cards */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Security Card */}
          <div className="bg-white dark:bg-gray-800 border border-primary-4 dark:border-gray-700 rounded-2xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-primary-4 dark:border-gray-700 p-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-base font-semibold text-black dark:text-white">Bảo mật</h3>
              <button
                onClick={() => setIsSecurityModalOpen(true)}
                className="h-8 px-3 bg-[#f6f6f6] dark:bg-gray-700 border border-primary-4 dark:border-gray-600 rounded-full text-sm font-medium text-primary-3 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Chỉnh sửa
              </button>
            </div>
            {/* Card Body */}
            <div className="p-4">
              <div className="flex gap-1">
                <div className="flex-1 flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    securitySettings.safeMode ? 'bg-brand/20' : 'bg-gray-200'
                  }`}>
                    <Check className={`w-3 h-3 ${securitySettings.safeMode ? 'text-brand' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs text-black dark:text-white">
                    {securitySettings.safeMode ? 'Hệ thống đang chạy ở chế độ an toàn' : 'Chế độ an toàn đã tắt'}
                  </span>
                </div>
                <div className="w-[223px] flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    securitySettings.dataEncryption ? 'bg-brand/20' : 'bg-gray-200'
                  }`}>
                    <Check className={`w-3 h-3 ${securitySettings.dataEncryption ? 'text-brand' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs text-black dark:text-white">
                    {securitySettings.dataEncryption ? 'Tất cả dữ liệu được mã hóa' : 'Mã hóa dữ liệu đã tắt'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Backup Card */}
          <div className="bg-white dark:bg-gray-800 border border-primary-4 dark:border-gray-700 rounded-2xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-primary-4 dark:border-gray-700 p-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-base font-semibold text-black dark:text-white">Sao lưu dữ liệu</h3>
              <button
                onClick={handleBackupData}
                disabled={isBackingUp}
                className="h-8 px-3 bg-brand rounded-2xl text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isBackingUp && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isBackingUp ? 'Đang sao lưu...' : 'Sao lưu ngay'}
              </button>
            </div>
            {/* Card Body */}
            <div className="p-4 flex flex-col gap-4">
              <p className="text-sm font-medium text-primary-3">
                Sao lưu lần cuối: {backupInfo.lastBackupDate || 'Chưa có bản sao lưu'}
              </p>

              {/* Divider */}
              <div className="h-px bg-primary-4 dark:bg-gray-700" />

              {/* Features */}
              <div className="flex gap-1">
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brand" />
                  </div>
                  <span className="text-xs text-black dark:text-white">Phiên bản: {backupInfo.version}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brand" />
                  </div>
                  <span className="text-xs text-black dark:text-white">Cập nhật cuối: {backupInfo.lastUpdateDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Display Settings Section */}
      <div className="p-6 flex gap-[143px]">
        <h2 className="text-lg font-bold text-black dark:text-white w-[172px]">Cài đặt hiển thị</h2>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-black dark:text-white">Chế độ tối</p>
              <p className="text-sm font-medium text-black/40 dark:text-white/40">Hiển thị chế độ tối</p>
            </div>
            <button
              onClick={() => handleSystemToggle('darkMode')}
              className={`w-[49px] h-[29px] rounded-full relative transition-colors ${
                systemSettings.darkMode ? 'bg-brand' : 'bg-primary-4'
              }`}
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-[25px] h-[25px] bg-white rounded-full shadow transition-all ${
                  systemSettings.darkMode ? 'right-[2px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return renderPersonalInfoContent()
      case 'password':
        return renderPasswordContent()
      case 'school-year':
        return renderSchoolYearContent()
      case 'notifications':
        return renderNotificationsContent()
      case 'system':
        return renderSystemContent()
      default:
        return renderPersonalInfoContent()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        activeTab="system"
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 py-6">
        <div className="w-full max-w-[1104px] flex flex-col gap-6">
          {/* Title and Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-[22px] font-semibold text-black dark:text-white">Cài đặt</h1>
              {/* Save Message */}
              {saveMessage && (
                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  saveMessage.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {saveMessage.text}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="w-[120px] h-10 bg-white dark:bg-gray-800 rounded-full text-sm font-bold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-[120px] h-10 bg-brand rounded-[48px] text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white dark:bg-gray-800 border border-primary-4 dark:border-gray-700 rounded-2xl overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-[200px] border-r border-primary-4 dark:border-gray-700 pt-7 pb-4 px-4 flex-shrink-0">
              <nav className="flex flex-col">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#f6f6f6] dark:bg-gray-700 border border-primary-4 dark:border-gray-600 text-primary-3 dark:text-gray-300'
                        : 'text-primary-3 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-8 flex items-center justify-between">
        <p className="text-xs text-black dark:text-white">
          &copy; 2025 Giáo Xứ Thiên Ân. All right reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="#" className="flex items-center gap-1.5 text-xs text-black dark:text-white hover:text-brand transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1.33334C4.32 1.33334 1.33334 4.32001 1.33334 8.00001C1.33334 11.68 4.32 14.6667 8 14.6667C11.68 14.6667 14.6667 11.68 14.6667 8.00001C14.6667 4.32001 11.68 1.33334 8 1.33334ZM8 13.3333C5.06 13.3333 2.66667 10.94 2.66667 8.00001C2.66667 5.06001 5.06 2.66668 8 2.66668C10.94 2.66668 13.3333 5.06001 13.3333 8.00001C13.3333 10.94 10.94 13.3333 8 13.3333Z" fill="currentColor"/>
              <path d="M8.66667 4.66668H7.33334V8.66668H11.3333V7.33334H8.66667V4.66668Z" fill="currentColor"/>
            </svg>
            Riêng tư
          </a>
          <a href="#" className="flex items-center gap-1.5 text-xs text-black dark:text-white hover:text-brand transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.3333 2H2.66667C1.93334 2 1.33334 2.6 1.33334 3.33333V12.6667C1.33334 13.4 1.93334 14 2.66667 14H13.3333C14.0667 14 14.6667 13.4 14.6667 12.6667V3.33333C14.6667 2.6 14.0667 2 13.3333 2ZM13.3333 12.6667H2.66667V5.33333H13.3333V12.6667ZM13.3333 4H2.66667V3.33333H13.3333V4Z" fill="currentColor"/>
            </svg>
            Điều khoản
          </a>
          <a href="#" className="flex items-center gap-1.5 text-xs text-black dark:text-white hover:text-brand transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1.33334C4.32 1.33334 1.33334 4.32001 1.33334 8.00001C1.33334 11.68 4.32 14.6667 8 14.6667C11.68 14.6667 14.6667 11.68 14.6667 8.00001C14.6667 4.32001 11.68 1.33334 8 1.33334ZM8.66667 12.6667H7.33334V11.3333H8.66667V12.6667ZM8.66667 10H7.33334V3.33334H8.66667V10Z" fill="currentColor"/>
            </svg>
            Trợ giúp
          </a>
        </div>
      </footer>
    </div>
  )
}
