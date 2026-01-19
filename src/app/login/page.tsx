'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Eye, EyeOff, Lock, FileText, HelpCircle, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('Đăng ký thành công! Vui lòng đăng nhập.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập')
      return
    }

    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu')
      return
    }

    setIsLoading(true)

    const result = await login(username, password)

    if (!result.success) {
      setError(result.error || 'Đăng nhập thất bại')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">
      {/* Background Image - Full Screen */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/background.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>

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
        <span className="text-black text-sm font-medium">Giáo xứ Thiên Ân</span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-[420px] p-8 bg-white rounded-[20px] shadow-xl">
          {/* User Icon */}
          <div className="flex flex-col items-center">
            <div
              className="p-3 rounded-full"
              style={{
                background: 'linear-gradient(180deg, rgba(250, 134, 94, 0.3) 0%, rgba(255, 255, 255, 0) 100%)'
              }}
            >
              <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-brand" />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center mt-4 space-y-1">
              <h1 className="text-[28px] font-semibold text-black">Chào mừng!</h1>
              <p className="text-sm text-gray-500">Đăng nhập vào tài khoản của bạn</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm text-center">
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-700">Tên đăng nhập</span>
                <span className="text-sm font-medium text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="w-full h-[44px] px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-black placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-700">Mật khẩu</span>
                <span className="text-sm font-medium text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full h-[44px] px-4 py-2 pr-12 bg-white border border-gray-200 rounded-xl text-sm text-black placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand hover:text-orange-600 transition-colors"
              >
                Quên mật khẩu?
              </Link>
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
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-500">
              Bạn chưa có tài khoản?{' '}
              <Link href="/register" className="font-semibold text-brand hover:text-orange-600 transition-colors">
                Đăng ký
              </Link>
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <p className="text-xs text-gray-600">© 2025 Giáo Xứ Thiên Ân. All right reserved.</p>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-brand transition-colors"
          >
            <Lock className="w-4 h-4" />
            Riêng tư
          </Link>
          <Link
            href="/terms"
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-brand transition-colors"
          >
            <FileText className="w-4 h-4" />
            Điều khoản
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-brand transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Trợ giúp
          </Link>
        </div>
      </footer>
    </div>
  )
}
