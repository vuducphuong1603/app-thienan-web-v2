'use client'

import { useTheme } from '@/lib/theme-context'

export function BackgroundImage() {
  const { isDarkMode } = useTheme()

  return (
    <div
      className="fixed inset-0 z-0 transition-opacity duration-500"
      style={{
        backgroundImage: isDarkMode
          ? 'url(/images/blackbackground1.png)'
          : 'url(/images/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
