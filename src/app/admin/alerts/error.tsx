'use client'

export default function AlertsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
          Đã xảy ra lỗi
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {error.message || 'Không thể tải trang cảnh báo. Vui lòng thử lại.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-brand/90 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
