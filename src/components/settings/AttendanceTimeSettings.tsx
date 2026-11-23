'use client'

import { useId, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createAttendanceTimeWindow,
  deleteAttendanceTimeWindow,
  queryKeys,
  updateAttendanceTimeWindow,
  useAttendanceTimeWindows,
} from '@/lib/queries'
import {
  formatWindow,
  validateWindowDraft,
  windowsForSession,
  type AttendanceTimeWindow,
  type PunctualitySession,
} from '@/lib/attendance-punctuality'

const SESSIONS: { session: PunctualitySession; title: string; hint: string }[] = [
  { session: 'cn', title: 'Học giáo lý', hint: 'Các ca học giáo lý sáng Chủ nhật' },
  { session: 'cn_le', title: 'Đi lễ', hint: 'Các ca Thánh lễ Chủ nhật' },
]

const inputClass =
  'h-[38px] px-3 bg-[#f6f6f6] dark:bg-gray-700 rounded-xl text-sm text-black dark:text-white border-none focus:ring-2 focus:ring-brand/30'
const labelClass = 'text-sm font-medium text-primary-3 dark:text-gray-300'
const primaryBtn =
  'h-[38px] px-4 bg-brand rounded-full text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50'
const ghostBtn =
  'h-[34px] px-3 bg-white dark:bg-gray-800 border border-primary-4 dark:border-gray-600 rounded-full text-sm font-medium text-primary-3 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'

/** Lỗi trùng khóa duy nhất (Postgres 23505) → thông báo thân thiện; còn lại giữ nguyên thông điệp. */
function describeSaveError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code
  const message = e instanceof Error ? e.message : ''
  if (code === '23505' || /duplicate key|unique constraint|23505/i.test(message)) {
    return 'Khung giờ này đã tồn tại'
  }
  return message || 'Không thể lưu khung giờ. Vui lòng thử lại.'
}

/** Lấy 'HH:MM' từ 'HH:MM:SS' để đổ vào <input type="time">. */
function toInputTime(t: string): string {
  return t ? t.slice(0, 5) : ''
}

interface SectionProps {
  session: PunctualitySession
  title: string
  hint: string
  windows: AttendanceTimeWindow[] // toàn bộ khung giờ (mọi buổi) — dùng để kiểm tra trùng
  isLoading: boolean
  onChanged: () => Promise<void>
}

function SessionSection({ session, title, hint, windows, isLoading, onChanged }: SectionProps) {
  const uid = useId()
  const rows = windowsForSession(windows, session)

  const [addStart, setAddStart] = useState('')
  const [addEnd, setAddEnd] = useState('')
  const [addLabel, setAddLabel] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editLabel, setEditLabel] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const run = async (action: () => Promise<void>, okMessage: string): Promise<boolean> => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await action()
      await onChanged()
      setSuccess(okMessage)
      return true
    } catch (e) {
      setError(describeSaveError(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(null)
    const result = validateWindowDraft({ start: addStart, end: addEnd, label: addLabel }, windows, session)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const ok = await run(async () => {
      await createAttendanceTimeWindow(session, result.value)
    }, 'Đã thêm khung giờ')
    if (ok) {
      setAddStart('')
      setAddEnd('')
      setAddLabel('')
    }
  }

  const startEdit = (w: AttendanceTimeWindow) => {
    setEditingId(w.id)
    setEditStart(toInputTime(w.start_time))
    setEditEnd(toInputTime(w.end_time))
    setEditLabel(w.label ?? '')
    setConfirmDeleteId(null)
    setError(null)
    setSuccess(null)
  }

  const handleSaveEdit = async (id: string) => {
    setSuccess(null)
    const result = validateWindowDraft({ start: editStart, end: editEnd, label: editLabel }, windows, session, id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const ok = await run(async () => {
      await updateAttendanceTimeWindow(id, result.value)
    }, 'Đã cập nhật khung giờ')
    if (ok) setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    const ok = await run(async () => {
      await deleteAttendanceTimeWindow(id)
    }, 'Đã xóa khung giờ')
    if (ok) setConfirmDeleteId(null)
  }

  return (
    <section
      data-testid={`atw-section-${session}`}
      aria-labelledby={`${uid}-title`}
      className="border border-primary-4 dark:border-gray-700 rounded-2xl p-4 sm:p-5 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id={`${uid}-title`} className="text-base font-semibold text-black dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-primary-3 dark:text-gray-400">{hint}</p>
      </div>

      {/* Danh sách khung giờ */}
      {isLoading ? (
        <p className="text-sm text-primary-3 dark:text-gray-400">Đang tải...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-primary-3 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-700/50 rounded-xl px-3 py-3">
          Chưa cài khung giờ — buổi này chưa xét đi trễ
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((w) => {
            const isEditing = editingId === w.id
            const isConfirming = confirmDeleteId === w.id
            return (
              <li
                key={w.id}
                data-testid={`atw-row-${w.id}`}
                className="bg-[#f6f6f6] dark:bg-gray-700/50 rounded-xl px-3 py-2.5 flex flex-col gap-2"
              >
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${uid}-es-${w.id}`} className={labelClass}>
                        Từ
                      </label>
                      <input
                        id={`${uid}-es-${w.id}`}
                        data-testid={`atw-edit-start-${w.id}`}
                        type="time"
                        step={60}
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${uid}-ee-${w.id}`} className={labelClass}>
                        Đến
                      </label>
                      <input
                        id={`${uid}-ee-${w.id}`}
                        data-testid={`atw-edit-end-${w.id}`}
                        type="time"
                        step={60}
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label htmlFor={`${uid}-el-${w.id}`} className={labelClass}>
                        Tên ca (không bắt buộc)
                      </label>
                      <input
                        id={`${uid}-el-${w.id}`}
                        data-testid={`atw-edit-label-${w.id}`}
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className={inputClass}
                        placeholder="VD: Ca 1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`atw-edit-save-${w.id}`}
                        onClick={() => handleSaveEdit(w.id)}
                        disabled={busy}
                        className={primaryBtn}
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        data-testid={`atw-edit-cancel-${w.id}`}
                        onClick={() => {
                          setEditingId(null)
                          setError(null)
                        }}
                        disabled={busy}
                        className={ghostBtn}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      {w.label && (
                        <span className="text-sm font-semibold text-black dark:text-white">{w.label}</span>
                      )}
                      <span className="text-sm text-black dark:text-white tabular-nums">{formatWindow(w)}</span>
                    </div>
                    {!isConfirming && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`atw-edit-${w.id}`}
                          onClick={() => startEdit(w)}
                          disabled={busy}
                          className={ghostBtn}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          data-testid={`atw-delete-${w.id}`}
                          onClick={() => {
                            setConfirmDeleteId(w.id)
                            setEditingId(null)
                            setError(null)
                            setSuccess(null)
                          }}
                          disabled={busy}
                          className="h-[34px] px-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Xác nhận xóa ngay trong trang (không dùng window.confirm) */}
                {isConfirming && !isEditing && (
                  <div
                    role="alertdialog"
                    aria-label={`Xác nhận xóa khung giờ ${formatWindow(w)}`}
                    className="flex flex-wrap items-center justify-between gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
                  >
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Xóa khung giờ {formatWindow(w)}? Các lượt điểm danh đã xét sẽ không bị đổi.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`atw-delete-confirm-${w.id}`}
                        onClick={() => handleDelete(w.id)}
                        disabled={busy}
                        className="h-[34px] px-3 bg-red-600 rounded-full text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Xóa
                      </button>
                      <button
                        type="button"
                        data-testid={`atw-delete-cancel-${w.id}`}
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={busy}
                        className={ghostBtn}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Form thêm khung giờ */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row sm:items-end gap-2" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-as`} className={labelClass}>
            Từ
          </label>
          <input
            id={`${uid}-as`}
            data-testid={`atw-add-start-${session}`}
            type="time"
            step={60}
            value={addStart}
            onChange={(e) => setAddStart(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-ae`} className={labelClass}>
            Đến
          </label>
          <input
            id={`${uid}-ae`}
            data-testid={`atw-add-end-${session}`}
            type="time"
            step={60}
            value={addEnd}
            onChange={(e) => setAddEnd(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor={`${uid}-al`} className={labelClass}>
            Tên ca (không bắt buộc)
          </label>
          <input
            id={`${uid}-al`}
            data-testid={`atw-add-label-${session}`}
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            className={inputClass}
            placeholder="VD: Ca 1"
          />
        </div>
        <button type="submit" data-testid={`atw-add-submit-${session}`} disabled={busy} className={primaryBtn}>
          Thêm khung giờ
        </button>
      </form>

      {error && (
        <p
          role="alert"
          data-testid={`atw-error-${session}`}
          className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
      {success && !error && (
        <p
          role="status"
          data-testid={`atw-success-${session}`}
          className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2"
        >
          {success}
        </p>
      )}
    </section>
  )
}

export default function AttendanceTimeSettings() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useAttendanceTimeWindows(true)
  const windows = data ?? []

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.attendanceTimeWindows })
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-black dark:text-white">Giờ điểm danh</h2>
        <p className="text-sm text-primary-3 dark:text-gray-400">
          Cài khung giờ đúng giờ cho điểm danh Chủ nhật. Mỗi thay đổi được lưu ngay.
        </p>
      </div>

      <div className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 leading-relaxed">
        <p>
          Thiếu nhi điểm danh trong bất kỳ khung giờ nào của buổi (tính cả giờ bắt đầu và giờ kết thúc, theo phút) là{' '}
          <strong>Đúng giờ</strong>; ngoài mọi khung giờ là <strong>Trễ</strong>. Điểm danh <strong>trước</strong> giờ
          bắt đầu cũng nằm ngoài khung giờ, nên hãy đặt giờ bắt đầu đủ sớm. Buổi chưa cài khung giờ thì chưa xét đi trễ.
        </p>
        <p className="mt-1">
          Chỉ điểm danh trong ngày mới được xét tự động; điểm danh bù ngày khác để &quot;Chưa xét&quot; và có thể sửa
          tay.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          Không tải được khung giờ: {error instanceof Error ? error.message : 'lỗi không xác định'}
        </p>
      )}

      {SESSIONS.map((s) => (
        <SessionSection
          key={s.session}
          session={s.session}
          title={s.title}
          hint={s.hint}
          windows={windows}
          isLoading={isLoading}
          onChanged={refresh}
        />
      ))}
    </div>
  )
}
