import type { PriestReportData } from '@/components/PriestReportTemplate'

type ExcelJSModule = typeof import('exceljs')

// Interop: Next's web bundle returns the module directly; Node/CJS may return { default }.
async function loadExcelJS(): Promise<ExcelJSModule> {
  const mod = await import('exceljs')
  return ((mod as unknown as { default?: ExcelJSModule }).default ?? mod) as ExcelJSModule
}

const FONT = 'Arial'
const thinBorder = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

const solidFill = (argb: string) => ({
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb },
  bgColor: { argb },
})

const columnWidths = [13.7109375, 13.7109375, 7.7109375, 10.7109375, 11.7109375, 7.7109375, 10.7109375, 11.7109375, 7.7109375, 15.5703125, 9.42578125, 11.140625]
const hiddenColumns = new Set([6, 9, 11, 12])
const headers = ['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'THỨ 5', 'TỈ LỆ T5 ', 'TL CŨ', 'GIÁO LÝ', 'TỈ LỆ GL', 'TL CŨ', 'GHI CHÚ']
const thu5Footnote = 'Thứ 5: vắng từ 4 em ~ khoảng dưới 90% là chú ý (các lớp tô vàng đặc biệt chú ý hơn)'
const cnFootnote = 'CN: vắng từ 3 em ~ khoảng dưới 91% là chú ý'

function setPageAndColumns(worksheet: import('exceljs').Worksheet): void {
  columnWidths.forEach((width, index) => {
    const column = worksheet.getColumn(index + 1)
    column.width = width
    column.hidden = hiddenColumns.has(index + 1)
  })

  worksheet.pageSetup = {
    orientation: 'portrait',
    scale: 90,
    fitToPage: false,
    margins: { left: 0.27, right: 0.24, top: 0.32, bottom: 0.31, header: 0.3, footer: 0.3 },
  }
}

function setMergedRowText(
  worksheet: import('exceljs').Worksheet,
  rowNumber: number,
  text: string,
  options: { fontSize?: number; bold?: boolean; italic?: boolean; alignment?: 'left' | 'center'; border?: 'top' }
): void {
  worksheet.mergeCells(`A${rowNumber}:J${rowNumber}`)
  const row = worksheet.getRow(rowNumber)
  row.getCell(1).value = text

  for (let column = 1; column <= 10; column += 1) {
    const cell = row.getCell(column)
    cell.font = { name: FONT, size: options.fontSize ?? 11, bold: options.bold, italic: options.italic }
    cell.alignment = { horizontal: options.alignment ?? 'left', vertical: 'middle', wrapText: options.fontSize === 16 }
    if (options.border === 'top') cell.border = { top: { style: 'thin' } }
  }
}

export function estimateWrappedLines(note: string): number {
  const maxCharsPerLine = 14

  return note.split(/\r?\n/).reduce((total, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return total + 1

    let lineCount = 0
    let currentLine = ''

    for (const word of words) {
      let remainingChars = Array.from(word)
      const currentLength = Array.from(currentLine).length
      if (currentLine && currentLength + 1 + remainingChars.length <= maxCharsPerLine) {
        currentLine += ` ${word}`
        continue
      }

      if (currentLine) {
        lineCount += 1
        currentLine = ''
      }

      while (remainingChars.length > maxCharsPerLine) {
        lineCount += 1
        remainingChars = remainingChars.slice(maxCharsPerLine)
      }
      currentLine = remainingChars.join('')
    }

    if (currentLine) lineCount += 1
    return total + lineCount
  }, 0)
}

function encodeJpegBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return `data:image/jpeg;base64,${btoa(binary)}`
}

function addWarningSheet(workbook: import('exceljs').Workbook, data: PriestReportData): void {
  const warning = data.absentWarning
  if (!warning) return

  const worksheet = workbook.addWorksheet('Canh bao')
  worksheet.pageSetup = {
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.27, right: 0.24, top: 0.32, bottom: 0.31, header: 0.3, footer: 0.3 },
  }
  worksheet.columns = [
    { width: 7 },
    { width: 18 },
    { width: 30 },
    { width: 18 },
    { width: 25 },
  ]

  worksheet.mergeCells('A1:E1')
  const title = `CẢNH BÁO: vắng 2 tháng liên tiếp (${warning.prevLabel} và ${warning.currentLabel})`
  worksheet.getCell('A1').value = title
  worksheet.getRow(1).height = 24
  worksheet.getCell('A1').font = { name: FONT, size: 14, bold: true }
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

  const warningHeaders = ['STT', 'Tên thánh', 'Họ tên', 'Lớp', 'SĐT phụ huynh']
  const headerRow = worksheet.getRow(2)
  headerRow.values = warningHeaders
  headerRow.height = 21
  for (let column = 1; column <= warningHeaders.length; column += 1) {
    const cell = headerRow.getCell(column)
    cell.font = { name: FONT, size: 11, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = solidFill('FFF8D7DA')
    cell.border = thinBorder
  }

  if (warning.students.length === 0) {
    worksheet.mergeCells('A3:E3')
    const empty = worksheet.getCell('A3')
    empty.value = 'Không có em nào vắng 2 tháng liên tiếp'
    empty.font = { name: FONT, size: 11 }
    empty.alignment = { horizontal: 'left', vertical: 'middle' }
    for (let column = 1; column <= 5; column += 1) worksheet.getCell(3, column).border = thinBorder
    worksheet.getRow(3).height = 20.1
    return
  }

  warning.students.forEach((student, index) => {
    const rowNumber = index + 3
    const row = worksheet.getRow(rowNumber)
    row.values = [index + 1, student.saintName, student.fullName, student.className, student.parentPhones.join(' / ')]
    row.height = 20.1
    for (let column = 1; column <= 5; column += 1) {
      const cell = row.getCell(column)
      cell.font = { name: FONT, size: 11 }
      cell.alignment = { horizontal: column === 1 ? 'center' : 'left', vertical: 'middle', wrapText: true }
      cell.border = thinBorder
    }
  })
}

/** Build the priest attendance report workbook in the supplied Excel template's layout. */
export async function buildPriestReportWorkbook(
  data: PriestReportData,
  logo?: ArrayBuffer | Uint8Array
): Promise<import('exceljs').Workbook> {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  workbook.calcProperties.fullCalcOnLoad = true
  const worksheet = workbook.addWorksheet('Bao cao chuyen can')
  setPageAndColumns(worksheet)

  worksheet.getCell('A1').value = '                   Phong trào thiếu nhi thánh thể Việt Nam'
  worksheet.getCell('A1').font = { name: FONT, size: 11.5 }
  worksheet.getRow(1).height = 16.5

  worksheet.mergeCells('A2:E2')
  worksheet.getCell('A2').value = '          Giáo xứ Thiên Ân - xứ đoàn Fatima'
  worksheet.getCell('A2').font = { name: FONT, size: 11.5 }
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }

  worksheet.mergeCells('A3:D3')
  worksheet.getRow(3).height = 7.5

  worksheet.mergeCells('A4:J4')
  worksheet.getCell('A4').value = 'BÁO CÁO KẾT QUẢ CHUYÊN CẦN'
  worksheet.getCell('A4').font = { name: FONT, size: 16, bold: true }
  worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  worksheet.getRow(4).height = 24

  worksheet.mergeCells('A5:J5')
  worksheet.getCell('A5').value = data.subtitleLines.join('\n')
  worksheet.getCell('A5').font = { name: FONT, size: 11, italic: true }
  worksheet.getCell('A5').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  worksheet.getRow(5).height = 34.5
  for (let column = 1; column <= 10; column += 1) {
    worksheet.getCell(5, column).border = { bottom: { style: 'thin' } }
  }

  const headerRow = worksheet.getRow(6)
  headerRow.values = headers
  headerRow.height = 19.5
  for (let column = 1; column <= headers.length; column += 1) {
    const cell = headerRow.getCell(column)
    cell.font = { name: FONT, size: 11, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder
  }

  let nextRow = 7
  for (const branch of data.branches) {
    if (branch.classes.length === 0) continue
    const branchStart = nextRow

    for (const reportClass of branch.classes) {
      const rowNumber = nextRow
      const row = worksheet.getRow(rowNumber)
      row.height = Math.max(20.1, estimateWrappedLines(reportClass.note) * 15 + 4)

      for (let column = 1; column <= 10; column += 1) {
        const cell = row.getCell(column)
        cell.font = { name: FONT, size: 11 }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: column === 10 }
        cell.border = thinBorder
      }

      row.getCell(2).value = reportClass.className
      row.getCell(3).value = reportClass.studentCount
      const thu5Present = reportClass.studentCount - reportClass.thu5Absent
      const cnPresent = reportClass.studentCount - reportClass.cnAbsent
      row.getCell(4).value = { formula: `C${rowNumber}-K${rowNumber}`, result: thu5Present }
      row.getCell(5).value = {
        formula: `D${rowNumber}/C${rowNumber}`,
        result: reportClass.studentCount > 0 ? thu5Present / reportClass.studentCount : { error: '#DIV/0!' },
      }
      row.getCell(5).numFmt = '0%'
      row.getCell(6).value = reportClass.prevThu5Rate
      row.getCell(6).numFmt = '0%'
      row.getCell(6).font = { name: FONT, size: 11, italic: true }
      row.getCell(7).value = { formula: `C${rowNumber}-L${rowNumber}`, result: cnPresent }
      row.getCell(8).value = {
        formula: `G${rowNumber}/C${rowNumber}`,
        result: reportClass.studentCount > 0 ? cnPresent / reportClass.studentCount : { error: '#DIV/0!' },
      }
      row.getCell(8).numFmt = '0%'
      row.getCell(9).value = reportClass.prevCnRate
      row.getCell(9).numFmt = '0%'
      row.getCell(9).font = { name: FONT, size: 11, italic: true }
      row.getCell(10).value = reportClass.note || null
      row.getCell(11).value = reportClass.thu5Absent
      row.getCell(11).font = { name: FONT, size: 11 }
      row.getCell(12).value = reportClass.cnAbsent
      row.getCell(12).font = { name: FONT, size: 11 }

      nextRow += 1
    }

    const branchEnd = nextRow - 1
    const branchCell = worksheet.getCell(branchStart, 1)
    branchCell.value = branch.label
    if (branchEnd > branchStart) worksheet.mergeCells(`A${branchStart}:A${branchEnd}`)
    branchCell.font = { name: FONT, size: 11, bold: true }
    branchCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }

  const lastDataRow = nextRow - 1
  if (lastDataRow >= 7) {
    worksheet.addConditionalFormatting({
      ref: `D7:D${lastDataRow}`,
      rules: [{
        type: 'expression',
        formulae: ['E7<0.8'],
        priority: 1,
        style: { fill: solidFill('FFFFFF00') },
      }],
    })
  }

  setMergedRowText(worksheet, nextRow, thu5Footnote, { alignment: 'left', border: 'top' })
  setMergedRowText(worksheet, nextRow + 1, cnFootnote, { alignment: 'left' })

  if (logo) {
    const bytes = logo instanceof ArrayBuffer ? new Uint8Array(logo) : logo
    const imageId = workbook.addImage({ base64: encodeJpegBase64(bytes), extension: 'jpeg' })
    const logoAnchor = { col: 0, row: 0, nativeCol: 0, nativeColOff: 90767, nativeRow: 0, nativeRowOff: 28575 }
    worksheet.addImage(imageId, {
      tl: logoAnchor,
      ext: { width: 509308 / 9525, height: 476249 / 9525 },
    })
  }

  addWarningSheet(workbook, data)
  return workbook
}
