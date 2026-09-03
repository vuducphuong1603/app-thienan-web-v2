import { describe, it, expect } from 'vitest'
import {
  getBranchScope, isManagerRole, inScope, filterByBranch, scopedBranches,
  classIdsInScope, filterByClassId, filterByClassName, scopeKey, assignableRoles, planInScope, notificationInScope,
} from '../branch-scope'

const classes = [
  { id: 'a', name: 'Ấu 1A', branch: 'Chiên Con' },
  { id: 'b', name: 'Thiếu 2A', branch: 'Thiếu Nhi' },
  { id: 'c', name: 'Thiếu 2B', branch: 'Thiếu Nhi' },
]

describe('isManagerRole', () => {
  it('admin và phân đoàn trưởng là manager, GLV thì không', () => {
    expect(isManagerRole('admin')).toBe(true)
    expect(isManagerRole('phan_doan_truong')).toBe(true)
    expect(isManagerRole('giao_ly_vien')).toBe(false)
    expect(isManagerRole(undefined)).toBe(false)
  })
})

describe('getBranchScope', () => {
  it('admin thấy tất cả', () => {
    expect(getBranchScope({ role: 'admin', branch: 'Thiếu Nhi' })).toEqual({ all: true })
  })
  it('phân đoàn trưởng chỉ thấy ngành mình', () => {
    expect(getBranchScope({ role: 'phan_doan_truong', branch: 'Thiếu Nhi' })).toEqual({ all: false, branch: 'Thiếu Nhi' })
  })
  it('phân đoàn trưởng chưa gán ngành thì không thấy gì', () => {
    const s = getBranchScope({ role: 'phan_doan_truong' })
    expect(s).toEqual({ all: false, branch: '' })
    expect(inScope(s, 'Thiếu Nhi')).toBe(false)
    expect(scopedBranches(s)).toEqual([])
    expect(scopeKey(s)).toBe('__none__')
  })
  it('GLV không bị giới hạn ở tầng phân đoàn', () => {
    expect(getBranchScope({ role: 'giao_ly_vien', branch: 'Ấu Nhi' })).toEqual({ all: true })
  })
})

describe('inScope / filterByBranch', () => {
  const s = getBranchScope({ role: 'phan_doan_truong', branch: 'Thiếu Nhi' })
  it('so khớp không phân biệt hoa thường và khoảng trắng', () => {
    expect(inScope(s, 'thiếu nhi ')).toBe(true)
    expect(inScope(s, 'Ấu Nhi')).toBe(false)
    expect(inScope(s, null)).toBe(false)
  })
  it('lọc danh sách có cột branch', () => {
    expect(filterByBranch(classes, s).map((c) => c.id)).toEqual(['b', 'c'])
    expect(filterByBranch(classes, { all: true })).toHaveLength(3)
  })
  it('scopedBranches giữ đúng thứ tự BRANCHES', () => {
    expect(scopedBranches({ all: true })).toEqual(['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'])
    expect(scopedBranches(s)).toEqual(['Thiếu Nhi'])
  })
})

describe('lọc theo lớp', () => {
  const s = getBranchScope({ role: 'phan_doan_truong', branch: 'Thiếu Nhi' })
  it('classIdsInScope', () => {
    expect([...classIdsInScope(classes, s)]).toEqual(['b', 'c'])
  })
  it('filterByClassId bỏ bản ghi ngoài ngành và bản ghi không có lớp', () => {
    const rows = [{ class_id: 'a' }, { class_id: 'b' }, { class_id: null }, { class_id: 'zzz' }]
    expect(filterByClassId(rows, classes, s)).toEqual([{ class_id: 'b' }])
    expect(filterByClassId(rows, classes, { all: true })).toHaveLength(4)
  })
  it('filterByClassName', () => {
    const rows = [{ class_name: 'Ấu 1A' }, { class_name: 'Thiếu 2B' }, { class_name: undefined }]
    expect(filterByClassName(rows, classes, s)).toEqual([{ class_name: 'Thiếu 2B' }])
  })
})

describe('assignableRoles', () => {
  it('admin gán được mọi vai trò, PĐT chỉ gán GLV', () => {
    expect(assignableRoles({ all: true })).toEqual(['admin', 'phan_doan_truong', 'giao_ly_vien'])
    expect(assignableRoles({ all: false, branch: 'Thiếu Nhi' })).toEqual(['giao_ly_vien'])
  })
})

describe('planInScope', () => {
  const s = getBranchScope({ role: 'phan_doan_truong', branch: 'Thiếu Nhi' })
  it('kế hoạch chung và đúng ngành thì thấy, ngành khác thì không', () => {
    expect(planInScope({ branch: null, class_ids: [] }, classes, s)).toBe(true)
    expect(planInScope({ branch: 'Thiếu Nhi' }, classes, s)).toBe(true)
    expect(planInScope({ branch: 'Ấu Nhi' }, classes, s)).toBe(false)
  })
  it('kế hoạch theo lớp: thấy khi có ít nhất một lớp trong ngành', () => {
    expect(planInScope({ class_ids: ['a'] }, classes, s)).toBe(false)
    expect(planInScope({ class_ids: ['a', 'c'] }, classes, s)).toBe(true)
  })
  it('admin thấy hết', () => {
    expect(planInScope({ branch: 'Ấu Nhi' }, classes, { all: true })).toBe(true)
  })
})

describe('notificationInScope', () => {
  const s = getBranchScope({ role: 'phan_doan_truong', branch: 'Thiếu Nhi' })
  const ctx = { userId: 'me', classes, studentClassIds: new Map([['s1', 'a'], ['s2', 'b']]) }
  it('thấy thông báo mình tạo, gửi tất cả, gửi đúng ngành', () => {
    expect(notificationInScope({ target_type: 'role', target_values: ['admin'], created_by: 'me' }, ctx, s)).toBe(true)
    expect(notificationInScope({ target_type: 'all', target_values: [] }, ctx, s)).toBe(true)
    expect(notificationInScope({ target_type: 'branch', target_values: ['Thiếu Nhi'] }, ctx, s)).toBe(true)
    expect(notificationInScope({ target_type: 'branch', target_values: ['Ấu Nhi'] }, ctx, s)).toBe(false)
  })
  it('theo lớp / thiếu nhi: dựa vào lớp thuộc ngành', () => {
    expect(notificationInScope({ target_type: 'class', target_values: ['b'] }, ctx, s)).toBe(true)
    expect(notificationInScope({ target_type: 'class', target_values: ['a'] }, ctx, s)).toBe(false)
    expect(notificationInScope({ target_type: 'student', target_values: ['s2'] }, ctx, s)).toBe(true)
    expect(notificationInScope({ target_type: 'student', target_values: ['s1'] }, ctx, s)).toBe(false)
  })
  it('theo vai trò do người khác tạo thì không thấy', () => {
    expect(notificationInScope({ target_type: 'role', target_values: ['giao_ly_vien'], created_by: 'x' }, ctx, s)).toBe(false)
  })
})
