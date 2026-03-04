'use client'

import { ArrowLeft, Moon, Sun, Type, Minimize2, Eye, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDisplay } from '@/lib/theme-context'

type FontSize = 'small' | 'medium' | 'large'

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Nhỏ' },
  { value: 'medium', label: 'Vừa' },
  { value: 'large', label: 'Lớn' },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-brand' : 'bg-gray-300 dark:bg-white/20'
      }`}
    >
      <div
        className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}

export default function DisplayPage() {
  const router = useRouter()
  const {
    isDarkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    isCompactMode,
    toggleCompactMode,
    isHighContrast,
    toggleHighContrast,
    reduceMotion,
    toggleReduceMotion,
  } = useDisplay()

  return (
    <div className="min-h-screen bg-[#f6f6f6] dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-[#e5e1dc] dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black dark:text-white" />
          </button>
          <h1 className="text-lg font-semibold text-black dark:text-white">
            Màn hình và trợ năng
          </h1>
        </div>
      </div>

      {/* Settings */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Dark mode */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-[#e5e1dc] dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-brand" />
              ) : (
                <Sun className="w-5 h-5 text-brand" />
              )}
              <div>
                <p className="text-sm font-medium text-black dark:text-white">Chế độ tối</p>
                <p className="text-xs text-black/40 dark:text-white/60 mt-0.5">
                  Giảm độ sáng màn hình, dễ nhìn vào ban đêm
                </p>
              </div>
            </div>
            <Toggle enabled={isDarkMode} onToggle={toggleDarkMode} />
          </div>
        </div>

        {/* Font size */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-[#e5e1dc] dark:border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Type className="w-5 h-5 text-brand" />
            <div>
              <p className="text-sm font-medium text-black dark:text-white">Cỡ chữ</p>
              <p className="text-xs text-black/40 dark:text-white/60 mt-0.5">
                Thay đổi kích thước chữ trong ứng dụng
              </p>
            </div>
          </div>
          <div className="flex bg-[#f6f6f6] dark:bg-white/10 rounded-full p-1">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontSize(option.value)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                  fontSize === option.value
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact mode */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-[#e5e1dc] dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Minimize2 className="w-5 h-5 text-brand" />
              <div>
                <p className="text-sm font-medium text-black dark:text-white">Chế độ thu gọn</p>
                <p className="text-xs text-black/40 dark:text-white/60 mt-0.5">
                  Giảm khoảng cách giữa các thành phần, hiển thị nhiều nội dung hơn
                </p>
              </div>
            </div>
            <Toggle enabled={isCompactMode} onToggle={toggleCompactMode} />
          </div>
        </div>

        {/* High contrast */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-[#e5e1dc] dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-brand" />
              <div>
                <p className="text-sm font-medium text-black dark:text-white">Tương phản cao</p>
                <p className="text-xs text-black/40 dark:text-white/60 mt-0.5">
                  Tăng độ tương phản cho chữ mờ, dễ đọc hơn
                </p>
              </div>
            </div>
            <Toggle enabled={isHighContrast} onToggle={toggleHighContrast} />
          </div>
        </div>

        {/* Reduce motion */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-[#e5e1dc] dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-brand" />
              <div>
                <p className="text-sm font-medium text-black dark:text-white">Giảm chuyển động</p>
                <p className="text-xs text-black/40 dark:text-white/60 mt-0.5">
                  Tắt hiệu ứng chuyển động và hoạt ảnh
                </p>
              </div>
            </div>
            <Toggle enabled={reduceMotion} onToggle={toggleReduceMotion} />
          </div>
        </div>
      </div>
    </div>
  )
}
