import type { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseScoreInput, round2, scoreSummary } from './score-summary'

// Nhập điểm hàng loạt: mở ô điểm cho cả danh sách, người dùng điền rồi bấm Lưu
// một lần. Chỉ những em có điểm thay đổi mới được gửi lên DB.

export const SCORE_FIELDS = ['score_45_hk1', 'score_exam_hk1', 'score_45_hk2', 'score_exam_hk2'] as const
export type ScoreField = (typeof SCORE_FIELDS)[number]
export type ScoreDraft = Record<ScoreField, string>
export type ScoreValues = Record<ScoreField, number | null>

export interface ScoredStudent {
  id: string
  score_45_hk1?: number | null
  score_exam_hk1?: number | null
  score_45_hk2?: number | null
  score_exam_hk2?: number | null
  avg_catechism?: number | null
  avg_attendance?: number | null
  total_avg?: number | null
}

export interface ScoreChange {
  id: string
  scores: ScoreValues
}

export function scoreDraftOf(student: ScoredStudent): ScoreDraft {
  return {
    score_45_hk1: student.score_45_hk1?.toString() ?? '',
    score_exam_hk1: student.score_exam_hk1?.toString() ?? '',
    score_45_hk2: student.score_45_hk2?.toString() ?? '',
    score_exam_hk2: student.score_exam_hk2?.toString() ?? '',
  }
}

/** Ô điểm chỉ nhận số; cho phép gõ dấu phẩy thập phân như thói quen người Việt. */
export function isScoreDraftInput(value: string): boolean {
  return value === '' || /^\d*[.,]?\d*$/.test(value)
}

function parseDraftValue(value: string): number | null | undefined {
  return parseScoreInput(value.replace(',', '.'))
}

export function collectScoreChanges(
  students: readonly ScoredStudent[],
  drafts: Readonly<Record<string, ScoreDraft>>,
): { changes: ScoreChange[]; invalidIds: string[] } {
  const changes: ScoreChange[] = []
  const invalidIds: string[] = []

  students.forEach((student) => {
    const draft = drafts[student.id]
    if (!draft) return

    const scores = {} as ScoreValues
    let valid = true
    let changed = false
    SCORE_FIELDS.forEach((field) => {
      const value = parseDraftValue(draft[field])
      if (value === undefined) {
        valid = false
        return
      }
      scores[field] = value
      if (value !== (student[field] ?? null)) changed = true
    })

    if (!valid) invalidIds.push(student.id)
    else if (changed) changes.push({ id: student.id, scores })
  })

  return { changes, invalidIds }
}

/** Gắn điểm mới vào danh sách và tính lại TB giáo lý / Tổng TB như queryFn. */
export function applyScoreChanges<T extends ScoredStudent>(students: readonly T[], changes: readonly ScoreChange[]): T[] {
  const byId = new Map(changes.map((change) => [change.id, change.scores]))
  return students.map((student) => {
    const scores = byId.get(student.id)
    if (!scores) return student
    const tbNam = scoreSummary({ ...scores, t5: null, cn: null }).tbNam
    return {
      ...student,
      ...scores,
      avg_catechism: tbNam,
      total_avg: tbNam === null ? null : round2(tbNam * 0.6 + (student.avg_attendance ?? 0) * 0.4),
    }
  })
}

/** Cập nhật ngay cache ['students', ...] để bảng hiện điểm vừa lưu, không phải chờ tải lại cả danh sách. */
export function applyScoreChangesToCache(queryClient: QueryClient, changes: readonly ScoreChange[]) {
  queryClient.setQueriesData<{ students: ScoredStudent[] }>({ queryKey: ['students'] }, (old) =>
    old && Array.isArray(old.students) ? { ...old, students: applyScoreChanges(old.students, changes) } : old,
  )
}

const SAVE_CONCURRENCY = 8

export async function saveScoreChanges(
  client: Pick<SupabaseClient, 'from'>,
  changes: readonly ScoreChange[],
): Promise<{ saved: ScoreChange[]; failed: { id: string; message: string }[] }> {
  const saved: ScoreChange[] = []
  const failed: { id: string; message: string }[] = []

  for (let i = 0; i < changes.length; i += SAVE_CONCURRENCY) {
    const batch = changes.slice(i, i + SAVE_CONCURRENCY)
    await Promise.all(
      batch.map(async (change) => {
        try {
          const { data, error } = await client
            .from('thieu_nhi')
            .update(change.scores)
            .eq('id', change.id)
            .select('id')
          if (error) failed.push({ id: change.id, message: error.message })
          // RLS chặn thì Supabase không báo lỗi mà chỉ trả về 0 dòng
          else if (!data || data.length === 0) failed.push({ id: change.id, message: 'Không có quyền cập nhật' })
          else saved.push(change)
        } catch (err) {
          failed.push({ id: change.id, message: err instanceof Error ? err.message : String(err) })
        }
      }),
    )
  }

  return { saved, failed }
}
