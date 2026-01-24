'use client'

import { useState } from 'react'
import { Lock, FileText, HelpCircle, KeyRound } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Địa chỉ email không hợp lệ')
      return
    }

    setIsLoading(true)

    try {
      // TODO: Implement forgot password API call
      // const result = await sendResetPasswordEmail(email)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      setSuccess(true)
    } catch {
      setError('Gửi email thất bại. Vui lòng thử lại.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="w-full px-8 py-6 flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand to-orange-400">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L4 7V12C4 16.42 7.42 20.74 12 22C16.58 20.74 20 16.42 20 12V7L12 2Z"
              fill="white"
            />
            <path
              d="M12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6ZM12 16C14.7 16 17.8 17.29 18 18H6C6.23 17.28 9.31 16 12 16Z"
              fill="#FA865E"
            />
          </svg>
        </div>
        <span className="text-black dark:text-white text-sm font-medium">Giáo xứ Thiên Ân</span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-[420px] p-8 bg-white dark:bg-white/10 dark:backdrop-blur-xl dark:border dark:border-white/10 rounded-[20px] shadow-xl">
          {!success ? (
            <>
              {/* Lock Icon */}
              <div className="flex flex-col items-center">
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: 'linear-gradient(180deg, rgba(250, 134, 94, 0.3) 0%, rgba(255, 255, 255, 0) 100%)'
                  }}
                >
                  <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center">
                    <KeyRound className="w-7 h-7 text-brand" />
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mt-4 space-y-2">
                  <h1 className="text-[28px] font-semibold text-black dark:text-white">Quên mật khẩu</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-300 max-w-[280px] mx-auto">
                    Nhập địa chỉ Email và chúng tôi sẽ gửi cho bạn hướng dẫn đặt lại mật khẩu
                  </p>
                </div>
              </div>

              {/* Forgot Password Form */}
              <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Địa chỉ Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="demo@gmail.com"
                    className="w-full h-[44px] px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                    disabled={isLoading}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[44px] px-4 py-2 bg-brand hover:bg-orange-500 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Đang gửi...
                    </>
                  ) : (
                    'Quên mật khẩu'
                  )}
                </button>

                {/* Alternative Link */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-300">
                  Không còn quyền truy cập nữa?{' '}
                  <Link href="/contact-support" className="font-semibold text-brand hover:text-orange-600 transition-colors">
                    Hãy thử phương pháp khác
                  </Link>
                </p>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="flex flex-col items-center py-4">
              <div
                className="p-3 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.3) 0%, rgba(255, 255, 255, 0) 100%)'
                }}
              >
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <div className="text-center mt-4 space-y-2">
                <h1 className="text-[28px] font-semibold text-black dark:text-white">Đã gửi email!</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300 max-w-[300px] mx-auto">
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến địa chỉ email <span className="font-medium text-gray-700">{email}</span>. Vui lòng kiểm tra hộp thư của bạn.
                </p>
              </div>

              <div className="w-full mt-6 space-y-4">
                <Link
                  href="/login"
                  className="w-full h-[44px] px-4 py-2 bg-brand hover:bg-orange-500 rounded-xl text-white text-sm font-semibold flex items-center justify-center transition-colors"
                >
                  Quay lại đăng nhập
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full h-[44px] px-4 py-2 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 border border-gray-200 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-200 text-sm font-semibold flex items-center justify-center transition-colors"
                >
                  Gửi lại email
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-6">
                Không nhận được email? Kiểm tra thư mục spam hoặc{' '}
                <Link href="/contact-support" className="text-brand hover:text-orange-600 transition-colors">
                  liên hệ hỗ trợ
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <p className="text-xs text-gray-600 dark:text-gray-400">© 2025 Giáo Xứ Thiên Ân. All right reserved.</p>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-brand transition-colors"
          >
            <Lock className="w-4 h-4" />
            Riêng tư
          </Link>
          <Link
            href="/terms"
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-brand transition-colors"
          >
            <FileText className="w-4 h-4" />
            Điều khoản
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-brand transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Trợ giúp
          </Link>
        </div>
      </footer>
    </div>
  )
}
