import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildPunctualityReport,
  type PunctualityRecord,
  type PunctualityReportInput,
} from '../punctuality-report'
import { buildPunctualityReportWorkbook } from '../punctuality-report-excel'

// Fixture G1 / G2 (SPEC v2 §4.1)
const CLASSES = [
  { id: 'c-au', name: 'Ấu 1', branch: 'Ấu Nhi', display_order: 10 },
  { id: 'c-thieu', name: 'Thiếu 1', branch: 'Thiếu Nhi', display_order: 20 },
  { id: 'c-demo', name: 'Lớp Demo (App Review)', branch: 'Chiên Con', display_order: 999 },
]
const STUDENTS = [
  ...['a1', 'a2', 'a3', 'a4'].map((id) => ({ id, class_id: 'c-au' })),
  ...['t1', 't2', 't3', 't4', 't5'].map((id) => ({ id, class_id: 'c-thieu' })),
  { id: 'd1', class_id: 'c-demo' },
]

function rec(student_id: string, day_type: string, attendance_date: string, is_late: boolean | null = null, status = 'present'): PunctualityRecord {
  return { student_id, status, day_type, attendance_date, is_late }
}

const RECORDS: PunctualityRecord[] = [
  ...['a1', 'a2', 'a3', 't1', 't2', 'd1'].map((id) => rec(id, 'thu5', '2026-11-26')),
  ...['a1', 't1', 't2', 't3', 't4'].map((id) => rec(id, 'thu5', '2026-12-03')),
  rec('a1', 'cn_le', '2026-11-29', false),
  rec('a2', 'cn_le', '2026-11-29', false),
  rec('a3', 'cn_le', '2026-11-29', true),
  rec('a4', 'cn_le', '2026-11-29', null),
  rec('t1', 'cn', '2026-11-29', false),
  rec('t2', 'cn', '2026-11-29', true),
  rec('t3', 'cn', '2026-11-29', false),
  ...['a1', 'a2', 'a3', 'a4'].map((id) => rec(id, 'cn_le', '2026-12-06', false)),
  rec('t1', 'cn', '2026-12-06', null),
  rec('t2', 'cn', '2026-12-06', null),
]

function input(overrides: Partial<PunctualityReportInput> = {}): PunctualityReportInput {
  return {
    mode: 'custom',
    fromDate: '2026-11-23',
    toDate: '2026-12-06',
    classes: CLASSES,
    branchOrder: ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'],
    students: STUDENTS,
    sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: ['2026-11-29', '2026-12-06'] },
    records: RECORDS,
    ...overrides,
  }
}

async function roundTrip(
  data = buildPunctualityReport(input()),
  logo?: Uint8Array
): Promise<ExcelJS.Workbook> {
  const workbook = await buildPunctualityReportWorkbook(data, logo)
  const buffer = await workbook.xlsx.writeBuffer()
  const reloaded = new ExcelJS.Workbook()
  await reloaded.xlsx.load(buffer as ArrayBuffer)
  return reloaded
}

function text(sheet: ExcelJS.Worksheet, address: string): string {
  return String(sheet.getCell(address).value ?? '')
}

function headerLabels(sheet: ExcelJS.Worksheet, count: number): string[] {
  return Array.from({ length: count }, (_, index) => String(sheet.getRow(6).getCell(index + 1).value))
}

const FOOTNOTES = [
  'Thứ 5: tỉ lệ = số em có mặt / sỉ số lớp (không xét giờ).',
  'Chủ nhật: ngành Thiếu, Nghĩa tính đúng giờ buổi học giáo lý; ngành Chiên, Ấu tính đúng giờ buổi đi lễ. Tỉ lệ = số em đúng giờ / sỉ số lớp.',
]
const AVERAGE_FOOTNOTE =
  'TB: trung bình các buổi trong kỳ; buổi Chủ nhật chưa xét giờ (—) không tính vào trung bình.'

describe('buildPunctualityReportWorkbook — G1', () => {
  it('đúng 1 sheet tên "Thong ke dung gio"', async () => {
    const workbook = await roundTrip()
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Thong ke dung gio'])
  })

  it('đầu trang: A1/A2 (trim), A4 gộp A4:I4, A5 gộp A5:I5 = subtitle nối xuống dòng', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    const data = buildPunctualityReport(input())
    expect(text(sheet, 'A1').trim()).toBe('Phong trào thiếu nhi thánh thể Việt Nam')
    expect(text(sheet, 'A2').trim()).toBe('Giáo xứ Thiên Ân - xứ đoàn Fatima')
    expect(text(sheet, 'A4')).toBe('THỐNG KÊ TỈ LỆ CÓ MẶT ĐÚNG GIỜ')
    expect(sheet.getCell('I4').master.address).toBe('A4')
    expect(sheet.getCell('A4').font?.bold).toBe(true)
    expect(sheet.getCell('A4').font?.size).toBe(16)
    expect(sheet.getCell('A4').alignment?.horizontal).toBe('center')
    expect(sheet.getCell('J4').isMerged).toBe(false)
    expect(sheet.getCell('I5').master.address).toBe('A5')
    expect(text(sheet, 'A5')).toBe(data.subtitleLines.join('\n'))
    expect(sheet.getCell('A5').font?.italic).toBe(true)
    expect(sheet.getCell('A5').alignment?.wrapText).toBe(true)
  })

  it('A2 không gộp ô, căn trái, có khoảng trắng đầu (không bị cắt)', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(sheet.getCell('A2').isMerged).toBe(false)
    expect(sheet.getCell('B2').isMerged).toBe(false)
    expect(sheet.getCell('A2').alignment?.horizontal).toBe('left')
    expect(text(sheet, 'A2')).toMatch(/^\s+Giáo xứ Thiên Ân - xứ đoàn Fatima$/)
  })

  it('hàng 6: PHÂN ĐOÀN, LỚP, SỈ SỐ, T5 26/11, T5 03/12, TB T5, CN 29/11, CN 06/12, TB CN (không có GHI CHÚ)', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(headerLabels(sheet, 9)).toEqual([
      'PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'T5 26/11', 'T5 03/12', 'TB T5', 'CN 29/11', 'CN 06/12', 'TB CN',
    ])
    expect(text(sheet, 'J6')).toBe('')
    sheet.eachRow((row) => row.eachCell((cell) => expect(String(cell.value ?? '')).not.toContain('GHI CHÚ')))
    const header = sheet.getCell('A6')
    expect(header.font?.bold).toBe(true)
    expect(header.alignment?.horizontal).toBe('center')
    expect(header.alignment?.wrapText).toBe(true)
    expect(header.border?.top?.style).toBe('thin')
    expect(sheet.getRow(6).height).toBeGreaterThanOrEqual(31.5)
  })

  it('hàng Ấu 1 (hàng 7): giá trị là số, numFmt 0 / 0%, không có ô ghi chú', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(sheet.getCell('A7').value).toBe('ẤU')
    expect(sheet.getCell('B7').value).toBe('Ấu 1')
    expect(sheet.getCell('C7').value).toBe(4)
    expect(sheet.getCell('C7').numFmt).toBe('0')
    const expected = [0.75, 0.25, 0.5, 0.5, 1, 0.75]
    ;['D', 'E', 'F', 'G', 'H', 'I'].forEach((letter, position) => {
      const cell = sheet.getCell(`${letter}7`)
      expect(typeof cell.value).toBe('number')
      expect(cell.value as number).toBeCloseTo(expected[position], 10)
      expect(cell.numFmt).toBe('0%')
    })
    expect(sheet.getCell('J7').value).toBeNull()
    expect(sheet.getRow(7).height).toBeCloseTo(20.1, 5)
    expect(sheet.getCell('A7').font?.bold).toBe(true)
  })

  it('hàng Thiếu 1 (hàng 8): CN 06/12 chưa xét → chuỗi "—"; TB CN = 0.4', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(sheet.getCell('A8').value).toBe('THIẾU')
    expect(sheet.getCell('B8').value).toBe('Thiếu 1')
    expect(sheet.getCell('C8').value).toBe(5)
    expect(sheet.getCell('D8').value as number).toBeCloseTo(0.4, 10)
    expect(sheet.getCell('E8').value as number).toBeCloseTo(0.8, 10)
    expect(sheet.getCell('F8').value as number).toBeCloseTo(0.6, 10)
    expect(sheet.getCell('G8').value as number).toBeCloseTo(0.4, 10)
    expect(sheet.getCell('H8').value).toBe('—')
    expect(sheet.getCell('H8').numFmt).not.toBe('0%')
    expect(sheet.getCell('I8').value as number).toBeCloseTo(0.4, 10)
    expect(sheet.getCell('J8').value).toBeNull()
  })

  it('ô TB đậm, ô ngày thường không đậm', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(sheet.getCell('F7').font?.bold).toBe(true)
    expect(sheet.getCell('I7').font?.bold).toBe(true)
    expect(sheet.getCell('D7').font?.bold).toBeFalsy()
    expect(sheet.getCell('G7').font?.bold).toBeFalsy()
  })

  it('hàng TỔNG: A:B gộp, đậm, số liệu tổng', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(sheet.getCell('A9').value).toBe('TỔNG')
    expect(sheet.getCell('B9').master.address).toBe('A9')
    expect(sheet.getCell('A9').font?.bold).toBe(true)
    expect(sheet.getCell('C9').value).toBe(9)
    const expected = [5 / 9, 5 / 9, 10 / 18, 4 / 9, 1, 8 / 13]
    ;['D', 'E', 'F', 'G', 'H', 'I'].forEach((letter, position) => {
      const cell = sheet.getCell(`${letter}9`)
      expect(cell.value as number).toBeCloseTo(expected[position], 10)
      expect(cell.numFmt).toBe('0%')
      expect(cell.font?.bold).toBe(true)
    })
  })

  it('3 dòng ghi chú gộp A:I sau hàng TỔNG; dòng đầu có viền trên', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(text(sheet, 'A10')).toBe(FOOTNOTES[0])
    expect(text(sheet, 'A11')).toBe(FOOTNOTES[1])
    expect(text(sheet, 'A12')).toBe(AVERAGE_FOOTNOTE)
    expect(text(sheet, 'A13')).toBe('')
    for (const row of [10, 11, 12]) {
      expect(sheet.getCell(`I${row}`).master.address).toBe(`A${row}`)
      expect(sheet.getCell(`J${row}`).isMerged).toBe(false)
      expect(sheet.getCell(`A${row}`).alignment?.horizontal).toBe('left')
    }
    expect(sheet.getCell('A10').border?.top?.style).toBe('thin')
    expect(sheet.getCell('A11').border?.top).toBeUndefined()
  })

  it('trang in: 9 cột → dọc, vừa 1 trang rộng; đóng băng 3 cột + 6 hàng', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    expect(sheet.pageSetup.orientation).toBe('portrait')
    expect(sheet.pageSetup.fitToPage).toBe(true)
    expect(sheet.pageSetup.fitToWidth).toBe(1)
    expect(sheet.pageSetup.fitToHeight).toBe(0)
    const view = sheet.views[0] as { state?: string; xSplit?: number; ySplit?: number }
    expect(view.state).toBe('frozen')
    expect(view.xSplit).toBe(3)
    expect(view.ySplit).toBe(6)
  })

  it('độ rộng: mọi cột ngày/TB ≈ 9 (kể cả cột cuối)', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    for (let column = 4; column <= 9; column += 1) {
      expect(sheet.getColumn(column).width).toBeGreaterThanOrEqual(8.5)
      expect(sheet.getColumn(column).width).toBeLessThanOrEqual(10.5)
    }
  })

  it('không còn cột ẩn', async () => {
    const sheet = (await roundTrip()).worksheets[0]
    for (let column = 1; column <= 9; column += 1) expect(sheet.getColumn(column).hidden).toBeFalsy()
  })

  it('có logo → 1 ảnh, file đọc lại được; không logo → không ảnh', async () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9])
    expect((await roundTrip(undefined, fakeJpeg)).worksheets[0].getImages()).toHaveLength(1)
    expect((await roundTrip()).worksheets[0].getImages()).toHaveLength(0)
  })
})

describe('buildPunctualityReportWorkbook — G2 (mode day, Chủ nhật 29/11)', () => {
  const g2 = () =>
    buildPunctualityReport(
      input({ mode: 'day', fromDate: '2026-11-29', toDate: '2026-11-29', sessions: { thu5: [], cn: ['2026-11-29'] } })
    )

  it('chỉ 4 cột: PHÂN ĐOÀN, LỚP, SỈ SỐ, CN 29/11', async () => {
    const sheet = (await roundTrip(g2())).worksheets[0]
    expect(headerLabels(sheet, 4)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'CN 29/11'])
    expect(text(sheet, 'E6')).toBe('')
  })

  it('giá trị, tổng, merge đầu trang theo cột D', async () => {
    const sheet = (await roundTrip(g2())).worksheets[0]
    expect(sheet.getCell('D7').value as number).toBeCloseTo(0.5, 10)
    expect(sheet.getCell('E7').value).toBeNull()
    expect(sheet.getCell('D8').value as number).toBeCloseTo(0.4, 10)
    expect(sheet.getCell('E8').value).toBeNull()
    expect(sheet.getCell('D9').value as number).toBeCloseTo(4 / 9, 10)
    expect(sheet.getCell('D4').master.address).toBe('A4')
    expect(sheet.getCell('E4').isMerged).toBe(false)
    expect(sheet.getCell('D5').master.address).toBe('A5')
  })

  it('2 ghi chú (không có dòng TB) gộp A:D; cột cuối rộng ≈ 9; hàng TỔNG tại hàng 9', async () => {
    const sheet = (await roundTrip(g2())).worksheets[0]
    expect(text(sheet, 'A10')).toBe(FOOTNOTES[0])
    expect(text(sheet, 'A11')).toBe(FOOTNOTES[1])
    expect(text(sheet, 'A12')).toBe('')
    expect(sheet.getCell('D10').master.address).toBe('A10')
    expect(sheet.getColumn(4).width).toBeLessThanOrEqual(10.5)
    expect(sheet.getCell('A9').value).toBe('TỔNG')
    expect(sheet.pageSetup.orientation).toBe('portrait')
  })

  it('ngày Thứ 5: cột T5 duy nhất, không xét giờ', async () => {
    const data = buildPunctualityReport(
      input({ mode: 'day', fromDate: '2026-11-26', toDate: '2026-11-26', sessions: { thu5: ['2026-11-26'], cn: [] } })
    )
    const sheet = (await roundTrip(data)).worksheets[0]
    expect(headerLabels(sheet, 4)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'T5 26/11'])
    expect(text(sheet, 'E6')).toBe('')
    expect(sheet.getCell('D7').value as number).toBeCloseTo(0.75, 10)
  })
})

describe('buildPunctualityReportWorkbook — nhiều cột (kiểu tháng 10/2026)', () => {
  // 5 Thứ 5 + 4 Chủ nhật → 5 + TB + 4 + TB = 11 cột ngày, N = 14 (cột cuối N)
  const month = () =>
    buildPunctualityReport(
      input({
        mode: 'month',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        sessions: {
          thu5: ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29'],
          cn: ['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25'],
        },
        records: [
          ...['a1', 'a2'].map((id) => rec(id, 'thu5', '2026-10-08')),
          rec('a1', 'cn_le', '2026-10-11', false),
        ],
      })
    )

  it('N > 10 → khổ ngang, vẫn fitToWidth 1, đóng băng 3 cột', async () => {
    const sheet = (await roundTrip(month())).worksheets[0]
    expect(sheet.pageSetup.orientation).toBe('landscape')
    expect(sheet.pageSetup.fitToPage).toBe(true)
    expect(sheet.pageSetup.fitToWidth).toBe(1)
    expect(sheet.pageSetup.fitToHeight).toBe(0)
    const view = sheet.views[0] as { xSplit?: number; ySplit?: number }
    expect(view.xSplit).toBe(3)
    expect(view.ySplit).toBe(6)
  })

  it('tiêu đề cột đúng thứ tự, TB CN ở cột cuối, merge A4:N4 / A5:N5', async () => {
    const sheet = (await roundTrip(month())).worksheets[0]
    expect(headerLabels(sheet, 14)).toEqual([
      'PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ',
      'T5 01/10', 'T5 08/10', 'T5 15/10', 'T5 22/10', 'T5 29/10', 'TB T5',
      'CN 04/10', 'CN 11/10', 'CN 18/10', 'CN 25/10', 'TB CN',
    ])
    expect(text(sheet, 'O6')).toBe('')
    expect(sheet.getCell('N4').master.address).toBe('A4')
    expect(sheet.getCell('O4').isMerged).toBe(false)
    expect(sheet.getCell('N5').master.address).toBe('A5')
  })

  it('giá trị theo cột: T5 08/10 của Ấu 1 = 50%, CN 11/10 = 25%, TB CN = 25%, CN chưa xét = —', async () => {
    const sheet = (await roundTrip(month())).worksheets[0]
    expect(sheet.getCell('E7').value as number).toBeCloseTo(0.5, 10) // T5 08/10
    expect(sheet.getCell('D7').value as number).toBeCloseTo(0, 10) // T5 01/10: không ai
    expect(sheet.getCell('I7').value as number).toBeCloseTo(0.1, 10) // TB T5 = 2 / (4 × 5)
    expect(sheet.getCell('J7').value).toBe('—') // CN 04/10 chưa xét
    expect(sheet.getCell('K7').value as number).toBeCloseTo(0.25, 10) // CN 11/10
    expect(sheet.getCell('N7').value as number).toBeCloseTo(0.25, 10) // TB CN (chỉ buổi đã xét)
    expect(sheet.getCell('O7').value).toBeNull()
  })

  it('3 dòng ghi chú gộp tới cột N', async () => {
    const sheet = (await roundTrip(month())).worksheets[0]
    expect(text(sheet, 'A10')).toBe(FOOTNOTES[0])
    expect(text(sheet, 'A12')).toBe(AVERAGE_FOOTNOTE)
    expect(sheet.getCell('N12').master.address).toBe('A12')
  })
})

describe('buildPunctualityReportWorkbook — biên', () => {
  it('không có buổi nào → chỉ 3 cột PHÂN ĐOÀN | LỚP | SỈ SỐ, merge A:C, không lỗi', async () => {
    const data = buildPunctualityReport(input({ sessions: { thu5: [], cn: [] }, records: [] }))
    const sheet = (await roundTrip(data)).worksheets[0]
    expect(headerLabels(sheet, 3)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ'])
    expect(text(sheet, 'D6')).toBe('')
    expect(sheet.getCell('C4').master.address).toBe('A4')
    expect(sheet.getCell('D4').isMerged).toBe(false)
    expect(sheet.getCell('C5').master.address).toBe('A5')
    expect(sheet.getCell('C10').master.address).toBe('A10')
    expect(sheet.getCell('A9').value).toBe('TỔNG')
  })

  it('không có lớp nào: hàng TỔNG ngay dưới tiêu đề, tỉ lệ "—"', async () => {
    const data = buildPunctualityReport(
      input({ mode: 'week', fromDate: '2026-11-23', toDate: '2026-11-29', classes: [], students: [],
        sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] } })
    )
    const sheet = (await roundTrip(data)).worksheets[0]
    expect(sheet.getCell('A7').value).toBe('TỔNG')
    expect(sheet.getCell('C7').value).toBe(0)
    expect(sheet.getCell('D7').value).toBe('—')
    expect(sheet.getCell('E7').value).toBe('—')
  })

  it('tên lớp Unicode không làm hỏng file; ghi chú (note) rất dài không được in và không làm cao hàng', async () => {
    const data = buildPunctualityReport(
      input({
        classes: [{ id: 'u', name: 'Ấu «Đặng» 🕊', branch: 'Ấu Nhi', display_order: 1 }],
        students: [{ id: 's', class_id: 'u' }],
        records: [rec('s', 'cn_le', '2026-11-29', true)],
      })
    )
    data.branches[0].classes[0].note = 'Ghi chú '.repeat(125)
    const sheet = (await roundTrip(data)).worksheets[0]
    expect(sheet.getCell('B7').value).toBe('Ấu «Đặng» 🕊')
    sheet.eachRow((row) => row.eachCell((cell) => expect(String(cell.value ?? '')).not.toContain('Ghi chú Ghi chú')))
    expect(sheet.getRow(7).height).toBeCloseTo(20.1, 5)
  })
})
