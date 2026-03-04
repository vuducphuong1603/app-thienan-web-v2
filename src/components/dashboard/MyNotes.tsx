'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, MoreHorizontal, X, Check, Trash2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useMyNotesData, useUserNotes, useInvalidateQueries } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const NOTE_COLORS = ['#FA865E', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']

type NoteFilter = 'all' | 'pending' | 'completed'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} giờ trước`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} ngày trước`
  return `${date.getDate()}/${date.getMonth() + 1}`
}

// ─── Create Note Modal ───────────────────────────────────────
function CreateNoteModal({ userId, onClose, onCreated }: {
  userId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(NOTE_COLORS[0])
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('user_notes').insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        color,
      })
      if (!error) {
        onCreated()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header bar with selected color */}
        <div className="h-2 w-full" style={{ backgroundColor: color }} />

        <div className="p-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-black/50 dark:text-white/50" />
          </button>

          <h3 className="text-lg font-semibold text-black dark:text-white mb-5">Tạo ghi chú mới</h3>

          {/* Title input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1.5">Tiêu đề</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) handleCreate() }}
              placeholder="Nhập tiêu đề ghi chú..."
              className="w-full px-3.5 py-2.5 bg-[#F6F6F6] dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>

          {/* Description input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1.5">Mô tả <span className="text-black/30 dark:text-white/20">(tùy chọn)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-[#F6F6F6] dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all resize-none"
            />
          </div>

          {/* Color picker */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-2">Màu sắc</label>
            <div className="flex gap-2.5">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all duration-150 flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {color === c && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="w-full py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Tạo ghi chú
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function MyNotes() {
  const { user } = useAuth()
  const { data: dashData, isLoading: dashLoading } = useMyNotesData(user)
  const { data: notes = [], isLoading: notesLoading } = useUserNotes(user?.id)
  const { invalidateUserNotes } = useInvalidateQueries()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showNotesMenu, setShowNotesMenu] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const notesMenuRef = useRef<HTMLDivElement>(null)

  const isLoading = dashLoading

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false)
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false)
      }
      if (notesMenuRef.current && !notesMenuRef.current.contains(event.target as Node)) {
        setShowNotesMenu(false)
      }
    }
    if (showFilterMenu || showHeaderMenu || showNotesMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterMenu, showHeaderMenu, showNotesMenu])

  // Dashboard data
  const classCount = dashData?.classCount ?? 0
  const studentCount = dashData?.studentCount ?? 0
  const nextActivity = dashData?.nextActivity ?? null

  // Notes data
  const completedNotes = notes.filter(n => n.is_completed).length
  const completionPercentage = notes.length > 0 ? Math.round((completedNotes / notes.length) * 100) : 0
  const totalBars = 26
  const filledBars = Math.round((completionPercentage / 100) * totalBars)

  // Filtered notes
  const filteredNotes = filter === 'all'
    ? notes
    : filter === 'completed'
      ? notes.filter(n => n.is_completed)
      : notes.filter(n => !n.is_completed)

  const filterLabels: Record<NoteFilter, string> = {
    all: 'Tất cả',
    pending: 'Chưa xong',
    completed: 'Đã xong',
  }

  // ── Mutations ──
  const handleToggleComplete = async (noteId: string, currentState: boolean) => {
    setTogglingId(noteId)
    try {
      const { error } = await supabase
        .from('user_notes')
        .update({ is_completed: !currentState, updated_at: new Date().toISOString() })
        .eq('id', noteId)
      if (!error) await invalidateUserNotes()
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) return
    setDeletingId(noteId)
    try {
      const { error } = await supabase.from('user_notes').delete().eq('id', noteId)
      if (!error) await invalidateUserNotes()
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCompleted = async () => {
    const completedIds = notes.filter(n => n.is_completed).map(n => n.id)
    if (completedIds.length === 0) return
    if (!confirm(`Xóa ${completedIds.length} ghi chú đã hoàn thành?`)) return
    setShowHeaderMenu(false)
    setShowNotesMenu(false)
    const { error } = await supabase.from('user_notes').delete().in('id', completedIds)
    if (!error) await invalidateUserNotes()
  }

  const handleDeleteAll = async () => {
    if (notes.length === 0) return
    if (!confirm(`Xóa tất cả ${notes.length} ghi chú?`)) return
    setShowHeaderMenu(false)
    setShowNotesMenu(false)
    const ids = notes.map(n => n.id)
    const { error } = await supabase.from('user_notes').delete().in('id', ids)
    if (!error) await invalidateUserNotes()
  }

  return (
    <>
      <div className="bg-white dark:bg-white/10 rounded-[15px] p-4 border border-gray-100 dark:border-white/10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between h-10 mb-3 flex-shrink-0">
          <h3 className="text-lg font-semibold text-black dark:text-white">Ghi chú của tôi</h3>
          <div className="relative" ref={headerMenuRef}>
            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="w-12 h-12 bg-[#F6F6F6] dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <MoreHorizontal className="w-[22px] h-[22px] text-black/40 dark:text-white/50" />
            </button>
            {showHeaderMenu && (
              <div className="absolute right-0 top-12 z-50 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 min-w-[180px]">
                <Link
                  href="/admin/notes"
                  className="w-full text-left px-3 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                  onClick={() => setShowHeaderMenu(false)}
                >
                  <ExternalLink className="w-4 h-4" />
                  Xem tất cả ghi chú
                </Link>
                <button
                  onClick={() => { setShowCreateModal(true); setShowHeaderMenu(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tạo ghi chú
                </button>
                <button
                  onClick={handleDeleteCompleted}
                  disabled={completedNotes === 0}
                  className="w-full text-left px-3 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa đã hoàn thành
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={notes.length === 0}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cards Row */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          {/* Add Note Card */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="w-[100px] min-h-[120px] bg-[#F6F6F6] dark:bg-white/5 rounded-2xl flex items-center justify-center border border-dashed border-black/20 dark:border-white/20 hover:border-brand hover:bg-brand/5 cursor-pointer transition-all flex-shrink-0 group"
          >
            <Plus className="w-5 h-5 text-black/40 dark:text-white/50 group-hover:text-brand transition-colors" />
          </div>

          {/* Class Card */}
          <div className="flex-1 min-h-[120px] bg-[#F6F6F6] dark:bg-white/5 rounded-[20px] p-3 flex flex-col justify-between">
            <div className="w-6 h-6">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 4.875C10.3 4.875 8.125 7.05 8.125 9.75C8.125 12.45 10.3 14.625 13 14.625C15.7 14.625 17.875 12.45 17.875 9.75C17.875 7.05 15.7 4.875 13 4.875Z" fill="#FA865E" />
                <path d="M20.5833 19.5C20.5833 16.1167 17.1958 13.4167 13 13.4167C8.80416 13.4167 5.41666 16.1167 5.41666 19.5V21.125H20.5833V19.5Z" fill="#FA865E" fillOpacity="0.4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-light text-black/40 dark:text-white/50">Lớp đang dạy</p>
              {isLoading ? (
                <div className="space-y-1 mt-1">
                  <div className="h-7 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-medium text-black dark:text-white leading-[1.2]">
                    {classCount} <span className="text-base font-normal text-black/40 dark:text-white/50">lớp</span>
                  </p>
                  <p className="text-xs text-black dark:text-white">{studentCount} thiếu nhi</p>
                </>
              )}
            </div>
          </div>

          {/* Activity Card */}
          <div className="flex-1 min-h-[120px] bg-[#F6F6F6] dark:bg-white/5 rounded-2xl p-3 flex flex-col justify-between">
            <div className="w-6 h-6">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 22.75L11.3425 21.2475C5.85 16.26 2.16666 12.935 2.16666 8.9375C2.16666 5.6125 4.78749 3.25 8.11249 3.25C9.94583 3.25 11.7 4.095 13 5.4925C14.3 4.095 16.0542 3.25 17.8875 3.25C21.2125 3.25 23.8333 5.6125 23.8333 8.9375C23.8333 12.935 20.15 16.26 14.6575 21.2475L13 22.75Z" fill="#FA865E" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-light text-black/40 dark:text-white/50">Tham gia hoạt động</p>
              {isLoading ? (
                <div className="space-y-1 mt-1">
                  <div className="h-7 w-14 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
              ) : nextActivity ? (
                <>
                  <p className="text-[22px] font-semibold text-black dark:text-white leading-tight">
                    {formatDate(nextActivity.plan_date)}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#DF1C41]">{nextActivity.location || 'Chưa có địa điểm'}</span>
                    <span className="text-black dark:text-white">{formatTime(nextActivity.time_start)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-black/40 dark:text-white/50 mt-1">Không có hoạt động sắp tới</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Section — note-based */}
        <div className="bg-[#F6F6F6] dark:bg-white/5 rounded-3xl p-4 h-[106px] mb-4 flex-shrink-0 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-[11px]">
              <div className="w-[49px] h-[49px] bg-white dark:bg-white/10 rounded-3xl flex items-center justify-center">
                <span className="text-[22px]">🔥</span>
              </div>
              <div>
                <span className="text-sm font-medium text-black dark:text-white">Hoàn thành</span>
                {notes.length > 0 && (
                  <p className="text-[11px] text-black/35 dark:text-white/40">{completedNotes}/{notes.length} ghi chú</p>
                )}
              </div>
            </div>
            <div className="flex items-baseline">
              {notesLoading ? (
                <div className="h-7 w-10 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              ) : (
                <>
                  <span className="text-[24px] font-medium text-black dark:text-white">{completionPercentage}</span>
                  <span className="text-sm text-black/20 dark:text-white/30">%</span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            {Array.from({ length: totalBars }).map((_, i) => (
              <div
                key={i}
                className={`h-4 w-[14px] rounded-[6px] transition-colors duration-300 ${i < filledBars ? 'bg-brand' : 'bg-[#E5E1DC] dark:bg-white/20'}`}
              />
            ))}
          </div>
        </div>

        {/* Notes Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-sm font-medium text-black dark:text-white">
            Ghi chú
            {filter !== 'all' && (
              <span className="text-xs text-brand ml-1">({filterLabels[filter]})</span>
            )}
          </h3>
          <div className="flex items-center gap-[15px]">
            {/* Filter button */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="hover:opacity-70 transition-opacity"
              >
                <svg width="23" height="23" viewBox="0 0 23 23" fill="none">
                  <path
                    d="M2.875 6.70833H20.125M5.75 11.5H17.25M8.625 16.2917H14.375"
                    stroke="currentColor"
                    className={filter !== 'all' ? 'text-brand' : 'text-black/40 dark:text-white/50'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 min-w-[140px]">
                  {(['all', 'pending', 'completed'] as NoteFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); setShowFilterMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${filter === f ? 'text-brand font-medium' : 'text-black/70 dark:text-white/70'}`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* More menu */}
            <div className="relative" ref={notesMenuRef}>
              <button
                onClick={() => setShowNotesMenu(!showNotesMenu)}
                className="hover:opacity-70 transition-opacity"
              >
                <MoreHorizontal className="w-[22px] h-[22px] text-black/40 dark:text-white/50" />
              </button>
              {showNotesMenu && (
                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 min-w-[180px]">
                  <button
                    onClick={() => { setShowCreateModal(true); setShowNotesMenu(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo ghi chú
                  </button>
                  <button
                    onClick={handleDeleteCompleted}
                    disabled={completedNotes === 0}
                    className="w-full text-left px-3 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa đã hoàn thành
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={notes.length === 0}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-2 overflow-y-auto min-h-0 max-h-[240px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-black/20 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          {notesLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-12 h-12 rounded-full bg-[#F6F6F6] dark:bg-white/5 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-black/20 dark:text-white/20">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm text-black/40 dark:text-white/50">
                {filter !== 'all' ? 'Không có ghi chú phù hợp' : 'Chưa có ghi chú nào'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs text-brand hover:text-brand/80 font-medium transition-colors"
                >
                  Tạo ghi chú đầu tiên
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isToggling = togglingId === note.id
              const isDeleting = deletingId === note.id

              return (
                <div
                  key={note.id}
                  className={`flex items-center gap-3 py-2 group transition-opacity duration-200 ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {/* Toggle circle */}
                  <button
                    onClick={() => handleToggleComplete(note.id, note.is_completed)}
                    disabled={isToggling}
                    className="flex-shrink-0 relative"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                        note.is_completed
                          ? 'bg-green-500'
                          : 'hover:scale-105'
                      }`}
                      style={note.is_completed ? {} : { backgroundColor: note.color + '20' }}
                    >
                      {isToggling ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: note.is_completed ? 'white' : note.color }} />
                      ) : note.is_completed ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-base font-semibold" style={{ color: note.color }}>
                          {note.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Note content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate transition-all duration-200 ${
                      note.is_completed
                        ? 'line-through text-black/30 dark:text-white/30'
                        : 'text-black dark:text-white'
                    }`}>
                      {note.title}
                    </h4>
                    {note.description && (
                      <p className={`text-xs truncate mt-0.5 transition-all duration-200 ${
                        note.is_completed
                          ? 'text-black/20 dark:text-white/20'
                          : 'text-black/50 dark:text-white/50'
                      }`}>
                        {note.description}
                      </p>
                    )}
                    <p className="text-[11px] text-black/30 dark:text-white/25 mt-0.5">
                      {timeAgo(note.created_at)}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={isDeleting}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Create Note Modal */}
      {showCreateModal && user && (
        <CreateNoteModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => invalidateUserNotes()}
        />
      )}
    </>
  )
}
