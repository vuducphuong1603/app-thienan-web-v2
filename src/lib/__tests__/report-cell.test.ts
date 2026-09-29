import { describe, expect, it } from 'vitest'
import {
  REPORT_CELL_SYMBOL,
  countReportCells,
  reportCellStatus,
  reportTotalAttendance,
} from '../report-cell'

const base = {
  date: '2026-09-20',
  today: '2026-09-29',
  isHoliday: false,
  classHasAnyRecord: true,
}

describe('reportCellStatus', () => {
  it('gives holiday precedence over an attendance record', () => {
    expect(reportCellStatus({ ...base, record: 'present', isHoliday: true })).toBe('holiday')
  })

  it('marks the WEB present status as present', () => {
    expect(reportCellStatus({ ...base, record: 'present' })).toBe('present')
  })

  it('marks an explicit absent record as absent', () => {
    expect(reportCellStatus({ ...base, record: 'absent' })).toBe('absent')
  })

  it('treats unknown recorded statuses as non-present, matching WEB', () => {
    expect(reportCellStatus({ ...base, record: 'late' })).toBe('absent')
  })

  it('marks a past date unmarked when the class has no record for that date/type', () => {
    expect(reportCellStatus({ ...base, classHasAnyRecord: false })).toBe('unmarked')
  })

  it('marks a past missing student record absent when the class was marked', () => {
    expect(reportCellStatus({ ...base, record: null })).toBe('absent')
  })

  it('marks today unmarked even when another student was marked', () => {
    expect(reportCellStatus({
      ...base,
      date: '2026-09-29',
      record: undefined,
    })).toBe('unmarked')
  })

  it('marks a future missing record unmarked', () => {
    expect(reportCellStatus({
      ...base,
      date: '2026-10-01',
      record: undefined,
    })).toBe('unmarked')
  })

  it('maps report statuses to the required symbols', () => {
    expect(REPORT_CELL_SYMBOL).toEqual({ present: 'X', absent: '', unmarked: '-' })
  })
})

describe('countReportCells', () => {
  it('counts each report status independently', () => {
    expect(countReportCells([
      'present', 'present', 'absent', 'unmarked', 'holiday',
    ])).toEqual({ present: 2, absent: 1, unmarked: 1, holiday: 1 })
  })

  it('returns zero counts for an empty report', () => {
    expect(countReportCells([])).toEqual({ present: 0, absent: 0, unmarked: 0, holiday: 0 })
  })
})

describe('reportTotalAttendance', () => {
  it('adds full attendance and half credit for partial Sunday attendance', () => {
    expect(reportTotalAttendance(4, 6, 2)).toBe(11)
  })

  it('returns the weekday and full-session totals when there are no partial sessions', () => {
    expect(reportTotalAttendance(4, 6, 0)).toBe(10)
  })
})
