export type TeacherPickerUser = {
  status?: string | null
  full_name?: string | null
}

/** Only active users with a usable full name may appear in teacher pickers. */
export function filterActiveNamedTeachers<T extends TeacherPickerUser>(teachers: readonly T[]): T[] {
  return teachers.filter((teacher) => teacher.status === 'ACTIVE' && Boolean(teacher.full_name?.trim()))
}
