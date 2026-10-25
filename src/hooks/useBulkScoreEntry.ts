import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useInvalidateQueries } from '@/lib/queries'
import {
  applyScoreChangesToCache,
  collectScoreChanges,
  isScoreDraftInput,
  saveScoreChanges,
  scoreDraftOf,
  type ScoreDraft,
  type ScoreField,
  type ScoredStudent,
} from '@/lib/bulk-score-entry'
import { parseScoreInput } from '@/lib/score-summary'

/**
 * Trạng thái "Nhập điểm" cho cả danh sách: bật một lần là mọi dòng hiện ô điểm,
 * bấm Lưu một lần thì gửi toàn bộ em có thay đổi rồi cập nhật bảng ngay.
 */
export function useBulkScoreEntry(students: readonly ScoredStudent[]) {
  const queryClient = useQueryClient()
  const { invalidateStudentData } = useInvalidateQueries()
  const [isBulkEditing, setIsBulkEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({})
  const [isSaving, setIsSaving] = useState(false)

  const { changes, invalidIds } = useMemo(() => collectScoreChanges(students, drafts), [students, drafts])
  const changedIds = useMemo(() => new Set(changes.map((c) => c.id)), [changes])
  const isDirty = changes.length > 0 || invalidIds.length > 0

  // Nhắc trước khi rời trang khi còn điểm chưa lưu
  useEffect(() => {
    if (!isBulkEditing || !isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isBulkEditing, isDirty])

  const startBulkEdit = () => {
    setDrafts({})
    setIsBulkEditing(true)
  }

  const cancelBulkEdit = () => {
    if (isDirty && !window.confirm('Huỷ nhập điểm? Các điểm chưa lưu sẽ mất.')) return
    setDrafts({})
    setIsBulkEditing(false)
  }

  const draftFor = (student: ScoredStudent): ScoreDraft => drafts[student.id] ?? scoreDraftOf(student)

  const setDraft = (student: ScoredStudent, field: ScoreField, value: string) => {
    if (!isScoreDraftInput(value)) return
    setDrafts((prev) => ({
      ...prev,
      [student.id]: { ...(prev[student.id] ?? scoreDraftOf(student)), [field]: value },
    }))
  }

  const isInvalidCell = (student: ScoredStudent, field: ScoreField) =>
    parseScoreInput(draftFor(student)[field].replace(',', '.')) === undefined

  const saveAll = async () => {
    if (invalidIds.length > 0) {
      alert(`Điểm phải từ 0 đến 10. Còn ${invalidIds.length} em nhập sai (ô viền đỏ).`)
      return
    }
    if (changes.length === 0) {
      setDrafts({})
      setIsBulkEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const { saved, failed } = await saveScoreChanges(supabase, changes)
      applyScoreChangesToCache(queryClient, saved)
      // Tải lại nền để đồng bộ với DB; bảng đã hiện điểm mới từ cache
      void invalidateStudentData()

      if (failed.length > 0) {
        console.error('Error saving scores:', failed)
        alert(`Đã lưu ${saved.length} em. Không lưu được ${failed.length} em: ${failed[0].message}`)
        // Giữ lại phần chưa lưu để người dùng thử lại
        const failedIds = new Set(failed.map((f) => f.id))
        setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => failedIds.has(id))))
      } else {
        setDrafts({})
        setIsBulkEditing(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return {
    isBulkEditing,
    isSaving,
    changedCount: changes.length,
    changedIds,
    startBulkEdit,
    cancelBulkEdit,
    saveAll,
    draftFor,
    setDraft,
    isInvalidCell,
  }
}

/** Enter / mũi tên lên-xuống: chuyển sang ô cùng cột của em kế tiếp để nhập nhanh. */
export function moveScoreFocus(e: KeyboardEvent<HTMLInputElement>, field: ScoreField) {
  const step = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
  if (step === 0) return
  e.preventDefault()
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-score-field="${field}"]`))
  const next = inputs[inputs.indexOf(e.currentTarget) + step]
  next?.focus()
  next?.select()
}
