import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { PriestReportData } from '@/components/PriestReportTemplate'
import { buildPriestReportWorkbook, estimateWrappedLines } from '@/lib/priest-report-excel'

const threeNameNote = 'Thứ 5\nVắng 2 tháng:\nGiuse Nguyễn Văn An\nMaria Trần Thị Bình\nPhêrô Lê Hoàng Cường'

function reportData(absentWarning: PriestReportData['absentWarning'] = null): PriestReportData {
  return {
    branches: [
      {
        branch: 'Chiên Con',
        label: 'CHIÊN CON',
        classes: [
          {
            classId: 'class-1',
            className: 'Khai Tâm A',
            studentCount: 10,
            thu5Absent: 4,
            cnAbsent: 3,
            prevThu5Rate: 0.7,
            prevCnRate: 0.9,
            warnedNames: ['Têrêsa Nguyễn An'],
            note: 'Thứ 5\nVắng 2 tháng:\nTêrêsa Nguyễn An',
          },
          {
            classId: 'class-2',
            className: 'Khai Tâm B',
            studentCount: 0,
            thu5Absent: 0,
            cnAbsent: 0,
            prevThu5Rate: null,
            prevCnRate: null,
            warnedNames: [],
            note: threeNameNote,
          },
        ],
      },
      {
        branch: 'Ấu Nhi',
        label: 'ẤU',
        classes: [
          {
            classId: 'class-3',
            className: 'Ấu 1A',
            studentCount: 8,
            thu5Absent: 1,
            cnAbsent: 2,
            prevThu5Rate: null,
            prevCnRate: 0.5,
            warnedNames: [],
            note: '',
          },
        ],
      },
    ],
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    timeLabel: 'tháng 9/2026',
    subtitleLines: [
      'Tỉ lệ thiếu nhi đi ít nhất 01 ngày trong tháng: (tháng 9/2026)',
      '*T5 ngày 3,10,17,24/09  ;  *GL ngày 6,13,20,27/09',
    ],
    absentWarning,
  }
}

async function roundTrip(data: PriestReportData, logo?: Uint8Array) {
  const workbook = await buildPriestReportWorkbook(data, logo)
  const buffer = await workbook.xlsx.writeBuffer()
  const excelModule = await import('exceljs')
  const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
  const loadedWorkbook = new ExcelJS.Workbook()
  await loadedWorkbook.xlsx.load(buffer)
  return loadedWorkbook
}

describe('buildPriestReportWorkbook', () => {
  it('estimates newline-separated, word-wrapped note lines with a 14-character width', () => {
    expect(estimateWrappedLines('Thứ 5\nVắng 2 tháng:\nName A\nName B')).toBe(4)
    expect(estimateWrappedLines('123456789 abcde')).toBe(2)
    expect(estimateWrappedLines('123456789012345')).toBe(2)
  })

  it('uses the template sheet name, required header merges, and page setup', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!

    expect(worksheet.model.merges).toEqual(expect.arrayContaining(['A2:E2', 'A3:D3', 'A4:J4', 'A5:J5']))
    expect(worksheet.pageSetup.orientation).toBe('portrait')
    expect(worksheet.pageSetup.scale).toBe(90)
    expect(worksheet.pageSetup.margins).toMatchObject({ left: 0.27, right: 0.24, top: 0.32, bottom: 0.31 })
  })

  it('writes the exact table headers, title, subtitle, and footnotes', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!

    expect(worksheet.getCell('A1').value).toBe('                   Phong trào thiếu nhi thánh thể Việt Nam')
    expect(worksheet.getCell('A4').value).toBe('BÁO CÁO KẾT QUẢ CHUYÊN CẦN')
    expect(worksheet.getCell('A5').value).toBe(reportData().subtitleLines.join('\n'))
    expect(['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6', 'I6', 'J6'].map(address => worksheet.getCell(address).value)).toEqual([
      'PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'THỨ 5', 'TỈ LỆ T5 ', 'TL CŨ', 'GIÁO LÝ', 'TỈ LỆ GL', 'TL CŨ', 'GHI CHÚ',
    ])
    expect(worksheet.getCell('A10').value).toBe('Thứ 5: vắng từ 4 em ~ khoảng dưới 90% là chú ý (các lớp tô vàng đặc biệt chú ý hơn)')
    expect(worksheet.getCell('A11').value).toBe('CN: vắng từ 3 em ~ khoảng dưới 91% là chú ý')
  })

  it('keeps formulas and cached attendance results, including zero-size classes', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!

    expect(worksheet.getCell('D7').value).toMatchObject({ formula: 'C7-K7' })
    expect(worksheet.getCell('D7').result).toBe(6)
    expect(worksheet.getCell('E7').value).toMatchObject({ formula: 'D7/C7' })
    expect(worksheet.getCell('E7').result).toBe(0.6)
    expect(worksheet.getCell('G7').value).toMatchObject({ formula: 'C7-L7' })
    expect(worksheet.getCell('G7').result).toBe(7)
    expect(worksheet.getCell('H7').value).toMatchObject({ formula: 'G7/C7' })
    expect(worksheet.getCell('H7').result).toBe(0.7)
    expect(worksheet.getCell('D8').value).toMatchObject({ formula: 'C8-K8' })
    expect(worksheet.getCell('D8').result).toBe(0)
    expect(worksheet.getCell('E8').value).toMatchObject({ formula: 'D8/C8' })
    expect(worksheet.getCell('E8').result).toEqual({ error: '#DIV/0!' })
    expect(worksheet.getCell('G8').value).toMatchObject({ formula: 'C8-L8' })
    expect(worksheet.getCell('G8').result).toBe(0)
    expect(worksheet.getCell('H8').value).toMatchObject({ formula: 'G8/C8' })
    expect(worksheet.getCell('H8').result).toEqual({ error: '#DIV/0!' })
    expect(worksheet.getCell('E8').numFmt).toBe('0%')
    expect(worksheet.getCell('F7').numFmt).toBe('0%')
    expect(worksheet.getCell('H7').numFmt).toBe('0%')
    expect(worksheet.getCell('I7').numFmt).toBe('0%')
    expect(worksheet.getCell('F7').value).toBe(0.7)
    expect(worksheet.getCell('I7').value).toBe(0.9)
    expect(worksheet.getCell('K7').value).toBe(4)
    expect(worksheet.getCell('L7').value).toBe(3)
    expect(worksheet.getCell('K7').font).toMatchObject({ name: 'Arial', size: 11 })
    expect(worksheet.getCell('L7').font).toMatchObject({ name: 'Arial', size: 11 })
    expect(worksheet.getCell('F7').font).toMatchObject({ name: 'Arial', size: 11, italic: true })
    expect(worksheet.getCell('I7').font).toMatchObject({ name: 'Arial', size: 11, italic: true })
    const sourceWorkbook = await buildPriestReportWorkbook(reportData())
    expect(sourceWorkbook.calcProperties.fullCalcOnLoad).toBe(true)
  })

  it('sets the specified widths and hides F, I, K, and L', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!
    const widths = [13.7109375, 13.7109375, 7.7109375, 10.7109375, 11.7109375, 7.7109375, 10.7109375, 11.7109375, 7.7109375, 15.5703125, 9.42578125, 11.140625]

    widths.forEach((width, index) => expect(worksheet.getColumn(index + 1).width).toBeCloseTo(width, 3))
    for (const column of [6, 9, 11, 12]) expect(worksheet.getColumn(column).hidden).toBe(true)
    for (const column of [1, 2, 3, 4, 5, 7, 8, 10]) expect(worksheet.getColumn(column).hidden).toBeFalsy()
  })

  it('uses Arial with the template font sizes and emphasis', async () => {
    const generatedWorkbook = await buildPriestReportWorkbook(reportData())
    expect(generatedWorkbook.getWorksheet('Bao cao chuyen can')!.getCell('A1').font.size).toBe(11.5)
    const buffer = await generatedWorkbook.xlsx.writeBuffer()
    const excelModule = await import('exceljs')
    const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!

    // ExcelJS writes the requested 11.5pt in the workbook XML but parses font sizes as integers on reload.
    expect(worksheet.getCell('A1').font).toMatchObject({ name: 'Arial', size: 11 })
    expect(worksheet.getCell('A4').font).toMatchObject({ name: 'Arial', size: 16, bold: true })
    expect(worksheet.getCell('A5').font).toMatchObject({ name: 'Arial', size: 11, italic: true })
    expect(worksheet.getCell('A6').font).toMatchObject({ name: 'Arial', size: 11, bold: true })
    expect(worksheet.getCell('A7').font).toMatchObject({ name: 'Arial', size: 11, bold: true })
    expect(worksheet.getCell('B7').font).toMatchObject({ name: 'Arial', size: 11 })
    expect(worksheet.getRow(1).height).toBe(16.5)
    expect(worksheet.getRow(3).height).toBe(7.5)
    expect(worksheet.getRow(4).height).toBe(24)
    expect(worksheet.getRow(5).height).toBe(34.5)
    expect(worksheet.getRow(6).height).toBe(19.5)
  })

  it('merges branch labels and both footnote rows', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!

    expect(worksheet.model.merges).toEqual(expect.arrayContaining(['A7:A8', 'A10:J10', 'A11:J11']))
    expect(worksheet.getCell('A7').value).toBe('CHIÊN CON')
    expect(worksheet.getCell('A9').value).toBe('ẤU')
  })

  it('wraps long class notes and gives their rows enough height', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!
    const wrappedLineCount = estimateWrappedLines(threeNameNote)

    expect(worksheet.getCell('J8').value).toBe(threeNameNote)
    expect(worksheet.getCell('J8').alignment.wrapText).toBe(true)
    expect(worksheet.getRow(8).height).toBeGreaterThanOrEqual(wrappedLineCount * 15)
    expect(worksheet.getRow(8).height).toBe(wrappedLineCount * 15 + 4)
  })

  it('adds the yellow conditional formatting rule to every data row', async () => {
    const workbook = await roundTrip(reportData())
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!
    const conditionalFormatting = (worksheet as unknown as {
      conditionalFormattings: Array<{
        ref: string
        rules: Array<{
          type: string
          formulae: string[]
          style?: {
            fill?: {
              type?: string
              pattern?: string
              fgColor?: { argb: string }
              bgColor?: { argb: string }
            }
          }
        }>
      }>
    }).conditionalFormattings[0]

    expect(conditionalFormatting.ref).toBe('D7:D9')
    expect(conditionalFormatting.rules[0]).toMatchObject({ type: 'expression', formulae: ['E7<0.8'] })
    expect(conditionalFormatting.rules[0].style?.fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' },
      bgColor: { argb: 'FFFFFF00' },
    })
  })

  it('adds the Arial warning sheet with title, headers, and student phones when supplied', async () => {
    const workbook = await roundTrip(reportData({
      prevLabel: 'Tháng 8/2026',
      currentLabel: 'Tháng 9/2026',
      students: [{
        studentId: 'student-1',
        saintName: 'Têrêsa',
        fullName: 'Nguyễn Văn An',
        className: 'Khai Tâm A',
        parentPhones: ['0900000001', '0900000002'],
      }],
    }))
    const worksheet = workbook.getWorksheet('Canh bao')!

    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Bao cao chuyen can', 'Canh bao'])
    expect(worksheet.getCell('A1').value).toBe('CẢNH BÁO: vắng 2 tháng liên tiếp (Tháng 8/2026 và Tháng 9/2026)')
    expect(['A2', 'B2', 'C2', 'D2', 'E2'].map(address => worksheet.getCell(address).value)).toEqual([
      'STT', 'Tên thánh', 'Họ tên', 'Lớp', 'SĐT phụ huynh',
    ])
    expect(worksheet.getCell('B3').value).toBe('Têrêsa')
    expect(worksheet.getCell('C3').value).toBe('Nguyễn Văn An')
    expect(worksheet.getCell('E3').value).toBe('0900000001 / 0900000002')
    expect(worksheet.getCell('A1').font).toMatchObject({ name: 'Arial', bold: true })
    expect(worksheet.pageSetup).toMatchObject({
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.27, right: 0.24, top: 0.32, bottom: 0.31, header: 0.3, footer: 0.3 },
    })
  })

  it('omits the warning sheet when no warning was computed', async () => {
    const workbook = await roundTrip(reportData(null))
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Bao cao chuyen can'])
  })

  it('embeds the supplied template logo', async () => {
    const logo = await readFile('public/images/tntt-logo-priest-report.jpeg')
    const workbook = await roundTrip(reportData(), logo)
    const worksheet = workbook.getWorksheet('Bao cao chuyen can')!
    const images = worksheet.getImages()
    expect(images).toHaveLength(1)
    const imageRange = images[0].range as unknown as {
      tl: { nativeCol: number; nativeColOff: number; nativeRow: number; nativeRowOff: number }
      ext: { width: number; height: number }
    }
    expect(imageRange.tl).toMatchObject({
      nativeCol: 0,
      nativeColOff: 90767,
      nativeRow: 0,
      nativeRowOff: 28575,
    })
    expect(imageRange.ext.width).toBeCloseTo(509308 / 9525, 8)
    expect(imageRange.ext.height).toBeCloseTo(476249 / 9525, 8)
  })
})
