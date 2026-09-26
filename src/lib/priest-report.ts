import { compareByGivenName } from '@/lib/student-sort'

export type PriestAttendanceType = 'all' | 'thu5' | 'cn'

export interface PriestStudent {
  id: string
  saint_name: string | null
  full_name: string
  class_id: string | null
  parent_phone: string | null
  parent_phone_2: string | null
}

export interface PriestAbsentWarning {
  studentId: string
  saintName: string
  fullName: string
  className: string
  parentPhones: string[]
}

const padDatePart = (value: number): string => String(value).padStart(2, '0')

function assertMonthIndex(monthIndex0: number): void {
  if (!Number.isInteger(monthIndex0) || monthIndex0 < 0 || monthIndex0 > 11) {
    throw new RangeError(`Invalid month index: ${monthIndex0}`)
  }
}

/** Construct a local date at noon so date formatting never crosses a UTC boundary. */
function localDate(year: number, monthIndex0: number, day: number): Date {
  const date = new Date(2000, 0, 1, 12)
  date.setFullYear(year, monthIndex0, day)
  date.setHours(12, 0, 0, 0)
  return date
}

function formatLocalDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new RangeError(`Invalid local date: ${value}`)
  }

  const year = Number(match[1])
  const monthIndex0 = Number(match[2]) - 1
  const day = Number(match[3])
  const date = localDate(year, monthIndex0, day)

  if (formatLocalDate(date) !== value) {
    throw new RangeError(`Invalid local date: ${value}`)
  }

  return date
}

export function monthRange(year: number, monthIndex0: number): { from: string; to: string } {
  assertMonthIndex(monthIndex0)
  return {
    from: formatLocalDate(localDate(year, monthIndex0, 1)),
    to: formatLocalDate(localDate(year, monthIndex0 + 1, 0)),
  }
}

export function monthOverlapsSchoolYear(
  range: { from: string; to: string },
  schoolYear: { start_date: string; end_date: string } | null | undefined
): boolean {
  return !!schoolYear && range.to >= schoolYear.start_date && range.from <= schoolYear.end_date
}

export function previousMonth(year: number, monthIndex0: number): { year: number; monthIndex0: number } {
  assertMonthIndex(monthIndex0)
  return monthIndex0 === 0
    ? { year: year - 1, monthIndex0: 11 }
    : { year, monthIndex0: monthIndex0 - 1 }
}

export function matchesAttendanceType(dayType: string, type: PriestAttendanceType): boolean {
  if (type === 'all') return dayType === 'thu5' || dayType === 'cn' || dayType === 'cn_le'
  if (type === 'thu5') return dayType === 'thu5'
  return dayType === 'cn' || dayType === 'cn_le'
}

export function presentStudentIds(
  records: { student_id: string; status: string; day_type: string }[],
  type: PriestAttendanceType
): Set<string> {
  const presentIds = new Set<string>()

  for (const record of records) {
    if (record.status === 'present' && matchesAttendanceType(record.day_type, type)) {
      presentIds.add(record.student_id)
    }
  }

  return presentIds
}

/** Count active students with no present student_id in each known class. */
export function countFullyAbsentByClass(students: PriestStudent[], presentIds: Set<string>): Map<string, number> {
  const absentByClass = new Map<string, number>()

  for (const student of students) {
    if (student.class_id === null) continue

    const currentCount = absentByClass.get(student.class_id) ?? 0
    absentByClass.set(student.class_id, presentIds.has(student.id) ? currentCount : currentCount + 1)
  }

  return absentByClass
}

export function buildAbsentWarnings(
  students: PriestStudent[],
  classes: { id: string; name: string; display_order: number | null }[],
  presentCurrent: Set<string>,
  presentPrevious: Set<string>
): PriestAbsentWarning[] {
  const classesById = new Map(classes.map((classItem) => [classItem.id, classItem]))

  return students
    .filter((student) => !presentCurrent.has(student.id) && !presentPrevious.has(student.id))
    .map((student) => {
      const classItem = student.class_id === null ? undefined : classesById.get(student.class_id)
      const parentPhones = [student.parent_phone, student.parent_phone_2]
        .map((phone) => phone?.trim() ?? '')
        .filter((phone, index, phones) => phone.length > 0 && phones.indexOf(phone) === index)

      return {
        studentId: student.id,
        saintName: student.saint_name ?? '',
        fullName: student.full_name,
        className: classItem?.name ?? '',
        parentPhones,
        classOrder: classItem?.display_order ?? Number.POSITIVE_INFINITY,
        hasKnownClass: classItem !== undefined,
      }
    })
    .sort((a, b) => {
      if (a.hasKnownClass !== b.hasKnownClass) return a.hasKnownClass ? -1 : 1
      if (a.classOrder !== b.classOrder) return a.classOrder - b.classOrder

      const nameOrder = compareByGivenName({ full_name: a.fullName }, { full_name: b.fullName })
      return nameOrder !== 0 ? nameOrder : a.studentId.localeCompare(b.studentId)
    })
    .map((warning) => ({
      studentId: warning.studentId,
      saintName: warning.saintName,
      fullName: warning.fullName,
      className: warning.className,
      parentPhones: warning.parentPhones,
    }))
}

function isAttendanceDay(date: Date, type: PriestAttendanceType): boolean {
  const dayOfWeek = date.getDay()
  if (type === 'all') return dayOfWeek === 0 || dayOfWeek === 4
  if (type === 'thu5') return dayOfWeek === 4
  return dayOfWeek === 0
}

export function countAttendanceDays(
  from: string,
  to: string,
  type: PriestAttendanceType,
  holidayDates: Set<string>
): number {
  const current = parseLocalDate(from)
  const end = parseLocalDate(to)
  let count = 0

  while (current.getTime() <= end.getTime()) {
    const dateString = formatLocalDate(current)
    if (!holidayDates.has(dateString) && isAttendanceDay(current, type)) count += 1
    current.setDate(current.getDate() + 1)
  }

  return count
}
