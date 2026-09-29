import { describe, expect, it } from 'vitest'
import {
  attendanceScores,
  effectiveSessionDays,
  fmtScore,
  ketQua,
  parseScoreInput,
  round2,
  scoreSummary,
  tbHK,
  tbNam,
  xepLoai,
} from '../score-summary'

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(1.236)).toBe(1.24)
    expect(round2(4.1)).toBe(4.1)
  })
})

describe('tbHK and tbNam', () => {
  it('calculates a weighted semester average and rounds it', () => {
    expect(tbHK(7, 8)).toBe(7.67)
  })

  it('returns null when either semester input is missing', () => {
    expect(tbHK(null, 8)).toBeNull()
    expect(tbHK(7, undefined)).toBeNull()
  })

  it('calculates the weighted year average from both semester averages', () => {
    expect(tbNam(7.67, 9.67)).toBe(9)
  })

  it('returns null when either semester average is missing', () => {
    expect(tbNam(null, 9)).toBeNull()
    expect(tbNam(7.67, undefined)).toBeNull()
  })

  it('treats non-finite inputs as missing', () => {
    expect(tbHK(Number.NaN, 8)).toBeNull()
    expect(tbHK(8, Number.POSITIVE_INFINITY)).toBeNull()
    expect(tbNam(Number.NaN, 8)).toBeNull()
    expect(tbNam(8, Number.NEGATIVE_INFINITY)).toBeNull()
  })
})

describe('xepLoai', () => {
  it('returns the missing-score marker for null', () => {
    expect(xepLoai(null)).toBe('-')
    expect(xepLoai(undefined)).toBe('-')
  })

  it.each([
    [8, 'Giỏi'],
    [7.999, 'Khá'],
    [6.5, 'Khá'],
    [6.499, 'Trung bình'],
    [5, 'Trung bình'],
    [4.999, 'Yếu'],
  ] as const)('uses the WEB classification boundary %s', (score, expected) => {
    expect(xepLoai(score)).toBe(expected)
  })

  it('treats non-finite scores as missing', () => {
    expect(xepLoai(Number.NaN)).toBe('-')
    expect(xepLoai(Number.POSITIVE_INFINITY)).toBe('-')
  })
})

describe('ketQua', () => {
  it('returns the missing-score marker when any input is missing', () => {
    expect(ketQua({ t5: null, cn: 8, avgCat: 8 })).toBe('-')
    expect(ketQua({ t5: 8, cn: undefined, avgCat: 8 })).toBe('-')
    expect(ketQua({ t5: 8, cn: 8, avgCat: null })).toBe('-')
  })

  it('passes scores exactly at the 2.5 and total 5 boundaries', () => {
    expect(ketQua({ t5: 5, cn: 5, avgCat: 5 })).toBe('Đạt')
  })

  it('fails when Thursday attendance is below 2.5', () => {
    expect(ketQua({ t5: 2.499, cn: 10, avgCat: 10 })).toBe('Ở lại')
  })

  it('fails when Sunday attendance is below 2.5', () => {
    expect(ketQua({ t5: 10, cn: 2.499, avgCat: 10 })).toBe('Ở lại')
  })

  it('fails when catechism average is below 2.5', () => {
    expect(ketQua({ t5: 10, cn: 10, avgCat: 2.499 })).toBe('Ở lại')
  })

  it('fails when the weighted total is below 5', () => {
    expect(ketQua({ t5: 2.5, cn: 2.5, avgCat: 4 })).toBe('Ở lại')
  })

  it('treats non-finite inputs as missing', () => {
    expect(ketQua({ t5: Number.NaN, cn: 8, avgCat: 8 })).toBe('-')
    expect(ketQua({ t5: 8, cn: Number.POSITIVE_INFINITY, avgCat: 8 })).toBe('-')
    expect(ketQua({ t5: 8, cn: 8, avgCat: Number.NEGATIVE_INFINITY })).toBe('-')
  })
})

describe('attendanceScores', () => {
  it('scales attendance counts and calculates the weighted attendance average', () => {
    expect(attendanceScores(
      { thu5: 28, cn: 24, cnLe: 26 },
      { thu5: 40, cn: 40 },
    )).toEqual({ diem_t5: 7, diem_gl: 6, diem_le_cn: 6.5, diem_tb: 6.55 })
  })

  it('caps attendance scores at 10 and guards zero effective days', () => {
    expect(attendanceScores(
      { thu5: 50, cn: 3, cnLe: 3 },
      { thu5: 0, cn: 0 },
    )).toEqual({ diem_t5: 0, diem_gl: 0, diem_le_cn: 0, diem_tb: 0 })
    expect(attendanceScores(
      { thu5: 50, cn: 50, cnLe: 50 },
      { thu5: 40, cn: 40 },
    )).toEqual({ diem_t5: 10, diem_gl: 10, diem_le_cn: 10, diem_tb: 10 })
  })
})

describe('effectiveSessionDays', () => {
  it('falls back to 40 sessions per type without a school year', () => {
    expect(effectiveSessionDays(null, [])).toEqual({ thu5: 40, cn: 40 })
    expect(effectiveSessionDays(undefined, [{ day_type: 'thu5' }])).toEqual({ thu5: 40, cn: 40 })
  })

  it('subtracts matching holidays and counts both for both session types', () => {
    expect(effectiveSessionDays(
      { start_date: '2026-09-01', end_date: '2026-09-30' },
      [{ day_type: 'thu5' }, { day_type: 'cn' }, { day_type: 'both' }],
    )).toEqual({ thu5: 2, cn: 2 })
  })

  it('keeps at least one effective session after holidays', () => {
    expect(effectiveSessionDays(
      { start_date: '2026-09-03', end_date: '2026-09-06' },
      [{ day_type: 'thu5' }, { day_type: 'both' }, { day_type: 'both' }],
    )).toEqual({ thu5: 1, cn: 1 })
  })
})

describe('scoreSummary', () => {
  it('combines rounded averages, classification, and result', () => {
    expect(scoreSummary({
      score_45_hk1: 7,
      score_exam_hk1: 8,
      score_45_hk2: 9,
      score_exam_hk2: 10,
      t5: 8,
      cn: 7,
    })).toEqual({
      tbHK1: 7.67,
      tbHK2: 9.67,
      tbNam: 9,
      xepLoai: 'Giỏi',
      ketQua: 'Đạt',
    })
  })

  it('keeps missing score fields null and displays markers', () => {
    expect(scoreSummary({
      score_45_hk1: null,
      score_exam_hk1: 8,
      score_45_hk2: 9,
      score_exam_hk2: 10,
      t5: 8,
      cn: 7,
    })).toEqual({
      tbHK1: null,
      tbHK2: 9.67,
      tbNam: null,
      xepLoai: '-',
      ketQua: '-',
    })
  })
})

describe('fmtScore', () => {
  it('formats nullish scores as a marker and numeric scores to two decimals', () => {
    expect(fmtScore(null)).toBe('-')
    expect(fmtScore(undefined)).toBe('-')
    expect(fmtScore(8.5)).toBe('8.50')
    expect(fmtScore(1.236)).toBe('1.24')
    expect(fmtScore(Number.NaN)).toBe('-')
    expect(fmtScore(Number.POSITIVE_INFINITY)).toBe('-')
  })
})

describe('parseScoreInput', () => {
  it('maps blank values to null and finite scores in the inclusive 0..10 range', () => {
    expect(parseScoreInput('')).toBeNull()
    expect(parseScoreInput('  ')).toBeNull()
    expect(parseScoreInput('0')).toBe(0)
    expect(parseScoreInput('10')).toBe(10)
    expect(parseScoreInput(' 4.25 ')).toBe(4.25)
  })

  it('returns undefined for non-finite and out-of-range values', () => {
    expect(parseScoreInput('-0.1')).toBeUndefined()
    expect(parseScoreInput('10.1')).toBeUndefined()
    expect(parseScoreInput('NaN')).toBeUndefined()
    expect(parseScoreInput('Infinity')).toBeUndefined()
    expect(parseScoreInput('not-a-score')).toBeUndefined()
  })
})
