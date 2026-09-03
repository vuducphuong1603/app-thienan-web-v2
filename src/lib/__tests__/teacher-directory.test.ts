import { describe, it, expect } from 'vitest'
import { buildTeacherDirectory, filterTeacherDirectory, telHref } from '../teacher-directory'

const classes = [
  { id: 'c1', name: 'Chiên 1', branch: 'Chiên Con', display_order: 1 },
  { id: 'a1', name: 'Ấu 1A', branch: 'Ấu Nhi', display_order: 2 },
  { id: 'a2', name: 'Ấu 1B', branch: 'Ấu Nhi', display_order: 1 },
  { id: 'x', name: 'Lớp cũ', branch: 'Ấu Nhi', display_order: 9, status: 'INACTIVE' },
]
const users = [
  { id: 'u1', full_name: 'Nguyễn Văn Bình', saint_name: 'Giuse', phone: '0901 234 567', role: 'giao_ly_vien', status: 'ACTIVE', class_id: 'a1' },
  { id: 'u2', full_name: 'Trần Thị An', saint_name: 'Maria', phone: '0912345678', role: 'giao_ly_vien', status: 'ACTIVE', class_id: null, class_name: 'Ấu 1A' },
  { id: 'u3', full_name: 'Lê Văn Cường', phone: '0933333333', role: 'admin', status: 'ACTIVE', class_id: 'c1' },
  { id: 'u4', full_name: 'Phạm Thị Dung', phone: '0944444444', role: 'phan_doan_truong', status: 'ACTIVE', branch: 'Ấu Nhi' },
  { id: 'u5', full_name: 'Đã nghỉ', phone: '0955555555', role: 'giao_ly_vien', status: 'INACTIVE', class_id: 'a1' },
]

describe('telHref', () => {
  it('bỏ khoảng trắng/chấm/gạch, giữ dấu +', () => {
    expect(telHref('0901 234 567')).toBe('tel:0901234567')
    expect(telHref('+84.901-234-567')).toBe('tel:+84901234567')
  })
  it('trả null khi rỗng hoặc không phải số', () => {
    expect(telHref(null)).toBeNull()
    expect(telHref('')).toBeNull()
    expect(telHref('chưa có')).toBeNull()
  })
})

describe('buildTeacherDirectory', () => {
  const dir = buildTeacherDirectory(classes, users)

  it('gom theo thứ tự ngành chuẩn, lớp theo display_order, bỏ lớp INACTIVE', () => {
    expect(dir.branches.map((b) => b.branch)).toEqual(['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'])
    expect(dir.branches[1].classes.map((c) => c.name)).toEqual(['Ấu 1B', 'Ấu 1A'])
  })

  it('ghép GLV theo class_id hoặc class_name, xếp theo tên gọi, bỏ user INACTIVE', () => {
    const au1a = dir.branches[1].classes.find((c) => c.name === 'Ấu 1A')!
    expect(au1a.teachers.map((t) => t.id)).toEqual(['u2', 'u1'])
  })

  it('admin kiêm nhiệm được liệt kê ở lớp phụ trách và trong Ban điều hành', () => {
    expect(dir.branches[0].classes[0].teachers.map((t) => t.id)).toEqual(['u3'])
    expect(dir.executives.map((t) => t.id)).toEqual(['u3'])
  })

  it('phân đoàn trưởng gắn vào ngành của họ', () => {
    expect(dir.branches[1].leaders.map((t) => t.id)).toEqual(['u4'])
    expect(dir.branches[0].leaders).toEqual([])
  })

  it('đưa ngành của lớp mình lên đầu khi có currentUser', () => {
    const mine = buildTeacherDirectory(classes, users, { class_id: 'a1' })
    expect(mine.branches[0].branch).toBe('Ấu Nhi')
  })
})

describe('filterTeacherDirectory', () => {
  const dir = buildTeacherDirectory(classes, users)

  it('rỗng → giữ nguyên', () => {
    expect(filterTeacherDirectory(dir, '  ')).toBe(dir)
  })

  it('tìm theo tên GLV không dấu, giữ lại lớp chứa GLV đó', () => {
    const r = filterTeacherDirectory(dir, 'binh')
    expect(r.branches.map((b) => b.branch)).toEqual(['Ấu Nhi'])
    expect(r.branches[0].classes.map((c) => c.name)).toEqual(['Ấu 1A'])
    expect(r.branches[0].classes[0].teachers.map((t) => t.id)).toEqual(['u1'])
    expect(r.executives).toEqual([])
  })

  it('tìm theo tên lớp giữ toàn bộ GLV của lớp', () => {
    const r = filterTeacherDirectory(dir, 'au 1a')
    expect(r.branches[0].classes[0].teachers).toHaveLength(2)
  })

  it('tìm theo số điện thoại', () => {
    const r = filterTeacherDirectory(dir, '0944')
    expect(r.branches.map((b) => b.branch)).toEqual(['Ấu Nhi'])
    expect(r.branches[0].leaders.map((t) => t.id)).toEqual(['u4'])
    expect(r.branches[0].classes).toEqual([])
  })
})
