import { describe, it, expect } from 'vitest'
import { CLASS_TEACHER_ROLES, isAssignedToClass, prioritizeAssignedClass, prioritizeAssignedBranch, defaultAssignedClassId } from '../class-teachers'

const classes = [
  { id: 'a', name: 'Ấu 1A', branch: 'Ấu Nhi' },
  { id: 'b', name: 'Thiếu 2A', branch: 'Thiếu Nhi' },
  { id: 'c', name: 'Thiếu 2B', branch: 'Thiếu Nhi' },
]
const BRANCHES = ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'] as const

describe('CLASS_TEACHER_ROLES', () => {
  it('gồm cả admin kiêm nhiệm', () => {
    expect(CLASS_TEACHER_ROLES).toContain('giao_ly_vien')
    expect(CLASS_TEACHER_ROLES).toContain('admin')
  })
})

describe('isAssignedToClass', () => {
  it('khớp theo class_id hoặc class_name', () => {
    expect(isAssignedToClass({ class_id: 'c' }, classes[2])).toBe(true)
    expect(isAssignedToClass({ class_name: 'Thiếu 2B' }, classes[2])).toBe(true)
    expect(isAssignedToClass({ class_id: 'a' }, classes[2])).toBe(false)
    expect(isAssignedToClass(null, classes[2])).toBe(false)
    expect(isAssignedToClass({ class_id: null, class_name: null }, classes[2])).toBe(false)
  })
})

describe('prioritizeAssignedClass', () => {
  it('đưa lớp phụ trách lên đầu, giữ nguyên lớp khác', () => {
    expect(prioritizeAssignedClass(classes, { class_id: 'c' }).map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })
  it('không đổi khi không có phân công', () => {
    expect(prioritizeAssignedClass(classes, { class_id: 'zzz' })).toEqual(classes)
    expect(prioritizeAssignedClass(classes, null)).toEqual(classes)
  })
})

describe('prioritizeAssignedBranch', () => {
  it('ngành có lớp phụ trách lên đầu', () => {
    expect(prioritizeAssignedBranch(BRANCHES, classes, { class_id: 'c' })).toEqual(['Thiếu Nhi', 'Chiên Con', 'Ấu Nhi', 'Nghĩa Sĩ'])
  })
  it('giữ nguyên khi không phân công', () => {
    expect(prioritizeAssignedBranch(BRANCHES, classes, null)).toEqual([...BRANCHES])
  })
})

describe('defaultAssignedClassId', () => {
  it('trả id lớp được phân công, không phụ thuộc role (GLV, admin, PĐT đều dùng chung)', () => {
    expect(defaultAssignedClassId(classes, { class_id: 'b' })).toBe('b')
  })
  it('khớp theo class_name khi class_id trống', () => {
    expect(defaultAssignedClassId(classes, { class_id: null, class_name: 'Thiếu 2B' })).toBe('c')
  })
  it('lớp được phân công không nằm trong danh sách được thấy (ngoài phạm vi ngành) thì trả rỗng', () => {
    expect(defaultAssignedClassId(classes, { class_id: 'zzz' })).toBe('')
  })
  it('chưa phân công lớp hoặc chưa có user thì trả rỗng', () => {
    expect(defaultAssignedClassId(classes, { class_id: null, class_name: null })).toBe('')
    expect(defaultAssignedClassId(classes, null)).toBe('')
  })
})
