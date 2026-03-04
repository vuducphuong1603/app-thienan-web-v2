'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, UserNote } from '@/lib/supabase'
import { useFilteredUserNotes, useInvalidateQueries } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { ArrowLeft, Plus, Heart, Calendar, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────
type ViewMode = 'day' | 'week' | 'month'
type NoteFilter = 'all' | 'pending' | 'completed' | 'favorite'

// ─── Date Helpers ────────────────────────────────────────
function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatVietnameseDate(date: Date): string {
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const dayName = dayNames[date.getDay()]
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dayName}, ${dd}/${mm}/${yyyy}`
}

function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = formatShortDate(start)
  const endDD = String(end.getDate()).padStart(2, '0')
  const endMM = String(end.getMonth() + 1).padStart(2, '0')
  const endYYYY = end.getFullYear()
  return `${startStr} - ${endDD}/${endMM}/${endYYYY}`
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday, end: sunday }
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start, end }
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false
  return dateStr === toLocalDateString(new Date())
}

function formatNoteDate(dateStr?: string): string {
  if (!dateStr) return ''
  if (isToday(dateStr)) return 'Hôm nay'
  const date = new Date(dateStr + 'T00:00:00')
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function formatNoteTime(timeStr?: string): string {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours, 10)
  if (h < 12) return `${h}${minutes !== '00' ? `:${minutes}` : ''} giờ sáng`
  if (h === 12) return `12${minutes !== '00' ? `:${minutes}` : ''} giờ trưa`
  return `${h - 12}${minutes !== '00' ? `:${minutes}` : ''} giờ chiều`
}

// ─── Reminder Options ────────────────────────────────────
const REMINDER_OPTIONS = [
  { value: '30_min', label: '30 phút' },
  { value: '2_hours', label: '2 tiếng' },
  { value: '1_day', label: '1 ngày' },
  { value: 'custom', label: 'Tự đặt giờ' },
]

// ─── Create Note Modal ───────────────────────────────────
function CreateNoteModal({ userId, defaultDate, onClose, onCreated }: {
  userId: string
  defaultDate: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [noteDate, setNoteDate] = useState(defaultDate)
  const [dateEnd, setDateEnd] = useState(defaultDate)
  const [noteTime, setNoteTime] = useState('08:00')
  const [timeEnd, setTimeEnd] = useState('16:00')
  const [reminder, setReminder] = useState('2_hours')
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDateInputs, setShowDateInputs] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  function formatDisplayTime(timeStr: string): string {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h, 10)
    const suffix = hour < 12 ? 'AM' : 'PM'
    return `${hour}:${m} ${suffix}`
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('user_notes').insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        note_date: noteDate || toLocalDateString(new Date()),
        date_end: dateEnd || null,
        note_time: noteTime || null,
        time_end: timeEnd || null,
        reminder: reminder || null,
        link: link.trim() || null,
        color: '#FA865E',
        is_favorite: false,
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-5 flex flex-col gap-2.5 items-center">

          {/* Plus Icon Header */}
          <div className="flex items-center justify-center w-[85px] h-[85px]">
            <div className="bg-gradient-to-b from-[#FA865E29] to-transparent border border-[#FFF0F3] rounded-full p-4">
              <div className="border border-[#FA865E66] rounded-full p-3.5 shadow-[0_2px_4px_rgba(223,28,65,0.04)]">
                <Plus className="w-[25px] h-[25px] text-[#FA865E]" />
              </div>
            </div>
          </div>

          {/* Title + Subtitle */}
          <div className="text-center w-full">
            <h3 className="text-[22px] font-semibold text-black dark:text-white">Thêm ghi chú</h3>
            <p className="text-xs text-black/40 dark:text-white/40">Thêm ghi chú về công việc, kế hoạch, sự kiện</p>
          </div>

          {/* Name Input Card */}
          <div className="w-full border border-[#E5E1DC] dark:border-white/15 rounded-2xl overflow-hidden">
            {/* Header - Name input */}
            <div className="border-b border-[#E5E1DC] dark:border-white/15 px-4 h-[38px] flex items-center">
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên ghi chú"
                className="w-full text-sm font-light text-black dark:text-white placeholder:text-[#8A8C90] bg-transparent outline-none"
              />
            </div>
            {/* Body - Date & Time display */}
            <div className="px-4 py-3 flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setShowDateInputs(!showDateInputs)}
                className="flex items-center gap-1 text-xs text-black dark:text-white"
              >
                <svg className="w-4 h-4 text-[#FA865E]" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.33a6.67 6.67 0 100 13.34A6.67 6.67 0 008 1.33zm0 12A5.34 5.34 0 1113.33 8 5.34 5.34 0 018 13.33zm.33-8.66H7.33v4l3.5 2.1.5-.82-3-1.78V4.67z" fill="currentColor"/>
                </svg>
                <span>Ngày: {formatDisplayDate(noteDate)} - {formatDisplayDate(dateEnd)}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDateInputs(!showDateInputs)}
                className="flex items-center gap-1 text-xs text-black dark:text-white ml-2"
              >
                <svg className="w-4 h-4 text-[#FA865E]" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.33a6.67 6.67 0 100 13.34A6.67 6.67 0 008 1.33zm0 12A5.34 5.34 0 1113.33 8 5.34 5.34 0 018 13.33zm.33-8.66H7.33v4l3.5 2.1.5-.82-3-1.78V4.67z" fill="currentColor"/>
                </svg>
                <span>Giờ: {formatDisplayTime(noteTime)} - {formatDisplayTime(timeEnd)}</span>
              </button>
            </div>
          </div>

          {/* Expandable Date/Time Inputs */}
          {showDateInputs && (
            <div className="w-full grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-xs text-[#666D80] mb-1">Ngày bắt đầu</label>
                <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F6F6] dark:bg-white/5 border border-[#E5E1DC] dark:border-white/15 rounded-xl text-xs text-black dark:text-white outline-none focus:border-[#FA865E]/50" />
              </div>
              <div>
                <label className="block text-xs text-[#666D80] mb-1">Ngày kết thúc</label>
                <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F6F6] dark:bg-white/5 border border-[#E5E1DC] dark:border-white/15 rounded-xl text-xs text-black dark:text-white outline-none focus:border-[#FA865E]/50" />
              </div>
              <div>
                <label className="block text-xs text-[#666D80] mb-1">Giờ bắt đầu</label>
                <input type="time" value={noteTime} onChange={(e) => setNoteTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F6F6] dark:bg-white/5 border border-[#E5E1DC] dark:border-white/15 rounded-xl text-xs text-black dark:text-white outline-none focus:border-[#FA865E]/50" />
              </div>
              <div>
                <label className="block text-xs text-[#666D80] mb-1">Giờ kết thúc</label>
                <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F6F6] dark:bg-white/5 border border-[#E5E1DC] dark:border-white/15 rounded-xl text-xs text-black dark:text-white outline-none focus:border-[#FA865E]/50" />
              </div>
            </div>
          )}

          {/* Reminder Tags */}
          <div className="w-full">
            <p className="text-xs mb-1.5">
              <span className="text-[#666D80]">Nhắc hẹn trước </span>
              <span className="text-[#DF1C41]">*</span>
            </p>
            <div className="flex gap-1.5">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setReminder(opt.value)}
                  className={`h-8 flex-1 rounded-[50px] text-xs transition-colors shadow-[0_0_14px_rgba(214,161,255,0.04)] ${
                    reminder === opt.value
                      ? 'bg-[#FA865E] text-white'
                      : 'bg-[#E5E1DC] dark:bg-white/15 text-black dark:text-white hover:bg-[#d9d4ce] dark:hover:bg-white/25'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="w-full">
            <label className="block text-xs text-[#666D80] mb-1.5">Mô tả</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả..."
              className="w-full h-[38px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#FA865E]/20 transition-all"
            />
          </div>

          {/* Link */}
          <div className="w-full">
            <label className="block text-xs text-[#666D80] mb-1.5">Link đính kèm</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full h-[38px] px-4 bg-[#F6F6F6] dark:bg-white/5 rounded-xl text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#FA865E]/20 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="w-full flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 h-[38px] bg-[#F6F6F6] dark:bg-white/10 rounded-full text-sm font-bold text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || saving}
              className="flex-1 h-[38px] bg-[#FA865E] rounded-full text-sm font-bold text-white hover:bg-[#e8764f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_1px_2px_rgba(13,13,18,0.06)] flex items-center justify-center"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Tạo kế hoạch'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Note Card Component ─────────────────────────────────
function NoteCard({ note, onToggleFavorite, onToggleComplete, onCancel }: {
  note: UserNote
  onToggleFavorite: (id: string, current: boolean) => void
  onToggleComplete: (id: string) => void
  onCancel: (id: string) => void
}) {
  return (
    <div className="relative bg-white dark:bg-white/10 rounded-[26px] border border-white/60 dark:border-white/10 px-4 pt-[17px] pb-5 flex flex-col gap-2.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow">
      {/* Top row: label + favorite */}
      <div className="flex items-start justify-between">
        <span className="px-3 py-1.5 bg-[#FA865E]/20 border border-[#FA865E] backdrop-blur-[11.5px] rounded-[30px] text-xs text-[#666D80] dark:text-white/60">
          Ghi chú
        </span>
        <button
          onClick={() => onToggleFavorite(note.id, note.is_favorite)}
          className="backdrop-blur-[12px] bg-white/10 dark:bg-white/10 rounded-full p-[9px] hover:bg-white/30 transition-colors"
        >
          <Heart
            className={`w-6 h-6 transition-colors ${
              note.is_favorite
                ? 'fill-[#FA865E] text-[#FA865E]'
                : 'text-[#FA865E]/50 hover:text-[#FA865E]'
            }`}
          />
        </button>
      </div>

      {/* Title + Date badge row */}
      <div className="flex items-start justify-between gap-2">
        <h4 className={`text-sm font-medium leading-normal flex-1 ${
          note.is_completed
            ? 'line-through text-black/30 dark:text-white/30'
            : 'text-black dark:text-white'
        }`}>
          {note.title}
        </h4>
        {note.note_date && (
          <span className="shrink-0 px-3 py-1.5 bg-[#86D4FF] rounded-[30px] text-[10px] text-white whitespace-nowrap">
            {formatNoteDate(note.note_date)}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4 flex-wrap">
        {note.class_name && (
          <span className="text-xs text-black dark:text-white">
            {note.class_name.replace(/(\d)/g, ' ')}
            <span className="text-black/40 dark:text-white/40">
              {note.class_name.match(/\d.*/)?.[0] || ''}
            </span>
          </span>
        )}
        {note.note_time && (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30" />
            <span className="text-black dark:text-white">
              Thời gian <span className="text-black/40 dark:text-white/40">{formatNoteTime(note.note_time)}</span>
            </span>
          </span>
        )}
        {note.location && (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30" />
            <span className="text-black dark:text-white">
              Phòng <span className="text-black/40 dark:text-white/40">{note.location.replace(/^Phòng\s*/i, '')}</span>
            </span>
          </span>
        )}
      </div>

      {/* Description */}
      {note.description && (
        <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed line-clamp-2">
          {note.description}
        </p>
      )}

      {/* Link */}
      {note.link && (
        <a
          href={note.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#FA865E] hover:text-[#e8764f] transition-colors truncate"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M6.67 8.67a3.33 3.33 0 005.02.36l2-2a3.33 3.33 0 00-4.72-4.72l-1.14 1.14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.33 7.33a3.33 3.33 0 00-5.02-.36l-2 2a3.33 3.33 0 004.72 4.72l1.13-1.14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="truncate">{note.link}</span>
        </a>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-auto pt-1">
        <button
          onClick={() => onCancel(note.id)}
          className="h-8 w-[112px] bg-[#E5E1DC] dark:bg-white/15 rounded-[50px] text-xs text-black dark:text-white hover:bg-[#d9d4ce] dark:hover:bg-white/25 transition-colors shadow-[0_0_14px_rgba(214,161,255,0.04)]"
        >
          Hủy
        </button>
        <button
          onClick={() => onToggleComplete(note.id)}
          className={`h-8 w-[108px] rounded-[50px] text-xs transition-colors shadow-[0_0_14px_rgba(214,161,255,0.04)] ${
            note.is_completed
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-[#FA865E] text-white hover:bg-[#e8764f]'
          }`}
        >
          {note.is_completed ? 'Đã xong' : 'Hoàn thành'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function NotesPage() {
  const { user, loading, logout } = useAuth()
  const { invalidateUserNotes } = useInvalidateQueries()

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterMenu])

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { start: new Date(referenceDate), end: new Date(referenceDate) }
      case 'week':
        return getWeekRange(referenceDate)
      case 'month':
        return getMonthRange(referenceDate)
    }
  }, [viewMode, referenceDate])

  const startDateStr = toLocalDateString(dateRange.start)
  const endDateStr = toLocalDateString(dateRange.end)

  // Fetch notes
  const { data: notes = [], isLoading: notesLoading } = useFilteredUserNotes(
    user?.id,
    startDateStr,
    endDateStr
  )

  // Apply local filter
  const filteredNotes = useMemo(() => {
    switch (filter) {
      case 'pending': return notes.filter(n => !n.is_completed)
      case 'completed': return notes.filter(n => n.is_completed)
      case 'favorite': return notes.filter(n => n.is_favorite)
      default: return notes
    }
  }, [notes, filter])

  // Navigation
  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(referenceDate)
    switch (viewMode) {
      case 'day':
        d.setDate(d.getDate() + direction)
        break
      case 'week':
        d.setDate(d.getDate() + direction * 7)
        break
      case 'month':
        d.setMonth(d.getMonth() + direction)
        break
    }
    setReferenceDate(d)
  }

  const goToToday = () => setReferenceDate(new Date())

  // Mutations
  const handleToggleFavorite = async (noteId: string, currentState: boolean) => {
    await supabase
      .from('user_notes')
      .update({ is_favorite: !currentState, updated_at: new Date().toISOString() })
      .eq('id', noteId)
    await invalidateUserNotes()
  }

  const handleToggleComplete = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    await supabase
      .from('user_notes')
      .update({ is_completed: !note.is_completed, updated_at: new Date().toISOString() })
      .eq('id', noteId)
    await invalidateUserNotes()
  }

  const handleCancel = async (noteId: string) => {
    if (!confirm('Bạn có chắc muốn xoá ghi chú này?')) return
    await supabase.from('user_notes').delete().eq('id', noteId)
    await invalidateUserNotes()
  }

  if (!user && !loading) return null
  if (!user) return null

  const firstName = user.full_name?.split(' ').pop() || user.full_name
  const todayFormatted = formatVietnameseDate(new Date())
  const isAdmin = user.role === 'admin'
  const dashboardHref = isAdmin ? '/admin/dashboard' : '/dashboard'

  const viewModeLabels: Record<ViewMode, string> = { day: 'Ngày', week: 'Tuần', month: 'Tháng' }
  const filterLabels: Record<NoteFilter, string> = { all: 'Tất cả', pending: 'Chưa xong', completed: 'Đã xong', favorite: 'Yêu thích' }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F0] via-white to-white dark:from-[#1a1a1a] dark:via-[#111] dark:to-[#111]">
      {/* Header */}
      <DashboardHeader
        userName={firstName || 'User'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="overview"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

      {/* Main Content */}
      <main className="px-6 py-4 max-w-[1400px] mx-auto">
        {/* Back button */}
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay trở lại
        </Link>

        {/* Title */}
        <h1 className="text-[32px] font-bold text-black dark:text-white leading-tight mb-3">
          Ghi chú của tôi
        </h1>

        {/* Toolbar: date info + view controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          {/* Left: Date display */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-black/60 dark:text-white/60">{todayFormatted}</span>
            <button
              onClick={goToToday}
              className="px-4 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/15 rounded-full text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/15 transition-colors"
            >
              Hôm nay
            </button>
          </div>

          {/* Right: View mode + date range + filter */}
          <div className="flex items-center gap-3">
            {/* View mode tabs */}
            <div className="flex items-center bg-[#F5F5F5] dark:bg-white/10 rounded-full p-0.5">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                    viewMode === mode
                      ? 'bg-white dark:bg-white/20 text-black dark:text-white shadow-sm'
                      : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'
                  }`}
                >
                  {viewModeLabels[mode]}
                </button>
              ))}
            </div>

            {/* Date range display with navigation */}
            <div className="flex items-center gap-1 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/15 rounded-full px-3 py-1.5">
              <button
                onClick={() => navigateDate(-1)}
                className="w-5 h-5 flex items-center justify-center text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <Calendar className="w-4 h-4 text-black/40 dark:text-white/40 mx-1" />
              <span className="text-sm text-black/70 dark:text-white/70 font-medium min-w-[140px] text-center">
                {viewMode === 'day'
                  ? `${String(dateRange.start.getDate()).padStart(2, '0')}/${String(dateRange.start.getMonth() + 1).padStart(2, '0')}/${dateRange.start.getFullYear()}`
                  : formatDateRange(dateRange.start, dateRange.end)
                }
              </span>
              <button
                onClick={() => navigateDate(1)}
                className="w-5 h-5 flex items-center justify-center text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {/* Filter button */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-full text-sm font-medium transition-colors ${
                  filter !== 'all'
                    ? 'bg-[#FA865E]/10 border-[#FA865E]/30 text-[#FA865E]'
                    : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/15 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-10 z-50 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 min-w-[140px]">
                  {(['all', 'pending', 'completed', 'favorite'] as NoteFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); setShowFilterMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${
                        filter === f ? 'text-[#FA865E] font-medium' : 'text-black/70 dark:text-white/70'
                      }`}
                    >
                      {filterLabels[f]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Add Note Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="group bg-white/60 dark:bg-white/5 rounded-2xl p-5 border-2 border-dashed border-black/15 dark:border-white/20 hover:border-[#FA865E]/50 hover:bg-[#FA865E]/5 transition-all flex flex-col items-center justify-center gap-3 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#FA865E]/10 group-hover:bg-[#FA865E]/20 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-[#FA865E]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-black dark:text-white mb-0.5">Thêm ghi chú</p>
              <p className="text-[11px] text-black/40 dark:text-white/40">Ghi chú hoạt động của bạn</p>
            </div>
          </button>

          {/* Loading skeleton */}
          {notesLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/10 rounded-[26px] border border-white/60 dark:border-white/10 px-4 pt-[17px] pb-5 min-h-[200px] animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="w-16 h-[30px] bg-gray-200 dark:bg-white/10 rounded-[30px]" />
                <div className="w-[42px] h-[42px] bg-gray-200 dark:bg-white/10 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/10 rounded mb-4" />
              <div className="flex gap-4 mb-4">
                <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded" />
              </div>
              <div className="flex gap-1.5 mt-auto">
                <div className="h-8 w-[112px] bg-gray-200 dark:bg-white/10 rounded-[50px]" />
                <div className="h-8 w-[108px] bg-gray-200 dark:bg-white/10 rounded-[50px]" />
              </div>
            </div>
          ))}

          {/* Note cards */}
          {!notesLoading && filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onToggleFavorite={handleToggleFavorite}
              onToggleComplete={handleToggleComplete}
              onCancel={handleCancel}
            />
          ))}
        </div>

        {/* Empty state (when not loading and no notes) */}
        {!notesLoading && filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#F6F6F6] dark:bg-white/5 flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-black/20 dark:text-white/20">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="currentColor" />
              </svg>
            </div>
            <p className="text-sm text-black/40 dark:text-white/50 mb-2">
              {filter !== 'all' ? 'Không có ghi chú phù hợp với bộ lọc' : 'Chưa có ghi chú nào trong khoảng thời gian này'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm text-[#FA865E] hover:text-[#e8764f] font-medium transition-colors"
            >
              Thêm ghi chú mới
            </button>
          </div>
        )}
      </main>

      {/* Create Note Modal */}
      {showCreateModal && user && (
        <CreateNoteModal
          userId={user.id}
          defaultDate={toLocalDateString(referenceDate)}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => invalidateUserNotes()}
        />
      )}
    </div>
  )
}
