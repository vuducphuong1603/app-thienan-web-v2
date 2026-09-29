export type Score = number | null | undefined

export interface SchoolYearDates {
  start_date: string
  end_date: string
}

export interface SessionHoliday {
  day_type?: string | null
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isFiniteScore(score: Score): score is number {
  return typeof score === 'number' && Number.isFinite(score)
}

export function tbHK(score45: Score, exam: Score): number | null {
  if (!isFiniteScore(score45) || !isFiniteScore(exam)) return null
  return round2((score45 + exam * 2) / 3)
}

export function tbNam(tbHK1: Score, tbHK2: Score): number | null {
  if (!isFiniteScore(tbHK1) || !isFiniteScore(tbHK2)) return null
  return round2((tbHK1 + tbHK2 * 2) / 3)
}

export type XepLoai = 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | '-'

export function xepLoai(score: Score): XepLoai {
  if (!isFiniteScore(score)) return '-'
  if (score >= 8) return 'Giỏi'
  if (score >= 6.5) return 'Khá'
  if (score >= 5) return 'Trung bình'
  return 'Yếu'
}

export type KetQua = 'Đạt' | 'Ở lại' | '-'

export function ketQua(input: { t5: Score; cn: Score; avgCat: Score }): KetQua {
  const { t5, cn, avgCat } = input
  if (!isFiniteScore(t5) || !isFiniteScore(cn) || !isFiniteScore(avgCat)) return '-'
  const total = avgCat * 0.6 + (t5 + cn) * 0.4
  if (!Number.isFinite(total)) return '-'
  return t5 < 2.5 || cn < 2.5 || avgCat < 2.5 || total < 5 ? 'Ở lại' : 'Đạt'
}

export function attendanceScores(
  counts: { thu5: number; cn: number; cnLe: number },
  effectiveDays: { thu5: number; cn: number },
): { diem_t5: number; diem_gl: number; diem_le_cn: number; diem_tb: number } {
  const scale = (count: number, days: number) => (
    days > 0 ? round2(Math.min(10, (count * 10) / days)) : 0
  )
  const diem_t5 = scale(counts.thu5, effectiveDays.thu5)
  const diem_gl = scale(counts.cn, effectiveDays.cn)
  const diem_le_cn = scale(counts.cnLe, effectiveDays.cn)
  const diem_tb = round2(diem_t5 * 0.4 + ((diem_gl + diem_le_cn) / 2) * 0.6)
  return { diem_t5, diem_gl, diem_le_cn, diem_tb }
}

function countWeekdays(startDate: string, endDate: string, dayOfWeek: number): number {
  let count = 0
  const current = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  while (current <= end) {
    if (current.getDay() === dayOfWeek) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function effectiveSessionDays(
  schoolYear: SchoolYearDates | null | undefined,
  holidays: readonly SessionHoliday[] = [],
): { thu5: number; cn: number } {
  if (!schoolYear) return { thu5: 40, cn: 40 }

  const totalThu5 = countWeekdays(schoolYear.start_date, schoolYear.end_date, 4)
  const totalCn = countWeekdays(schoolYear.start_date, schoolYear.end_date, 0)
  const thu5Holidays = holidays.filter(
    holiday => holiday.day_type === 'thu5' || holiday.day_type === 'both',
  ).length
  const cnHolidays = holidays.filter(
    holiday => holiday.day_type === 'cn' || holiday.day_type === 'both',
  ).length

  return {
    thu5: Math.max(1, totalThu5 - thu5Holidays),
    cn: Math.max(1, totalCn - cnHolidays),
  }
}

function catechismAverage(
  score45Hk1: Score,
  examHk1: Score,
  score45Hk2: Score,
  examHk2: Score,
): number | null {
  if (!isFiniteScore(score45Hk1) || !isFiniteScore(examHk1) || !isFiniteScore(score45Hk2) || !isFiniteScore(examHk2)) {
    return null
  }
  return (score45Hk1 + score45Hk2 + examHk1 * 2 + examHk2 * 2) / 6
}

export interface ScoreSummaryInput {
  score_45_hk1: Score
  score_exam_hk1: Score
  score_45_hk2: Score
  score_exam_hk2: Score
  t5: Score
  cn: Score
}

export interface ScoreSummary {
  tbHK1: number | null
  tbHK2: number | null
  tbNam: number | null
  xepLoai: XepLoai
  ketQua: KetQua
}

export function scoreSummary(input: ScoreSummaryInput): ScoreSummary {
  const tbHK1 = tbHK(input.score_45_hk1, input.score_exam_hk1)
  const tbHK2 = tbHK(input.score_45_hk2, input.score_exam_hk2)
  const tbNamScore = tbNam(tbHK1, tbHK2)
  return {
    tbHK1,
    tbHK2,
    tbNam: tbNamScore,
    xepLoai: xepLoai(tbNamScore),
    ketQua: ketQua({
      t5: input.t5,
      cn: input.cn,
      avgCat: catechismAverage(
        input.score_45_hk1,
        input.score_exam_hk1,
        input.score_45_hk2,
        input.score_exam_hk2,
      ),
    }),
  }
}

export function fmtScore(score: Score): string {
  return !isFiniteScore(score) ? '-' : round2(score).toFixed(2)
}

export function parseScoreInput(value: string): number | null | undefined {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  const score = Number(trimmedValue)
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : undefined
}
