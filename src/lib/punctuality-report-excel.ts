import type { Cell, Workbook, Worksheet } from 'exceljs'
import {
  PUNCTUALITY_REPORT_TITLE,
  punctualityCellRate,
  punctualityColumns,
  type PunctualityColumn,
  type PunctualityReportData,
} from '@/lib/punctuality-report'

type ExcelJSModule = typeof import('exceljs')

// Interop: Next's web bundle returns the module directly; Node/CJS may return { default }.
async function loadExcelJS(): Promise<ExcelJSModule> {
  const mod = await import('exceljs')
  return ((mod as unknown as { default?: ExcelJSModule }).default ?? mod) as ExcelJSModule
}

const FONT = 'Arial'
const NULL_PLACEHOLDER = '—'
const FIXED_COLUMNS = 3 // PHÂN ĐOÀN, LỚP, SỈ SỐ
const HEADER_ROW = 6
const FIRST_DATA_ROW = 7
const LANDSCAPE_FROM_COLUMNS = 11

const thinBorder = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

const FIXED_WIDTHS = [13.7109375, 13.7109375, 7.7109375]
const RATE_WIDTH = 9.7109375
const ROW_HEIGHT = 20.1

function encodeJpegBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return `data:image/jpeg;base64,${btoa(binary)}`
}

function isAverage(column: PunctualityColumn): boolean {
  return column.kind === 'thu5-avg' || column.kind === 'cn-avg'
}

function setPageAndColumns(worksheet: Worksheet, lastColumn: number): void {
  FIXED_WIDTHS.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width
  })
  for (let column = FIXED_COLUMNS + 1; column <= lastColumn; column += 1) {
    worksheet.getColumn(column).width = RATE_WIDTH
  }

  worksheet.pageSetup = {
    orientation: lastColumn >= LANDSCAPE_FROM_COLUMNS ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.27, right: 0.24, top: 0.32, bottom: 0.31, header: 0.3, footer: 0.3 },
  }
  worksheet.views = [{ state: 'frozen', xSplit: FIXED_COLUMNS, ySplit: HEADER_ROW }]
}

/** Số → số thật + numFmt; null → chuỗi "—". */
function setRateCell(cell: Cell, rate: number | null): void {
  if (rate === null) {
    cell.value = NULL_PLACEHOLDER
    return
  }
  cell.value = rate
  cell.numFmt = '0%'
}

function styleRow(row: import('exceljs').Row, lastColumn: number, bold: boolean): void {
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = row.getCell(column)
    cell.font = { name: FONT, size: 11, bold }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder
  }
}

function writeHeader(worksheet: Worksheet, data: PunctualityReportData, columns: PunctualityColumn[], lastColumn: number): void {
  const lastLetter = worksheet.getColumn(lastColumn).letter

  worksheet.getCell('A1').value = '                   Phong trào thiếu nhi thánh thể Việt Nam'
  worksheet.getCell('A1').font = { name: FONT, size: 11.5 }
  worksheet.getRow(1).height = 16.5

  // Không gộp ô: chữ tràn sang ô trống bên phải, không bị cắt khi bảng hẹp.
  worksheet.getCell('A2').value = '                      Giáo xứ Thiên Ân - xứ đoàn Fatima'
  worksheet.getCell('A2').font = { name: FONT, size: 11.5 }
  worksheet.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle' }

  worksheet.getRow(3).height = 7.5

  worksheet.mergeCells(`A4:${lastLetter}4`)
  worksheet.getCell('A4').value = PUNCTUALITY_REPORT_TITLE
  worksheet.getCell('A4').font = { name: FONT, size: 16, bold: true }
  worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  worksheet.getRow(4).height = 24

  worksheet.mergeCells(`A5:${lastLetter}5`)
  worksheet.getCell('A5').value = data.subtitleLines.join('\n')
  worksheet.getCell('A5').font = { name: FONT, size: 11, italic: true }
  worksheet.getCell('A5').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  worksheet.getRow(5).height = 34.5
  for (let column = 1; column <= lastColumn; column += 1) {
    worksheet.getCell(5, column).border = { bottom: { style: 'thin' } }
  }

  const headerRow = worksheet.getRow(HEADER_ROW)
  headerRow.values = ['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', ...columns.map((column) => column.label)]
  headerRow.height = 31.5
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = headerRow.getCell(column)
    cell.font = { name: FONT, size: 11, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  }
}

function writeBody(worksheet: Worksheet, data: PunctualityReportData, columns: PunctualityColumn[], lastColumn: number): void {
  let nextRow = FIRST_DATA_ROW

  for (const branch of data.branches) {
    if (branch.classes.length === 0) continue
    const branchStart = nextRow

    for (const item of branch.classes) {
      const row = worksheet.getRow(nextRow)
      row.height = ROW_HEIGHT
      styleRow(row, lastColumn, false)

      row.getCell(2).value = item.className
      row.getCell(3).value = item.studentCount
      row.getCell(3).numFmt = '0'
      columns.forEach((column, position) => {
        const cell = row.getCell(FIXED_COLUMNS + 1 + position)
        setRateCell(cell, punctualityCellRate(item, column))
        if (isAverage(column)) cell.font = { name: FONT, size: 11, bold: true }
      })

      nextRow += 1
    }

    const branchEnd = nextRow - 1
    const branchCell = worksheet.getCell(branchStart, 1)
    branchCell.value = branch.label
    if (branchEnd > branchStart) worksheet.mergeCells(`A${branchStart}:A${branchEnd}`)
    branchCell.font = { name: FONT, size: 11, bold: true }
    branchCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }

  // Dòng TỔNG: A:B gộp
  const totalRow = worksheet.getRow(nextRow)
  totalRow.height = ROW_HEIGHT
  styleRow(totalRow, lastColumn, true)
  totalRow.getCell(1).value = 'TỔNG'
  worksheet.mergeCells(`A${nextRow}:B${nextRow}`)
  totalRow.getCell(3).value = data.total.studentCount
  totalRow.getCell(3).numFmt = '0'
  columns.forEach((column, position) => {
    setRateCell(totalRow.getCell(FIXED_COLUMNS + 1 + position), punctualityCellRate(data.total, column))
  })
  nextRow += 1

  // Chú thích cuối bảng: mỗi dòng gộp từ A tới cột cuối, căn trái; dòng đầu có viền trên
  const lastLetter = worksheet.getColumn(lastColumn).letter
  const charsPerLine = Math.max(60, Math.round((FIXED_WIDTHS.reduce((a, b) => a + b, 0) + RATE_WIDTH * (lastColumn - FIXED_COLUMNS)) * 1.1))
  data.footnotes.forEach((text, index) => {
    const rowNumber = nextRow + index
    worksheet.mergeCells(`A${rowNumber}:${lastLetter}${rowNumber}`)
    const row = worksheet.getRow(rowNumber)
    row.getCell(1).value = text
    for (let column = 1; column <= lastColumn; column += 1) {
      const cell = row.getCell(column)
      cell.font = { name: FONT, size: 11 }
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
      if (index === 0) cell.border = { top: { style: 'thin' } }
    }
    row.height = Math.max(16.5, Math.ceil(Array.from(text).length / charsPerLine) * 15 + 1.5)
  })
}

function addLogo(workbook: Workbook, worksheet: Worksheet, logo: ArrayBuffer | Uint8Array): void {
  const bytes = logo instanceof ArrayBuffer ? new Uint8Array(logo) : logo
  const imageId = workbook.addImage({ base64: encodeJpegBase64(bytes), extension: 'jpeg' })
  const logoAnchor = { col: 0, row: 0, nativeCol: 0, nativeColOff: 90767, nativeRow: 0, nativeRowOff: 28575 }
  worksheet.addImage(imageId, {
    tl: logoAnchor,
    ext: { width: 509308 / 9525, height: 476249 / 9525 },
  })
}

/** Cả kỳ báo cáo = 1 sheet `data.sheetName`; cột ngày theo `punctualityColumns`. */
export async function buildPunctualityReportWorkbook(
  data: PunctualityReportData,
  logo?: ArrayBuffer | Uint8Array
): Promise<Workbook> {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(data.sheetName)

  const columns = punctualityColumns(data)
  const lastColumn = FIXED_COLUMNS + columns.length // cột cuối = cột ngày/TB cuối (không có cột ghi chú)

  setPageAndColumns(worksheet, lastColumn)
  writeHeader(worksheet, data, columns, lastColumn)
  writeBody(worksheet, data, columns, lastColumn)
  if (logo) addLogo(workbook, worksheet, logo)

  return workbook
}
