'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, ChevronLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase, UserRole, ROLE_LABELS, Class } from '@/lib/supabase'

interface ImportUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedUser {
  username: string
  saint_name: string
  full_name: string
  date_of_birth?: string
  class_name: string
  class_code: string
  branch: string
  role: UserRole
  address: string
  phone: string
  isValid: boolean
  errors: string[]
  warnings: string[]
  classMatched: boolean
}

// Helper function to convert Excel serial date to ISO date string
function excelSerialToDate(serial: number): string | undefined {
  if (!serial || isNaN(serial)) return undefined
  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)
  return date_info.toISOString().split('T')[0]
}

// Helper function to determine branch from class name
function getBranchFromClassName(className: string): string {
  const upperClassName = className?.toUpperCase() || ''
  if (upperClassName.includes('CHIÊN') || upperClassName.includes('CC')) return 'Chiên Con'
  if (upperClassName.includes('ẤU') || upperClassName.includes('AU')) return 'Ấu Nhi'
  if (upperClassName.includes('THIẾU') || upperClassName.startsWith('TS')) return 'Thiếu Nhi'
  if (upperClassName.includes('NGHĨA') || upperClassName.startsWith('NS')) return 'Nghĩa Sĩ'
  if (upperClassName.includes('HIỆP') || upperClassName.startsWith('HS')) return 'Hiệp Sĩ'
  return 'Ấu Nhi' // Default
}

// Helper function to map role from notes
function getRoleFromNotes(notes: string): UserRole {
  const lowerNotes = notes?.toLowerCase() || ''
  if (lowerNotes.includes('admin') || lowerNotes.includes('điều hành') || lowerNotes.includes('ban dieu hanh')) return 'admin'
  if (lowerNotes.includes('phân đoàn') || lowerNotes.includes('phan doan') || lowerNotes.includes('pdt')) return 'phan_doan_truong'
  return 'giao_ly_vien' // Default role for GLV
}

// Helper function to format phone number
function formatPhone(phone: string | number): string {
  if (!phone) return ''
  let phoneStr = String(phone).replace(/\D/g, '')
  // Add leading 0 if missing (Vietnamese phone numbers)
  if (phoneStr.length === 9 && !phoneStr.startsWith('0')) {
    phoneStr = '0' + phoneStr
  }
  return phoneStr
}

// Helper function to normalize class name for matching
// Converts "ẤU 1A", "Ấu 1A", "AU 1A" all to "au1a" for comparison
function normalizeClassName(name: string): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, '') // Remove spaces
    .trim()
}

export default function ImportUsersModal({ isOpen, onClose, onSuccess }: ImportUsersModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
  const [parsedData, setParsedData] = useState<ParsedUser[]>([])
  const [importResult, setImportResult] = useState<{ success: number; failed: number; skipped: number; errors: string[] }>({
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  })
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [classesLoading, setClassesLoading] = useState(false)

  // Fetch classes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClasses()
    }
  }, [isOpen])

  const fetchClasses = async () => {
    setClassesLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('status', 'ACTIVE')

      if (error) {
        console.error('Error fetching classes:', error)
        return
      }

      setClasses(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setClassesLoading(false)
    }
  }

  // Function to find class UUID by matching class name
  const findClassId = (className: string): string | null => {
    if (!className) return null

    const normalizedInput = normalizeClassName(className)

    // Try to find exact match first (normalized)
    const matchedClass = classes.find(cls =>
      normalizeClassName(cls.name) === normalizedInput
    )

    return matchedClass?.id || null
  }

  const resetModal = () => {
    setStep('upload')
    setParsedData([])
    setImportResult({ success: 0, failed: 0, skipped: 0, errors: [] })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const parseExcelFile = async (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as (string | number)[][]

        // Parse data - skip header rows (row 0 and 1), data starts from row 2
        // Excel structure from "DS GLV 2025-2026.xlsx":
        // Col 0: MÃ GLV, Col 1: Tên thánh, Col 2: Họ, Col 3: Tên,
        // Col 4: Năm sinh (Excel serial), Col 5: LỚP, Col 6: MÃ LỚP,
        // Col 7: Ghi chú, Col 8: Địa chỉ, Col 9: Điện thoại
        const users: ParsedUser[] = []
        for (let i = 2; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length < 2) continue // Skip empty rows

          // Check if the first column has data (MÃ GLV)
          const username = String(row[0] || '').trim()
          if (!username) continue // Skip rows without username

          const errors: string[] = []
          const warnings: string[] = []
          const saintName = String(row[1] || '').trim()
          const lastName = String(row[2] || '').trim()
          const firstName = String(row[3] || '').trim()
          const fullName = `${lastName} ${firstName}`.trim()
          const dateOfBirth = typeof row[4] === 'number' ? excelSerialToDate(row[4]) : undefined
          const className = String(row[5] || '').trim()
          const classCode = String(row[6] || '').trim()
          const notes = String(row[7] || '').trim()
          const address = String(row[8] || '').trim()
          const phone = formatPhone(row[9])

          // Validation - only full_name is required, phone is optional
          if (!fullName || fullName === ' ') errors.push('Thiếu họ tên')

          const branch = getBranchFromClassName(className)
          const role = getRoleFromNotes(notes)

          // Check if class exists in database
          const classMatched = className ? classes.some(cls =>
            normalizeClassName(cls.name) === normalizeClassName(className)
          ) : false

          // Add warning if class specified but not found
          if (className && !classMatched) {
            warnings.push(`Không tìm thấy lớp "${className}"`)
          }

          users.push({
            username,
            saint_name: saintName,
            full_name: fullName,
            date_of_birth: dateOfBirth,
            class_name: className,
            class_code: classCode,
            branch,
            role,
            address,
            phone,
            isValid: errors.length === 0,
            errors,
            warnings,
            classMatched
          })
        }

        if (users.length === 0) {
          alert('Không tìm thấy dữ liệu trong file. Vui lòng kiểm tra lại định dạng file.')
          return
        }

        setParsedData(users)
        setStep('preview')
      } catch (error) {
        console.error('Error parsing Excel file:', error)
        alert('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      parseExcelFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseExcelFile(file)
    } else {
      alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)')
    }
  }

  const handleImport = async () => {
    setStep('importing')
    const validUsers = parsedData.filter(u => u.isValid)
    let success = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for (const user of validUsers) {
      try {
        // Check if username already exists - skip if exists
        const { data: existingByUsername } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .maybeSingle()

        if (existingByUsername) {
          // Skip existing user
          skipped++
          continue
        }

        // Insert new user (phone can be null, email auto-generated from username)
        const autoEmail = `${user.username.toLowerCase()}@thienan.local`

        // Lookup class UUID by matching class name
        const classUuid = findClassId(user.class_name)

        const { error } = await supabase.from('users').insert({
          username: user.username,
          email: autoEmail,
          full_name: user.full_name,
          saint_name: user.saint_name || null,
          phone: user.phone || null,
          address: user.address || null,
          role: user.role,
          branch: user.branch,
          class_id: classUuid, // Now stores actual UUID instead of class_code
          class_name: user.class_name || null,
          status: 'ACTIVE',
          password: '123456' // Default password
        })

        if (error) {
          failed++
          errors.push(`${user.username}: ${error.message}`)
        } else {
          success++
        }
      } catch {
        failed++
        errors.push(`${user.username}: Lỗi không xác định`)
      }
    }

    setImportResult({ success, failed, skipped, errors })
    setStep('result')
  }

  const handleDownloadTemplate = () => {
    // Create a template workbook matching the expected format
    const templateData = [
      ['MÃ GLV', 'GLV PHỤ TRÁCH', '', '', 'Năm sinh', 'LỚP', 'MÃ LỚP', 'Ghi chú', 'Địa chỉ', 'Điện thoại'],
      ['', 'Tên thánh', 'Họ', 'Tên', '', '', '', '', '', ''],
      ['GLV001', 'Phaolo', 'Nguyễn Văn', 'An', '', 'ẤU 1A', 'AU1A', 'Huynh trưởng', '123 Đường ABC, Quận XYZ', '0901234567'],
      ['GLV002', 'Maria', 'Trần Thị', 'Bình', '', 'THIẾU 2B', 'TS2B', 'Giáo lý viên', '456 Đường DEF, Quận UVW', '0912345678'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Set column widths
    ws['!cols'] = [
      { wch: 10 }, // MÃ GLV
      { wch: 12 }, // Tên thánh
      { wch: 15 }, // Họ
      { wch: 10 }, // Tên
      { wch: 12 }, // Năm sinh
      { wch: 12 }, // LỚP
      { wch: 10 }, // MÃ LỚP
      { wch: 15 }, // Ghi chú
      { wch: 35 }, // Địa chỉ
      { wch: 12 }, // Điện thoại
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DS GLV')
    XLSX.writeFile(wb, 'Template_Import_GLV.xlsx')
  }

  if (!isOpen) return null

  const validCount = parsedData.filter(u => u.isValid).length
  const invalidCount = parsedData.filter(u => !u.isValid).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E1DC]">
          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button
                onClick={resetModal}
                className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-primary-3" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-black">
              {step === 'upload' && 'Import danh sách Giáo lý viên'}
              {step === 'preview' && 'Xem trước dữ liệu'}
              {step === 'importing' && 'Đang import...'}
              {step === 'result' && 'Kết quả import'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-primary-3" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-brand bg-brand/5' : 'border-[#E5E1DC] hover:border-brand'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-brand" />
                </div>
                <h3 className="text-base font-medium text-black mb-2">
                  Kéo thả file Excel vào đây
                </h3>
                <p className="text-sm text-primary-3 mb-4">hoặc click để chọn file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-primary-3">
                  Hỗ trợ định dạng: .xlsx, .xls
                </p>
              </div>

              {/* Template Download */}
              <div className="flex items-center justify-between p-4 bg-[#FFF8F5] border border-brand/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-brand" />
                  <div>
                    <h4 className="text-sm font-medium text-black">Tải file mẫu</h4>
                    <p className="text-xs text-primary-3">Tải xuống file Excel mẫu để import đúng định dạng</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadTemplate()
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-brand text-brand rounded-xl text-sm font-medium hover:bg-brand/5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải mẫu
                </button>
              </div>

              {/* Notes */}
              <div className="bg-[#FAFAFA] rounded-xl p-4">
                <p className="text-sm font-semibold text-black mb-2">Lưu ý:</p>
                <ul className="text-xs text-primary-3 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Dòng 1-2 là header, dữ liệu bắt đầu từ dòng 3</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Cột bắt buộc: MÃ GLV, Họ & Tên (SĐT không bắt buộc)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Mật khẩu mặc định: 123456</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Nếu MÃ GLV đã tồn tại trong hệ thống sẽ được bỏ qua</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-brand flex-shrink-0" />
                    <span className="text-brand font-medium">
                      {classesLoading ? 'Đang tải danh sách lớp...' : `${classes.length} lớp sẵn sàng để liên kết`}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#E8F5E9] rounded-xl">
                  <CheckCircle className="w-5 h-5 text-[#2E7D32]" />
                  <span className="text-sm font-medium text-[#2E7D32]">{validCount} hợp lệ</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#FFEBEE] rounded-xl">
                    <AlertCircle className="w-5 h-5 text-[#C62828]" />
                    <span className="text-sm font-medium text-[#C62828]">{invalidCount} lỗi</span>
                  </div>
                )}
                {(() => {
                  const classMatchedCount = parsedData.filter(u => u.classMatched).length
                  const classNotMatchedCount = parsedData.filter(u => u.class_name && !u.classMatched).length
                  return (
                    <>
                      {classMatchedCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#E8F5E9] rounded-xl">
                          <CheckCircle className="w-5 h-5 text-[#2E7D32]" />
                          <span className="text-sm font-medium text-[#2E7D32]">{classMatchedCount} lớp liên kết</span>
                        </div>
                      )}
                      {classNotMatchedCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF8E1] rounded-xl">
                          <AlertCircle className="w-5 h-5 text-[#F57C00]" />
                          <span className="text-sm font-medium text-[#F57C00]">{classNotMatchedCount} lớp chưa liên kết</span>
                        </div>
                      )}
                    </>
                  )
                })()}
                <span className="text-sm text-primary-3">Tổng: {parsedData.length} dòng</span>
              </div>

              {/* Data Table */}
              <div className="overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr>
                        <th colSpan={9} className="p-0">
                          <div className="flex items-center bg-[#E5E1DC] rounded-[15px] h-12 border border-white/60">
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap w-[50px]">#</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Mã GLV</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Tên thánh</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Họ tên</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Ngành</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Lớp</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Vai trò</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">SĐT</span>
                            <span className="px-3 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap flex-1">Trạng thái</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1DC]">
                      {parsedData.map((user, index) => (
                        <tr key={index} className={user.isValid ? 'bg-white hover:bg-gray-50' : 'bg-[#FFF5F5]'}>
                          <td className="px-3 py-2 text-primary-3">{index + 1}</td>
                          <td className="px-3 py-2 font-medium">{user.username}</td>
                          <td className="px-3 py-2">{user.saint_name || '-'}</td>
                          <td className="px-3 py-2">{user.full_name}</td>
                          <td className="px-3 py-2">
                            <span className="text-brand font-medium">{user.branch}</span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {user.class_name ? (
                              <span
                                className={`flex items-center gap-1 ${user.classMatched ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}
                                title={user.classMatched ? 'Đã liên kết lớp' : 'Chưa tìm thấy lớp trong hệ thống'}
                              >
                                {user.class_name}
                                {user.classMatched ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                              </span>
                            ) : (
                              <span className="text-primary-3">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              user.role === 'admin' ? 'bg-[#FFF0EB] text-brand' :
                              user.role === 'phan_doan_truong' ? 'bg-[#FFF0EB] text-brand' :
                              'bg-[#E8F5E9] text-[#2E7D32]'
                            }`}>
                              {ROLE_LABELS[user.role]}
                            </span>
                          </td>
                          <td className="px-3 py-2">{user.phone || '-'}</td>
                          <td className="px-3 py-2">
                            {user.isValid ? (
                              <span className="flex items-center gap-1 text-[#2E7D32] text-xs">
                                <CheckCircle className="w-4 h-4" />
                                OK
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[#C62828] text-xs" title={user.errors.join(', ')}>
                                <AlertCircle className="w-4 h-4" />
                                {user.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-12 w-12 text-brand mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-primary-3">Đang import {validCount} người dùng...</p>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              {/* Result Summary */}
              <div className="flex items-center gap-4 justify-center flex-wrap py-6">
                <div className="flex items-center gap-2 px-6 py-3 bg-[#E8F5E9] rounded-xl">
                  <CheckCircle className="w-6 h-6 text-[#2E7D32]" />
                  <span className="text-lg font-medium text-[#2E7D32]">{importResult.success} thêm mới</span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2 px-6 py-3 bg-[#FFF8E1] rounded-xl">
                    <AlertCircle className="w-6 h-6 text-[#F57C00]" />
                    <span className="text-lg font-medium text-[#F57C00]">{importResult.skipped} đã tồn tại</span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 px-6 py-3 bg-[#FFEBEE] rounded-xl">
                    <AlertCircle className="w-6 h-6 text-[#C62828]" />
                    <span className="text-lg font-medium text-[#C62828]">{importResult.failed} thất bại</span>
                  </div>
                )}
              </div>

              {/* Error List */}
              {importResult.errors.length > 0 && (
                <div className="p-4 bg-[#FFF5F5] border border-[#FFCDD2] rounded-xl">
                  <h4 className="text-sm font-medium text-[#C62828] mb-2">Chi tiết lỗi:</h4>
                  <ul className="text-sm text-[#C62828] space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.success > 0 && (
                <div className="p-4 bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl text-center">
                  <p className="text-sm text-[#2E7D32]">
                    Đã thêm mới {importResult.success} người dùng vào hệ thống.
                  </p>
                </div>
              )}

              {importResult.skipped > 0 && importResult.success === 0 && importResult.failed === 0 && (
                <div className="p-4 bg-[#FFF8E1] border border-[#FFE082] rounded-xl text-center">
                  <p className="text-sm text-[#F57C00]">
                    Tất cả {importResult.skipped} người dùng đã tồn tại trong hệ thống.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E1DC]">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 border border-[#E5E1DC] rounded-xl text-sm font-medium text-primary-3 hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={resetModal}
                className="px-6 py-2.5 border border-[#E5E1DC] rounded-xl text-sm font-medium text-primary-3 hover:bg-gray-50 transition-colors"
              >
                Chọn file khác
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {validCount} người dùng
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={() => {
                handleClose()
                if (importResult.success > 0) {
                  onSuccess()
                }
              }}
              className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-orange-500 transition-colors"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
