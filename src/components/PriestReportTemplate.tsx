import { forwardRef, Fragment } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { PriestAbsentWarning, PriestReportBranchGroup, PriestReportClassRow } from '@/lib/priest-report'

export interface PriestReportData {
  branches: PriestReportBranchGroup[]
  fromDate: string
  toDate: string
  timeLabel: string
  subtitleLines: [string, string]
  absentWarning?: {
    prevLabel: string
    currentLabel: string
    students: PriestAbsentWarning[]
  } | null
}

interface PriestReportTemplateProps {
  data: PriestReportData
}

export interface PriestRowView {
  thu5Present: number
  thu5Rate: number | null
  cnPresent: number
  cnRate: number | null
  highlight: boolean
}

export function priestRowView(row: PriestReportClassRow): PriestRowView {
  const thu5Present = row.studentCount - row.thu5Absent
  const cnPresent = row.studentCount - row.cnAbsent
  const thu5Rate = row.studentCount > 0 ? thu5Present / row.studentCount : null
  const cnRate = row.studentCount > 0 ? cnPresent / row.studentCount : null

  return {
    thu5Present,
    thu5Rate,
    cnPresent,
    cnRate,
    highlight: row.studentCount > 0 && thu5Rate !== null && thu5Rate < 0.8,
  }
}

const containerStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '800px',
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

const noteCellStyle: CSSProperties = {
  ...cellStyle,
  textAlign: 'left',
  whiteSpace: 'pre-line',
  lineHeight: 1.35,
}

const warningCellStyle: CSSProperties = {
  border: '1px solid #777777',
  padding: '5px 6px',
  verticalAlign: 'middle',
  textAlign: 'left',
  backgroundColor: '#FFFFFF',
}

function formatRate(rate: number | null): string {
  return rate === null ? '-' : `${Math.round(rate * 100)}%`
}

const PriestReportTemplate = forwardRef<HTMLDivElement, PriestReportTemplateProps>(({ data }, ref) => (
  <div ref={ref} style={containerStyle}>
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
      BÁO CÁO KẾT QUẢ CHUYÊN CẦN
    </h1>

    <div style={{ fontSize: '11pt', fontStyle: 'italic', whiteSpace: 'pre-line', margin: '0 0 8px' }}>
      <div>{data.subtitleLines[0]}</div>
      <div>{data.subtitleLines[1]}</div>
    </div>

    <table style={tableStyle}>
      <thead>
        <tr>
          {['PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'THỨ 5', 'TỈ LỆ T5', 'GIÁO LÝ', 'TỈ LỆ GL', 'GHI CHÚ'].map(label => (
            <th key={label} scope="col" style={headerCellStyle}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.branches.map(branch => (
          <Fragment key={branch.branch}>
            {branch.classes.map((row, rowIndex) => {
              const view = priestRowView(row)
              return (
                <tr key={row.classId}>
                  {rowIndex === 0 && (
                    <td rowSpan={branch.classes.length} style={{ ...cellStyle, fontWeight: 700 }}>
                      {branch.label}
                    </td>
                  )}
                  <td style={cellStyle}>{row.className}</td>
                  <td style={cellStyle}>{row.studentCount}</td>
                  <td style={{ ...cellStyle, backgroundColor: view.highlight ? '#FFFF00' : '#FFFFFF' }}>
                    {view.thu5Present}
                  </td>
                  <td style={cellStyle}>{formatRate(view.thu5Rate)}</td>
                  <td style={cellStyle}>{view.cnPresent}</td>
                  <td style={cellStyle}>{formatRate(view.cnRate)}</td>
                  <td style={noteCellStyle}>{row.note}</td>
                </tr>
              )
            })}
          </Fragment>
        ))}
      </tbody>
    </table>

    <div style={{ fontSize: '11pt', lineHeight: 1.35, marginTop: '8px' }}>
      <p style={{ borderTop: '1px solid #000000', paddingTop: '6px', margin: 0 }}>
        Thứ 5: vắng từ 4 em ~ khoảng dưới 90% là chú ý (các lớp tô vàng đặc biệt chú ý hơn)
      </p>
      <p style={{ margin: 0 }}>CN: vắng từ 3 em ~ khoảng dưới 91% là chú ý</p>
    </div>

    {data.absentWarning && data.absentWarning.students.length > 0 && (
      <section style={{ marginTop: '16px', border: '1px solid #c41e3a', padding: '10px', backgroundColor: '#FFFFFF' }}>
        <h2 style={{ color: '#000000', fontSize: '12pt', fontWeight: 700, margin: '0 0 8px' }}>
          ⚠ CẢNH BÁO: vắng 2 tháng liên tiếp ({data.absentWarning.prevLabel} và {data.absentWarning.currentLabel})
        </h2>
        <table style={{ ...tableStyle, tableLayout: 'auto' }}>
          <thead>
            <tr>
              {['STT', 'Tên thánh + Họ tên', 'Lớp', 'SĐT phụ huynh'].map(label => (
                <th key={label} scope="col" style={{ ...headerCellStyle, backgroundColor: '#F8D7DA' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.absentWarning.students.map((student, index) => (
              <tr key={student.studentId}>
                <td style={{ ...warningCellStyle, textAlign: 'center' }}>{index + 1}</td>
                <td style={warningCellStyle}>{`${student.saintName} ${student.fullName}`.trim()}</td>
                <td style={warningCellStyle}>{student.className}</td>
                <td style={warningCellStyle}>{student.parentPhones.join(' / ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
  </div>
))

PriestReportTemplate.displayName = 'PriestReportTemplate'

export default PriestReportTemplate
