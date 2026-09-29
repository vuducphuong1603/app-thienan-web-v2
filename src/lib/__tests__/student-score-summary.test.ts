import { describe, expect, it } from 'vitest'
import { attendanceScores, scoreSummary } from '../score-summary'
import {
  calculateStudentScoreDetails,
  countPresentAttendance,
} from '../student-score-summary'

describe('student score summary', () => {
  it('counts records by student and ignores absent/unknown sessions', () => {
    const counts = countPresentAttendance([
      { student_id: 's1', day_type: 'thu5', status: 'present' },
      { student_id: 's1', day_type: 'cn', status: 'present' },
      { student_id: 's1', day_type: 'cn_le', status: 'present' },
      { student_id: 's1', day_type: 'cn', status: 'absent' },
      { student_id: 's1', day_type: 'holiday', status: 'present' },
      { student_id: 's2', day_type: 'thu5' },
    ])

    expect(counts.get('s1')).toEqual({ thu5: 1, cn: 1, cnLe: 1 })
    expect(counts.get('s2')).toEqual({ thu5: 1, cn: 0, cnLe: 0 })
  })

  it('makes the management-list total equal the score-report total from records', () => {
    const records = [
      ...Array.from({ length: 2 }, () => ({ student_id: 's1', day_type: 'thu5' })),
      ...Array.from({ length: 3 }, () => ({ student_id: 's1', day_type: 'cn' })),
      { student_id: 's1', day_type: 'cn_le' },
    ]
    const counts = countPresentAttendance(records)
    const effectiveDays = { thu5: 4, cn: 4 }
    const student = {
      score_45_hk1: 7,
      score_exam_hk1: 8,
      score_45_hk2: 9,
      score_exam_hk2: 10,
    }

    const reportAttendance = attendanceScores(counts.get('s1')!, effectiveDays)
    const reportSummary = scoreSummary({
      ...student,
      t5: reportAttendance.diem_t5,
      cn: reportAttendance.diem_gl,
    })
    const reportTotal = reportSummary.tbNam === null
      ? null
      : Math.round((reportSummary.tbNam * 0.6 + reportAttendance.diem_tb * 0.4) * 100) / 100

    const listDetails = calculateStudentScoreDetails(student, counts.get('s1'), effectiveDays)

    expect(listDetails.total_avg).toBe(reportTotal)
    expect(listDetails.attendance_cn).toBe(2)
    expect(listDetails.avg_attendance).toBe(reportAttendance.diem_tb)
  })

  it('keeps class-detail score fields aligned with the record-based list path', () => {
    const records = [
      { student_id: 's1', day_type: 'thu5' },
      { student_id: 's1', day_type: 'thu5' },
      { student_id: 's1', day_type: 'cn' },
      { student_id: 's1', day_type: 'cn_le' },
    ]
    const counts = countPresentAttendance(records).get('s1')
    const scoreInput = {
      score_45_hk1: 6,
      score_exam_hk1: 7,
      score_45_hk2: 8,
      score_exam_hk2: 9,
    }
    const effectiveDays = { thu5: 4, cn: 4 }
    const listDetails = calculateStudentScoreDetails(scoreInput, counts, effectiveDays)
    const classDetails = {
      attendance_thu5: listDetails.attendance_thu5,
      attendance_cn: listDetails.attendance_cn,
      avgCatechism: listDetails.avg_catechism,
      avgAttendance: listDetails.avg_attendance,
      totalAvg: listDetails.total_avg,
    }

    expect(classDetails).toEqual({
      attendance_thu5: 2,
      attendance_cn: 1,
      avgCatechism: 8,
      avgAttendance: 3.5,
      totalAvg: 6.2,
    })
    expect(classDetails.totalAvg).toBe(listDetails.total_avg)
  })

  it('returns a null total when any catechism score is missing', () => {
    const details = calculateStudentScoreDetails(
      {
        score_45_hk1: null,
        score_exam_hk1: 8,
        score_45_hk2: 9,
        score_exam_hk2: 10,
      },
      { thu5: 2, cn: 2, cnLe: 2 },
      { thu5: 4, cn: 4 },
    )

    expect(details.avg_catechism).toBeNull()
    expect(details.total_avg).toBeNull()
  })
})
