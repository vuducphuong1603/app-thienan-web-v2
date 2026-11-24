import { forwardRef, Fragment } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import {
  PUNCTUALITY_REPORT_TITLE,
  formatPunctualityRate,
  punctualityCellRate,
  punctualityColumns,
} from '@/lib/punctuality-report'
import type { PunctualityColumn, PunctualityReportData } from '@/lib/punctuality-report'

interface PunctualityReportTemplateProps {
  data: PunctualityReportData
}

const containerStyle: CSSProperties = {
  boxSizing: 'border-box',
  padding: '24px',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  fontFamily: 'Arial, Helvetica, sans-serif',
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: '11pt',
  color: '#000000',
}

const cellStyle: CSSProperties = {
  border: '1px solid #000000',
  padding: '4px 5px',
  textAlign: 'center',
  verticalAlign: 'middle',
  overflowWrap: 'anywhere',
}

const headerCellStyle: CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  backgroundColor: '#FFFFFF',
}

const totalCellStyle: CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
}

const CONTAINER_PADDING = 48 // padding 24px hai bên của containerStyle
const BRANCH_COL_WIDTH = 90
const CLASS_COL_WIDTH = 120
const COUNT_COL_WIDTH = 52
const FIXED_COLUMNS_WIDTH = BRANCH_COL_WIDTH + CLASS_COL_WIDTH + COUNT_COL_WIDTH // 262
const DATE_COL_WIDTH = 62
const MIN_TEMPLATE_WIDTH = 800

/** Chiều rộng ảnh/bản xem trước: max(800, padding 48 + cột cố định 262 + 62 × số cột ngày/TB). */
export function punctualityTemplateWidth(columnCount: number): number {
  return Math.max(MIN_TEMPLATE_WIDTH, CONTAINER_PADDING + FIXED_COLUMNS_WIDTH + DATE_COL_WIDTH * columnCount)
}

/**
 * Bề rộng từng cột [PHÂN ĐOÀN, LỚP, SỈ SỐ, ...cột ngày/TB]; tổng luôn = khung − padding để bảng lấp đầy 100%.
 * Khi khung chạm sàn 800px, phần dư được chia đều theo tỉ lệ cho mọi cột (số lẻ làm tròn dồn vào cột LỚP).
 */
export function punctualityColumnWidths(columnCount: number): number[] {
  const base = [BRANCH_COL_WIDTH, CLASS_COL_WIDTH, COUNT_COL_WIDTH, ...Array<number>(columnCount).fill(DATE_COL_WIDTH)]
  const natural = FIXED_COLUMNS_WIDTH + DATE_COL_WIDTH * columnCount
  const available = punctualityTemplateWidth(columnCount) - CONTAINER_PADDING
  if (available === natural) return base
  const widths = base.map(width => Math.floor((width * available) / natural))
  widths[1] += available - widths.reduce((sum, width) => sum + width, 0)
  return widths
}

function isAverageColumn(column: PunctualityColumn): boolean {
  return column.kind === 'thu5-avg' || column.kind === 'cn-avg'
}

const PunctualityReportTemplate = forwardRef<HTMLDivElement, PunctualityReportTemplateProps>(({ data }, ref) => {
  const columns = punctualityColumns(data)
  const columnWidths = punctualityColumnWidths(columns.length)

  return (
    <div ref={ref} style={{ ...containerStyle, width: `${punctualityTemplateWidth(columns.length)}px` }}>
      <header style={{ display: 'flex', alignItems: 'center', minHeight: '50px', marginBottom: '12px' }}>
        <Image
          src="/images/tntt-logo-priest-report.jpeg"
          alt="Logo Phong trào Thiếu nhi Thánh Thể"
          width={53}
          height={50}
          unoptimized
          crossOrigin="anonymous"
          style={{ width: '53px', height: '50px', objectFit: 'contain', flex: '0 0 53px' }}
          onError={event => {
            event.currentTarget.style.display = 'none'
          }}
        />
        <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
          <div style={{ fontSize: '11.5pt' }}>Phong trào thiếu nhi thánh thể Việt Nam</div>
          <div style={{ fontSize: '11.5pt' }}>Giáo xứ Thiên Ân - xứ đoàn Fatima</div>
        </div>
      </header>

      <h1 style={{ fontSize: '16pt', fontWeight: 700, textAlign: 'center', margin: '8px 0' }}>
        {PUNCTUALITY_REPORT_TITLE}
      </h1>

      <div style={{ fontSize: '11pt', fontStyle: 'italic', margin: '0 0 8px' }}>
        <div>{data.subtitleLines[0]}</div>
        <div>{data.subtitleLines[1]}</div>
      </div>

      <table data-testid="punct-table" style={tableStyle}>
        <colgroup>
          {columnWidths.map((width, index) => (
            <col key={index} style={{ width: `${width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" style={headerCellStyle}>PHÂN ĐOÀN</th>
            <th scope="col" style={headerCellStyle}>LỚP</th>
            <th scope="col" style={headerCellStyle}>SỈ SỐ</th>
            {columns.map((column, index) => (
              <th key={index} scope="col" style={headerCellStyle}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.branches.map(branch => (
            <Fragment key={branch.branch}>
              {branch.classes.map((row, rowIndex) => (
                <tr key={row.classId}>
                  {rowIndex === 0 && (
                    <td rowSpan={branch.classes.length} style={{ ...cellStyle, fontWeight: 700 }}>
                      {branch.label}
                    </td>
                  )}
                  <td style={cellStyle}>{row.className}</td>
                  <td style={cellStyle}>{row.studentCount}</td>
                  {columns.map((column, index) => (
                    <td key={index} style={isAverageColumn(column) ? totalCellStyle : cellStyle}>
                      {formatPunctualityRate(punctualityCellRate(row, column))}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
          <tr data-testid="punct-total">
            <td colSpan={2} style={totalCellStyle}>TỔNG</td>
            <td style={totalCellStyle}>{data.total.studentCount}</td>
            {columns.map((column, index) => (
              <td key={index} style={totalCellStyle}>
                {formatPunctualityRate(punctualityCellRate(data.total, column))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {data.footnotes.length > 0 && (
        <div data-testid="punct-footnotes" style={{ fontSize: '10.5pt', lineHeight: 1.35, marginTop: '8px' }}>
          {data.footnotes.map((footnote, index) => (
            <p
              key={index}
              style={{ margin: 0, ...(index === 0 ? { borderTop: '1px solid #000000', paddingTop: '4px' } : {}) }}
            >
              {footnote}
            </p>
          ))}
        </div>
      )}
    </div>
  )
})

PunctualityReportTemplate.displayName = 'PunctualityReportTemplate'

export default PunctualityReportTemplate
