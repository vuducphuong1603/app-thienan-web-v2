// Danh bạ giáo lý viên: ghép lớp ↔ GLV (theo class_id hoặc class_name) và gom theo ngành
// để mọi GLV tra được ai đang dạy lớp nào + số điện thoại bấm gọi. Module thuần, không
// phụ thuộc Supabase để test được.
import { BRANCHES, type Branch } from './branches'
import { CLASS_TEACHER_ROLES, isAssignedToClass, prioritizeAssignedBranch, type AssignedUser } from './class-teachers'
import { sortByGivenName } from './student-sort'
import { normalizeSearchText } from './search'

export interface DirectoryClass {
  id: string
  name: string
  branch: string
  display_order?: number | null
  status?: string | null
}

export interface DirectoryUser {
  id: string
  full_name: string
  saint_name?: string | null
  phone?: string | null
  avatar_url?: string | null
  role: string
  status?: string | null
  branch?: string | null
  class_id?: string | null
  class_name?: string | null
}

export interface DirectoryClassEntry {
  id: string
  name: string
  teachers: DirectoryUser[]
}

export interface DirectoryBranchGroup {
  branch: Branch
  classes: DirectoryClassEntry[]
  /** Phân đoàn trưởng / phó của ngành này */
  leaders: DirectoryUser[]
}

export interface TeacherDirectory {
  /** Ban điều hành (admin) */
  executives: DirectoryUser[]
  branches: DirectoryBranchGroup[]
}

/** Chuẩn hoá SĐT thành href tel: (bỏ khoảng trắng, chấm, gạch). Trả null nếu không có chữ số. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[\s.\-()]/g, '')
  if (!/^\+?\d{3,}$/.test(cleaned)) return null
  return `tel:${cleaned}`
}

function isActive(u: { status?: string | null }): boolean {
  return !u.status || u.status === 'ACTIVE'
}

export function buildTeacherDirectory(
  classes: DirectoryClass[],
  users: DirectoryUser[],
  currentUser?: AssignedUser | null
): TeacherDirectory {
  const activeUsers = users.filter(isActive)
  const activeClasses = classes
    .filter((c) => !c.status || c.status === 'ACTIVE')
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name, 'vi'))

  const teacherRoles: readonly string[] = CLASS_TEACHER_ROLES
  const teacherPool = activeUsers.filter((u) => teacherRoles.includes(u.role))

  const executives = sortByGivenName(activeUsers.filter((u) => u.role === 'admin'))

  const branchOrder = prioritizeAssignedBranch(BRANCHES, activeClasses, currentUser)
  const branches: DirectoryBranchGroup[] = branchOrder.map((branch) => ({
    branch,
    leaders: sortByGivenName(activeUsers.filter((u) => u.role === 'phan_doan_truong' && u.branch === branch)),
    classes: activeClasses
      .filter((c) => c.branch === branch)
      .map((c) => ({
        id: c.id,
        name: c.name,
        teachers: sortByGivenName(teacherPool.filter((u) => isAssignedToClass(u, c))),
      })),
  }))

  return { executives, branches }
}

function userMatches(u: DirectoryUser, q: string): boolean {
  return (
    normalizeSearchText(`${u.saint_name ?? ''} ${u.full_name}`).includes(q) ||
    (u.phone ?? '').replace(/\s/g, '').includes(q)
  )
}

/** Lọc theo tên lớp, tên GLV hoặc SĐT (không dấu). Lớp khớp tên giữ nguyên toàn bộ GLV. */
export function filterTeacherDirectory(dir: TeacherDirectory, query: string): TeacherDirectory {
  const q = normalizeSearchText(query.trim())
  if (!q) return dir
  return {
    executives: dir.executives.filter((u) => userMatches(u, q)),
    branches: dir.branches
      .map((b) => ({
        branch: b.branch,
        leaders: b.leaders.filter((u) => userMatches(u, q)),
        classes: b.classes
          .map((c) =>
            normalizeSearchText(c.name).includes(q) ? c : { ...c, teachers: c.teachers.filter((u) => userMatches(u, q)) }
          )
          .filter((c) => c.teachers.length > 0 || normalizeSearchText(c.name).includes(q)),
      }))
      .filter((b) => b.classes.length > 0 || b.leaders.length > 0),
  }
}
