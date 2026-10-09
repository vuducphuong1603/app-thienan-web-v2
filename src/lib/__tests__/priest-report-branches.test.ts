import { describe, expect, it } from 'vitest'
import {
  buildPriestReportBranches,
  isPriestReportClass,
  type PriestAbsentWarning,
  type PriestAttendanceRecord,
  type PriestReportBranchGroup,
  type PriestSessionDates,
  type PriestStudent,
} from '@/lib/priest-report'

const emptySessions: PriestSessionDates = { thu5: [], cn: [] }

describe('isPriestReportClass', () => {
  it('keeps ordinary classes', () => {
    expect(isPriestReportClass({ name: 'Lớp Ấu 1', display_order: 4 })).toBe(true)
  })

  it('excludes demo names and display_order 999', () => {
    expect(isPriestReportClass({ name: 'Demo review class', display_order: 4 })).toBe(false)
    expect(isPriestReportClass({ name: 'Lớp đặc biệt', display_order: 999 })).toBe(false)
  })
})

function student(id: string, class_id: string | null, saint_name: string | null = null, full_name = id): PriestStudent {
  return {
    id,
    saint_name,
    full_name,
    class_id,
    parent_phone: null,
    parent_phone_2: null,
  }
}

function attendance(student_id: string, day_type: string, attendance_date: string): PriestAttendanceRecord {
  return { student_id, status: 'present', day_type, attendance_date }
}

function assemble(input: Partial<Parameters<typeof buildPriestReportBranches>[0]> = {}): PriestReportBranchGroup[] {
  return buildPriestReportBranches({
    classes: [{ id: 'c1', name: 'Lớp A', branch: 'Chiên Con', display_order: 1 }],
    branchOrder: ['Chiên Con'],
    students: [],
    sessions: emptySessions,
    records: [],
    prevSessions: null,
    prevRecords: [],
    warnings: [],
    ...input,
  })
}

describe('buildPriestReportBranches', () => {
  it('groups branches in branchOrder and sorts classes by display_order with nulls last', () => {
    const groups = assemble({
      branchOrder: ['Ấu Nhi', 'Chiên Con'],
      classes: [
        { id: 'c-null', name: 'Cuối', branch: 'Chiên Con', display_order: null },
        { id: 'a2', name: 'Ấu B', branch: 'Ấu Nhi', display_order: 2 },
        { id: 'c2', name: 'Chiên B', branch: 'Chiên Con', display_order: 2 },
        { id: 'c1', name: 'Chiên A', branch: 'Chiên Con', display_order: 1 },
        { id: 'a1', name: 'Ấu A', branch: 'Ấu Nhi', display_order: 1 },
      ],
    })

    expect(groups.map((group) => group.branch)).toEqual(['Ấu Nhi', 'Chiên Con'])
    expect(groups[0].classes.map((row) => row.className)).toEqual(['Ấu A', 'Ấu B'])
    expect(groups[1].classes.map((row) => row.className)).toEqual(['Chiên A', 'Chiên B', 'Cuối'])
  })

  it('skips empty branches and excludes Demo and display_order 999 classes', () => {
    const groups = assemble({
      branchOrder: ['Chiên Con', 'Thiếu Nhi'],
      classes: [
        { id: 'normal', name: 'Lớp thường', branch: 'Chiên Con', display_order: 1 },
        { id: 'demo-name', name: 'Lớp Demo', branch: 'Chiên Con', display_order: 2 },
        { id: 'demo-order', name: 'Lớp đặc biệt', branch: 'Chiên Con', display_order: 999 },
      ],
    })

    expect(groups).toHaveLength(1)
    expect(groups[0].classes.map((row) => row.classId)).toEqual(['normal'])
  })

  it('computes Thursday and giáo lý absences from matching current sessions only', () => {
    const groups = assemble({
      students: [student('s1', 'c1'), student('s2', 'c1'), student('s3', 'c1')],
      sessions: { thu5: ['2026-09-17'], cn: ['2026-09-20'] },
      records: [
        attendance('s1', 'thu5', '2026-09-17'),
        attendance('s2', 'cn_le', '2026-09-20'),
        attendance('s3', 'cn', '2026-09-20'),
      ],
    })

    expect(groups[0].classes[0]).toMatchObject({ studentCount: 3, thu5Absent: 2, cnAbsent: 2 })
  })

  it('sets absent counts to zero when the corresponding session list is empty', () => {
    const groups = assemble({
      students: [student('s1', 'c1'), student('s2', 'c1')],
      sessions: emptySessions,
      records: [],
    })

    expect(groups[0].classes[0]).toMatchObject({ studentCount: 2, thu5Absent: 0, cnAbsent: 0 })
  })

  it('computes previous rates and returns null when no previous sessions exist', () => {
    const students = [student('s1', 'c1'), student('s2', 'c1'), student('s3', 'c1')]
    const groups = assemble({
      students,
      prevSessions: { thu5: ['2026-08-20'], cn: ['2026-08-23'] },
      prevRecords: [
        attendance('s1', 'thu5', '2026-08-20'),
        attendance('s2', 'thu5', '2026-08-20'),
        attendance('s2', 'cn', '2026-08-23'),
        attendance('s3', 'cn', '2026-08-23'),
      ],
    })

    expect(groups[0].classes[0]).toMatchObject({ prevThu5Rate: 2 / 3, prevCnRate: 2 / 3 })

    const noPreviousSessions = assemble({
      students,
      prevSessions: emptySessions,
      prevRecords: [attendance('s1', 'thu5', '2026-08-20')],
    })
    expect(noPreviousSessions[0].classes[0]).toMatchObject({ prevThu5Rate: null, prevCnRate: null })

    const noPreviousWindow = assemble({ students, prevSessions: null })
    expect(noPreviousWindow[0].classes[0]).toMatchObject({ prevThu5Rate: null, prevCnRate: null })
  })

  it('preserves warning order, builds names, and appends the class note', () => {
    const groups = assemble({
      students: [
        student('s1', 'c1', 'Micae', 'Nguyễn An'),
        student('s2', 'c1', 'Maria', 'Trần Bình'),
        student('s3', 'c1'),
        student('s4', 'c1'),
        student('other', 'c2', 'Gioan', 'Lê Cường'),
      ],
      sessions: { thu5: ['2026-09-17'], cn: ['2026-09-20'] },
      warnings: [
        { studentId: 's2', saintName: 'Maria', fullName: 'Trần Bình', className: 'Lớp A', parentPhones: [] },
        { studentId: 'other', saintName: 'Gioan', fullName: 'Lê Cường', className: 'Lớp B', parentPhones: [] },
        { studentId: 's1', saintName: 'Micae', fullName: 'Nguyễn An', className: 'Lớp A', parentPhones: [] },
      ] satisfies PriestAbsentWarning[],
    })

    expect(groups[0].classes[0]).toMatchObject({
      thu5Absent: 4,
      cnAbsent: 4,
      warnedNames: ['Maria Trần Bình', 'Micae Nguyễn An'],
      note: 'Thứ 5 và CN\nVắng 2 tháng:\nMaria Trần Bình\nMicae Nguyễn An',
    })
  })

  it('keeps a class with zero active students and returns null previous rates', () => {
    const groups = assemble({
      students: [],
      sessions: { thu5: ['2026-09-17'], cn: ['2026-09-20'] },
      prevSessions: { thu5: ['2026-08-20'], cn: ['2026-08-23'] },
    })

    expect(groups[0].classes).toHaveLength(1)
    expect(groups[0].classes[0]).toMatchObject({
      studentCount: 0,
      thu5Absent: 0,
      cnAbsent: 0,
      prevThu5Rate: null,
      prevCnRate: null,
    })
  })

  it('uses the branch label helper for each group', () => {
    const groups = assemble({
      classes: [{ id: 'c1', name: 'Lớp A', branch: 'Chiên Con', display_order: 1 }],
    })
    expect(groups[0].label).toBe('CHIÊN CON')
  })
})
