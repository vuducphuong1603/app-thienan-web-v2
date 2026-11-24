import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildPunctualityReport,
  punctualityColumns,
  type PunctualityRecord,
  type PunctualityReportInput,
} from '../punctuality-report'
import { buildPunctualityReportWorkbook } from '../punctuality-report-excel'

const CLASSES = [
  { id: 'c-au', name: 'Ấu 1', branch: 'Ấu Nhi', display_order: 10 },
  { id: 'c-thieu', name: 'Thiếu 1', branch: 'Thiếu Nhi', display_order: 20 },
]
const STUDENTS = [
  ...['a1', 'a2', 'a3', 'a4'].map((id) => ({ id, class_id: 'c-au' })),
  ...['t1', 't2', 't3'].map((id) => ({ id, class_id: 'c-thieu' })),
]
const rec = (student_id: string, day_type: string, attendance_date: string, is_late: boolean | null = null): PunctualityRecord =>
  ({ student_id, status: 'present', day_type, attendance_date, is_late })
function input(over: Partial<PunctualityReportInput>): PunctualityReportInput {
  return { mode: 'custom', fromDate: '2026-11-23', toDate: '2026-11-29', classes: CLASSES,
    branchOrder: ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'], students: STUDENTS,
    sessions: { thu5: [], cn: ['2026-11-29'] }, records: [], ...over }
}
async function roundTrip(data: ReturnType<typeof buildPunctualityReport>, logo?: Uint8Array) {
  const wb = await buildPunctualityReportWorkbook(data, logo)
  const buf = await wb.xlsx.writeBuffer()
  const back = new ExcelJS.Workbook()
  await back.xlsx.load(buf as ArrayBuffer)
  return back
}

describe('QA Excel v2', () => {
  it('exactly one sheet named Thong ke dung gio, even with zero sessions / zero classes', async () => {
    for (const over of [{}, { sessions: { thu5: [], cn: [] } }, { classes: [], students: [] }]) {
      const wb = await roundTrip(buildPunctualityReport(input(over)))
      expect(wb.worksheets.map((w) => w.name)).toEqual(['Thong ke dung gio'])
    }
  })

  it('no dates: header is PHÂN ĐOÀN | LỚP | SỈ SỐ only and TỔNG row valid', async () => {
    const ws = (await roundTrip(buildPunctualityReport(input({ sessions: { thu5: [], cn: [] } })))).worksheets[0]
    expect([1, 2, 3, 4].map((c) => ws.getCell(6, c).value)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', null])
    expect(ws.getCell('C4').isMerged).toBe(true)
    expect(ws.getCell('D4').isMerged).toBe(false)
    expect(ws.getCell('A9').value).toBe('TỔNG')
    expect(ws.getCell('C9').value).toBe(7)
  })

  it('1 date per group: no TB columns; headers & merges (A4:?4)', async () => {
    const data = buildPunctualityReport(input({ sessions: { thu5: ['2026-11-26'], cn: ['2026-11-29'] },
      records: [rec('a1', 'thu5', '2026-11-26'), rec('a1', 'cn_le', '2026-11-29', false)] }))
    const ws = (await roundTrip(data)).worksheets[0]
    expect([1, 2, 3, 4, 5, 6].map((c) => ws.getCell(6, c).value)).toEqual(['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'T5 26/11', 'CN 29/11', null])
    expect(ws.getCell('D7').value).toBe(0.25)
    expect(ws.getCell('D7').numFmt).toBe('0%')
    expect(ws.getCell('E7').value).toBe(0.25)
    expect(ws.getCell('A4').isMerged).toBe(true)
    expect(ws.getCell('E4').isMerged).toBe(true) // title merged through the last date column
    expect(ws.getCell('F4').isMerged).toBe(false)
    expect(ws.pageSetup.orientation).toBe('portrait')
  })

  it('all-null Sundays → "—" strings (not 0, not blank), no note cell; TB CN is —', async () => {
    const data = buildPunctualityReport(input({ toDate: '2026-12-06', sessions: { thu5: [], cn: ['2026-11-29', '2026-12-06'] },
      records: [rec('a1', 'cn_le', '2026-11-29', null)] }))
    const ws = (await roundTrip(data)).worksheets[0]
    const labels = [4, 5, 6].map((c) => ws.getCell(6, c).value)
    expect(labels).toEqual(['CN 29/11', 'CN 06/12', 'TB CN'])
    for (const c of [4, 5, 6]) expect(ws.getCell(7, c).value).toBe('—')
    expect(ws.getCell(7, 7).value).toBeNull()
  })

  it('many columns (12 date columns + 2 TB): landscape, fit to width, frozen panes, last col = TB CN (no GHI CHÚ), footnotes merged to last col', async () => {
    const thu5 = Array.from({ length: 5 }, (_, i) => `2026-10-${String(1 + 7 * i).padStart(2, '0')}`)
    const cn = Array.from({ length: 4 }, (_, i) => `2026-10-${String(4 + 7 * i).padStart(2, '0')}`)
    const data = buildPunctualityReport(input({ mode: 'month', fromDate: '2026-10-01', toDate: '2026-10-31', sessions: { thu5, cn },
      records: [rec('a1', 'thu5', thu5[0]), rec('a1', 'cn_le', cn[0], true)] }))
    const n = punctualityColumns(data).length // 5+1+4+1 = 11
    const ws = (await roundTrip(data)).worksheets[0]
    expect(ws.pageSetup.orientation).toBe('landscape')
    expect(ws.pageSetup.fitToPage).toBe(true)
    expect(ws.pageSetup.fitToWidth).toBe(1)
    expect(ws.getCell(6, 3 + n).value).toBe('TB CN')
    expect(ws.getCell(6, 3 + n + 1).value).toBeNull()
    const view = ws.views[0] as { state?: string; xSplit?: number; ySplit?: number }
    expect(view.state).toBe('frozen')
    expect(view.xSplit).toBe(3)
    expect(view.ySplit).toBe(6)
    // footnote rows merged across the whole table
    const footRow = 7 + 2 + 1 // 2 classes + TỔNG → first footnote
    expect(ws.getCell(footRow, 3 + n).isMerged).toBe(true)
    expect(ws.getCell(footRow, 3 + n + 1).isMerged).toBe(false)
    expect(ws.getCell(footRow, 1).value).toBe(data.footnotes[0])
  })

  it('TB cells are bold, rates stored as numbers, studentCount numFmt 0', async () => {
    const data = buildPunctualityReport(input({ toDate: '2026-12-06', sessions: { thu5: ['2026-11-26', '2026-12-03'], cn: [] },
      records: [rec('a1', 'thu5', '2026-11-26')] }))
    const ws = (await roundTrip(data)).worksheets[0]
    expect(ws.getCell(6, 6).value).toBe('TB T5')
    expect(typeof ws.getCell(7, 6).value).toBe('number')
    expect(ws.getCell(7, 6).font?.bold).toBe(true)
    expect(ws.getCell(7, 4).font?.bold).toBeFalsy()
    expect(ws.getCell(7, 3).numFmt).toBe('0')
  })

  it('Unicode names + logo bytes do not break the file; a very long note is not written', async () => {
    const data = buildPunctualityReport(input({ classes: [{ id: 'u', name: 'Ấu «Đặng» 🕊', branch: 'Ấu Nhi', display_order: 1 }],
      students: [{ id: 's', class_id: 'u' }], records: [rec('s', 'cn_le', '2026-11-29', true)] }))
    data.branches[0].classes[0].note = 'Ghi chú dài '.repeat(100)
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9])
    const ws = (await roundTrip(data, jpeg)).worksheets[0]
    expect(ws.getCell('B7').value).toBe('Ấu «Đặng» 🕊')
    expect(ws.getCell('E7').value).toBeNull()
    expect(ws.getRow(7).height).toBeCloseTo(20.1, 5)
  })

  it('A1/A2 header texts', async () => {
    const ws = (await roundTrip(buildPunctualityReport(input({})))).worksheets[0]
    expect(String(ws.getCell('A1').value).trim()).toBe('Phong trào thiếu nhi thánh thể Việt Nam')
    expect(String(ws.getCell('A2').value).trim()).toBe('Giáo xứ Thiên Ân - xứ đoàn Fatima')
    expect(ws.getCell('A4').value).toBe('THỐNG KÊ TỈ LỆ CÓ MẶT ĐÚNG GIỜ')
  })
})
