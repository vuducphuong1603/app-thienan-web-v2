'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ChevronDown, User } from 'lucide-react'
import Image from 'next/image'
import { supabase, UserProfile, UserRole, ROLE_LABELS, BRANCHES, Class } from '@/lib/supabase'
import CustomDatePicker from '@/components/ui/CustomDatePicker'

interface EditUserFormProps {
  user: UserProfile
  onBack: () => void
  onSuccess: () => void
}

interface FormData {
  username: string
  role: UserRole
  password: string
  confirmPassword: string
  saint_name: string
  full_name: string
  birthday: string
  phone: string
  address: string
  branch: string
  class_id: string
  class_name: string
}

export default function EditUserForm({ user, onBack, onSuccess }: EditUserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    username: user.username || '',
    role: user.role,
    password: '',
    confirmPassword: '',
    saint_name: user.saint_name || '',
    full_name: user.full_name || '',
    birthday: '',
    phone: user.phone || '',
    address: user.address || '',
    branch: user.branch || '',
    class_id: user.class_id || '',
    class_name: user.class_name || '',
  })
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch classes when branch changes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!formData.branch) {
        setClasses([])
        return
      }

      setIsLoadingClasses(true)
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('branch', formData.branch)
          .eq('status', 'ACTIVE')
          .order('display_order', { ascending: true })

        if (error) {
          console.error('Error fetching classes:', error)
          return
        }

        setClasses(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoadingClasses(false)
      }
    }

    fetchClasses()
  }, [formData.branch])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Dung luong file toi da 5MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.username.trim()) newErrors.username = 'Vui long nhap ten dang nhap'
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mat khau xac nhan khong khop'
    }
    if (!formData.saint_name.trim()) newErrors.saint_name = 'Vui long nhap ten thanh'
    if (!formData.full_name.trim()) newErrors.full_name = 'Vui long nhap ho va ten'
    if (!formData.phone.trim()) newErrors.phone = 'Vui long nhap so dien thoai'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      let avatarUrl = user.avatar_url

      // Upload avatar if new one selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)
          avatarUrl = publicUrl
        }
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        username: formData.username,
        role: formData.role,
        saint_name: formData.saint_name,
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address || null,
        avatar_url: avatarUrl,
        branch: formData.branch || null,
        class_id: formData.class_id || null,
        class_name: formData.class_name || null,
        updated_at: new Date().toISOString(),
      }

      // Only update password if provided
      if (formData.password) {
        updateData.password = formData.password
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('Error updating user:', error)
        alert(`Loi cap nhat nguoi dung: ${error.message}`)
        return
      }

      onSuccess()
      onBack()
    } catch (err) {
      console.error('Error:', err)
      alert('Co loi xay ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary-3 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quay tro lai</span>
          </button>
          <h1 className="text-4xl font-bold text-black">Chinh sua nguoi dung</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="h-[40px] px-6 bg-white border border-[#E5E1DC] rounded-full text-sm font-bold text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Huy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-[40px] px-6 bg-brand rounded-full text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Luu thay doi
          </button>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-3xl p-6">
        {/* Account Info Section */}
        <div className="flex gap-6 pb-6 border-b border-[#E5E1DC]">
          {/* Left Label */}
          <div className="w-[300px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Thong tin tai khoan</h2>
            <p className="text-sm text-primary-3">Cap nhat thong tin nguoi dung</p>
          </div>

          {/* Right Form */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-[#F5EAF6] flex items-center justify-center flex-shrink-0">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-brand" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Chon anh dai dien
                </button>
                <p className="text-xs text-black/40">Ho tro JPG, PNG. Dung luong toi da 5MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Username & Role */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Ten dang nhap <span className="text-[#DF1C41]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="VD: HA172336"
                  className={`h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 ${errors.username ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Vai tro <span className="text-[#DF1C41]">*</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center justify-between"
                  >
                    <span>{ROLE_LABELS[formData.role]}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isRoleDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => {
                            handleInputChange('role', key)
                            setIsRoleDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${formData.role === key ? 'bg-brand/10 text-brand' : 'text-black'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Mat khau <span className="text-black/40">(de trong neu khong doi)</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Nhap mat khau moi"
                  className={`h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 ${errors.password ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Xac nhan mat khau
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Nhap lai mat khau"
                  className={`h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 ${errors.confirmPassword ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E5E1DC] my-2" />

            {/* Saint Name & Full Name */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Ten thanh <span className="text-[#DF1C41]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.saint_name}
                  onChange={(e) => handleInputChange('saint_name', e.target.value)}
                  placeholder="VD: Teresa"
                  className={`h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 ${errors.saint_name ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.saint_name && <p className="text-xs text-red-500">{errors.saint_name}</p>}
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Ho va ten <span className="text-[#DF1C41]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="VD: Nguyen Van A"
                  className={`h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 ${errors.full_name ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
              </div>
            </div>

            {/* Birthday & Phone */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Ngay sinh <span className="text-[#DF1C41]">*</span>
                </label>
                <CustomDatePicker
                  value={formData.birthday}
                  onChange={(date) => handleInputChange('birthday', date)}
                  placeholder="Chọn ngày sinh"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  So dien thoai <span className="text-[#DF1C41]">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="VD: 0987654321"
                  className={`h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 ${errors.phone ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-primary-3">
                Dia chi <span className="text-[#DF1C41]">*</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="VD: 123 Duong ABC, Phuong XYZ..."
                rows={3}
                className="px-4 py-3 bg-[#F6F6F6] rounded-xl text-sm text-black placeholder:text-black/40 border-none focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div className="flex gap-6 pt-6">
          {/* Left Label */}
          <div className="w-[300px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Phan cong & phu trach</h2>
            <p className="text-sm text-primary-3">Vai tro</p>
          </div>

          {/* Right Form */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Branch & Class Column */}
            <div className="flex flex-col gap-4">
              {/* Branch Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Ngành phụ trách <span className="text-[#DF1C41]">*</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsBranchDropdownOpen(!isBranchDropdownOpen)
                      setIsClassDropdownOpen(false)
                    }}
                    className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm text-black flex items-center justify-between"
                  >
                    <span>{formData.branch || 'Chọn ngành'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isBranchDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden">
                      {BRANCHES.map((branch) => (
                        <button
                          key={branch}
                          onClick={() => {
                            handleInputChange('branch', branch)
                            handleInputChange('class_id', '') // Reset class when branch changes
                            handleInputChange('class_name', '')
                            setIsBranchDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${formData.branch === branch ? 'bg-brand/10 text-brand' : 'text-black'}`}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Class Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-primary-3">
                  Lớp phụ trách
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (formData.branch && classes.length > 0) {
                        setIsClassDropdownOpen(!isClassDropdownOpen)
                        setIsBranchDropdownOpen(false)
                      }
                    }}
                    disabled={!formData.branch || classes.length === 0}
                    className={`w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-sm flex items-center justify-between ${!formData.branch || classes.length === 0 ? 'text-black/40 cursor-not-allowed' : 'text-black'}`}
                  >
                    <span>
                      {isLoadingClasses
                        ? 'Đang tải...'
                        : formData.class_name
                          ? formData.class_name
                          : formData.class_id
                            ? classes.find(c => c.id === formData.class_id)?.name || 'Chọn lớp'
                            : formData.branch
                              ? (classes.length > 0 ? 'Chọn lớp' : 'Không có lớp')
                              : 'Chọn ngành trước'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isClassDropdownOpen && formData.branch && classes.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 overflow-hidden max-h-[200px] overflow-y-auto">
                      {classes.map((cls) => (
                        <button
                          key={cls.id}
                          onClick={() => {
                            handleInputChange('class_id', cls.id)
                            handleInputChange('class_name', cls.name)
                            setIsClassDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${formData.class_id === cls.id ? 'bg-brand/10 text-brand' : 'text-black'}`}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
