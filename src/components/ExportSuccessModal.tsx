'use client'

interface ExportSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string
}

export default function ExportSuccessModal({
  isOpen,
  onClose,
  message = 'Đã xuất ảnh!',
}: ExportSuccessModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-[20px] w-[320px] px-8 py-10 shadow-xl flex flex-col items-center">
        {/* Icon */}
        <div className="w-[56px] h-[56px] rounded-full bg-[rgba(250,134,94,0.15)] flex items-center justify-center mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#FA865E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10L12 15L17 10" stroke="#FA865E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15V3" stroke="#FA865E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-black dark:text-white">
          {message}
        </h2>
      </div>
    </div>
  )
}
