import { describe, it, expect, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  scoreDraftOf,
  isScoreDraftInput,
  collectScoreChanges,
  applyScoreChanges,
  applyScoreChangesToCache,
  saveScoreChanges,
} from '../bulk-score-entry'

const student = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  score_45_hk1: undefined as number | undefined,
  score_exam_hk1: undefined as number | undefined,
  score_45_hk2: undefined as number | undefined,
  score_exam_hk2: undefined as number | undefined,
  avg_catechism: null as number | null,
  avg_attendance: 5,
  total_avg: null as number | null,
  ...extra,
})

describe('scoreDraftOf', () => {
  it('chuyển điểm hiện có thành chuỗi, ô trống khi chưa có điểm', () => {
    expect(scoreDraftOf(student('a', { score_45_hk1: 9, score_exam_hk1: 7.5 }))).toEqual({
      score_45_hk1: '9',
      score_exam_hk1: '7.5',
      score_45_hk2: '',
      score_exam_hk2: '',
    })
  })
})

describe('isScoreDraftInput', () => {
  it('chỉ cho gõ số và dấu thập phân (chấm hoặc phẩy)', () => {
    expect(isScoreDraftInput('')).toBe(true)
    expect(isScoreDraftInput('8.5')).toBe(true)
    expect(isScoreDraftInput('8,5')).toBe(true)
    expect(isScoreDraftInput('abc')).toBe(false)
    expect(isScoreDraftInput('8.5.1')).toBe(false)
  })
})

describe('collectScoreChanges', () => {
  it('chỉ lấy những em có điểm thay đổi', () => {
    const students = [student('a', { score_45_hk1: 9 }), student('b'), student('c')]
    const drafts = {
      a: { score_45_hk1: '9', score_exam_hk1: '', score_45_hk2: '', score_exam_hk2: '' },
      b: { score_45_hk1: '7', score_exam_hk1: '8,5', score_45_hk2: '', score_exam_hk2: '' },
    }
    const { changes, invalidIds } = collectScoreChanges(students, drafts)
    expect(invalidIds).toEqual([])
    expect(changes).toEqual([
      { id: 'b', scores: { score_45_hk1: 7, score_exam_hk1: 8.5, score_45_hk2: null, score_exam_hk2: null } },
    ])
  })

  it('xoá điểm (để trống) cũng là thay đổi', () => {
    const students = [student('a', { score_45_hk1: 9 })]
    const drafts = { a: { score_45_hk1: '', score_exam_hk1: '', score_45_hk2: '', score_exam_hk2: '' } }
    expect(collectScoreChanges(students, drafts).changes).toHaveLength(1)
  })

  it('báo em có điểm ngoài 0–10', () => {
    const students = [student('a'), student('b')]
    const drafts = {
      a: { score_45_hk1: '11', score_exam_hk1: '', score_45_hk2: '', score_exam_hk2: '' },
      b: { score_45_hk1: '10', score_exam_hk1: '', score_45_hk2: '', score_exam_hk2: '' },
    }
    const { changes, invalidIds } = collectScoreChanges(students, drafts)
    expect(invalidIds).toEqual(['a'])
    expect(changes.map((c) => c.id)).toEqual(['b'])
  })
})

describe('applyScoreChanges', () => {
  it('cập nhật điểm và tính lại TB giáo lý, Tổng TB ngay lập tức', () => {
    const students = [student('a'), student('b')]
    const next = applyScoreChanges(students, [
      { id: 'a', scores: { score_45_hk1: 9, score_exam_hk1: 9, score_45_hk2: 6, score_exam_hk2: 6 } },
    ])
    // TB HK1 = 9, TB HK2 = 6, TB năm = (9 + 6*2)/3 = 7
    expect(next[0]).toMatchObject({ score_45_hk1: 9, score_exam_hk2: 6, avg_catechism: 7, total_avg: 6.2 })
    expect(next[1]).toBe(students[1])
  })

  it('điểm trống thì TB để trống', () => {
    const next = applyScoreChanges([student('a', { avg_catechism: 7, total_avg: 6 })], [
      { id: 'a', scores: { score_45_hk1: 9, score_exam_hk1: null, score_45_hk2: null, score_exam_hk2: null } },
    ])
    expect(next[0]).toMatchObject({ avg_catechism: null, total_avg: null })
  })
})

describe('applyScoreChangesToCache', () => {
  it('cập nhật mọi cache danh sách thiếu nhi để bảng hiện điểm mới không cần tải lại', () => {
    const client = new QueryClient()
    const key = ['students', 'admin']
    client.setQueryData(key, { students: [student('a')], classes: [] })
    applyScoreChangesToCache(client, [
      { id: 'a', scores: { score_45_hk1: 8, score_exam_hk1: 8, score_45_hk2: 8, score_exam_hk2: 8 } },
    ])
    const data = client.getQueryData<{ students: ReturnType<typeof student>[] }>(key)
    expect(data?.students[0]).toMatchObject({ score_45_hk1: 8, avg_catechism: 8 })
  })
})

describe('saveScoreChanges', () => {
  const fakeClient = (handler: (id: string) => { data: unknown[] | null; error: { message: string } | null }) => {
    const updated: Array<{ id: string; values: unknown }> = []
    return {
      updated,
      client: {
        from: vi.fn(() => ({
          update: (values: unknown) => ({
            eq: (_col: string, id: string) => ({
              select: async () => {
                updated.push({ id, values })
                return handler(id)
              },
            }),
          }),
        })),
      },
    }
  }

  it('lưu tất cả và trả về danh sách lưu được / lỗi', async () => {
    const { client, updated } = fakeClient((id) =>
      id === 'b' ? { data: null, error: { message: 'boom' } } : { data: [{ id }], error: null },
    )
    const scores = { score_45_hk1: 8, score_exam_hk1: null, score_45_hk2: null, score_exam_hk2: null }
    const result = await saveScoreChanges(client as never, [
      { id: 'a', scores },
      { id: 'b', scores },
    ])
    expect(updated.map((u) => u.id).sort()).toEqual(['a', 'b'])
    expect(result.saved.map((c) => c.id)).toEqual(['a'])
    expect(result.failed).toEqual([{ id: 'b', message: 'boom' }])
  })

  it('không có dòng nào được cập nhật (bị chặn quyền) thì coi là lỗi', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }))
    const scores = { score_45_hk1: 8, score_exam_hk1: null, score_45_hk2: null, score_exam_hk2: null }
    const result = await saveScoreChanges(client as never, [{ id: 'a', scores }])
    expect(result.saved).toEqual([])
    expect(result.failed[0].id).toBe('a')
  })
})
