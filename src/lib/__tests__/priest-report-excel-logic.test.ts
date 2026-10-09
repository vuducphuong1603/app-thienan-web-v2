import { describe, expect, it } from 'vitest'
import {
  formatSessionDateList,
  presentIdsOnSessions,
  priestBranchLabel,
  priestClassNote,
  priestPeriodLabel,
  priestPreviousWindow,
  priestSubtitleLines,
  sessionDates,
  type PriestAttendanceRecord,
  type PriestSessionDates,
} from '@/lib/priest-report'

describe('sessionDates', () => {
  it('collects Thursdays and Sundays in an inclusive date range', () => {
    expect(sessionDates('2026-09-01', '2026-09-13', [])).toEqual({
      thu5: ['2026-09-03', '2026-09-10'],
      cn: ['2026-09-06', '2026-09-13'],
    })
  })

  it('a thu5 holiday removes a Thursday session only', () => {
    expect(sessionDates('2026-09-17', '2026-09-20', [
      { holiday_date: '2026-09-17', day_type: 'thu5' },
    ])).toEqual({ thu5: [], cn: ['2026-09-20'] })
  })

  it('a cn holiday removes a Sunday session only', () => {
    expect(sessionDates('2026-09-17', '2026-09-20', [
      { holiday_date: '2026-09-20', day_type: 'cn' },
    ])).toEqual({ thu5: ['2026-09-17'], cn: [] })
  })

  it('a both holiday removes sessions of both types on its date', () => {
    expect(sessionDates('2026-09-17', '2026-09-20', [
      { holiday_date: '2026-09-17', day_type: 'both' },
      { holiday_date: '2026-09-20', day_type: 'both' },
    ])).toEqual({ thu5: [], cn: [] })
  })

  it('clips sessions to school-year start and end dates', () => {
    expect(sessionDates('2026-08-20', '2026-09-10', [], {
      clipFrom: '2026-08-30',
      clipTo: '2026-09-06',
    })).toEqual({ thu5: ['2026-09-03'], cn: ['2026-08-30', '2026-09-06'] })
  })

  it('clips the range at the supplied today date', () => {
    expect(sessionDates('2026-09-03', '2026-09-20', [], { clipTo: '2026-09-10' })).toEqual({
      thu5: ['2026-09-03', '2026-09-10'],
      cn: ['2026-09-06'],
    })
  })

  it('returns empty sessions when clipping leaves no intersection', () => {
    expect(sessionDates('2026-09-01', '2026-09-10', [], { clipFrom: '2026-09-11' })).toEqual({
      thu5: [],
      cn: [],
    })
  })

  it('keeps dates on both sides of a month boundary in ascending order', () => {
    expect(sessionDates('2026-09-24', '2026-10-04', [])).toEqual({
      thu5: ['2026-09-24', '2026-10-01'],
      cn: ['2026-09-27', '2026-10-04'],
    })
  })
})

describe('formatSessionDateList', () => {
  it('formats two month groups with the final group joined by và', () => {
    expect(formatSessionDateList(['2026-09-17', '2026-09-24', '2026-10-01'])).toBe('17,24/09 và 1/10')
  })

  it('formats three month groups with commas and a final và', () => {
    expect(formatSessionDateList(['2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-11-01']))
      .toBe('13,20,27/09, 4/10 và 1/11')
  })

  it('formats an empty date list as không có buổi', () => {
    expect(formatSessionDateList([])).toBe('không có buổi')
  })
})

describe('presentIdsOnSessions', () => {
  const sessions: PriestSessionDates = { thu5: ['2026-09-17'], cn: ['2026-09-20'] }
  const record = (student_id: string, day_type: string, attendance_date: string, status = 'present'): PriestAttendanceRecord => ({
    student_id,
    status,
    day_type,
    attendance_date,
  })

  it('counts only cn, not cn_le, for giáo lý attendance', () => {
    const records = [record('cn', 'cn', '2026-09-20'), record('mass-only', 'cn_le', '2026-09-20')]
    expect([...presentIdsOnSessions(records, sessions, 'cn')]).toEqual(['cn'])
  })

  it('counts cn_le as attendance for any-presence warnings', () => {
    const records = [record('mass-only', 'cn_le', '2026-09-20')]
    expect([...presentIdsOnSessions(records, sessions, 'any')]).toEqual(['mass-only'])
  })

  it('ignores records on holidays or other non-session dates', () => {
    const sessionsWithoutHoliday: PriestSessionDates = { thu5: [], cn: ['2026-09-20'] }
    const records = [
      record('holiday', 'thu5', '2026-09-17'),
      record('not-session', 'cn', '2026-09-27'),
      record('real-session', 'cn', '2026-09-20'),
    ]
    expect([...presentIdsOnSessions(records, sessionsWithoutHoliday, 'any')]).toEqual(['real-session'])
  })

  it('requires present status and matching session day type', () => {
    const records = [
      record('absent', 'thu5', '2026-09-17', 'absent'),
      record('wrong-type', 'cn', '2026-09-17'),
      record('thu5', 'thu5', '2026-09-17'),
    ]
    expect([...presentIdsOnSessions(records, sessions, 'thu5')]).toEqual(['thu5'])
  })
})

describe('priestClassNote', () => {
  it('adds a Thursday attention note when at least four students are absent', () => {
    expect(priestClassNote(4, 2, [])).toBe('Thứ 5')
  })

  it('adds a Sunday attention note when at least three students are absent', () => {
    expect(priestClassNote(3, 3, [])).toBe('CN')
  })

  it('combines Thursday and Sunday attention notes at their thresholds', () => {
    expect(priestClassNote(4, 3, [])).toBe('Thứ 5 và CN')
  })

  it('returns an empty note below both thresholds', () => {
    expect(priestClassNote(3, 2, [])).toBe('')
  })

  it('appends trimmed two-month warning names after attention text', () => {
    expect(priestClassNote(4, 0, ['  Maria Nguyễn An  ', 'Giuse Trần Bình', ' ']))
      .toBe('Thứ 5\nVắng 2 tháng:\nMaria Nguyễn An\nGiuse Trần Bình')
  })
})

describe('priestBranchLabel', () => {
  it.each([
    ['Chiên Con', 'CHIÊN CON'],
    ['Ấu Nhi', 'ẤU'],
    ['Thiếu Nhi', 'THIẾU'],
    ['Nghĩa Sĩ', 'NGHĨA'],
    ['Nhánh Mới', 'NHÁNH MỚI'],
  ])('maps %s to %s', (branch, label) => {
    expect(priestBranchLabel(branch)).toBe(label)
  })
})

describe('priestPreviousWindow', () => {
  it('returns the previous December for January month mode', () => {
    expect(priestPreviousWindow('month', '2026-01-15')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
      label: 'Tháng 12/2025',
    })
  })

  it('uses the previous calendar month for custom mode', () => {
    expect(priestPreviousWindow('custom', '2026-03-15')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      label: 'Tháng 2/2026',
    })
  })

  it.each(['week', 'year'] as const)('returns null in %s mode', (mode) => {
    expect(priestPreviousWindow(mode, '2026-03-15')).toBeNull()
  })
})

describe('priest period and subtitle labels', () => {
  it('formats a month period label', () => {
    expect(priestPeriodLabel('month', '2026-09-01', '2026-09-30')).toBe('tháng 9/2026')
  })

  it('formats week and custom period labels with padded dates', () => {
    expect(priestPeriodLabel('week', '2026-09-03', '2026-09-06')).toBe('từ 03/09/2026 đến 06/09/2026')
    expect(priestPeriodLabel('custom', '2026-09-17', '2026-10-01')).toBe('từ 17/09/2026 đến 01/10/2026')
  })

  it('formats a school year label', () => {
    expect(priestPeriodLabel('year', '2026-08-01', '2027-07-31', '2026-2027'))
      .toBe('năm học 2026 - 2027')
  })

  it('creates the two template subtitle lines from the period and session dates', () => {
    expect(priestSubtitleLines('tháng 9/2026', {
      thu5: ['2026-09-17', '2026-09-24', '2026-10-01'],
      cn: ['2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04'],
    })).toEqual([
      'Tỉ lệ thiếu nhi đi ít nhất 01 ngày trong tháng: (tháng 9/2026)',
      '*T5 ngày 17,24/09 và 1/10  ;  *GL ngày 13,20,27/09 và 4/10',
    ])
  })
})
