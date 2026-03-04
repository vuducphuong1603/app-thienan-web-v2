'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type FontSize = 'small' | 'medium' | 'large'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

interface DisplayContextType extends ThemeContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  isCompactMode: boolean
  toggleCompactMode: () => void
  isHighContrast: boolean
  toggleHighContrast: () => void
  reduceMotion: boolean
  toggleReduceMotion: () => void
}

const ThemeContext = createContext<DisplayContextType>({
  isDarkMode: true,
  toggleDarkMode: () => {},
  fontSize: 'medium',
  setFontSize: () => {},
  isCompactMode: false,
  toggleCompactMode: () => {},
  isHighContrast: false,
  toggleHighContrast: () => {},
  reduceMotion: false,
  toggleReduceMotion: () => {},
})

const DISPLAY_STORAGE_KEY = 'thien_an_display_settings'

interface DisplaySettings {
  fontSize: FontSize
  isCompactMode: boolean
  isHighContrast: boolean
  reduceMotion: boolean
}

function getStoredDisplaySettings(): DisplaySettings {
  if (typeof window === 'undefined') {
    return { fontSize: 'medium', isCompactMode: false, isHighContrast: false, reduceMotion: false }
  }
  try {
    const stored = localStorage.getItem(DISPLAY_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { fontSize: 'medium', isCompactMode: false, isHighContrast: false, reduceMotion: false }
}

function applyDisplayClasses(settings: DisplaySettings) {
  const html = document.documentElement
  // Font size
  html.classList.remove('font-size-small', 'font-size-large')
  if (settings.fontSize === 'small') html.classList.add('font-size-small')
  else if (settings.fontSize === 'large') html.classList.add('font-size-large')
  // Compact mode
  html.classList.toggle('compact-mode', settings.isCompactMode)
  // High contrast
  html.classList.toggle('high-contrast', settings.isHighContrast)
  // Reduce motion
  html.classList.toggle('reduce-motion', settings.reduceMotion)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => getStoredDisplaySettings())

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('darkMode')
    const shouldBeDark = stored === null ? true : stored === 'true'
    setIsDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Apply display settings
    const settings = getStoredDisplaySettings()
    setDisplaySettings(settings)
    applyDisplayClasses(settings)
  }, [])

  const updateDisplaySettings = (newSettings: DisplaySettings) => {
    setDisplaySettings(newSettings)
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(newSettings))
    applyDisplayClasses(newSettings)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev
      if (newValue) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('darkMode', 'true')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('darkMode', 'false')
      }
      return newValue
    })
  }

  const setFontSize = (size: FontSize) => {
    updateDisplaySettings({ ...displaySettings, fontSize: size })
  }

  const toggleCompactMode = () => {
    updateDisplaySettings({ ...displaySettings, isCompactMode: !displaySettings.isCompactMode })
  }

  const toggleHighContrast = () => {
    updateDisplaySettings({ ...displaySettings, isHighContrast: !displaySettings.isHighContrast })
  }

  const toggleReduceMotion = () => {
    updateDisplaySettings({ ...displaySettings, reduceMotion: !displaySettings.reduceMotion })
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      fontSize: displaySettings.fontSize,
      setFontSize,
      isCompactMode: displaySettings.isCompactMode,
      toggleCompactMode,
      isHighContrast: displaySettings.isHighContrast,
      toggleHighContrast,
      reduceMotion: displaySettings.reduceMotion,
      toggleReduceMotion,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Backward-compatible hook (returns isDarkMode + toggleDarkMode)
export function useTheme() {
  return useContext(ThemeContext)
}

// Full display settings hook
export function useDisplay() {
  return useContext(ThemeContext)
}
