// Xuất Excel bảng điểm / điểm danh theo mẫu "FILE MAU SO DIEM TUNG LOP.xlsx"
// (logo Xứ Đoàn, Times New Roman, header 2 tầng với 3 khối màu, viền lưới)

import { isSundayDate } from './sunday-attendance'
import { REPORT_CELL_SYMBOL, reportCellStatus } from './report-cell'
import { round2, scoreSummary } from './score-summary'
export interface ScoreColumnSelection {
  diLeT5: boolean
  hocGL: boolean
  diLeCN: boolean
  diemTB: boolean
  score45HK1: boolean
  scoreExamHK1: boolean
  score45HK2: boolean
  scoreExamHK2: boolean
  diemTong: boolean
  xepLoai: boolean
  ketQua: boolean
}

export type ColumnGroup = 'info' | 'diemdanh' | 'giaoly' | 'tongket'

export interface ReportColumn {
  key: string
  label: string
  group: ColumnGroup
  width: number
  numFmt?: string
}

export interface ScoreReportStudent {
  saint_name?: string
  full_name: string
  score_di_le_t5: number | null
  score_hoc_gl: number | null
  score_45_hk1: number | null
  score_exam_hk1: number | null
  score_45_hk2: number | null
  score_exam_hk2: number | null
  average_hk1: number | null
  average_hk2: number | null
  average_year: number | null
  /** Điểm điểm danh thang 10 (chưa nhân hệ số): Đi lễ T5, Học GL (CN), Đi lễ CN */
  diem_t5: number | null
  diem_gl: number | null
  diem_le_cn: number | null
  /** Điểm TB điểm danh = T5*0.4 + ((GL + Lễ CN)/2)*0.6 — dùng khi không xuất được công thức */
  diem_tb: number | null
}

/** Tách "Họ và tên" thành họ + đệm và tên (từ cuối cùng) */
export function splitFullName(fullName: string): { hoDem: string; ten: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { hoDem: '', ten: '' }
  return { hoDem: parts.slice(0, -1).join(' '), ten: parts[parts.length - 1] }
}

export { attendanceScores } from './score-summary'

// Bảng màu lấy từ file mẫu
const COLOR = {
  headerInfo: 'FFE2EFDA', // xanh lá nhạt (accent6 tint 0.8)
  diemdanh: 'FFFFE699', // vàng gold nhạt (accent4 tint 0.6)
  giaoly: 'FFDDEBF7', // xanh dương nhạt (accent5 tint 0.8)
  tongket: 'FFFFFF99', // vàng nhạt
  classCell: 'FFFFFF00', // ô tên lớp vàng chói
}

const FONT = 'Times New Roman'
const FONT_SIZE = 11.5
const reportRecordKey = (date: string, dayType: string) => `${date}:${dayType}`

export function buildScoreColumns(sel: ScoreColumnSelection): ReportColumn[] {
  const anySelected = Object.values(sel).some(v => v)
  const showAll = !anySelected
  const show = (k: keyof ScoreColumnSelection) => showAll || sel[k]

  const cols: ReportColumn[] = [
    // Độ rộng cột theo file mẫu đã chỉnh (Khai Tâm A 2026-08-28)
    { key: 'stt', label: 'Stt', group: 'info', width: 3.6 },
    { key: 'saintName', label: 'Tên thánh', group: 'info', width: 14.9 },
    { key: 'hoDem', label: 'Họ', group: 'info', width: 25 },
    { key: 'ten', label: 'Tên', group: 'info', width: 25 },
  ]
  if (show('diLeT5')) cols.push({ key: 'diLeT5', label: 'Đi Lễ T5', group: 'diemdanh', width: 6.9, numFmt: '0.00' })
  if (show('hocGL')) cols.push({ key: 'hocGL', label: 'Học GL', group: 'diemdanh', width: 6.9, numFmt: '0.00' })
  if (show('diLeCN')) cols.push({ key: 'diLeCN', label: 'Đi Lễ CN', group: 'diemdanh', width: 6.9, numFmt: '0.00' })
  if (show('diemTB')) cols.push({ key: 'diemTB', label: 'Điểm TB', group: 'diemdanh', width: 7.4, numFmt: '0.00' })
  if (show('score45HK1')) cols.push({ key: 's45HK1', label: "45' HKI", group: 'giaoly', width: 6.9, numFmt: '0.00' })
  if (show('scoreExamHK1')) cols.push({ key: 'examHK1', label: 'Thi HKI', group: 'giaoly', width: 6.9, numFmt: '0.00' })
  // Cột TB HKI tạm ẩn cho tới khi sơ kết HKI (yêu cầu 2026-08-28). Khi cần hiện lại:
  // if (show('score45HK1') || show('scoreExamHK1')) cols.push({ key: 'tbHK1', label: 'TB HKI', group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('score45HK2')) cols.push({ key: 's45HK2', label: "45' HKII", group: 'giaoly', width: 6.9, numFmt: '0.00' })
  if (show('scoreExamHK2')) cols.push({ key: 'examHK2', label: 'Thi HKII', group: 'giaoly', width: 6.9, numFmt: '0.00' })
  // Cột TB HKII ẩn khi xuất báo cáo (yêu cầu 2026-09-03). Khi cần hiện lại:
  // if (show('score45HK2') || show('scoreExamHK2')) cols.push({ key: 'tbHK2', label: 'TB HKII', group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('diemTong')) {
    cols.push({ key: 'tbNam', label: 'TB Năm', group: 'tongket', width: 7.6, numFmt: '0.00' })
  }
  if (show('xepLoai')) {
    cols.push({ key: 'xepLoai', label: 'Xếp loại', group: 'tongket', width: 10 })
  }
  if (show('diemTong')) {
    cols.push({ key: 'hang', label: 'Hạng', group: 'tongket', width: 7.7, numFmt: '0' })
  }
  if (show('ketQua')) cols.push({ key: 'ketQua', label: 'Kết quả', group: 'tongket', width: 8.4 })
  return cols
}

export function colLetter(index: number): string {
  let s = ''
  let n = index
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

export interface RowFormulas {
  diemTB?: string
  tbHK1?: string
  tbHK2?: string
  tbNam?: string
  hang?: string
  ketQua?: string
}

export function buildRowFormulas(
  cols: ReportColumn[],
  excelRow: number,
  firstDataRow: number,
  lastDataRow: number
): RowFormulas {
  const pos: Record<string, number> = {}
  cols.forEach((c, i) => { pos[c.key] = i })
  const ref = (key: string, row = excelRow) => `${colLetter(pos[key])}${row}`
  const has = (...keys: string[]) => keys.every(k => pos[k] !== undefined)

  const f: RowFormulas = {}
  // Score averages, classification, and result are written as values from score-summary.ts.
  // Only ranking remains an Excel formula because it depends on the whole exported class.
  if (has('hang', 'tbNam')) {
    const col = colLetter(pos.tbNam)
    f.hang = `IF(OR(${ref('tbNam')}="",${ref('tbNam')}="-"),"",RANK(${ref('tbNam')},$${col}$${firstDataRow}:$${col}$${lastDataRow},0))`
  }
  return f
}

// Liệt kê mọi ngày Thứ 5 / Chúa nhật trong khoảng [from, to] (định dạng YYYY-MM-DD),
// để cột ngày luôn hiện đủ nguyên tháng/khoảng dù chưa có ai được điểm danh.
export function listAttendanceDates(
  from: string,
  to: string,
  type: 'thu5' | 'cn' | 'all'
): string[] {
  const weekdays = type === 'thu5' ? [4] : type === 'cn' ? [0] : [0, 4]
  const dates: string[] = []
  const d = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (d <= end) {
    if (weekdays.includes(d.getDay())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${day}`)
    }
    d.setDate(d.getDate() + 1)
  }
  return dates
}

// Ngày cho báo cáo điểm danh: đủ mọi T5/CN trong kỳ (dù chưa điểm danh) + các ngày
// lẻ có bản ghi hoặc nghỉ lễ, sắp xếp tăng dần. Thiếu khoảng ngày → chỉ dùng extraDates.
export function mergeReportDates(
  from: string | null | undefined,
  to: string | null | undefined,
  type: 'thu5' | 'cn' | 'all',
  extraDates: Iterable<string>
): string[] {
  const set = new Set<string>(extraDates)
  if (from && to) {
    listAttendanceDates(from, to, type).forEach(d => set.add(d))
  }
  return Array.from(set).sort()
}

type ExcelJSModule = typeof import('exceljs')

// Interop: bundle web (Next.js) trả module trực tiếp, Node/CJS trả { default }
async function loadExcelJS(): Promise<ExcelJSModule> {
  const mod = await import('exceljs')
  return ((mod as unknown as { default?: ExcelJSModule }).default ?? mod) as ExcelJSModule
}

const thinBorder = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

function fill(color: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } }
}

function groupFill(group: ColumnGroup): ReturnType<typeof fill> | undefined {
  if (group === 'diemdanh') return fill(COLOR.diemdanh)
  if (group === 'giaoly') return fill(COLOR.giaoly)
  if (group === 'tongket') return fill(COLOR.tongket)
  return undefined
}

// Header chung: logo + 2 dòng tên đơn vị + tiêu đề lớn + dòng thông tin lớp.
// Trả về chỉ số dòng kế tiếp (dòng bắt đầu bảng).
function addSheetHeader(
  ws: import('exceljs').Worksheet,
  wb: import('exceljs').Workbook,
  opts: { title: string; className: string; totalCols: number; logoBase64?: string; badgeBase64?: string; extraInfo?: string }
): number {
  const { title, className, logoBase64, badgeBase64, extraInfo } = opts
  // Tiêu đề 20pt cần đủ chỗ: merge tối thiểu 9 cột kể cả khi bảng hẹp hơn
  const totalCols = Math.max(opts.totalCols, 9)

  // 2 dòng tên đơn vị merge trọn chiều rộng bảng → canh giữa đúng tâm bảng điểm
  ws.mergeCells(1, 1, 1, totalCols)
  ws.getCell(1, 1).value = 'Phong trào thiếu nhi thánh thể Việt Nam'
  ws.mergeCells(2, 1, 2, totalCols)
  ws.getCell(2, 1).value = 'Giáo xứ Thiên Ân - Xứ Đoàn Đức Mẹ Fatima'
  for (const r of [1, 2]) {
    const cell = ws.getCell(r, 1)
    cell.font = { name: FONT, size: FONT_SIZE }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(r).height = 15.75
  }
  ws.getRow(3).height = 15.75

  ws.mergeCells(4, 1, 4, totalCols)
  const titleCell = ws.getCell(4, 1)
  titleCell.value = title
  titleCell.font = { name: FONT, size: 20, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(4).height = 32.25

  // Như file mẫu: 'Lớp:' ở cột B, tên lớp cột C, sĩ số cột D
  const labelCol = 2
  const lblCell = ws.getCell(5, labelCol)
  lblCell.value = 'Lớp: '
  lblCell.font = { name: FONT, size: FONT_SIZE }
  lblCell.alignment = { horizontal: 'right', vertical: 'middle' }
  const clsCell = ws.getCell(5, labelCol + 1)
  clsCell.value = className
  clsCell.font = { name: FONT, size: FONT_SIZE, bold: true }
  clsCell.fill = fill(COLOR.classCell)
  clsCell.alignment = { horizontal: 'center', vertical: 'middle' }
  if (extraInfo) {
    const infoCell = ws.getCell(5, Math.min(labelCol + 2, totalCols))
    infoCell.value = extraInfo
    infoCell.font = { name: FONT, size: FONT_SIZE }
    infoCell.alignment = { horizontal: 'left', vertical: 'middle' }
  }
  ws.getRow(5).height = 18

  // Theo file mẫu đã chỉnh: logo nhỏ, nằm 2 bên — huy hiệu TNTT góc trái,
  // logo tròn Xứ Đoàn góc phải (cột áp chót của bảng), đều gói trong 3 dòng đầu
  if (badgeBase64) {
    const badgeId = wb.addImage({ base64: badgeBase64, extension: 'png' })
    ws.addImage(badgeId, {
      tl: { col: 0.25, row: 0 },
      ext: { width: 49, height: 61 },
      editAs: 'oneCell',
    })
  }
  if (logoBase64) {
    const imgId = wb.addImage({ base64: logoBase64, extension: 'png' })
    ws.addImage(imgId, {
      tl: { col: Math.max(1, totalCols - 2) + 0.3, row: 0 },
      ext: { width: 61, height: 61 },
      editAs: 'oneCell',
    })
  }

  return 7 // bảng bắt đầu từ dòng 7
}

/** Tiêu đề bảng điểm — dùng chung cho file Excel và file ảnh để luôn giống nhau */
export function getScoreReportTitle(schoolYearName: string): string {
  return `BẢNG ĐIỂM NĂM HỌC GIÁO LÝ ${schoolYearName}`.trim()
}

export async function buildScoreReportWorkbook(opts: {
  className: string
  schoolYearName: string
  students: ScoreReportStudent[]
  selection: ScoreColumnSelection
  logoBase64?: string
  badgeBase64?: string
}): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS()
  const { className, schoolYearName, students, selection, logoBase64, badgeBase64 } = opts

  const cols = buildScoreColumns(selection)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Bảng điểm', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.width })

  const tier1Row = addSheetHeader(ws, wb, {
    title: getScoreReportTitle(schoolYearName),
    className,
    totalCols: cols.length,
    logoBase64,
    badgeBase64,
    extraInfo: `Sĩ số: ${students.length}`,
  })
  const tier2Row = tier1Row + 1
  const firstDataRow = tier2Row + 1
  const lastDataRow = firstDataRow + students.length - 1

  // Header 2 tầng
  const groupLabel: Partial<Record<ColumnGroup, string>> = { diemdanh: 'Điểm Danh', giaoly: 'Điểm Giáo Lý' }
  let i = 0
  while (i < cols.length) {
    const c = cols[i]
    const colIdx = i + 1
    if (c.group === 'diemdanh' || c.group === 'giaoly') {
      let j = i
      while (j + 1 < cols.length && cols[j + 1].group === c.group) j++
      if (j > i) ws.mergeCells(tier1Row, colIdx, tier1Row, j + 1)
      const gCell = ws.getCell(tier1Row, colIdx)
      gCell.value = groupLabel[c.group]
      for (let k = i; k <= j; k++) {
        const t2 = ws.getCell(tier2Row, k + 1)
        t2.value = cols[k].label
      }
      i = j + 1
    } else {
      // info / tongket: merge dọc 2 tầng
      ws.mergeCells(tier1Row, colIdx, tier2Row, colIdx)
      ws.getCell(tier1Row, colIdx).value = c.label
      i++
    }
  }
  // Style header
  for (const r of [tier1Row, tier2Row]) {
    for (let cIdx = 1; cIdx <= cols.length; cIdx++) {
      const col = cols[cIdx - 1]
      const cell = ws.getCell(r, cIdx)
      cell.font = { name: FONT, size: FONT_SIZE, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = thinBorder
      cell.fill = col.group === 'info' ? fill(COLOR.headerInfo) : groupFill(col.group)!
    }
  }
  ws.getRow(tier1Row).height = 18
  ws.getRow(tier2Row).height = 30

  // Dữ liệu — null điểm là dấu '-' thay vì ô rỗng/0; các tổng hợp lấy từ score-summary.ts.
  const excelScore = (score: number | null | undefined): string | number => (
    score == null ? '-' : round2(score)
  )
  const valueOf = (s: ScoreReportStudent, summary: ReturnType<typeof scoreSummary>, key: string, stt: number): string | number => {
    switch (key) {
      case 'stt': return stt
      case 'saintName': return s.saint_name || ''
      case 'hoDem': return splitFullName(s.full_name).hoDem
      case 'ten': return splitFullName(s.full_name).ten
      case 'diLeT5': return excelScore(s.diem_t5)
      case 'hocGL': return excelScore(s.diem_gl)
      case 'diLeCN': return excelScore(s.diem_le_cn)
      case 'diemTB': return excelScore(s.diem_tb)
      case 's45HK1': return excelScore(s.score_45_hk1)
      case 'examHK1': return excelScore(s.score_exam_hk1)
      case 'tbHK1': return excelScore(summary.tbHK1)
      case 's45HK2': return excelScore(s.score_45_hk2)
      case 'examHK2': return excelScore(s.score_exam_hk2)
      case 'tbHK2': return excelScore(summary.tbHK2)
      case 'tbNam': return excelScore(summary.tbNam)
      case 'xepLoai': return summary.xepLoai
      case 'ketQua': return summary.ketQua
      default: return ''
    }
  }

  students.forEach((s, idx) => {
    const rowIdx = firstDataRow + idx
    const summary = scoreSummary({
      score_45_hk1: s.score_45_hk1,
      score_exam_hk1: s.score_exam_hk1,
      score_45_hk2: s.score_45_hk2,
      score_exam_hk2: s.score_exam_hk2,
      t5: s.diem_t5,
      cn: s.diem_gl,
    })
    const formulas = buildRowFormulas(cols, rowIdx, firstDataRow, lastDataRow)
    cols.forEach((c, ci) => {
      const cell = ws.getCell(rowIdx, ci + 1)
      const formula = c.key === 'hang' ? formulas.hang : undefined
      if (formula) {
        cell.value = { formula }
      } else {
        cell.value = valueOf(s, summary, c.key, idx + 1)
      }
      cell.font = { name: FONT, size: FONT_SIZE }
      cell.alignment = {
        horizontal: c.key === 'hoDem' ? 'left' : 'center',
        vertical: 'middle',
      }
      cell.border = thinBorder
      if (c.numFmt) cell.numFmt = c.numFmt
      const gf = groupFill(c.group)
      if (gf) cell.fill = gf
    })
    ws.getRow(rowIdx).height = 15
  })

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}

export interface AttendanceReportStudent {
  saint_name?: string
  full_name: string
  /** Thứ 5 / Chủ nhật buổi học giáo lý */
  attendance: Record<string, string | null | undefined>
  /** Chủ nhật buổi đi lễ */
  attendance_mass?: Record<string, string | null | undefined>
}

/** Cột ngày trong sheet điểm danh: Chủ nhật (không nghỉ) tách 2 cột con GL | Lễ */
export type AttendanceExcelColumn = { date: string; session: 'single' | 'gl' | 'le' }

export function buildAttendanceExcelColumns(dates: string[], holidayNames: Map<string, string>): AttendanceExcelColumn[] {
  return dates.flatMap((date): AttendanceExcelColumn[] =>
    isSundayDate(date) && !holidayNames.has(date)
      ? [{ date, session: 'gl' }, { date, session: 'le' }]
      : [{ date, session: 'single' }],
  )
}

export async function buildAttendanceWorkbook(opts: {
  className: string
  title: string
  dates: string[]
  formatDate: (date: string) => string
  holidayNames: Map<string, string>
  students: AttendanceReportStudent[]
  classRecordKeys: ReadonlySet<string>
  today: string
  logoBase64?: string
  badgeBase64?: string
}): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS()
  const { className, title, dates, formatDate, holidayNames, students, classRecordKeys, today, logoBase64, badgeBase64 } = opts

  const columns = buildAttendanceExcelColumns(dates, holidayNames)
  const hasSplit = columns.some(c => c.session !== 'single')

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Điểm danh', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  const totalCols = 4 + columns.length

  ws.getColumn(1).width = 4.7
  ws.getColumn(2).width = 14
  ws.getColumn(3).width = 19
  ws.getColumn(4).width = 10
  columns.forEach((c, i) => { ws.getColumn(5 + i).width = c.session === 'single' ? 6.5 : 4.5 })

  const headerRow = addSheetHeader(ws, wb, {
    title,
    className,
    totalCols: Math.min(totalCols, 14),
    logoBase64,
    badgeBase64,
    extraInfo: `Tổng số buổi: ${dates.length} | X: Có mặt | Ô trống: Vắng mặt | -: Chưa điểm danh`,
  })
  const subHeaderRow = hasSplit ? headerRow + 1 : headerRow

  const styleHeaderCell = (cell: import('exceljs').Cell, value: string, size = 10) => {
    cell.value = value
    cell.font = { name: FONT, size, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
    cell.fill = fill(COLOR.headerInfo)
  }

  // 4 cột cố định (gộp 2 hàng nếu có Chủ nhật tách buổi)
  ;['Stt', 'Tên thánh', 'Họ đệm', 'Tên'].forEach((label, ci) => {
    styleHeaderCell(ws.getCell(headerRow, ci + 1), label)
    if (hasSplit) {
      styleHeaderCell(ws.getCell(subHeaderRow, ci + 1), label)
      ws.mergeCells(headerRow, ci + 1, subHeaderRow, ci + 1)
    }
  })
  // Cột ngày
  columns.forEach((c, i) => {
    const col = 5 + i
    if (c.session === 'single') {
      styleHeaderCell(ws.getCell(headerRow, col), formatDate(c.date))
      if (hasSplit) {
        styleHeaderCell(ws.getCell(subHeaderRow, col), formatDate(c.date))
        ws.mergeCells(headerRow, col, subHeaderRow, col)
      }
    } else if (c.session === 'gl') {
      // Ô ngày gộp ngang 2 cột (GL | Lễ)
      styleHeaderCell(ws.getCell(headerRow, col), formatDate(c.date))
      styleHeaderCell(ws.getCell(headerRow, col + 1), formatDate(c.date))
      ws.mergeCells(headerRow, col, headerRow, col + 1)
      styleHeaderCell(ws.getCell(subHeaderRow, col), 'GL', 8)
      styleHeaderCell(ws.getCell(subHeaderRow, col + 1), 'Lễ', 8)
    }
  })
  ws.getRow(headerRow).height = 28
  if (hasSplit) ws.getRow(subHeaderRow).height = 14

  students.forEach((s, idx) => {
    const rowIdx = subHeaderRow + 1 + idx
    const nameParts = s.full_name.split(' ')
    const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
    const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
    // Theo file mẫu: có mặt đánh X; vắng để trống; ngày chưa điểm danh đánh '-' màu xám.
    const values: (string | number)[] = [idx + 1, s.saint_name || '', familyMiddleName, givenName]
    columns.forEach(c => {
      if (holidayNames.has(c.date)) {
        values.push('Nghỉ')
      } else {
        const status = c.session === 'le' ? s.attendance_mass?.[c.date] : s.attendance[c.date]
        const dayType = c.session === 'le' ? 'cn_le' : c.session === 'gl' ? 'cn' : 'thu5'
        const cellStatus = reportCellStatus({
          record: status,
          date: c.date,
          today,
          isHoliday: false,
          classHasAnyRecord: classRecordKeys.has(reportRecordKey(c.date, dayType)),
        })
        values.push(cellStatus === 'holiday' ? '' : REPORT_CELL_SYMBOL[cellStatus])
      }
    })
    values.forEach((v, ci) => {
      const cell = ws.getCell(rowIdx, ci + 1)
      cell.value = v
      cell.font = { name: FONT, size: 10 }
      cell.alignment = {
        horizontal: ci === 2 ? 'left' : ci === 3 ? 'right' : 'center',
        vertical: 'middle',
      }
      cell.border = thinBorder
      if (ci >= 4 && v !== REPORT_CELL_SYMBOL.present) {
        cell.fill = fill(COLOR.headerInfo)
        if (v === REPORT_CELL_SYMBOL.unmarked) {
          cell.font = { name: FONT, size: 10, color: { argb: 'FF666D80' } }
        }
      }
    })
    ws.getRow(rowIdx).height = 15
  })

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}

// Tải logo từ /public thành base64 (chạy trên trình duyệt)
export async function fetchLogoBase64(url = '/logo-circle.png'): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}
