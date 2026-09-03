// Phạm vi dữ liệu theo phân đoàn (ngành).
// - admin: thấy toàn bộ.
// - phan_doan_truong: chỉ thấy phân đoàn của mình (user.branch). Không có branch → không thấy gì.
// - giao_ly_vien: không bị giới hạn ở tầng này (các trang GLV đã khoá theo class_id riêng).
import { BRANCHES, type Branch } from './branches'
import type { UserRole } from './supabase'

export type BranchScope = { all: true } | { all: false; branch: string }

export const ALL_SCOPE: BranchScope = { all: true }

export const MANAGER_ROLES: readonly UserRole[] = ['admin', 'phan_doan_truong'] as const

export function isManagerRole(role: UserRole | null | undefined): boolean {
  return !!role && MANAGER_ROLES.includes(role)
}

export function normalizeBranch(branch: string | null | undefined): string {
  return (branch || '').trim().toLowerCase()
}

export function getBranchScope(user: { role: UserRole; branch?: string | null } | null | undefined): BranchScope {
  if (!user) return ALL_SCOPE
  if (user.role === 'phan_doan_truong') return { all: false, branch: (user.branch || '').trim() }
  return ALL_SCOPE
}

/** Khoá cache cho react-query: 'all' hoặc tên phân đoàn. */
export function scopeKey(scope: BranchScope): string {
  return scope.all ? 'all' : scope.branch || '__none__'
}

export function inScope(scope: BranchScope, branch: string | null | undefined): boolean {
  if (scope.all) return true
  if (!scope.branch) return false
  return normalizeBranch(branch) === normalizeBranch(scope.branch)
}

export function filterByBranch<T extends { branch?: string | null }>(items: readonly T[], scope: BranchScope): T[] {
  if (scope.all) return [...items]
  return items.filter((it) => inScope(scope, it.branch))
}

/** Vai trò mà người quản lý được gán khi thêm/sửa người dùng: PĐT chỉ tạo được giáo lý viên. */
export function assignableRoles(scope: BranchScope): UserRole[] {
  return scope.all ? ['admin', 'phan_doan_truong', 'giao_ly_vien'] : ['giao_ly_vien']
}

/** Danh sách phân đoàn được phép chọn trong dropdown/form. */

export function scopedBranches(scope: BranchScope): Branch[] {
  if (scope.all) return [...BRANCHES]
  return BRANCHES.filter((b) => inScope(scope, b))
}

/** Tập id lớp nằm trong phạm vi. */
export function classIdsInScope(classes: readonly { id: string; branch?: string | null }[], scope: BranchScope): Set<string> {
  return new Set(filterByBranch(classes, scope).map((c) => c.id))
}

/** Lọc các bản ghi gắn với lớp (class_id) theo phạm vi. Bản ghi không có class_id: chỉ giữ khi thấy toàn bộ. */
export function filterByClassId<T extends { class_id?: string | null }>(
  items: readonly T[],
  classes: readonly { id: string; branch?: string | null }[],
  scope: BranchScope,
): T[] {
  if (scope.all) return [...items]
  const ids = classIdsInScope(classes, scope)
  return items.filter((it) => !!it.class_id && ids.has(it.class_id))
}

/** Lọc theo tên lớp (vd bảng alerts chỉ lưu class_name). */
export function filterByClassName<T extends { class_name?: string | null }>(
  items: readonly T[],
  classes: readonly { name: string; branch?: string | null }[],
  scope: BranchScope,
): T[] {
  if (scope.all) return [...items]
  const names = new Set(filterByBranch(classes, scope).map((c) => c.name))
  return items.filter((it) => !!it.class_name && names.has(it.class_name))
}

/** Kế hoạch tuần thuộc phạm vi: chung toàn xứ đoàn, đúng phân đoàn, hoặc có lớp trong phân đoàn. */
export function planInScope(
  plan: { branch?: string | null; class_ids?: string[] | null },
  classes: readonly { id: string; branch?: string | null }[],
  scope: BranchScope,
): boolean {
  if (scope.all) return true
  if (plan.branch) return inScope(scope, plan.branch)
  if (plan.class_ids && plan.class_ids.length > 0) {
    const ids = classIdsInScope(classes, scope)
    return plan.class_ids.some((id) => ids.has(id))
  }
  return true // kế hoạch chung cho tất cả
}

/** Thông báo thuộc phạm vi: do mình tạo, gửi tất cả, gửi đúng phân đoàn, hoặc gửi lớp/thiếu nhi trong phân đoàn. */
export function notificationInScope(
  n: { target_type: string; target_values?: string[] | null; created_by?: string | null },
  ctx: { userId: string; classes: readonly { id: string; branch?: string | null }[]; studentClassIds?: ReadonlyMap<string, string> },
  scope: BranchScope,
): boolean {
  if (scope.all) return true
  if (n.created_by && n.created_by === ctx.userId) return true
  const values = n.target_values || []
  switch (n.target_type) {
    case 'all':
      return true
    case 'branch':
      return values.some((b) => inScope(scope, b))
    case 'class': {
      const ids = classIdsInScope(ctx.classes, scope)
      return values.some((id) => ids.has(id))
    }
    case 'student': {
      if (!ctx.studentClassIds) return false
      const ids = classIdsInScope(ctx.classes, scope)
      return values.some((sid) => {
        const cid = ctx.studentClassIds!.get(sid)
        return !!cid && ids.has(cid)
      })
    }
    default:
      return false // theo vai trò: chỉ Ban điều hành quản lý
  }
}
