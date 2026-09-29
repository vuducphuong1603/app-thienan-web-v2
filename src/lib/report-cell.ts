export type ReportCellStatus = 'holiday' | 'present' | 'absent' | 'unmarked'

export interface ReportCellInput {
  record?: string | null
  date: string
  today: string
  isHoliday: boolean
  classHasAnyRecord: boolean
}

export function reportCellStatus(input: ReportCellInput): ReportCellStatus {
  if (input.isHoliday) return 'holiday'
  if (input.record === 'present') return 'present'
  if (input.record !== null && input.record !== undefined) return 'absent'
  if (input.date >= input.today || !input.classHasAnyRecord) return 'unmarked'
  return 'absent'
}

export const REPORT_CELL_SYMBOL: Record<Exclude<ReportCellStatus, 'holiday'>, string> = {
  present: 'X',
  absent: '',
  unmarked: '-',
}

export function reportTotalAttendance(
  presentThu5: number,
  full: number,
  partial: number,
): number {
  return presentThu5 + full + partial * 0.5
}

export function countReportCells(statuses: ReportCellStatus[]): {
  present: number
  absent: number
  unmarked: number
  holiday: number
} {
  const counts = { present: 0, absent: 0, unmarked: 0, holiday: 0 }
  for (const status of statuses) {
    counts[status]++
  }
  return counts
}
