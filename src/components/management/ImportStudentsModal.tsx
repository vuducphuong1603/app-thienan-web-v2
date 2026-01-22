'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, ChevronLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase, Class } from '@/lib/supabase'

interface ImportStudentsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedStudent {
  student_code: string
  saint_name: string
  full_name: string
  date_of_birth?: string
  address: string
  parent_phone: string
  parent_phone_2: string
  class_name: string
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

// Helper function to format phone number
function formatPhone(phone: string | number | null | undefined): string {
  if (!phone) return ''
  let phoneStr = String(phone).replace(/\D/g, '')
  // Add leading 0 if missing (Vietnamese phone numbers)
  if (phoneStr.length === 9 && !phoneStr.startsWith('0')) {
    phoneStr = '0' + phoneStr
  }
  return phoneStr
}

// Helper function to normalize class name for matching
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

export default function ImportStudentsModal({ isOpen, onClose, onSuccess }: ImportStudentsModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([])
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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as (string | number | null)[][]

        // Parse data - skip header row (row 0), data starts from row 1
        // Excel structure from "DS tổng thiếu nhi 2025.xlsx":
        // Col 0: STT, Col 1: Mã TN, Col 2: TÊN THÁNH, Col 3: HỌ VÀ TÊN (Họ), Col 4: (Tên)
        // Col 5: NGÀY SINH (Excel serial), Col 6: ĐỊA CHỈ, Col 7: SĐT 1, Col 8: SĐT 2, Col 9: LỚP

        const students: ParsedStudent[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length < 2) continue // Skip empty rows

          // Check if the second column has data (Mã TN)
          const studentCode = String(row[1] || '').trim()
          if (!studentCode) continue // Skip rows without student code

          const errors: string[] = []
          const warnings: string[] = []
          const saintName = String(row[2] || '').trim()
          const lastName = String(row[3] || '').trim()
          const firstName = String(row[4] || '').trim()
          const fullName = `${lastName} ${firstName}`.trim()
          const dateOfBirth = typeof row[5] === 'number' ? excelSerialToDate(row[5]) : undefined
          const address = String(row[6] || '').trim()
          const phone1 = formatPhone(row[7])
          const phone2 = formatPhone(row[8])
          const className = String(row[9] || '').trim()

          // Validation - only full_name is required
          if (!fullName || fullName === ' ') errors.push('Thiếu họ tên')

          // Check if class exists in database
          const classMatched = className ? classes.some(cls =>
            normalizeClassName(cls.name) === normalizeClassName(className)
          ) : false

          // Add warning if class specified but not found
          if (className && !classMatched) {
            warnings.push(`Không tìm thấy lớp "${className}"`)
          }

          students.push({
            student_code: studentCode,
            saint_name: saintName,
            full_name: fullName,
            date_of_birth: dateOfBirth,
            address,
            parent_phone: phone1,
            parent_phone_2: phone2,
            class_name: className,
            isValid: errors.length === 0,
            errors,
            warnings,
            classMatched
          })
        }

        if (students.length === 0) {
          alert('Không tìm thấy dữ liệu trong file. Vui lòng kiểm tra lại định dạng file.')
          return
        }

        setParsedData(students)
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
    const validStudents = parsedData.filter(s => s.isValid)
    let success = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for (const student of validStudents) {
      try {
        // Check if student with same full_name and date_of_birth already exists - skip if exists
        const { data: existing } = await supabase
          .from('thieu_nhi')
          .select('id')
          .eq('full_name', student.full_name)
          .eq('saint_name', student.saint_name || '')
          .maybeSingle()

        if (existing) {
          // Skip existing student
          skipped++
          continue
        }

        // Lookup class UUID by matching class name
        const classUuid = findClassId(student.class_name)

        const { error } = await supabase.from('thieu_nhi').insert({
          student_code: student.student_code || null,
          full_name: student.full_name,
          saint_name: student.saint_name || null,
          date_of_birth: student.date_of_birth || null,
          address: student.address || null,
          parent_phone: student.parent_phone || null,
          parent_phone_2: student.parent_phone_2 || null,
          class_id: classUuid,
          status: 'ACTIVE'
        })

        if (error) {
          failed++
          errors.push(`${student.full_name}: ${error.message}`)
        } else {
          success++
        }
      } catch {
        failed++
        errors.push(`${student.full_name}: Lỗi không xác định`)
      }
    }

    setImportResult({ success, failed, skipped, errors })
    setStep('result')
  }

  const handleDownloadTemplate = () => {
    // Create a template workbook matching the expected format
    const templateData = [
      ['STT', 'Mã TN', 'TÊN THÁNH', 'HỌ VÀ TÊN', '', 'NGÀY SINH', 'ĐỊA CHỈ', 'SĐT 1', 'SĐT 2', 'LỚP'],
      [1, 'HA172336', 'Têrêsa Avila', 'Hoàng Nguyễn Khả', 'Ái', '', '102/52 Bình Long, Phú Thạnh', '0906417493', '0906417492', 'Ấu 2B'],
      [2, 'BA152253', 'Maria', 'Bùi Đặng Gia', 'An', '', '72 Đường số 13A, BHH, Bình Tân', '0939811068', '', 'Thiếu 1C'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // STT
      { wch: 12 }, // Mã TN
      { wch: 15 }, // Tên thánh
      { wch: 15 }, // Họ
      { wch: 10 }, // Tên
      { wch: 12 }, // Ngày sinh
      { wch: 35 }, // Địa chỉ
      { wch: 12 }, // SĐT 1
      { wch: 12 }, // SĐT 2
      { wch: 12 }, // Lớp
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DS Thiếu Nhi')
    XLSX.writeFile(wb, 'Template_Import_ThieuNhi.xlsx')
  }

  if (!isOpen) return null

  const validCount = parsedData.filter(s => s.isValid).length
  const invalidCount = parsedData.filter(s => !s.isValid).length

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
              {step === 'upload' && 'Import danh sách Thiếu Nhi'}
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
                    <span>Dòng 1 là header, dữ liệu bắt đầu từ dòng 2</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Cột bắt buộc: Mã TN, Họ & Tên</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Nếu thiếu nhi đã tồn tại (trùng tên + tên thánh) sẽ được bỏ qua</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                    <span>Điểm số sẽ được nhập riêng sau</span>
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
                  const classMatchedCount = parsedData.filter(s => s.classMatched).length
                  const classNotMatchedCount = parsedData.filter(s => s.class_name && !s.classMatched).length
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
              <div className="border border-[#E5E1DC] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-[#FAFAFA] border-b border-[#E5E1DC]">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">Mã TN</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">Tên thánh</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">Họ tên</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">Ngày sinh</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">Lớp</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">SĐT 1</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">SĐT 2</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-primary-3 uppercase whitespace-nowrap">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1DC]">
                      {parsedData.map((student, index) => (
                        <tr key={index} className={student.isValid ? 'bg-white hover:bg-gray-50' : 'bg-[#FFF5F5]'}>
                          <td className="px-3 py-2 text-primary-3">{index + 1}</td>
                          <td className="px-3 py-2 font-medium">{student.student_code}</td>
                          <td className="px-3 py-2">{student.saint_name || '-'}</td>
                          <td className="px-3 py-2">{student.full_name}</td>
                          <td className="px-3 py-2 text-xs">
                            {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {student.class_name ? (
                              <span
                                className={`flex items-center gap-1 ${student.classMatched ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}
                                title={student.classMatched ? 'Đã liên kết lớp' : 'Chưa tìm thấy lớp trong hệ thống'}
                              >
                                {student.class_name}
                                {student.classMatched ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                              </span>
                            ) : (
                              <span className="text-primary-3">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">{student.parent_phone || '-'}</td>
                          <td className="px-3 py-2">{student.parent_phone_2 || '-'}</td>
                          <td className="px-3 py-2">
                            {student.isValid ? (
                              <span className="flex items-center gap-1 text-[#2E7D32] text-xs">
                                <CheckCircle className="w-4 h-4" />
                                OK
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[#C62828] text-xs" title={student.errors.join(', ')}>
                                <AlertCircle className="w-4 h-4" />
                                {student.errors[0]}
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
              <p className="text-sm text-primary-3">Đang import {validCount} thiếu nhi...</p>
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
                      <li key={index}>* {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.success > 0 && (
                <div className="p-4 bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl text-center">
                  <p className="text-sm text-[#2E7D32]">
                    Đã thêm mới {importResult.success} thiếu nhi vào hệ thống.
                  </p>
                </div>
              )}

              {importResult.skipped > 0 && importResult.success === 0 && importResult.failed === 0 && (
                <div className="p-4 bg-[#FFF8E1] border border-[#FFE082] rounded-xl text-center">
                  <p className="text-sm text-[#F57C00]">
                    Tất cả {importResult.skipped} thiếu nhi đã tồn tại trong hệ thống.
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
                Import {validCount} thiếu nhi
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
