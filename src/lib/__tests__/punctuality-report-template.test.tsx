import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PunctualityReportTemplate, {
  punctualityColumnWidths,
  punctualityTemplateWidth,
} from '@/components/PunctualityReportTemplate'
import { buildPunctualityReport, punctualityColumns } from '@/lib/punctuality-report'
import type { PunctualityRecord, PunctualityReportData } from '@/lib/punctuality-report'

// Fixture G1 (SPEC): Ấu 1 (4 em, đi lễ), Thiếu 1 (5 em, học GL); 2 Thứ 5 + 2 Chủ nhật.
const CLASSES = [
  { id: 'c-au', name: 'Ấu 1', branch: 'Ấu Nhi', display_order: 10 },
  { id: 'c-thieu', name: 'Thiếu 1', branch: 'Thiếu Nhi', display_order: 20 },
]
const STUDENTS = [
  ...['a1', 'a2', 'a3', 'a4'].map(id => ({ id, class_id: 'c-au' })),
  ...['t1', 't2', 't3', 't4', 't5'].map(id => ({ id, class_id: 'c-thieu' })),
]

function rec(student_id: string, day_type: string, attendance_date: string, is_late: boolean | null = null): PunctualityRecord {
  return { student_id, status: 'present', day_type, attendance_date, is_late }
}

const RECORDS: PunctualityRecord[] = [
  ...['a1', 'a2', 'a3', 't1', 't2'].map(id => rec(id, 'thu5', '2026-11-26')),
  ...['a1', 't1', 't2', 't3', 't4'].map(id => rec(id, 'thu5', '2026-12-03')),
  rec('a1', 'cn_le', '2026-11-29', false),
  rec('a2', 'cn_le', '2026-11-29', false),
  rec('a3', 'cn_le', '2026-11-29', true),
  rec('a4', 'cn_le', '2026-11-29', null),
  rec('t1', 'cn', '2026-11-29', false),
  rec('t2', 'cn', '2026-11-29', true),
  rec('t3', 'cn', '2026-11-29', false),
  ...['a1', 'a2', 'a3', 'a4'].map(id => rec(id, 'cn_le', '2026-12-06', false)),
  rec('t1', 'cn', '2026-12-06', null),
  rec('t2', 'cn', '2026-12-06', null),
]

function g1(overrides: Partial<Parameters<typeof buildPunctualityReport>[0]> = {}): PunctualityReportData {
  return buildPunctualityReport({
    mode: 'custom',
    fromDate: '2026-11-23',
    toDate: '2026-12-06',
    classes: CLASSES,
    branchOrder: ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'],
    students: STUDENTS,
    sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: ['2026-11-29', '2026-12-06'] },
    records: RECORDS,
    ...overrides,
  })
}

function render(data: PunctualityReportData): string {
  return renderToStaticMarkup(createElement(PunctualityReportTemplate, { data }))
}

function headers(html: string): string[] {
  return [...html.matchAll(/<th [^>]*>([^<]*)<\/th>/g)].map(match => match[1])
}

/** Các ô <td> của dòng chứa `marker` (đến </tr>), tách thành text. */
function rowCells(html: string, marker: string): string[] {
  const start = html.lastIndexOf('<tr', html.indexOf(marker))
  const end = html.indexOf('</tr>', start)
  return [...html.slice(start, end).matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map(match => match[1])
}

describe('PunctualityReportTemplate (một bảng)', () => {
  const data = g1()
  const html = render(data)

  it('vẽ header, tiêu đề, hai dòng phụ đề và đúng 1 bảng punct-table', () => {
    expect(html).toContain('Phong trào thiếu nhi thánh thể Việt Nam')
    expect(html).toContain('Giáo xứ Thiên Ân - xứ đoàn Fatima')
    expect(html).toContain('THỐNG KÊ TỈ LỆ CÓ MẶT ĐÚNG GIỜ')
    expect(html).toContain(data.subtitleLines[0])
    expect(html).toContain(data.subtitleLines[1])
    expect((html.match(/data-testid="punct-table"/g) ?? []).length).toBe(1)
    expect((html.match(/<table/g) ?? []).length).toBe(1)
  })

  it('cột theo thứ tự: PHÂN ĐOÀN | LỚP | SỈ SỐ | T5… | TB T5 | CN… | TB CN (không có GHI CHÚ)', () => {
    expect(headers(html)).toEqual([
      'PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ',
      'T5 26/11', 'T5 03/12', 'TB T5',
      'CN 29/11', 'CN 06/12', 'TB CN',
    ])
    expect(html).not.toContain('GHI CHÚ')
    expect(headers(html).slice(3)).toEqual(punctualityColumns(data).map(column => column.label))
  })

  it('giá trị ô là tỉ lệ %, ô chưa xét giờ là "—", ô TB nằm trong số liệu trung bình', () => {
    // Ấu 1 (4 em): T5 3/4, 1/4 → TB 50%; đi lễ đúng giờ 2/4, 4/4 → TB 75%
    const au = rowCells(html, '>Ấu 1<')
    expect(au).toEqual(['ẤU', 'Ấu 1', '4', '75%', '25%', '50%', '50%', '100%', '75%'])
    expect(html).not.toContain('Trễ: 1 lượt')
    // Thiếu 1 (5 em): T5 2/5, 4/5 → TB 60%; CN 29/11 đúng giờ 2/5, 06/12 chưa xét → "—", TB 40%
    const thieu = rowCells(html, '>Thiếu 1<')
    expect(thieu.slice(1, 9)).toEqual(['Thiếu 1', '5', '40%', '80%', '60%', '40%', '—', '40%'])
  })

  it('PHÂN ĐOÀN gộp theo số lớp (rowspan) với nhãn ngành', () => {
    expect(html).toContain('>ẤU</td>')
    expect(html).toContain('>THIẾU</td>')
    expect(html).toContain('rowspan="1"')
  })

  it('ô TB in đậm, ô ngày thường không đậm', () => {
    const start = html.lastIndexOf('<tr', html.indexOf('>Ấu 1<'))
    const row = html.slice(start, html.indexOf('</tr>', start))
    const cells = [...row.matchAll(/<td([^>]*)>([^<]*)<\/td>/g)].map(match => ({ style: match[1], text: match[2] }))
    const byText = (text: string, nth: number) => cells.filter(cell => cell.text === text)[nth]
    // 50% xuất hiện ở T5 TB (ô TB) — ô ngày 25% không đậm
    expect(cells.find(cell => cell.text === '25%')?.style).not.toContain('font-weight:700')
    expect(byText('50%', 0).style).toContain('font-weight:700')
    expect(cells.find(cell => cell.text === '75%' && cell.style.includes('font-weight:700'))).toBeTruthy()
  })

  it('dòng TỔNG (punct-total) in đậm, đủ cột như bảng', () => {
    const cells = rowCells(html, 'data-testid="punct-total"')
    expect(cells[0]).toBe('TỔNG')
    expect(cells[1]).toBe('9')
    expect(cells).toHaveLength(1 + 1 + punctualityColumns(data).length)
    const start = html.indexOf('data-testid="punct-total"')
    expect(html.slice(start, html.indexOf('</tr>', start))).toContain('font-weight:700')
  })

  it('chú thích in đúng 1 lần, sau bảng, đúng nguyên văn từ data.footnotes', () => {
    expect((html.match(/data-testid="punct-footnotes"/g) ?? []).length).toBe(1)
    expect(html.indexOf('data-testid="punct-footnotes"')).toBeGreaterThan(html.indexOf('</table>'))
    expect(data.footnotes.length).toBeGreaterThan(0)
    for (const footnote of data.footnotes) expect(html).toContain(footnote)
  })

  it('không còn khái niệm bảng tuần / tổng hợp / số lượng', () => {
    expect(html).not.toContain('TỔNG HỢP')
    expect(html).not.toContain('TUẦN ')
    expect(html).not.toContain('ĐÚNG GIỜ CN')
    expect(html).not.toContain('punct-table-')
  })
})

function colWidths(html: string): number[] {
  const colgroup = html.slice(html.indexOf('<colgroup>'), html.indexOf('</colgroup>'))
  return [...colgroup.matchAll(/<col style="width:(\d+)px"/g)].map(match => Number(match[1]))
}

function containerWidth(html: string): number {
  return Number(/^<div style="[^"]*?width:(\d+)px/.exec(html)?.[1])
}

describe('chiều rộng động', () => {
  it('công thức max(800, 48 + 262 + 62 × số cột)', () => {
    expect(punctualityTemplateWidth(0)).toBe(800)
    expect(punctualityTemplateWidth(6)).toBe(800) // 682 → sàn 800
    expect(punctualityTemplateWidth(7)).toBe(800) // 744 → sàn 800
    expect(punctualityTemplateWidth(8)).toBe(806)
    expect(punctualityTemplateWidth(12)).toBe(1054)
  })

  it('tổng bề rộng cột luôn = khung − 48 (bảng lấp đầy, không chừa dải trống)', () => {
    for (let n = 0; n <= 20; n++) {
      const widths = punctualityColumnWidths(n)
      expect(widths).toHaveLength(3 + n)
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(punctualityTemplateWidth(n) - 48)
    }
  })

  it('khung rộng hơn 800: giữ bề rộng gốc 90 | 120 | 52 | 62…', () => {
    expect(punctualityColumnWidths(8)).toEqual([90, 120, 52, ...Array(8).fill(62)])
    expect(punctualityColumnWidths(12)).toEqual([90, 120, 52, ...Array(12).fill(62)])
  })

  it('khung 800: phần dư chia theo tỉ lệ, không cột nào hẹp hơn bề rộng gốc, cột ngày bằng nhau', () => {
    for (let n = 0; n <= 7; n++) {
      const widths = punctualityColumnWidths(n)
      expect(widths[0]).toBeGreaterThanOrEqual(90)
      expect(widths[1]).toBeGreaterThanOrEqual(120)
      expect(widths[2]).toBeGreaterThanOrEqual(52)
      for (const width of widths.slice(3)) {
        expect(width).toBeGreaterThanOrEqual(62)
        expect(width).toBe(widths[3])
      }
    }
    expect(punctualityColumnWidths(0)).toEqual([258, 345, 149])
  })

  it('n = 6 (G1: 2 T5 + TB + 2 CN + TB): khung 800px, 9 col, tổng cột + 48 = khung', () => {
    const data = g1()
    expect(punctualityColumns(data)).toHaveLength(6)
    const html = render(data)
    expect(containerWidth(html)).toBe(800)
    const widths = colWidths(html)
    expect(widths).toEqual(punctualityColumnWidths(6))
    expect(widths).toHaveLength(3 + 6)
    expect(widths.reduce((sum, width) => sum + width, 0) + 48).toBe(800)
  })

  it('n = 12 (tháng 5 T5 + 5 CN + 2 TB): khung 1054px, tổng cột + 48 = khung', () => {
    const thu5 = ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29']
    const cn = ['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01']
    const data = g1({ mode: 'custom', fromDate: '2026-10-01', toDate: '2026-11-01', sessions: { thu5, cn }, records: [] })
    expect(punctualityColumns(data)).toHaveLength(12)
    const html = render(data)
    expect(containerWidth(html)).toBe(1054)
    const widths = colWidths(html)
    expect(widths).toHaveLength(3 + 12)
    expect(widths.reduce((sum, width) => sum + width, 0) + 48).toBe(1054)
  })

  it('số ô mỗi hàng khớp số col (không còn ô ghi chú thừa)', () => {
    const data = g1()
    const html = render(data)
    expect(rowCells(html, '>Ấu 1<')).toHaveLength(3 + 6)
    expect(rowCells(html, 'data-testid="punct-total"')).toHaveLength(2 + 6) // TỔNG colSpan 2
  })
})

describe('báo cáo một ngày (G2)', () => {
  const data = g1({
    mode: 'day',
    fromDate: '2026-11-29',
    toDate: '2026-11-29',
    sessions: { thu5: [], cn: ['2026-11-29'] },
  })
  const html = render(data)

  it('chỉ có cột CN, không có cột T5 và không có cột TB', () => {
    expect(headers(html)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'CN 29/11'])
    expect(html).not.toContain('TB T5')
    expect(html).not.toContain('TB CN')
  })

  it('giá trị đúng giờ: Ấu 1 50%, Thiếu 1 40%, tổng 4/9 = 44%', () => {
    expect(rowCells(html, '>Ấu 1<').slice(1, 4)).toEqual(['Ấu 1', '4', '50%'])
    expect(rowCells(html, '>Thiếu 1<').slice(1, 4)).toEqual(['Thiếu 1', '5', '40%'])
    expect(rowCells(html, 'data-testid="punct-total"').slice(0, 3)).toEqual(['TỔNG', '9', '44%'])
  })
})

describe('chỉ có Thứ 5', () => {
  it('không có cột CN / TB CN; TB T5 xuất hiện khi ≥ 2 buổi', () => {
    const html = render(g1({ sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: [] } }))
    expect(headers(html)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'T5 26/11', 'T5 03/12', 'TB T5'])
  })
})
