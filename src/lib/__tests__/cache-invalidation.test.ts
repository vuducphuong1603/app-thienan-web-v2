import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  invalidateStudentData,
  invalidateUserData,
  STUDENT_CHANGE_KEYS,
  USER_CHANGE_KEYS,
} from '../cache-invalidation'

// Tạo cache có sẵn dữ liệu "còn tươi" cho các query key cần kiểm tra
function seed(client: QueryClient, keys: unknown[][]) {
  keys.forEach((key) => client.setQueryData(key, { seeded: true }))
}

function isStale(client: QueryClient, key: unknown[]) {
  return client.getQueryState(key)?.isInvalidated === true
}

describe('invalidateStudentData', () => {
  it('làm mới danh sách thiếu nhi, lớp, chi tiết lớp và thống kê sau khi chuyển lớp', async () => {
    const client = new QueryClient()
    const keys = [
      ['students', 'all'],
      ['classes', 'withDetails', 'all'],
      ['classDetail', 'class-a'],
      ['classStats', 'all'],
      ['dashboardStats', 'all'],
      ['attendanceStudents', 'class-a', '2026-09-16'],
    ]
    seed(client, keys)

    await invalidateStudentData(client)

    keys.forEach((key) => expect(isStale(client, key), key.join('/')).toBe(true))
  })

  it('không đụng tới cache không liên quan', async () => {
    const client = new QueryClient()
    seed(client, [['weeklyPlans', '2026-09-14'], ['holidays', 'sy-1']])

    await invalidateStudentData(client)

    expect(isStale(client, ['weeklyPlans', '2026-09-14'])).toBe(false)
    expect(isStale(client, ['holidays', 'sy-1'])).toBe(false)
  })

  it('bao gồm key students và classes', () => {
    const flat = STUDENT_CHANGE_KEYS.map((k) => k[0])
    expect(flat).toContain('students')
    expect(flat).toContain('classes')
    expect(flat).toContain('classDetail')
  })
})

describe('invalidateUserData', () => {
  it('làm mới danh sách GLV, lớp và danh bạ sau khi đổi lớp phụ trách', async () => {
    const client = new QueryClient()
    const keys = [
      ['users', 'all'],
      ['classes', 'withDetails', 'all'],
      ['classDetail', 'class-a'],
      ['teacherDirectory'],
    ]
    seed(client, keys)

    await invalidateUserData(client)

    keys.forEach((key) => expect(isStale(client, key), key.join('/')).toBe(true))
  })

  it('không làm mới cache thiếu nhi', async () => {
    const client = new QueryClient()
    seed(client, [['students', 'all']])

    await invalidateUserData(client)

    expect(isStale(client, ['students', 'all'])).toBe(false)
    expect(USER_CHANGE_KEYS.map((k) => k[0])).not.toContain('students')
  })
})
