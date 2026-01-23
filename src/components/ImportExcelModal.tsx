'use client'

import { useRef } from 'react'

interface ImportExcelModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File) => void
  selectedDate: string
  dayType: 'thu5' | 'cn'
  isLoading?: boolean
}

export default function ImportExcelModal({
  isOpen,
  onClose,
  onImport,
  selectedDate,
  dayType,
  isLoading = false,
}: ImportExcelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }

  // Get day name
  const getDayName = (type: 'thu5' | 'cn') => {
    return type === 'thu5' ? 'Thứ 5' : 'Chủ nhật'
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-[20px] w-[420px] px-8 pt-8 pb-8 shadow-xl">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-[56px] h-[56px] rounded-full bg-[rgba(250,134,94,0.15)] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7C3 5.11438 3 4.17157 3.58579 3.58579C4.17157 3 5.11438 3 7 3H12.1716C12.5803 3 12.7847 3 12.9685 3.07612C13.1522 3.15224 13.2968 3.29676 13.5858 3.58579L16.4142 6.41421C16.7032 6.70324 16.8478 6.84776 16.9239 7.03153C17 7.2153 17 7.41968 17 7.82843V17C17 18.8856 17 19.8284 16.4142 20.4142C15.8284 21 14.8856 21 13 21H7C5.11438 21 4.17157 21 3.58579 20.4142C3 19.8284 3 18.8856 3 17V7Z" stroke="#FA865E" strokeWidth="1.5"/>
              <path d="M7 21V18.5C7 16.6144 7 15.6716 7.58579 15.0858C8.17157 14.5 9.11438 14.5 11 14.5H17M17 14.5H17.1716C17.5803 14.5 17.7847 14.5 17.9685 14.5761C18.1522 14.6522 18.2968 14.7968 18.5858 15.0858L20.4142 16.9142C20.7032 17.2032 20.8478 17.3478 20.9239 17.5315C21 17.7153 21 17.9197 21 18.3284V21C21 21.9428 21 22.4142 20.7071 22.7071C20.4142 23 19.9428 23 19 23H9C8.05719 23 7.58579 23 7.29289 22.7071C7 22.4142 7 21.9428 7 21" stroke="#FA865E" strokeWidth="1.5"/>
              <path d="M12 3V5.5C12 6.32843 12 6.74264 12.1464 7.03647C12.2768 7.29547 12.4877 7.50649 12.7467 7.63687C13.0406 7.78325 13.4548 7.78325 14.2833 7.78325H17" stroke="#FA865E" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-black dark:text-white mb-1">
          Import điểm danh từ Excel
        </h2>

        {/* Subtitle */}
        <p className="text-center text-sm text-[#666d80] dark:text-gray-400 mb-1">
          Chọn file Excel
        </p>

        {/* File type note */}
        <p className="text-center text-xs text-[#8A8C90] mb-6">
          Chỉ hỗ trợ file .xlsx và .xls
        </p>

        {/* Current Settings Card */}
        <div className="border border-[#E5E1DC] dark:border-white/10 rounded-[16px] overflow-hidden mb-5">
          {/* Card Header */}
          <div className="px-5 py-3 border-b border-[#E5E1DC] dark:border-white/10 bg-[#FAFAFA] dark:bg-white/5">
            <p className="text-sm font-medium text-black dark:text-white">
              Thiết lập hiện tại
            </p>
          </div>

          {/* Card Content */}
          <div className="px-5 py-4 flex items-center gap-8">
            {/* Date */}
            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-[rgba(250,134,94,0.15)] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M5 7.83333L6 8.83333L9 5.83333M7 12.1667C4.05448 12.1667 1.66667 9.77885 1.66667 6.83333C1.66667 3.88781 4.05448 1.5 7 1.5C9.94552 1.5 12.3333 3.88781 12.3333 6.83333C12.3333 9.77885 9.94552 12.1667 7 12.1667Z"
                    stroke="#FA865E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-sm text-black dark:text-white">Ngày: {formatDisplayDate(selectedDate)}</span>
            </div>

            {/* Day Type */}
            <div className="flex items-center gap-2">
              <div className="w-[18px] h-[18px] rounded-full bg-[rgba(250,134,94,0.15)] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M5 7.83333L6 8.83333L9 5.83333M7 12.1667C4.05448 12.1667 1.66667 9.77885 1.66667 6.83333C1.66667 3.88781 4.05448 1.5 7 1.5C9.94552 1.5 12.3333 3.88781 12.3333 6.83333C12.3333 9.77885 9.94552 12.1667 7 12.1667Z"
                    stroke="#FA865E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-sm text-black dark:text-white">Buổi: {getDayName(dayType)}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <p className="text-sm font-medium text-black dark:text-white mb-2">Hướng dẫn</p>
          <ul className="space-y-1.5 text-sm text-[#666d80] dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-[#666d80] mt-0.5">•</span>
              <span>File Excel chỉ cần 1 cột chứa mã thiếu nhi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#666d80] mt-0.5">•</span>
              <span>Mỗi dòng = 1 mã thiếu nhi có mặt</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#666d80] mt-0.5">•</span>
              <span>Chỉ đánh dấu có mặt, không thay đổi trạng thái hiện tại của những thiếu nhi khác</span>
            </li>
          </ul>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Buttons */}
        <div className="flex items-center gap-4">
          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-[52px] bg-[#F6F6F6] dark:bg-white/10 text-black dark:text-white text-base font-medium rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>

          {/* Import Button */}
          <button
            onClick={handleImportClick}
            disabled={isLoading}
            className="flex-1 h-[52px] bg-brand text-white text-base font-medium rounded-full hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(13,13,18,0.06)]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Import'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
