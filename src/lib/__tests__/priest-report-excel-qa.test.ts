import { describe, expect, it } from 'vitest'
import {
  buildAbsentWarnings,
  buildPriestReportBranches,
  formatSessionDateList,
  presentIdsOnSessions,
  priestPreviousWindow,
  sessionDates,
  type PriestAttendanceRecord,
  type PriestStudent,
} from '@/lib/priest-report'

const student = (id: string): PriestStudent => ({
  id, saint_name: 'Maria', full_name: id, class_id: 'class-1', parent_phone: null, parent_phone_2: null,
})
const record = (student_id: string, day_type: string, attendance_date: string, status = 'present'): PriestAttendanceRecord => ({
  student_id, day_type, attendance_date, status,
})

describe('priest Excel adversarial calculation cases', () => {
  it('removes each day when both is used on both Thursday and Sunday', () => {
    expect(sessionDates('2026-09-17', '2026-09-20', [
      { holiday_date: '2026-09-17', day_type: 'both' },
      { holiday_date: '2026-09-20', day_type: 'both' },
    ])).toEqual({ thu5: [], cn: [] })
  })

  it('returns no sessions when the entire window precedes the school year', () => {
    expect(sessionDates('2026-08-01', '2026-08-31', [], {
      clipFrom: '2026-09-13', clipTo: '2027-06-30',
    })).toEqual({ thu5: [], cn: [] })
  })

  it('returns no sessions when the entire window follows the school year', () => {
    expect(sessionDates('2027-07-01', '2027-07-31', [], {
      clipFrom: '2026-09-13', clipTo: '2027-06-30',
    })).toEqual({ thu5: [], cn: [] })
  })

  it('clips to today in the middle of a month, including today', () => {
    expect(sessionDates('2026-10-01', '2026-10-31', [], { clipTo: '2026-10-11' })).toEqual({
      thu5: ['2026-10-01', '2026-10-08'], cn: ['2026-10-04', '2026-10-11'],
    })
  })

  it('uses December of the prior year as January custom previous window', () => {
    expect(priestPreviousWindow('custom', '2026-01-31')).toEqual({
      from: '2025-12-01', to: '2025-12-31', label: 'Tháng 12/2025',
    })
  })

  it('counts cn_le-only student as absent from GL but present for warning calculation', () => {
    const pupils = [student('mass-only')]
    const sessions = { thu5: ['2026-09-17'], cn: ['2026-09-20'] }
    const records = [record('mass-only', 'cn_le', '2026-09-20')]
    const presentAny = presentIdsOnSessions(records, sessions, 'any')
    const warnings = buildAbsentWarnings(pupils, [{ id: 'class-1', name: 'A', display_order: 1 }], presentAny, new Set())
    const branches = buildPriestReportBranches({
      classes: [{ id: 'class-1', name: 'A', branch: 'Ấu Nhi', display_order: 1 }],
      branchOrder: ['Ấu Nhi'], students: pupils, sessions, records,
      prevSessions: null, prevRecords: [], warnings,
    })
    expect(branches[0].classes[0].cnAbsent).toBe(1)
    expect(warnings).toEqual([])
  })

  it('deduplicates multiple valid attendance records for one student', () => {
    const sessions = { thu5: ['2026-09-17'], cn: [] }
    const records = [record('present', 'thu5', '2026-09-17'), record('present', 'thu5', '2026-09-17')]
    expect([...presentIdsOnSessions(records, sessions, 'thu5')]).toEqual(['present'])
  })

  it('formats unsorted dates in chronological month and day order', () => {
    expect(formatSessionDateList(['2026-10-04', '2026-09-27', '2026-09-13'])).toBe('13,27/09 và 4/10')
  })

  it('ignores absent status even on a valid session', () => {
    const sessions = { thu5: ['2026-09-17'], cn: ['2026-09-20'] }
    const records = [record('absent-thu5', 'thu5', '2026-09-17', 'absent'), record('absent-cn', 'cn', '2026-09-20', 'absent')]
    expect(presentIdsOnSessions(records, sessions, 'any').size).toBe(0)
  })

  it('rejects holiday and non-session records even when marked present', () => {
    const sessions = sessionDates('2026-09-17', '2026-09-20', [{ holiday_date: '2026-09-17', day_type: 'thu5' }])
    const records = [record('holiday', 'thu5', '2026-09-17'), record('monday', 'cn', '2026-09-21')]
    expect(presentIdsOnSessions(records, sessions, 'any').size).toBe(0)
  })
})
