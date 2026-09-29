import { describe, expect, it } from 'vitest'
import { getEdgeFunctionErrorMessage } from '../edge-function-error'
import { filterByBranch, getBranchScope, scopedBranches } from '../branch-scope'
import { loginIdentifierToEmail, normalizePhone } from '../login-identifier'
import { attendanceScores, scoreSummary } from '../score-summary'
import { calculateStudentScoreDetails, countPresentAttendance } from '../student-score-summary'
import { filterActiveNamedTeachers } from '../teacher-scope'

// QA edge cases for team "harden" (H1, H2, H3, H4). Source files are read-only for QA.

describe('QA H1 — login identifier', () => {
  it('maps every phone spelling of one account to the same auth email', () => {
    const spellings = ['0981981614', ' 0981981614 ', '0981 981 614', '0981.981.614', '+84981981614', '84981981614']
    for (const spelling of spellings) {
      expect(loginIdentifierToEmail(spelling)).toBe('0981981614@thienan.app')
    }
  })

  it('gives the same result as the previous web phoneToEmail for plain phones', () => {
    const previous = (phone: string) => {
      let normalized = phone.trim().replace(/\s/g, '')
      if (normalized.startsWith('+84')) normalized = '0' + normalized.slice(3)
      if (normalized.startsWith('84') && normalized.length === 11) normalized = '0' + normalized.slice(2)
      return `${normalized}@thienan.app`
    }
    for (const phone of ['0981981614', '+84981981614', '84981981614', ' 0981 981 614 ', '0012345678']) {
      expect(loginIdentifierToEmail(phone)).toBe(previous(phone))
    }
  })

  it('passes existing emails through, lowercased', () => {
    expect(loginIdentifierToEmail('Teresa.Hoa@thienan.local')).toBe('teresa.hoa@thienan.local')
    expect(loginIdentifierToEmail(' Someone@Gmail.com ')).toBe('someone@gmail.com')
  })

  it('is idempotent', () => {
    const email = loginIdentifierToEmail('0981981614')
    expect(loginIdentifierToEmail(email)).toBe(email)
    expect(normalizePhone(normalizePhone('+84 981 981 614'))).toBe('0981981614')
  })

  it('never produces an email containing whitespace', () => {
    expect(loginIdentifierToEmail('(098) 198 1614')).not.toMatch(/\s/)
  })

  // QA finding #6 residual (MINOR, open): blank input still gives an empty local part.
  // Assertion restored by QA in round 2; flip to `it` when fixed.
  it.fails('never produces an email with an empty local part', () => {
    expect(loginIdentifierToEmail('   ')).not.toMatch(/^@/)
  })

  it('QA r2: accepts phones typed with brackets, slashes or a bracketed country code', () => {
    for (const typed of ['(098) 198 1614', '098/198/1614', '(+84) 981 981 614', '+84 (0)981981614'.replace('(0)', ''), '0981_981_614']) {
      expect(loginIdentifierToEmail(typed)).toBe('0981981614@thienan.app')
    }
  })

  // QA finding #12 (MINOR, open): a leading + that is not +84 is kept. Flip to `it` when fixed.
  it.fails('QA r2: a leading plus never survives into the result', () => {
    expect(normalizePhone('+')).toBe('')
    expect(normalizePhone('+1 202 555 0100')).toMatch(/^\d+$/)
  })

  it('QA r2: a plus sign that is not leading is ignored', () => {
    expect(normalizePhone('0981+981614')).toBe('0981981614')
  })

  it('QA r2: result is always digits only, and idempotent', () => {
    for (const typed of ['glv001', 'abc', '０９８１', '+84', '84', ' 0981 981 614 ']) {
      const once = normalizePhone(typed)
      expect(once).toMatch(/^\d*$/)
      expect(normalizePhone(once)).toBe(once)
    }
  })
})

describe('QA H2 — report scope', () => {
  const classes = [
    { id: 'c1', branch: 'Chiên Con' },
    { id: 'c2', branch: 'Nghĩa Sĩ' },
    { id: 'c3', branch: null },
  ]

  it('PĐT sees only own branch and classes', () => {
    const scope = getBranchScope({ role: 'phan_doan_truong', branch: 'Nghĩa Sĩ' })
    expect(filterByBranch(classes, scope).map((c) => c.id)).toEqual(['c2'])
    expect(scopedBranches(scope)).toEqual(['Nghĩa Sĩ'])
  })

  it('PĐT without a branch sees nothing', () => {
    const scope = getBranchScope({ role: 'phan_doan_truong', branch: null })
    expect(filterByBranch(classes, scope)).toEqual([])
    expect(scopedBranches(scope)).toEqual([])
  })

  it('admin and giáo lý viên see everything', () => {
    for (const role of ['admin', 'giao_ly_vien'] as const) {
      expect(filterByBranch(classes, getBranchScope({ role, branch: 'Nghĩa Sĩ' }))).toHaveLength(3)
    }
  })
})

describe('QA H3 — teacher picker', () => {
  it('drops inactive, status-less and nameless users', () => {
    const rows = [
      { id: 'ok', status: 'ACTIVE', full_name: 'Nguyễn Văn Ân' },
      { id: 'inactive', status: 'INACTIVE', full_name: 'Trần Thị B' },
      { id: 'null-status', status: null, full_name: 'Lê C' },
      { id: 'no-status', full_name: 'Lê D' },
      { id: 'null-name', status: 'ACTIVE', full_name: null },
      { id: 'empty-name', status: 'ACTIVE', full_name: '' },
      { id: 'blank-name', status: 'ACTIVE', full_name: ' \t\n ' },
    ]
    expect(filterActiveNamedTeachers(rows).map((row) => row.id)).toEqual(['ok'])
  })
})

describe('QA H4 — list total from attendance records', () => {
  const fullScores = { score_45_hk1: 7, score_exam_hk1: 8, score_45_hk2: 9, score_exam_hk2: 10 }

  const reportTotal = (
    student: typeof fullScores | Record<keyof typeof fullScores, number | null>,
    counts: { thu5: number; cn: number; cnLe: number },
    days: { thu5: number; cn: number },
  ) => {
    const attendance = attendanceScores(counts, days)
    const summary = scoreSummary({ ...student, t5: attendance.diem_t5, cn: attendance.diem_gl })
    return summary.tbNam === null
      ? null
      : Math.round((summary.tbNam * 0.6 + attendance.diem_tb * 0.4) * 100) / 100
  }

  it('equals the report formula over a grid of attendance counts', () => {
    const days = { thu5: 37, cn: 41 }
    for (let thu5 = 0; thu5 <= 40; thu5 += 5) {
      for (let cn = 0; cn <= 45; cn += 9) {
        for (let cnLe = 0; cnLe <= 45; cnLe += 15) {
          const counts = { thu5, cn, cnLe }
          expect(calculateStudentScoreDetails(fullScores, counts, days).total_avg)
            .toBe(reportTotal(fullScores, counts, days))
        }
      }
    }
  })

  it('a student with no attendance records gets 0 attendance, not NaN', () => {
    const details = calculateStudentScoreDetails(fullScores, undefined, { thu5: 37, cn: 41 })
    expect(details.avg_attendance).toBe(0)
    expect(details.attendance_thu5).toBe(0)
    expect(details.attendance_cn).toBe(0)
    expect(Number.isFinite(details.total_avg)).toBe(true)
  })

  it('never returns NaN or Infinity when effective days are 0', () => {
    const details = calculateStudentScoreDetails(fullScores, { thu5: 3, cn: 3, cnLe: 3 }, { thu5: 0, cn: 0 })
    for (const value of [details.score_thu5, details.score_cn, details.avg_attendance, details.total_avg]) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('caps attendance at 10 when records exceed effective days', () => {
    const details = calculateStudentScoreDetails(fullScores, { thu5: 99, cn: 99, cnLe: 99 }, { thu5: 10, cn: 10 })
    expect(details.avg_attendance).toBe(10)
    expect(details.total_avg).toBeLessThanOrEqual(10)
  })

  it('score_thu5 + score_cn add up to avg_attendance (columns shown side by side)', () => {
    const details = calculateStudentScoreDetails(fullScores, { thu5: 17, cn: 23, cnLe: 11 }, { thu5: 37, cn: 41 })
    expect(Math.abs(details.score_thu5 + details.score_cn - details.avg_attendance)).toBeLessThanOrEqual(0.011)
  })

  it('NULL score → null total, and a real 0 is kept as 0', () => {
    const days = { thu5: 10, cn: 10 }
    const counts = { thu5: 10, cn: 10, cnLe: 10 }
    for (const key of Object.keys(fullScores) as (keyof typeof fullScores)[]) {
      const withNull = { ...fullScores, [key]: null }
      expect(calculateStudentScoreDetails(withNull, counts, days).total_avg).toBeNull()
      const withUndefined = { ...fullScores, [key]: undefined }
      expect(calculateStudentScoreDetails(withUndefined, counts, days).total_avg).toBeNull()
    }
    const zeros = { score_45_hk1: 0, score_exam_hk1: 0, score_45_hk2: 0, score_exam_hk2: 0 }
    expect(calculateStudentScoreDetails(zeros, counts, days).avg_catechism).toBe(0)
    expect(calculateStudentScoreDetails(zeros, counts, days).total_avg).toBe(4)
  })

  it('counts per student without sharing state between students', () => {
    const counts = countPresentAttendance([
      { student_id: 'a', day_type: 'thu5' },
      { student_id: 'b', day_type: 'thu5' },
      { student_id: 'b', day_type: 'cn_le' },
    ])
    expect(counts.get('a')).toEqual({ thu5: 1, cn: 0, cnLe: 0 })
    expect(counts.get('b')).toEqual({ thu5: 1, cn: 0, cnLe: 1 })
    expect(counts.get('missing')).toBeUndefined()
  })

  it('does not create an entry for a student whose only records are unknown day types', () => {
    const counts = countPresentAttendance([{ student_id: 'a', day_type: 'both' }])
    expect(counts.has('a')).toBe(false)
    expect(countPresentAttendance([]).size).toBe(0)
  })

  it('handles 60k records', () => {
    const records = Array.from({ length: 60000 }, (_, i) => ({
      student_id: `s${i % 1500}`,
      day_type: i % 3 === 0 ? 'thu5' : i % 3 === 1 ? 'cn' : 'cn_le',
    }))
    const counts = countPresentAttendance(records)
    expect(counts.size).toBe(1500)
    const total = [...counts.values()].reduce((sum, c) => sum + c.thu5 + c.cn + c.cnLe, 0)
    expect(total).toBe(60000)
  })
})

describe('QA r2 — edge function error message (#1)', () => {
  const httpError = (payload: unknown) => ({
    message: 'Edge Function returned a non-2xx status code',
    context: { json: async () => payload },
  })

  it('returns the body error for a real Response context', async () => {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 }),
    }
    await expect(getEdgeFunctionErrorMessage(error)).resolves.toBe('Invalid phone number')
  })

  it('falls back when the body has no usable error string', async () => {
    for (const payload of [null, 'text', 42, [], {}, { error: '' }, { error: '  ' }, { error: { message: 'x' } }, { error: 500 }]) {
      await expect(getEdgeFunctionErrorMessage(httpError(payload)))
        .resolves.toBe('Edge Function returned a non-2xx status code')
    }
  })

  it('falls back for a non-JSON body (gateway HTML page)', async () => {
    const error = { message: 'non-2xx', context: new Response('<html>502</html>', { status: 502 }) }
    await expect(getEdgeFunctionErrorMessage(error)).resolves.toBe('non-2xx')
  })

  it('never rejects and never returns an empty string', async () => {
    for (const error of [null, undefined, 'boom', 0, {}, { message: '' }, { message: 5 }, { context: null }]) {
      const message = await getEdgeFunctionErrorMessage(error)
      expect(message.trim()).not.toBe('')
    }
  })

  it('keeps Vietnamese text intact', async () => {
    await expect(getEdgeFunctionErrorMessage(httpError({ error: 'Số điện thoại đã tồn tại' })))
      .resolves.toBe('Số điện thoại đã tồn tại')
  })
})
