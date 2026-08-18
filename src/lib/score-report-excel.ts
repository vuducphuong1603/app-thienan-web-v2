// Xuất Excel bảng điểm / điểm danh theo mẫu "FILE MAU SO DIEM TUNG LOP.xlsx"
// (logo Xứ Đoàn, Times New Roman, header 2 tầng với 3 khối màu, viền lưới, công thức)

export interface ScoreColumnSelection {
  diLeT5: boolean
  hocGL: boolean
  tbThu5: boolean
  tbGL: boolean
  score45HK1: boolean
  scoreExamHK1: boolean
  score45HK2: boolean
  scoreExamHK2: boolean
  diemTong: boolean
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
  avg_thu5: number | null
  avg_gl: number | null
}

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

export function buildScoreColumns(sel: ScoreColumnSelection): ReportColumn[] {
  const anySelected = Object.values(sel).some(v => v)
  const showAll = !anySelected
  const show = (k: keyof ScoreColumnSelection) => showAll || sel[k]

  const cols: ReportColumn[] = [
    { key: 'stt', label: 'Stt', group: 'info', width: 6.6 },
    { key: 'saintName', label: 'Tên thánh', group: 'info', width: 14.9 },
    { key: 'fullName', label: 'Họ và Tên', group: 'info', width: 25 },
  ]
  if (show('diLeT5')) cols.push({ key: 'diLeT5', label: 'Đi Lễ T5', group: 'diemdanh', width: 6.9, numFmt: '0.0' })
  if (show('hocGL')) cols.push({ key: 'hocGL', label: 'Học GL', group: 'diemdanh', width: 6.9, numFmt: '0.0' })
  if (show('tbThu5')) cols.push({ key: 'tbThu5', label: 'TB Thứ 5', group: 'diemdanh', width: 6.9, numFmt: '0.0' })
  if (show('tbGL')) cols.push({ key: 'tbGL', label: 'TB Giáo lý', group: 'diemdanh', width: 7.4, numFmt: '0.0' })
  if (show('score45HK1')) cols.push({ key: 's45HK1', label: "45' HKI", group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('scoreExamHK1')) cols.push({ key: 'examHK1', label: 'Thi HKI', group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('score45HK1') || show('scoreExamHK1')) cols.push({ key: 'tbHK1', label: 'TB HKI', group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('score45HK2')) cols.push({ key: 's45HK2', label: "45' HKII", group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('scoreExamHK2')) cols.push({ key: 'examHK2', label: 'Thi HKII', group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('score45HK2') || show('scoreExamHK2')) cols.push({ key: 'tbHK2', label: 'TB HKII', group: 'giaoly', width: 6.9, numFmt: '0.0' })
  if (show('diemTong')) {
    cols.push({ key: 'tbNam', label: 'TB Năm', group: 'tongket', width: 7.6, numFmt: '0.0' })
    cols.push({ key: 'hang', label: 'Hạng', group: 'tongket', width: 7.7, numFmt: '0' })
  }
  if (sel.ketQua) cols.push({ key: 'ketQua', label: 'Kết quả', group: 'tongket', width: 8.4 })
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
  if (has('tbHK1', 's45HK1', 'examHK1')) {
    f.tbHK1 = `(${ref('s45HK1')}+${ref('examHK1')}*2)/3`
  }
  if (has('tbHK2', 's45HK2', 'examHK2')) {
    f.tbHK2 = `(${ref('s45HK2')}+${ref('examHK2')}*2)/3`
  }
  if (has('tbNam', 'tbHK1', 'tbHK2')) {
    f.tbNam = `(${ref('tbHK1')}+${ref('tbHK2')}*2)/3`
  }
  if (has('hang', 'tbNam')) {
    const col = colLetter(pos.tbNam)
    f.hang = `IF(${ref('tbNam')}="","",RANK(${ref('tbNam')},$${col}$${firstDataRow}:$${col}$${lastDataRow},0))`
  }
  if (has('ketQua', 'diLeT5', 'hocGL', 's45HK1', 'examHK1', 's45HK2', 'examHK2')) {
    const t5 = ref('diLeT5')
    const cn = ref('hocGL')
    const avgCat = `(${ref('s45HK1')}+${ref('s45HK2')}+${ref('examHK1')}*2+${ref('examHK2')}*2)/6`
    const totalAvg = `${avgCat}*0.6+(${t5}+${cn})*0.4`
    f.ketQua = `IF(OR(${t5}<2.5,${cn}<2.5,${avgCat}<2.5,${totalAvg}<5),"Ở Lại","")`
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
  opts: { title: string; className: string; totalCols: number; logoBase64?: string; extraInfo?: string }
): number {
  const { title, className, logoBase64, extraInfo } = opts
  // Tiêu đề 20pt cần đủ chỗ: merge tối thiểu 9 cột kể cả khi bảng hẹp hơn
  const totalCols = Math.max(opts.totalCols, 9)
  const orgSpan = Math.min(Math.max(totalCols, 5), 8)

  ws.mergeCells(1, 2, 1, orgSpan)
  ws.getCell(1, 2).value = 'Phong trào thiếu nhi thánh thể Việt Nam'
  ws.mergeCells(2, 2, 2, orgSpan)
  ws.getCell(2, 2).value = 'Giáo xứ Thiên Ân - Xứ Đoàn Đức Mẹ Fatima'
  for (const r of [1, 2]) {
    const cell = ws.getCell(r, 2)
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

  const labelCol = Math.max(1, Math.floor(totalCols / 2) - 1)
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
    const infoCell = ws.getCell(5, Math.min(labelCol + 3, totalCols))
    infoCell.value = extraInfo
    infoCell.font = { name: FONT, size: FONT_SIZE }
    infoCell.alignment = { horizontal: 'left', vertical: 'middle' }
  }
  ws.getRow(5).height = 18

  if (logoBase64) {
    const imgId = wb.addImage({ base64: logoBase64, extension: 'png' })
    ws.addImage(imgId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 95, height: 95 },
      editAs: 'absolute',
    })
  }

  return 7 // bảng bắt đầu từ dòng 7
}

export async function buildScoreReportWorkbook(opts: {
  className: string
  schoolYearName: string
  students: ScoreReportStudent[]
  selection: ScoreColumnSelection
  logoBase64?: string
}): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS()
  const { className, schoolYearName, students, selection, logoBase64 } = opts

  const cols = buildScoreColumns(selection)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Bảng điểm', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.width })

  const tier1Row = addSheetHeader(ws, wb, {
    title: `BẢNG ĐIỂM NĂM HỌC GIÁO LÝ ${schoolYearName}`.trim(),
    className,
    totalCols: cols.length,
    logoBase64,
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

  // Dữ liệu
  const valueOf = (s: ScoreReportStudent, key: string, stt: number): string | number => {
    switch (key) {
      case 'stt': return stt
      case 'saintName': return s.saint_name || ''
      case 'fullName': return s.full_name
      case 'diLeT5': return s.score_di_le_t5 ?? ''
      case 'hocGL': return s.score_hoc_gl ?? ''
      case 'tbThu5': return s.avg_thu5 ?? ''
      case 'tbGL': return s.avg_gl ?? ''
      case 's45HK1': return s.score_45_hk1 ?? ''
      case 'examHK1': return s.score_exam_hk1 ?? ''
      case 'tbHK1': return s.average_hk1 ?? ''
      case 's45HK2': return s.score_45_hk2 ?? ''
      case 'examHK2': return s.score_exam_hk2 ?? ''
      case 'tbHK2': return s.average_hk2 ?? ''
      case 'tbNam': return s.average_year ?? ''
      default: return ''
    }
  }

  students.forEach((s, idx) => {
    const rowIdx = firstDataRow + idx
    const formulas = buildRowFormulas(cols, rowIdx, firstDataRow, lastDataRow)
    cols.forEach((c, ci) => {
      const cell = ws.getCell(rowIdx, ci + 1)
      const formula = (formulas as Record<string, string | undefined>)[c.key]
      if (formula) {
        cell.value = { formula }
      } else {
        cell.value = valueOf(s, c.key, idx + 1)
      }
      cell.font = { name: FONT, size: FONT_SIZE }
      cell.alignment = {
        horizontal: c.key === 'fullName' ? 'left' : 'center',
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
  attendance: Record<string, string | null | undefined>
}

export async function buildAttendanceWorkbook(opts: {
  className: string
  title: string
  dates: string[]
  formatDate: (date: string) => string
  holidayNames: Map<string, string>
  students: AttendanceReportStudent[]
  logoBase64?: string
}): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS()
  const { className, title, dates, formatDate, holidayNames, students, logoBase64 } = opts

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Điểm danh', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  const totalCols = 4 + dates.length

  ws.getColumn(1).width = 4.7
  ws.getColumn(2).width = 14
  ws.getColumn(3).width = 19
  ws.getColumn(4).width = 10
  for (let d = 0; d < dates.length; d++) ws.getColumn(5 + d).width = 6.5

  const headerRow = addSheetHeader(ws, wb, {
    title,
    className,
    totalCols: Math.min(totalCols, 14),
    logoBase64,
    extraInfo: `Tổng số buổi: ${dates.length}`,
  })

  const labels = ['Stt', 'Tên thánh', 'Họ đệm', 'Tên', ...dates.map(d => formatDate(d))]
  labels.forEach((label, ci) => {
    const cell = ws.getCell(headerRow, ci + 1)
    cell.value = label
    cell.font = { name: FONT, size: 10, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
    cell.fill = fill(COLOR.headerInfo)
  })
  ws.getRow(headerRow).height = 28

  students.forEach((s, idx) => {
    const rowIdx = headerRow + 1 + idx
    const nameParts = s.full_name.split(' ')
    const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
    const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
    // Theo file mẫu: có mặt đánh X, còn lại để trống với nền xanh nhạt
    const values: (string | number)[] = [idx + 1, s.saint_name || '', familyMiddleName, givenName]
    dates.forEach(date => {
      if (holidayNames.has(date)) {
        values.push('Nghỉ')
      } else {
        values.push(s.attendance[date] === 'present' ? 'X' : '')
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
      if (ci >= 4 && v !== 'X') cell.fill = fill(COLOR.headerInfo)
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
