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

/** Count calendar Thursdays and Sundays in the inclusive local-date range. */
export function countWeekdays(from: string, to: string): { thu5: number; cn: number } {
  const current = parseLocalDate(from)
  const end = parseLocalDate(to)
  const counts = { thu5: 0, cn: 0 }

  while (current.getTime() <= end.getTime()) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek === 4) counts.thu5 += 1
    if (dayOfWeek === 0) counts.cn += 1
    current.setDate(current.getDate() + 1)
  }

  return counts
}

/** Calculate the attendance rate from roster size and students absent for the whole period. */
export function attendanceRateByStudents(studentCount: number, absentCount: number): number | null {
  if (studentCount <= 0) return null

  const clampedAbsentCount = Math.min(studentCount, Math.max(0, absentCount))
  return ((studentCount - clampedAbsentCount) / studentCount) * 100
}

export interface PriestHoliday {
  holiday_date: string
  day_type: string
}

export interface PriestSessionDates {
  thu5: string[]
  cn: string[]
}

export interface PriestAttendanceRecord {
  student_id: string
  status: string
  day_type: string
  attendance_date: string
}

/** Thursdays and Sundays in the inclusive local-date range, clipped to optional bounds and excluding matching holidays. */
export function sessionDates(
  from: string,
  to: string,
  holidays: PriestHoliday[],
  clip?: { clipFrom?: string; clipTo?: string }
): PriestSessionDates {
  parseLocalDate(from)
  parseLocalDate(to)

  const clipFrom = clip?.clipFrom
  const clipTo = clip?.clipTo
  if (clipFrom) parseLocalDate(clipFrom)
  if (clipTo) parseLocalDate(clipTo)

  const start = clipFrom && clipFrom > from ? clipFrom : from
  const end = clipTo && clipTo < to ? clipTo : to
  const sessions: PriestSessionDates = { thu5: [], cn: [] }
  if (start > end) return sessions

  const holidaysByDate = new Map<string, Set<string>>()
  for (const holiday of holidays) {
    const types = holidaysByDate.get(holiday.holiday_date) ?? new Set<string>()
    types.add(holiday.day_type)
    holidaysByDate.set(holiday.holiday_date, types)
  }

  const current = parseLocalDate(start)
  const endDate = parseLocalDate(end)
  while (current.getTime() <= endDate.getTime()) {
    const date = formatLocalDate(current)
    const dayTypes = holidaysByDate.get(date)
    const dayOfWeek = current.getDay()

    if (dayOfWeek === 4 && !dayTypes?.has('thu5') && !dayTypes?.has('both')) {
      sessions.thu5.push(date)
    }
    if (dayOfWeek === 0 && !dayTypes?.has('cn') && !dayTypes?.has('both')) {
      sessions.cn.push(date)
    }

    current.setDate(current.getDate() + 1)
  }

  return sessions
}

/** Format ascending session dates as day groups by month, joining the last month with "và". */
export function formatSessionDateList(dates: string[]): string {
  if (dates.length === 0) return 'không có buổi'

  const sortedDates = [...dates].sort()
  const monthGroups: { month: string; days: string[] }[] = []

  for (const value of sortedDates) {
    parseLocalDate(value)
    const month = value.slice(0, 7)
    const day = String(Number(value.slice(8, 10)))
    const lastGroup = monthGroups[monthGroups.length - 1]

    if (lastGroup?.month === month) {
      lastGroup.days.push(day)
    } else {
      monthGroups.push({ month, days: [day] })
    }
  }

  const formattedGroups = monthGroups.map(({ month, days }) => `${days.join(',')}/${month.slice(5, 7)}`)
  if (formattedGroups.length === 1) return formattedGroups[0]
  return `${formattedGroups.slice(0, -1).join(', ')} và ${formattedGroups[formattedGroups.length - 1]}`
}

function formatVietnameseDate(value: string): string {
  parseLocalDate(value)
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) ?? []
  return `${day}/${month}/${year}`
}

export function priestPeriodLabel(
  mode: 'week' | 'month' | 'year' | 'custom',
  from: string,
  to: string,
  schoolYearName?: string
): string {
  if (mode === 'month') {
    parseLocalDate(from)
    const [, year, month] = /^(\d{4})-(\d{2})-/.exec(from) ?? []
    return `tháng ${Number(month)}/${year}`
  }

  if (mode === 'year') {
    const normalizedName = schoolYearName?.trim().replace(/\s*[-–]\s*/, ' - ')
    if (normalizedName) return `năm học ${normalizedName}`

    parseLocalDate(from)
    parseLocalDate(to)
    const fromYear = from.slice(0, 4)
    const toYear = to.slice(0, 4)
    return `năm học ${fromYear} - ${toYear}`
  }

  return `từ ${formatVietnameseDate(from)} đến ${formatVietnameseDate(to)}`
}

export function priestSubtitleLines(periodLabel: string, sessions: PriestSessionDates): [string, string] {
  return [
    `Tỉ lệ thiếu nhi đi ít nhất 01 ngày trong tháng: (${periodLabel})`,
    `*T5 ngày ${formatSessionDateList(sessions.thu5)}  ;  *GL ngày ${formatSessionDateList(sessions.cn)}`,
  ]
}

export function presentIdsOnSessions(
  records: PriestAttendanceRecord[],
  sessions: PriestSessionDates,
  kind: 'thu5' | 'cn' | 'any'
): Set<string> {
  const thu5Dates = new Set(sessions.thu5)
  const cnDates = new Set(sessions.cn)
  const presentIds = new Set<string>()

  for (const record of records) {
    if (record.status !== 'present') continue

    const isThu5 = record.day_type === 'thu5' && thu5Dates.has(record.attendance_date)
    const isCn = record.day_type === 'cn' && cnDates.has(record.attendance_date)
    const isAnySundayAttendance = (record.day_type === 'cn' || record.day_type === 'cn_le') &&
      cnDates.has(record.attendance_date)

    if (kind === 'thu5' && isThu5) presentIds.add(record.student_id)
    if (kind === 'cn' && isCn) presentIds.add(record.student_id)
    if (kind === 'any' && (isThu5 || isAnySundayAttendance)) presentIds.add(record.student_id)
  }

  return presentIds
}

export function priestBranchLabel(branch: string): string {
  const knownLabels: Record<string, string> = {
    'Chiên Con': 'CHIÊN CON',
    'Ấu Nhi': 'ẤU',
    'Thiếu Nhi': 'THIẾU',
    'Nghĩa Sĩ': 'NGHĨA',
  }
  return knownLabels[branch] ?? branch.toUpperCase()
}

export function priestClassNote(thu5Absent: number, cnAbsent: number, warnedNames: string[]): string {
  const attention = thu5Absent >= 4 && cnAbsent >= 3
    ? 'Thứ 5 và CN'
    : thu5Absent >= 4
      ? 'Thứ 5'
      : cnAbsent >= 3
        ? 'CN'
      : ''
  const names = warnedNames.map((name) => name.trim()).filter((name) => name.length > 0)
  const warning = names.length > 0 ? `Vắng 2 tháng:\n${names.join('\n')}` : ''

  return [attention, warning].filter((part) => part.length > 0).join('\n')
}

export function priestPreviousWindow(
  mode: 'week' | 'month' | 'year' | 'custom',
  from: string
): { from: string; to: string; label: string } | null {
  if (mode !== 'month' && mode !== 'custom') return null

  const date = parseLocalDate(from)
  const { year, monthIndex0 } = previousMonth(date.getFullYear(), date.getMonth())
  const range = monthRange(year, monthIndex0)
  return {
    ...range,
    label: `Tháng ${monthIndex0 + 1}/${year}`,
  }
}

export interface PriestReportClassRow {
  classId: string
  className: string
  studentCount: number
  thu5Absent: number
  cnAbsent: number
  prevThu5Rate: number | null
  prevCnRate: number | null
  warnedNames: string[]
  note: string
}

export interface PriestReportBranchGroup {
  branch: string
  label: string
  classes: PriestReportClassRow[]
}

export function isPriestReportClass(classItem: { name: string; display_order: number | null }): boolean {
  return !classItem.name.toLowerCase().includes('demo') && classItem.display_order !== 999
}

/** Assemble report rows from the already-active student list, session dates, records, and warnings. */
export function buildPriestReportBranches(input: {
  classes: { id: string; name: string; branch: string; display_order: number | null }[]
  branchOrder: string[]
  students: PriestStudent[]
  sessions: PriestSessionDates
  records: PriestAttendanceRecord[]
  prevSessions: PriestSessionDates | null
  prevRecords: PriestAttendanceRecord[]
  warnings: PriestAbsentWarning[]
}): PriestReportBranchGroup[] {
  const studentsByClass = new Map<string, PriestStudent[]>()
  for (const student of input.students) {
    if (student.class_id === null) continue
    const classStudents = studentsByClass.get(student.class_id) ?? []
    classStudents.push(student)
    studentsByClass.set(student.class_id, classStudents)
  }

  const presentThu5 = presentIdsOnSessions(input.records, input.sessions, 'thu5')
  const presentCn = presentIdsOnSessions(input.records, input.sessions, 'cn')
  const previousPresentThu5 = input.prevSessions === null
    ? null
    : presentIdsOnSessions(input.prevRecords, input.prevSessions, 'thu5')
  const previousPresentCn = input.prevSessions === null
    ? null
    : presentIdsOnSessions(input.prevRecords, input.prevSessions, 'cn')

  return input.branchOrder.flatMap((branch): PriestReportBranchGroup[] => {
    const branchClasses = input.classes
      .filter((classItem) => classItem.branch === branch && isPriestReportClass(classItem))
      .sort((left, right) => {
        if (left.display_order === null && right.display_order !== null) return 1
        if (left.display_order !== null && right.display_order === null) return -1
        if (left.display_order !== null && right.display_order !== null && left.display_order !== right.display_order) {
          return left.display_order - right.display_order
        }
        return left.name.localeCompare(right.name)
      })

    if (branchClasses.length === 0) return []

    const classes = branchClasses.map((classItem): PriestReportClassRow => {
      const classStudents = studentsByClass.get(classItem.id) ?? []
      const studentCount = classStudents.length
      const thu5Absent = input.sessions.thu5.length === 0
        ? 0
        : classStudents.filter((student) => !presentThu5.has(student.id)).length
      const cnAbsent = input.sessions.cn.length === 0
        ? 0
        : classStudents.filter((student) => !presentCn.has(student.id)).length
      const studentIds = new Set(classStudents.map((student) => student.id))
      const warnedNames = input.warnings
        .filter((warning) => studentIds.has(warning.studentId))
        .map((warning) => `${warning.saintName} ${warning.fullName}`.trim())

      const prevThu5Rate = studentCount === 0 || input.prevSessions === null || input.prevSessions.thu5.length === 0
        ? null
        : (studentCount - classStudents.filter((student) => !previousPresentThu5?.has(student.id)).length) / studentCount
      const prevCnRate = studentCount === 0 || input.prevSessions === null || input.prevSessions.cn.length === 0
        ? null
        : (studentCount - classStudents.filter((student) => !previousPresentCn?.has(student.id)).length) / studentCount

      return {
        classId: classItem.id,
        className: classItem.name,
        studentCount,
        thu5Absent,
        cnAbsent,
        prevThu5Rate,
        prevCnRate,
        warnedNames,
        note: priestClassNote(thu5Absent, cnAbsent, warnedNames),
      }
    })

    return [{ branch, label: priestBranchLabel(branch), classes }]
  })
}
