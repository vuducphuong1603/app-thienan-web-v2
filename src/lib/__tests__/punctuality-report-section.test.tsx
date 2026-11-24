import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Section import supabase client / html2canvas; test chỉ cần phần thuần + markup tĩnh.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/queries', () => ({ fetchAllRows: vi.fn() }))
vi.mock('html2canvas', () => ({ default: vi.fn() }))

import PunctualityReportSection, {
  PUNCTUALITY_MAX_DAYS,
  PUNCTUALITY_NO_SESSION_MESSAGE,
  inclusiveDayCount,
  localDateString,
  validatePunctualityRange,
  weekLabelOf,
} from '@/components/PunctualityReportSection'
import type { PunctualityRangeInput } from '@/components/PunctualityReportSection'
import { defaultWeekAnchor } from '@/lib/punctuality-report'

const base: PunctualityRangeInput = {
  mode: 'week',
  weekDate: '2026-11-26',
  month: 9,
  year: 2026,
  day: '',
  customFrom: '',
  customTo: '',
}

describe('validatePunctualityRange', () => {
  it('chế độ tuần: trả về Thứ 2 → Chủ nhật của tuần chứa ngày chọn', () => {
    expect(validatePunctualityRange({ ...base, mode: 'week', weekDate: '2026-11-26' })).toEqual({
      ok: true,
      from: '2026-11-23',
      to: '2026-11-29',
    })
    // Chủ nhật vẫn thuộc tuần của Thứ 2 trước đó
    expect(validatePunctualityRange({ ...base, mode: 'week', weekDate: '2026-11-29' })).toEqual({
      ok: true,
      from: '2026-11-23',
      to: '2026-11-29',
    })
  })

  it('thiếu ngày (tuần / một ngày) → "Vui lòng chọn ngày"', () => {
    expect(validatePunctualityRange({ ...base, mode: 'week', weekDate: '' })).toEqual({
      ok: false,
      message: 'Vui lòng chọn ngày',
    })
    expect(validatePunctualityRange({ ...base, mode: 'day', day: '' })).toEqual({
      ok: false,
      message: 'Vui lòng chọn ngày',
    })
  })

  it('một ngày: from = to', () => {
    expect(validatePunctualityRange({ ...base, mode: 'day', day: '2026-11-26' })).toEqual({
      ok: true,
      from: '2026-11-26',
      to: '2026-11-26',
    })
  })

  it('tháng: ngày đầu → ngày cuối tháng (tháng 10 là index 9, không lệch UTC)', () => {
    expect(validatePunctualityRange({ ...base, mode: 'month', month: 9, year: 2026 })).toEqual({
      ok: true,
      from: '2026-10-01',
      to: '2026-10-31',
    })
    expect(validatePunctualityRange({ ...base, mode: 'month', month: 1, year: 2028 })).toEqual({
      ok: true,
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('tuỳ chọn: thiếu ngày bắt đầu hoặc kết thúc', () => {
    const message = 'Vui lòng chọn ngày bắt đầu và ngày kết thúc'
    expect(validatePunctualityRange({ ...base, mode: 'custom' })).toEqual({ ok: false, message })
    expect(validatePunctualityRange({ ...base, mode: 'custom', customFrom: '2026-10-01' })).toEqual({
      ok: false,
      message,
    })
    expect(validatePunctualityRange({ ...base, mode: 'custom', customTo: '2026-10-31' })).toEqual({
      ok: false,
      message,
    })
  })

  it('tuỳ chọn: ngày bắt đầu sau ngày kết thúc', () => {
    expect(
      validatePunctualityRange({ ...base, mode: 'custom', customFrom: '2026-10-31', customTo: '2026-10-01' }),
    ).toEqual({ ok: false, message: 'Ngày bắt đầu không được sau ngày kết thúc' })
  })

  it('tuỳ chọn: 366 ngày vẫn được, 367 ngày bị chặn "Khoảng ngày tối đa 1 năm"', () => {
    expect(PUNCTUALITY_MAX_DAYS).toBe(366)
    // 2026-01-01 → 2027-01-01 = 366 ngày tính cả hai đầu
    expect(
      validatePunctualityRange({ ...base, mode: 'custom', customFrom: '2026-01-01', customTo: '2027-01-01' }),
    ).toEqual({ ok: true, from: '2026-01-01', to: '2027-01-01' })
    expect(
      validatePunctualityRange({ ...base, mode: 'custom', customFrom: '2026-01-01', customTo: '2027-01-02' }),
    ).toEqual({ ok: false, message: 'Khoảng ngày tối đa 1 năm' })
  })

  it('tuỳ chọn: from = to hợp lệ', () => {
    expect(
      validatePunctualityRange({ ...base, mode: 'custom', customFrom: '2026-10-04', customTo: '2026-10-04' }),
    ).toEqual({ ok: true, from: '2026-10-04', to: '2026-10-04' })
  })
})

describe('inclusiveDayCount', () => {
  it('đếm cả hai đầu và không bị lệch khi qua ngày đổi giờ / năm nhuận', () => {
    expect(inclusiveDayCount('2026-11-26', '2026-11-26')).toBe(1)
    expect(inclusiveDayCount('2026-11-23', '2026-11-29')).toBe(7)
    expect(inclusiveDayCount('2028-02-28', '2028-03-01')).toBe(3)
    expect(inclusiveDayCount('2026-03-01', '2026-11-01')).toBe(246)
  })
})

describe('tuần mặc định và nhãn tuần', () => {
  it('weekLabelOf: Tuần: dd/mm/yyyy - dd/mm/yyyy theo Thứ 2 → Chủ nhật', () => {
    expect(weekLabelOf('2026-11-26')).toBe('Tuần: 23/11/2026 - 29/11/2026')
    expect(weekLabelOf('2026-11-29')).toBe('Tuần: 23/11/2026 - 29/11/2026')
    expect(weekLabelOf('2026-11-23')).toBe('Tuần: 23/11/2026 - 29/11/2026')
    expect(weekLabelOf('2026-12-30')).toBe('Tuần: 28/12/2026 - 03/01/2027')
  })

  it('weekLabelOf: chưa chọn ngày → rỗng', () => {
    expect(weekLabelOf('')).toBe('')
  })

  it('mặc định: Thứ 2–4 lùi về Chủ nhật tuần trước, Thứ 5–CN giữ nguyên', () => {
    // 2026-11-24 là Thứ 3
    expect(weekLabelOf(defaultWeekAnchor('2026-11-24'))).toBe('Tuần: 16/11/2026 - 22/11/2026')
    // 2026-11-26 là Thứ 5
    expect(weekLabelOf(defaultWeekAnchor('2026-11-26'))).toBe('Tuần: 23/11/2026 - 29/11/2026')
  })

  it('localDateString dùng getter local (không UTC)', () => {
    expect(localDateString(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
    expect(localDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('thông báo', () => {
  it('không có buổi nào → đúng nguyên văn', () => {
    expect(PUNCTUALITY_NO_SESSION_MESSAGE).toBe('Khoảng ngày đã chọn không có buổi Thứ 5 / Chủ nhật nào')
  })
})

describe('PunctualityReportSection (markup ban đầu)', () => {
  const html = renderToStaticMarkup(
    createElement(PunctualityReportSection, {
      scope: { all: true },
      reportBranches: ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'],
      schoolYear: null,
      schoolYears: [],
      notify: () => undefined,
    }),
  )

  it('có tiêu đề, 4 radio chế độ, nút Tạo báo cáo; chưa có kết quả', () => {
    expect(html).toContain('data-testid="punct-section"')
    expect(html).toContain('Thống kê đúng giờ')
    expect(html).toContain('Tỉ lệ thiếu nhi có mặt đúng giờ - tất cả các lớp')
    for (const mode of ['week', 'month', 'day', 'custom']) {
      expect(html).toContain(`data-testid="punct-mode-${mode}"`)
    }
    expect(html).toContain('data-testid="punct-generate"')
    expect(html).not.toContain('data-testid="punct-result"')
  })

  it('mặc định là chế độ Tuần với ô ngày + nhãn tuần, chưa hiện ô tháng', () => {
    expect(html).toContain('data-testid="punct-week-date"')
    expect(html).toContain('data-testid="punct-week-label"')
    expect(html).toContain('Tuần: ')
    expect(html).not.toContain('data-testid="punct-month"')
    expect(html).not.toContain('data-testid="punct-day"')
  })

  it('radio Tuần được chọn (aria-checked)', () => {
    expect(html).toMatch(/aria-checked="true"[^>]*data-testid="punct-mode-week"|data-testid="punct-mode-week"[^>]*aria-checked="true"/)
  })
})
