'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

interface ImportUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportedUser {
  class_name: string
  class_code: string
  saint_name: string
  full_name: string
  notes: string
  glv_level: number | null
  address: string
  phone: string
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

// Branch mapping based on class code prefix
const getBranchFromClassCode = (classCode: string): string => {
  const code = classCode.toUpperCase()
  if (code.startsWith('KT') || code.includes('CHIEN') || code.includes('KHAI')) return 'Chien'
  if (code.startsWith('AU') || code.includes('AU')) return 'Au nhi'
  if (code.startsWith('TS') || code.includes('THIEU')) return 'Thieu nhi'
  if (code.startsWith('HS') || code.includes('NGHIA') || code.includes('HIEP')) return 'Nghia si'
  return 'Chua xac dinh'
}

export default function ImportUsersModal({ isOpen, onClose, onSuccess }: ImportUsersModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file)
        setImportResult(null)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setImportResult(null)
    }
  }

  const parseExcelFile = async (file: File): Promise<ImportedUser[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

          // Skip header row (row 1), data starts from row 2
          const users: ImportedUser[] = []
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            if (!row || row.length === 0) continue

            // Column mapping based on template:
            // 0: Lop, 1: Class code, 2: Ten thanh, 3-5: Ho & Ten parts, 6: Ghi chu, 7: GLV cap, 8: Dia chi, 9: Dien thoai
            const className = String(row[0] || '').trim()
            const classCode = String(row[1] || '').trim()
            const saintName = String(row[2] || '').trim()

            // Combine name parts (columns 3, 4, 5)
            const nameParts = [row[3], row[4], row[5]].filter(Boolean).map(p => String(p).trim())
            const fullName = nameParts.join(' ')

            const notes = String(row[6] || '').trim()
            const glvLevel = row[7] ? Number(row[7]) : null
            const address = String(row[8] || '').trim()
            const phone = String(row[9] || '').trim()

            // Skip if no phone number (required for username)
            if (!phone) continue

            users.push({
              class_name: className,
              class_code: classCode,
              saint_name: saintName,
              full_name: fullName,
              notes,
              glv_level: glvLevel,
              address,
              phone: phone.replace(/\D/g, ''), // Remove non-numeric characters
            })
          }

          resolve(users)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const users = await parseExcelFile(selectedFile)

      if (users.length === 0) {
        setImportResult({
          success: 0,
          failed: 0,
          errors: ['Khong tim thay du lieu nguoi dung trong file'],
        })
        setIsImporting(false)
        return
      }

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      // Import users one by one
      for (const user of users) {
        try {
          // Check if user already exists by phone
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', user.phone)
            .maybeSingle()

          if (existingUser) {
            // Update existing user
            const { error } = await supabase
              .from('users')
              .update({
                saint_name: user.saint_name,
                full_name: user.full_name,
                address: user.address,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingUser.id)

            if (error) {
              failedCount++
              errors.push(`Loi cap nhat ${user.full_name}: ${error.message}`)
            } else {
              successCount++
            }
          } else {
            // Insert new user
            const branch = getBranchFromClassCode(user.class_code)
            const { error } = await supabase
              .from('users')
              .insert({
                id: crypto.randomUUID(),
                username: user.phone,
                phone: user.phone,
                password: '123456', // Default password
                saint_name: user.saint_name,
                full_name: user.full_name,
                address: user.address,
                role: 'giao_ly_vien',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
              })

            if (error) {
              failedCount++
              errors.push(`Loi them ${user.full_name}: ${error.message}`)
            } else {
              successCount++
            }
          }
        } catch (err) {
          failedCount++
          errors.push(`Loi xu ly ${user.full_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 5), // Only show first 5 errors
      })

      if (successCount > 0) {
        onSuccess()
      }
    } catch (error) {
      setImportResult({
        success: 0,
        failed: 0,
        errors: [`Loi doc file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setImportResult(null)
    onClose()
  }

  const handleDownloadTemplate = () => {
    window.open('/files/Danh sách GLV import Template.xlsx', '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[480px] max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f6f6f6] flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-primary-3" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex flex-col items-center">
          {/* Upload Icon */}
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-brand" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-black mb-1">Import nguoi dung</h2>
          <p className="text-sm text-primary-3 mb-4">Chon file Excel</p>

          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-[100px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors mb-4 ${
              isDragging
                ? 'border-brand bg-brand/5'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-[#E5E1DC] hover:border-brand hover:bg-brand/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <>
                <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-sm text-green-600 font-medium">{selectedFile.name}</p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-8 h-8 text-primary-3 mb-2" />
                <p className="text-sm text-primary-3">Keo tha file vao day hoac click de chon</p>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="w-full bg-[#FAFAFA] rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-black mb-2">Luu y:</p>
            <ul className="text-xs text-primary-3 space-y-1">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                <span>Headers o dong 1, data tu dong 2</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                <span>So dien thoai se lam username</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                <span>Mat khau mac dinh: 123456</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-3 flex-shrink-0" />
                <span>Phan doan: CHIEN, AU, THIEU, NGHIA</span>
              </li>
            </ul>
            <button
              onClick={handleDownloadTemplate}
              className="mt-3 text-xs text-brand hover:underline"
            >
              Tai file mau
            </button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`w-full rounded-xl p-4 mb-4 ${
              importResult.failed > 0 ? 'bg-red-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {importResult.failed > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <span className={`text-sm font-semibold ${
                  importResult.failed > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Thanh cong: {importResult.success}, That bai: {importResult.failed}
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-xs text-red-600 space-y-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="w-full flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="flex-1 h-[44px] bg-white border border-[#E5E1DC] rounded-xl text-sm font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Huy
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="flex-1 h-[44px] bg-brand rounded-xl text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImporting && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isImporting ? 'Dang import...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
