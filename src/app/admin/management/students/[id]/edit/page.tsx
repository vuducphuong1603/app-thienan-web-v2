'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, User } from 'lucide-react'
import { supabase, Class, BRANCHES } from '@/lib/supabase'
import CustomDatePicker from '@/components/ui/CustomDatePicker'

interface StudentFormData {
  student_code: string
  class_id: string
  saint_name: string
  full_name: string
  date_of_birth: string
  phone: string
  parent_phone: string
  parent_phone_2: string
  address: string
  notes: string
  score_45_hk1: string
  score_exam_hk1: string
  score_45_hk2: string
  score_exam_hk2: string
  avatar_url: string
}

const initialFormData: StudentFormData = {
  student_code: '',
  class_id: '',
  saint_name: '',
  full_name: '',
  date_of_birth: '',
  phone: '',
  parent_phone: '',
  parent_phone_2: '',
  address: '',
  notes: '',
  score_45_hk1: '',
  score_exam_hk1: '',
  score_45_hk2: '',
  score_exam_hk2: '',
  avatar_url: '',
}

export default function EditStudentPage() {
  const params = useParams()
  const studentId = params.id as string
  const router = useRouter()
  const [formData, setFormData] = useState<StudentFormData>(initialFormData)
  const [classes, setClasses] = useState<Class[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)

  // Fetch student data and classes on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch classes
        const { data: classesData } = await supabase
          .from('classes')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('display_order', { ascending: true })
        setClasses(classesData || [])

        // Fetch student data
        const { data: studentData, error } = await supabase
          .from('thieu_nhi')
          .select('*')
          .eq('id', studentId)
          .single()

        if (error || !studentData) {
          console.error('Error fetching student:', error)
          alert('Không tìm thấy thiếu nhi')
          router.push('/admin/management/students')
          return
        }

        // Populate form data
        setFormData({
          student_code: studentData.student_code || '',
          class_id: studentData.class_id || '',
          saint_name: studentData.saint_name || '',
          full_name: studentData.full_name || '',
          date_of_birth: studentData.date_of_birth || '',
          phone: studentData.phone || '',
          parent_phone: studentData.parent_phone || '',
          parent_phone_2: studentData.parent_phone_2 || '',
          address: studentData.address || '',
          notes: studentData.notes || '',
          score_45_hk1: studentData.score_45_hk1?.toString() || '',
          score_exam_hk1: studentData.score_exam_hk1?.toString() || '',
          score_45_hk2: studentData.score_45_hk2?.toString() || '',
          score_exam_hk2: studentData.score_exam_hk2?.toString() || '',
          avatar_url: studentData.avatar_url || '',
        })

        if (studentData.avatar_url) {
          setAvatarPreview(studentData.avatar_url)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [studentId, router])

  // Group classes by branch
  const classesGroupedByBranch = BRANCHES.reduce((acc, branch) => {
    const branchClasses = classes.filter((c) => c.branch === branch)
    if (branchClasses.length > 0) {
      acc[branch] = branchClasses
    }
    return acc
  }, {} as Record<string, Class[]>)

  // Get class name and branch by id
  const getClassInfo = (classId: string) => {
    const cls = classes.find((c) => c.id === classId)
    return cls ? `${cls.name} (${cls.branch})` : ''
  }

  // Handle input change
  const handleChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File quá lớn. Dung lượng tối đa 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    setFormData((prev) => ({ ...prev, avatar_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof StudentFormData, string>> = {}

    if (!formData.class_id) {
      newErrors.class_id = 'Vui lòng chọn lớp'
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Vui lòng nhập họ và tên'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Calculate year average
  const calculateYearAverage = () => {
    const s45_hk1 = parseFloat(formData.score_45_hk1) || 0
    const exam_hk1 = parseFloat(formData.score_exam_hk1) || 0
    const s45_hk2 = parseFloat(formData.score_45_hk2) || 0
    const exam_hk2 = parseFloat(formData.score_exam_hk2) || 0

    const avg = (s45_hk1 + s45_hk2 + exam_hk1 * 2 + exam_hk2 * 2) / 6
    return avg.toFixed(1)
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('thieu_nhi')
        .update({
          student_code: formData.student_code.trim() || null,
          class_id: formData.class_id,
          saint_name: formData.saint_name.trim() || null,
          full_name: formData.full_name.trim(),
          date_of_birth: formData.date_of_birth || null,
          phone: formData.phone.trim() || null,
          parent_phone: formData.parent_phone.trim() || null,
          parent_phone_2: formData.parent_phone_2.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null,
          score_45_hk1: parseFloat(formData.score_45_hk1) || 0,
          score_exam_hk1: parseFloat(formData.score_exam_hk1) || 0,
          score_45_hk2: parseFloat(formData.score_45_hk2) || 0,
          score_exam_hk2: parseFloat(formData.score_exam_hk2) || 0,
          avatar_url: avatarPreview || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      if (error) {
        console.error('Error updating student:', error)
        alert('Có lỗi xảy ra khi cập nhật thiếu nhi. Vui lòng thử lại.')
        return
      }

      router.push('/admin/management/students')
    } catch (err) {
      console.error('Error:', err)
      alert('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="flex items-center gap-3">
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
          <span className="text-[#666d80]">Đang tải...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F6F6F6] border border-white/60 rounded-2xl min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            {/* Back Button */}
            <button
              onClick={() => router.push('/admin/management/students')}
              className="flex items-center gap-1.5 text-[#666d80] hover:text-black transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">Quay trở lại</span>
            </button>
            {/* Title */}
            <h1 className="text-[40px] font-bold text-black leading-tight">Chỉnh sửa thiếu nhi</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/management/students')}
              className="h-10 px-6 bg-white rounded-full text-sm font-bold text-black hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-10 px-6 bg-brand rounded-full text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white mx-6 mb-6 rounded-3xl p-6">
        {/* Personal Information Section */}
        <div className="flex gap-6 pb-6 border-b border-[#E5E1DC]">
          {/* Left side - Section title */}
          <div className="w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Thông tin cá nhân</h2>
            <p className="text-xs text-[#666d80] mt-1">
              Xem và cập nhật chi tiết tài khoản, thông tin và nhiều hơn thế nữa
            </p>
          </div>

          {/* Right side - Form fields */}
          <div className="flex-1 space-y-4">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="w-[100px] h-[100px] rounded-full bg-[#F5EAF6] overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-[#C4B5C7]" />
                )}
              </div>
              {/* Avatar Actions */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-medium text-brand hover:text-orange-600"
                  >
                    Đổi ảnh đại diện
                  </button>
                  <span className="w-px h-3 bg-[#666d80]" />
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-sm font-medium text-[#df1c41] hover:text-red-600"
                  >
                    Xóa
                  </button>
                </div>
                <p className="text-xs text-black/40">Hỗ trợ JPG, PNG. Dung lượng tối đa 5MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Row 1: Mã thiếu nhi + Lớp */}
            <div className="flex gap-3">
              {/* Mã thiếu nhi */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  Mã thiếu nhi <span className="text-[#df1c41]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.student_code}
                  onChange={(e) => handleChange('student_code', e.target.value)}
                  placeholder="VD: HA172336"
                  className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Lớp */}
              <div className="flex-1 relative">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  Lớp <span className="text-[#df1c41]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  className={`w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-left flex items-center justify-between ${errors.class_id ? 'ring-1 ring-red-500' : ''}`}
                >
                  <span className={formData.class_id ? 'text-black' : 'text-[#8B8685]'}>
                    {formData.class_id ? getClassInfo(formData.class_id) : 'Chọn lớp'}
                  </span>
                  <ChevronLeft
                    className={`w-4 h-4 text-[#8B8685] transition-transform ${isClassDropdownOpen ? 'rotate-90' : '-rotate-90'}`}
                  />
                </button>
                {isClassDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E1DC] rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto">
                    {Object.entries(classesGroupedByBranch).map(([branch, branchClasses]) => (
                      <div key={branch}>
                        <div className="px-4 py-2 text-xs font-semibold text-[#666d80] uppercase bg-gray-50">
                          {branch}
                        </div>
                        {branchClasses.map((cls) => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              handleChange('class_id', cls.id)
                              setIsClassDropdownOpen(false)
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 ${formData.class_id === cls.id ? 'bg-brand/10 text-brand' : 'text-black'}`}
                          >
                            {cls.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {errors.class_id && <p className="text-xs text-red-500 mt-1">{errors.class_id}</p>}
              </div>
            </div>

            {/* Row 2: Tên thánh + Họ và tên */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  Tên thánh <span className="text-[#df1c41]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.saint_name}
                  onChange={(e) => handleChange('saint_name', e.target.value)}
                  placeholder="VD: Têrêsa Avila"
                  className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  Họ và tên <span className="text-[#df1c41]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="VD: Hoàng Nguyễn Khả Ái"
                  className={`w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand ${errors.full_name ? 'ring-1 ring-red-500' : ''}`}
                />
                {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
              </div>
            </div>

            {/* Row 3: Ngày sinh + SĐT thiếu nhi */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  Ngày sinh
                </label>
                <CustomDatePicker
                  value={formData.date_of_birth}
                  onChange={(date) => handleChange('date_of_birth', date)}
                  placeholder="Chọn ngày sinh"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  SĐT thiếu nhi
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="VD: 0123456789"
                  className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Row 4: SĐT phụ huynh 1 + SĐT phụ huynh 2 */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  SĐT phụ huynh 1
                </label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => handleChange('parent_phone', e.target.value)}
                  placeholder="VD: 0123456789"
                  className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                  SĐT phụ huynh 2
                </label>
                <input
                  type="tel"
                  value={formData.parent_phone_2}
                  onChange={(e) => handleChange('parent_phone_2', e.target.value)}
                  placeholder="VD: 0987654321"
                  className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Row 5: Địa chỉ */}
            <div>
              <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                Địa chỉ <span className="text-[#df1c41]">*</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Nhập địa chỉ..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-[#E5E1DC] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="flex gap-6 py-6 border-b border-[#E5E1DC]">
          <div className="w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Ghi chú</h2>
            <p className="text-xs text-[#666d80] mt-1">Ghi chú về thiếu nhi</p>
          </div>
          <div className="flex-1">
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Nhập ghi chú..."
              rows={4}
              className="w-full px-4 py-3 bg-white border border-[#E5E1DC] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand resize-none"
            />
          </div>
        </div>

        {/* Scores Section */}
        <div className="flex gap-6 pt-6">
          <div className="w-[280px] flex-shrink-0">
            <h2 className="text-lg font-bold text-black">Điểm số giáo lý</h2>
            <div className="text-xs text-[#666d80] mt-1">
              <p>Lưu ý: Điểm điểm danh và điểm tổng sẽ được tính tự động dựa trên:</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Điểm điểm danh: Từ việc điểm danh thứ 5 và Chúa nhật</li>
                <li>Điểm tổng: Điểm giáo lý x 0.6 + Điểm điểm danh x 0.4</li>
              </ul>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {/* Học kỳ 1 Card */}
            <div className="border border-[#E5E1DC] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC]">
                <h3 className="text-base font-semibold text-black">Học kỳ 1</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                      Điểm 45 phút <span className="text-[#df1c41]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.score_45_hk1}
                      onChange={(e) => handleChange('score_45_hk1', e.target.value)}
                      placeholder="0"
                      className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                      Điểm học kỳ (x2) <span className="text-[#df1c41]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.score_exam_hk1}
                      onChange={(e) => handleChange('score_exam_hk1', e.target.value)}
                      placeholder="0"
                      className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Học kỳ 2 Card */}
            <div className="border border-[#E5E1DC] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC]">
                <h3 className="text-base font-semibold text-black">Học kỳ 2</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                      Điểm 45 phút <span className="text-[#df1c41]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.score_45_hk2}
                      onChange={(e) => handleChange('score_45_hk2', e.target.value)}
                      placeholder="0"
                      className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#666d80] mb-1.5">
                      Điểm học kỳ (x2) <span className="text-[#df1c41]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.score_exam_hk2}
                      onChange={(e) => handleChange('score_exam_hk2', e.target.value)}
                      placeholder="0"
                      className="w-full h-[43px] px-4 bg-[#F6F6F6] rounded-xl text-xs text-black placeholder:text-[#8B8685] focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Điểm trung bình năm học Card */}
            <div className="border border-[#E5E1DC] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E1DC]">
                <h3 className="text-base font-semibold text-black">Điểm trung bình năm học</h3>
              </div>
              <div className="p-4">
                <p className="text-lg font-bold text-black">{calculateYearAverage()}</p>
                <p className="text-sm text-[#666d80] mt-1">
                  Công thức: (45&apos; HK1 + 45&apos; HK2 + Thi HK1x2 + Thi HK2x2) / 6
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
