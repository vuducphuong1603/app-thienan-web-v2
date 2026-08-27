// Ai được tính là GLV của một lớp: GLV thường và admin kiêm nhiệm (có class_id / class_name).
// Admin vẫn giữ nguyên mọi quyền; chỉ khác là được liệt kê ở lớp mình phụ trách
// và lớp đó được ưu tiên lên đầu các danh sách lớp.
export const CLASS_TEACHER_ROLES = ['giao_ly_vien', 'admin'] as const

export interface AssignedUser {
  class_id?: string | null
  class_name?: string | null
}

export interface ClassLike {
  id: string
  name: string
  branch: string
}

export function isAssignedToClass(user: AssignedUser | null | undefined, cls: ClassLike): boolean {
  if (!user) return false
  return (!!user.class_id && user.class_id === cls.id) || (!!user.class_name && user.class_name === cls.name)
}

/** Đưa lớp được phân công lên đầu, giữ nguyên thứ tự các lớp còn lại. */
export function prioritizeAssignedClass<T extends ClassLike>(classes: T[], user: AssignedUser | null | undefined): T[] {
  if (!user) return classes
  const mine = classes.filter((c) => isAssignedToClass(user, c))
  if (mine.length === 0) return classes
  return [...mine, ...classes.filter((c) => !isAssignedToClass(user, c))]
}

/** Thứ tự ngành: ngành có lớp được phân công lên đầu, còn lại giữ nguyên. */
export function prioritizeAssignedBranch<B extends string>(
  branches: readonly B[],
  classes: ClassLike[],
  user: AssignedUser | null | undefined
): B[] {
  const mine = classes.find((c) => isAssignedToClass(user, c))
  if (!mine) return [...branches]
  const target = branches.find((b) => b === mine.branch)
  if (!target) return [...branches]
  return [target, ...branches.filter((b) => b !== target)]
}
