'use client'

import { moveScoreFocus } from '@/hooks/useBulkScoreEntry'
import type { ScoreField } from '@/lib/bulk-score-entry'

const AwardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M15.477 12.89L17 22L12 19L7 22L8.523 12.89" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

interface BulkScoreActionsProps {
  isBulkEditing: boolean
  isSaving: boolean
  changedCount: number
  onStart: () => void
  onSave: () => void
  onCancel: () => void
}

/** Nút "Nhập điểm" trên thanh công cụ; khi đang nhập thì thành Lưu / Huỷ. */
export function BulkScoreActions({ isBulkEditing, isSaving, changedCount, onStart, onSave, onCancel }: BulkScoreActionsProps) {
  if (!isBulkEditing) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="flex items-center gap-2 h-[38px] px-4 bg-white dark:bg-white/10 border border-brand rounded-full text-sm font-medium text-brand hover:bg-brand/5 transition-colors"
      >
        <AwardIcon />
        Nhập điểm
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 h-[38px] px-4 bg-brand rounded-full text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
      >
        {isSaving && <Spinner />}
        {isSaving ? 'Đang lưu...' : `Lưu điểm${changedCount > 0 ? ` (${changedCount} em)` : ''}`}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="h-[38px] px-4 bg-[#FEE2E2] rounded-full text-sm font-medium text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        Huỷ
      </button>
    </div>
  )
}

/** Thanh Lưu nổi ở cuối màn hình để không phải cuộn lên đầu bảng sau khi nhập xong. */
export function BulkScoreFloatingBar(props: Omit<BulkScoreActionsProps, 'onStart'>) {
  if (!props.isBulkEditing) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-[#E5E1DC] dark:border-white/10 rounded-full shadow-lg">
      <span className="text-sm text-[#8B8685] whitespace-nowrap">
        {props.changedCount > 0 ? `${props.changedCount} em đã sửa điểm` : 'Đang nhập điểm'}
      </span>
      <BulkScoreActions {...props} onStart={() => {}} />
    </div>
  )
}

interface ScoreInputProps {
  field: ScoreField
  value: string
  invalid: boolean
  onChange: (value: string) => void
}

export function ScoreInput({ field, value, invalid, onChange }: ScoreInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      data-score-field={field}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => moveScoreFocus(e, field)}
      onFocus={(e) => e.target.select()}
      className={`w-11 h-7 text-center text-sm text-black border rounded-md bg-white focus:outline-none ${invalid ? 'border-red-500 focus:border-red-500' : 'border-[#E5E1DC] focus:border-brand'}`}
    />
  )
}
