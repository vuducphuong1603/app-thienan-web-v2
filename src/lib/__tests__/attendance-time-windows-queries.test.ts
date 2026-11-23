import { describe, it, expect, vi, beforeEach } from 'vitest'

type Result = { data: unknown; error: { message: string } | null }

// Supabase giả: mọi bước trong chuỗi trả về chính nó, `await` ra kết quả đã đặt trước.
const state = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: { message: string } | null },
  calls: [] as Array<[string, unknown[]]>,
}))

vi.mock('../supabase', () => {
  const chain: Record<string, unknown> = {}
  for (const m of ['from', 'select', 'insert', 'update', 'delete', 'eq']) {
    chain[m] = (...args: unknown[]) => {
      state.calls.push([m, args])
      return chain
    }
  }
  chain.then = (resolve: (r: Result) => unknown) => resolve(state.result)
  return { supabase: chain, BRANCHES: [] }
})
vi.mock('../auth-context', () => ({ useAuth: () => ({ scope: null }) }))

import {
  createAttendanceTimeWindow,
  updateAttendanceTimeWindow,
  deleteAttendanceTimeWindow,
  setAttendanceLate,
  queryKeys,
} from '../queries'

const V = { start_time: '06:45:00', end_time: '07:15:00', label: null }
const ROW = { id: 'w1', session_type: 'cn', ...V }

beforeEach(() => {
  state.calls = []
  state.result = { data: null, error: null }
})

describe('queryKeys.attendanceTimeWindows', () => {
  it('khoá ổn định', () => {
    expect(queryKeys.attendanceTimeWindows).toEqual(['attendance-time-windows'])
  })
})

describe('createAttendanceTimeWindow', () => {
  it('trả về dòng vừa tạo', async () => {
    state.result = { data: [ROW], error: null }
    await expect(createAttendanceTimeWindow('cn', V)).resolves.toEqual(ROW)
    expect(state.calls[0]).toEqual(['from', ['attendance_time_windows']])
    expect(state.calls[1][0]).toBe('insert')
    expect(state.calls[1][1][0]).toEqual({ session_type: 'cn', ...V })
  })

  it('ném lỗi của Supabase (vd RLS, trùng khung)', async () => {
    state.result = { data: null, error: { message: 'new row violates row-level security policy' } }
    await expect(createAttendanceTimeWindow('cn', V)).rejects.toThrow('row-level security')
  })

  it('không có dòng trả về → ném lỗi', async () => {
    state.result = { data: [], error: null }
    await expect(createAttendanceTimeWindow('cn', V)).rejects.toThrow()
  })
})

describe('updateAttendanceTimeWindow', () => {
  it('trả về dòng sau khi sửa, lọc theo id', async () => {
    state.result = { data: [ROW], error: null }
    await expect(updateAttendanceTimeWindow('w1', V)).resolves.toEqual(ROW)
    expect(state.calls).toContainEqual(['eq', ['id', 'w1']])
  })

  it('0 dòng bị ảnh hưởng (không phải admin) → ném lỗi', async () => {
    state.result = { data: [], error: null }
    await expect(updateAttendanceTimeWindow('w1', V)).rejects.toThrow()
  })

  it('ném lỗi của Supabase', async () => {
    state.result = { data: null, error: { message: 'boom' } }
    await expect(updateAttendanceTimeWindow('w1', V)).rejects.toThrow('boom')
  })
})

describe('deleteAttendanceTimeWindow', () => {
  it('xoá thành công khi có dòng bị xoá', async () => {
    state.result = { data: [{ id: 'w1' }], error: null }
    await expect(deleteAttendanceTimeWindow('w1')).resolves.toBeUndefined()
    expect(state.calls).toContainEqual(['eq', ['id', 'w1']])
  })

  it('0 dòng bị xoá (không phải admin) → ném lỗi', async () => {
    state.result = { data: [], error: null }
    await expect(deleteAttendanceTimeWindow('w1')).rejects.toThrow()
  })

  it('ném lỗi của Supabase', async () => {
    state.result = { data: null, error: { message: 'boom' } }
    await expect(deleteAttendanceTimeWindow('w1')).rejects.toThrow('boom')
  })
})

describe('setAttendanceLate', () => {
  it('chỉ gửi is_late (không gửi late_edited_*) và trả về giá trị DB lưu', async () => {
    state.result = { data: [{ is_late: true }], error: null }
    await expect(setAttendanceLate('r1', true)).resolves.toBe(true)
    const update = state.calls.find(c => c[0] === 'update')!
    expect(update[1][0]).toEqual({ is_late: true })
    expect(state.calls).toContainEqual(['eq', ['id', 'r1']])
  })

  it('trả về giá trị DB, không phải giá trị client gửi', async () => {
    state.result = { data: [{ is_late: false }], error: null }
    await expect(setAttendanceLate('r1', true)).resolves.toBe(false)
  })

  it('DB trả null → null', async () => {
    state.result = { data: [{ is_late: null }], error: null }
    await expect(setAttendanceLate('r1', false)).resolves.toBeNull()
  })

  it('0 dòng → ném lỗi', async () => {
    state.result = { data: [], error: null }
    await expect(setAttendanceLate('r1', true)).rejects.toThrow()
  })

  it('ném lỗi của Supabase', async () => {
    state.result = { data: null, error: { message: 'boom' } }
    await expect(setAttendanceLate('r1', true)).rejects.toThrow('boom')
  })
})
