import {
  attendanceScores,
  scoreSummary,
  type Score,
} from './score-summary'

export interface StudentAttendanceCounts {
  thu5: number
  cn: number
  cnLe: number
}

export interface PresentAttendanceRecord {
  student_id: string
  day_type: string
  status?: string | null
}

export interface StudentScoreInput {
  score_45_hk1: Score
  score_exam_hk1: Score
  score_45_hk2: Score
  score_exam_hk2: Score
}

export interface StudentScoreDetails {
  avg_catechism: number | null
  attendance_thu5: number
  attendance_cn: number
  score_thu5: number
  score_cn: number
  avg_attendance: number
  total_avg: number | null
}

const emptyAttendanceCounts = (): StudentAttendanceCounts => ({
  thu5: 0,
  cn: 0,
  cnLe: 0,
})

/** Count present records by student, keeping the two Sunday sessions separate. */
export function countPresentAttendance(
  records: readonly PresentAttendanceRecord[],
): Map<string, StudentAttendanceCounts> {
  const countsByStudent = new Map<string, StudentAttendanceCounts>()

  records.forEach(record => {
    if (record.status && record.status !== 'present') return

    const counts = countsByStudent.get(record.student_id) || emptyAttendanceCounts()
    if (record.day_type === 'thu5') counts.thu5++
    else if (record.day_type === 'cn') counts.cn++
    else if (record.day_type === 'cn_le') counts.cnLe++
    else return
    countsByStudent.set(record.student_id, counts)
  })

  return countsByStudent
}

/**
 * Calculate the management-list scores using the same attendance and score
 * helpers as the score report. Stored attendance columns are intentionally not
 * part of this calculation because they can lag behind attendance_records.
 */
export function calculateStudentScoreDetails(
  student: StudentScoreInput,
  counts: StudentAttendanceCounts = emptyAttendanceCounts(),
  effectiveDays: { thu5: number; cn: number },
): StudentScoreDetails {
  const attendance = attendanceScores(counts, effectiveDays)
  const summary = scoreSummary({
    ...student,
    t5: attendance.diem_t5,
    cn: attendance.diem_gl,
  })

  const score_thu5 = Math.round(attendance.diem_t5 * 0.4 * 100) / 100
  const score_cn = Math.round(((attendance.diem_gl + attendance.diem_le_cn) / 2) * 0.6 * 100) / 100
  const total_avg = summary.tbNam === null
    ? null
    : Math.round((summary.tbNam * 0.6 + attendance.diem_tb * 0.4) * 100) / 100

  return {
    avg_catechism: summary.tbNam,
    attendance_thu5: counts.thu5,
    attendance_cn: (counts.cn + counts.cnLe) / 2,
    score_thu5,
    score_cn,
    avg_attendance: attendance.diem_tb,
    total_avg,
  }
}
