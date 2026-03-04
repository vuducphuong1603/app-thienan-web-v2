'use client'

import { useState, useEffect, useCallback } from 'react'

export function useDropdown() {
  const [openId, setOpenId] = useState<string | null>(null)

  const isOpen = useCallback((id: string) => openId === id, [openId])

  const toggle = useCallback((id: string) => {
    setOpenId(prev => (prev === id ? null : id))
  }, [])

  const close = useCallback(() => {
    setOpenId(null)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setOpenId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return { openId, isOpen, toggle, close }
}
