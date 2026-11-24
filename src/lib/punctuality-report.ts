import {
  formatSessionDateList,
  isPriestReportClass,
  priestBranchLabel,
  type PriestSessionDates,
} from '@/lib/priest-report'

// Báo cáo "Thống kê đúng giờ": T5 = số em có mặt; CN = số em có mặt ĐÚNG GIỜ (is_late === false).
// Thuần logic, không đọc đồng hồ / DB. Mọi chuỗi ngày dùng getter local (không toISOString).

export type PunctualityMode = 'day' | 'week' | 'month' | 'custom'
export type SundaySessionType = 'cn' | 'cn_le'

export interface PunctualityRecord {
  student_id: string
  status: string
  day_type: string
  attendance_date: string
  is_late: boolean | null
}

export interface PunctualityClassInput {
  id: string
  name: string
  branch: string
  display_order: number | null
}

export interface PunctualityStudentInput {
  id: string
  class_id: string | null
}

export interface PunctualityReportInput {
  mode: PunctualityMode
  fromDate: string
  toDate: string
  classes: PunctualityClassInput[]
  branchOrder: string[]
  students: PunctualityStudentInput[]
  sessions: PriestSessionDates
  records: PunctualityRecord[]
}

export interface PunctualityRow {
  classId: string
  className: string
  studentCount: number
  /** Tỉ lệ có mặt từng Thứ 5, cùng thứ tự với `thu5Dates`. */
  thu5Rates: (number | null)[]
  thu5Average: number | null
  /** Tỉ lệ đúng giờ từng Chủ nhật (null = buổi chưa xét giờ), cùng thứ tự với `cnDates`. */
  sundayRates: (number | null)[]
  sundayAverage: number | null
  late: number
  unknown: number
  note: string
}

export interface PunctualityBranch {
  branch: string
  label: string
  sundaySession: SundaySessionType
  classes: PunctualityRow[]
}

export interface PunctualityTotal {
  studentCount: number
  thu5Rates: (number | null)[]
  thu5Average: number | null
  sundayRates: (number | null)[]
  sundayAverage: number | null
}

export interface PunctualityReportData {
  fromDate: string
  toDate: string
  timeLabel: string
  sheetName: string
  subtitleLines: [string, string]
  thu5Dates: string[]
  cnDates: string[]
  branches: PunctualityBranch[]
  total: PunctualityTotal
  footnotes: string[]
}

export type PunctualityColumnKind = 'thu5' | 'thu5-avg' | 'cn' | 'cn-avg'

export interface PunctualityColumn {
  kind: PunctualityColumnKind
  label: string
  index?: number
}

export const PUNCTUALITY_REPORT_TITLE = 'THỐNG KÊ TỈ LỆ CÓ MẶT ĐÚNG GIỜ'
export const PUNCTUALITY_SHEET_NAME = 'Thong ke dung gio'

const NULL_PLACEHOLDER = '—'

const FOOTNOTE_THU5 = 'Thứ 5: tỉ lệ = số em có mặt / sỉ số lớp (không xét giờ).'
const FOOTNOTE_SUNDAY =
  'Chủ nhật: ngành Thiếu, Nghĩa tính đúng giờ buổi học giáo lý; ngành Chiên, Ấu tính đúng giờ buổi đi lễ. Tỉ lệ = số em đúng giờ / sỉ số lớp.'
const FOOTNOTE_AVERAGE =
  'TB: trung bình các buổi trong kỳ; buổi Chủ nhật chưa xét giờ (—) không tính vào trung bình.'

// ───────────────────────── Ngày (local, không UTC) ─────────────────────────

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Ngày không hợp lệ: ${value}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Ngày không hợp lệ: ${value}`)
  }
  return date
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function addDays(value: string, days: number): string {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

/** yyyy-mm-dd → dd/mm/yyyy */
function dmy(value: string): string {
  parseDate(value)
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
}

/** yyyy-mm-dd → dd/mm */
function dm(value: string): string {
  parseDate(value)
  return `${value.slice(8, 10)}/${value.slice(5, 7)}`
}

// ───────────────────────── Tuần / buổi ─────────────────────────

/** Chiên Con, Ấu Nhi đi lễ (cn_le); các ngành còn lại học giáo lý (cn). */
export function sundaySessionForBranch(branch: string): SundaySessionType {
  return branch === 'Chiên Con' || branch === 'Ấu Nhi' ? 'cn_le' : 'cn'
}

/** Thứ 2 → Chủ nhật (local) của tuần chứa `date`. */
export function weekRangeOf(date: string): { from: string; to: string } {
  const parsed = parseDate(date)
  const daysSinceMonday = (parsed.getDay() + 6) % 7
  const from = addDays(date, -daysSinceMonday)
  return { from, to: addDays(from, 6) }
}

/** Thứ 2/3/4 → Chủ nhật tuần trước (tuần vừa xong); Thứ 5..CN → chính hôm nay. */
export function defaultWeekAnchor(today: string): string {
  const day = parseDate(today).getDay()
  if (day >= 1 && day <= 3) return addDays(today, -day)
  return today
}

// ───────────────────────── Định dạng / cột ─────────────────────────

export function formatPunctualityRate(rate: number | null): string {
  if (rate === null) return NULL_PLACEHOLDER
  return `${Math.round(rate * 100)}%`
}

export function punctualityFileBase(fromDate: string, toDate: string): string {
  return `thong_ke_dung_gio_${fromDate}_${toDate}`
}

/** Các cột động sau SỈ SỐ; cột TB chỉ có khi nhóm đó ≥ 2 buổi. Excel và bản xem trước dùng chung. */
export function punctualityColumns(data: Pick<PunctualityReportData, 'thu5Dates' | 'cnDates'>): PunctualityColumn[] {
  const columns: PunctualityColumn[] = []
  data.thu5Dates.forEach((date, index) => columns.push({ kind: 'thu5', label: `T5 ${dm(date)}`, index }))
  if (data.thu5Dates.length >= 2) columns.push({ kind: 'thu5-avg', label: 'TB T5' })
  data.cnDates.forEach((date, index) => columns.push({ kind: 'cn', label: `CN ${dm(date)}`, index }))
  if (data.cnDates.length >= 2) columns.push({ kind: 'cn-avg', label: 'TB CN' })
  return columns
}

export function punctualityCellRate(row: PunctualityRow | PunctualityTotal, column: PunctualityColumn): number | null {
  switch (column.kind) {
    case 'thu5':
      return row.thu5Rates[column.index ?? 0] ?? null
    case 'thu5-avg':
      return row.thu5Average
    case 'cn':
      return row.sundayRates[column.index ?? 0] ?? null
    default:
      return row.sundayAverage
  }
}

// ───────────────────────── Tính toán ─────────────────────────

type PunctualState = 'on_time' | 'late' | 'unknown'

interface ClassGroup {
  id: string
  name: string
  studentIds: string[]
}

interface BranchGroup {
  branch: string
  label: string
  sundaySession: SundaySessionType
  classes: ClassGroup[]
}

/** Số liệu thô của 1 lớp; `onTime[i] === null` = buổi CN thứ i chưa xét giờ. */
interface ClassCounts {
  thu5Present: number[]
  onTime: (number | null)[]
  late: number
  unknown: number
}

function compareClasses(left: PunctualityClassInput, right: PunctualityClassInput): number {
  if (left.display_order === null && right.display_order !== null) return 1
  if (left.display_order !== null && right.display_order === null) return -1
  if (left.display_order !== null && right.display_order !== null && left.display_order !== right.display_order) {
    return left.display_order - right.display_order
  }
  return left.name.localeCompare(right.name)
}

function groupBranches(input: PunctualityReportInput): BranchGroup[] {
  const studentsByClass = new Map<string, string[]>()
  for (const student of input.students) {
    if (student.class_id === null) continue
    const ids = studentsByClass.get(student.class_id) ?? []
    ids.push(student.id)
    studentsByClass.set(student.class_id, ids)
  }

  return input.branchOrder.flatMap((branch): BranchGroup[] => {
    const classes = input.classes
      .filter((item) => item.branch === branch && isPriestReportClass(item))
      .sort(compareClasses)
    if (classes.length === 0) return []
    return [{
      branch,
      label: priestBranchLabel(branch),
      sundaySession: sundaySessionForBranch(branch),
      classes: classes.map((item) => ({
        id: item.id,
        name: item.name,
        studentIds: studentsByClass.get(item.id) ?? [],
      })),
    }]
  })
}

interface RecordIndex {
  /** `${date}|${day_type}` → (student_id → trạng thái đúng giờ đã gộp trùng) */
  states: Map<string, Map<string, PunctualState>>
  /** `${date}|${day_type}` có ít nhất 1 bản ghi có mặt đã xét giờ (true/false) */
  evaluated: Set<string>
}

function sessionKey(date: string, dayType: string): string {
  return `${date}|${dayType}`
}

function mergeState(current: PunctualState | undefined, next: PunctualState): PunctualState {
  if (current === 'on_time' || next === 'on_time') return 'on_time'
  if (current === 'late' || next === 'late') return 'late'
  return 'unknown'
}

function indexRecords(records: PunctualityRecord[], thu5Dates: string[], cnDates: string[]): RecordIndex {
  const relevant = new Set<string>()
  for (const date of thu5Dates) relevant.add(sessionKey(date, 'thu5'))
  for (const date of cnDates) {
    relevant.add(sessionKey(date, 'cn'))
    relevant.add(sessionKey(date, 'cn_le'))
  }

  const states = new Map<string, Map<string, PunctualState>>()
  const evaluated = new Set<string>()

  for (const record of records) {
    if (record.status !== 'present') continue
    const key = sessionKey(record.attendance_date, record.day_type)
    if (!relevant.has(key)) continue

    const state: PunctualState = record.is_late === false ? 'on_time' : record.is_late === true ? 'late' : 'unknown'
    if (typeof record.is_late === 'boolean') evaluated.add(key)

    const byStudent = states.get(key) ?? new Map<string, PunctualState>()
    byStudent.set(record.student_id, mergeState(byStudent.get(record.student_id), state))
    states.set(key, byStudent)
  }

  return { states, evaluated }
}

function countClass(
  studentIds: string[],
  sundaySession: SundaySessionType,
  thu5Dates: string[],
  cnDates: string[],
  index: RecordIndex
): ClassCounts {
  const thu5Present = thu5Dates.map((date) => {
    const present = index.states.get(sessionKey(date, 'thu5'))
    return present ? studentIds.filter((id) => present.has(id)).length : 0
  })

  let late = 0
  let unknown = 0
  const onTime = cnDates.map((date): number | null => {
    const key = sessionKey(date, sundaySession)
    if (!index.evaluated.has(key)) return null
    const byStudent = index.states.get(key)
    let onTimeCount = 0
    for (const id of studentIds) {
      const state = byStudent?.get(id)
      if (state === 'on_time') onTimeCount += 1
      else if (state === 'late') late += 1
      else if (state === 'unknown') unknown += 1
    }
    return onTimeCount
  })

  return { thu5Present, onTime, late, unknown }
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function rowNote(counts: ClassCounts): string {
  const unevaluated = counts.onTime.filter((value) => value === null).length
  const parts: string[] = []
  if (counts.late > 0) parts.push(`Trễ: ${counts.late} lượt`)
  if (counts.unknown > 0) parts.push(`Chưa xét: ${counts.unknown} lượt`)
  if (unevaluated > 0) parts.push(`${unevaluated} buổi CN chưa xét giờ`)
  return parts.join(' · ')
}

function buildRow(group: ClassGroup, counts: ClassCounts): PunctualityRow {
  const studentCount = group.studentIds.length
  const evaluatedOnTime = counts.onTime.filter((value): value is number => value !== null)

  return {
    classId: group.id,
    className: group.name,
    studentCount,
    thu5Rates: counts.thu5Present.map((present) => ratio(present, studentCount)),
    thu5Average: ratio(sum(counts.thu5Present), studentCount * counts.thu5Present.length),
    sundayRates: counts.onTime.map((value) => (value === null ? null : ratio(value, studentCount))),
    sundayAverage: ratio(sum(evaluatedOnTime), studentCount * evaluatedOnTime.length),
    late: counts.late,
    unknown: counts.unknown,
    note: rowNote(counts),
  }
}

function buildTotal(
  rows: { studentCount: number; counts: ClassCounts }[],
  thu5Count: number,
  cnCount: number
): PunctualityTotal {
  const studentCount = sum(rows.map((row) => row.studentCount))

  const thu5Rates = Array.from({ length: thu5Count }, (_, position) =>
    ratio(sum(rows.map((row) => row.counts.thu5Present[position])), studentCount)
  )
  const thu5Average = ratio(
    sum(rows.flatMap((row) => row.counts.thu5Present)),
    studentCount * thu5Count
  )

  const sundayRates = Array.from({ length: cnCount }, (_, position) => {
    const evaluatedRows = rows.filter((row) => row.counts.onTime[position] !== null)
    return ratio(
      sum(evaluatedRows.map((row) => row.counts.onTime[position] ?? 0)),
      sum(evaluatedRows.map((row) => row.studentCount))
    )
  })

  let onTimeSum = 0
  let onTimeBase = 0
  for (const row of rows) {
    const evaluated = row.counts.onTime.filter((value): value is number => value !== null)
    onTimeSum += sum(evaluated)
    onTimeBase += row.studentCount * evaluated.length
  }

  return { studentCount, thu5Rates, thu5Average, sundayRates, sundayAverage: ratio(onTimeSum, onTimeBase) }
}

function periodLabelFor(mode: PunctualityMode, fromDate: string, toDate: string): string {
  if (mode === 'month') return `tháng ${Number(fromDate.slice(5, 7))}/${fromDate.slice(0, 4)}`
  if (mode === 'day') return `ngày ${dmy(fromDate)}`
  if (mode === 'week') return `tuần từ ${dmy(fromDate)} đến ${dmy(toDate)}`
  return `từ ${dmy(fromDate)} đến ${dmy(toDate)}`
}

function timeLabelFor(mode: PunctualityMode, fromDate: string, toDate: string): string {
  switch (mode) {
    case 'day':
      return `Ngày ${dmy(fromDate)}`
    case 'week':
      return `Tuần: ${dmy(fromDate)} - ${dmy(toDate)}`
    case 'month':
      return `Tháng ${Number(fromDate.slice(5, 7))}/${fromDate.slice(0, 4)}`
    default:
      return `Từ ${dmy(fromDate)} đến ${dmy(toDate)}`
  }
}

function uniqueSorted(dates: string[]): string[] {
  return [...new Set(dates)].sort()
}

export function buildPunctualityReport(input: PunctualityReportInput): PunctualityReportData {
  const thu5Dates = uniqueSorted(input.sessions.thu5)
  const cnDates = uniqueSorted(input.sessions.cn)
  const groups = groupBranches(input)
  const index = indexRecords(input.records, thu5Dates, cnDates)

  const allRows: { studentCount: number; counts: ClassCounts }[] = []
  const branches: PunctualityBranch[] = groups.map((group) => ({
    branch: group.branch,
    label: group.label,
    sundaySession: group.sundaySession,
    classes: group.classes.map((item) => {
      const counts = countClass(item.studentIds, group.sundaySession, thu5Dates, cnDates, index)
      allRows.push({ studentCount: item.studentIds.length, counts })
      return buildRow(item, counts)
    }),
  }))

  const footnotes = [FOOTNOTE_THU5, FOOTNOTE_SUNDAY]
  if (thu5Dates.length >= 2 || cnDates.length >= 2) footnotes.push(FOOTNOTE_AVERAGE)

  return {
    fromDate: input.fromDate,
    toDate: input.toDate,
    timeLabel: timeLabelFor(input.mode, input.fromDate, input.toDate),
    sheetName: PUNCTUALITY_SHEET_NAME,
    subtitleLines: [
      `Tỉ lệ thiếu nhi có mặt đúng giờ: (${periodLabelFor(input.mode, input.fromDate, input.toDate)})`,
      `*T5 ngày ${formatSessionDateList(thu5Dates)}  ;  *CN ngày ${formatSessionDateList(cnDates)}`,
    ],
    thu5Dates,
    cnDates,
    branches,
    total: buildTotal(allRows, thu5Dates.length, cnDates.length),
    footnotes,
  }
}
