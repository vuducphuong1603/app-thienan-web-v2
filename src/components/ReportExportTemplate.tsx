import { forwardRef, Fragment } from 'react'
import { isSundayDate } from '@/lib/sunday-attendance'
import { getScoreReportTitle } from '@/lib/score-report-excel'
import { REPORT_CELL_SYMBOL, reportCellStatus } from '@/lib/report-cell'
import { fmtScore, scoreSummary } from '@/lib/score-summary'

const reportRecordKey = (date: string, dayType: string) => `${date}:${dayType}`

interface AttendanceReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  attendance: Record<string, 'present' | 'absent' | null>
  /** Chủ nhật buổi đi lễ ('cn_le'); attendance là giáo lý */
  attendance_mass?: Record<string, 'present' | 'absent' | null>
}

interface ScoreReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  score_di_le_t5: number | null
  score_hoc_gl: number | null
  score_45_hk1: number | null
  score_exam_hk1: number | null
  score_45_hk2: number | null
  score_exam_hk2: number | null
  average_hk1: number | null
  average_hk2: number | null
  average_year: number | null
  diem_t5: number | null
  diem_gl: number | null
  diem_le_cn: number | null
  diem_tb: number | null
}

interface AttendanceReportProps {
  type: 'attendance'
  students: AttendanceReportStudent[]
  dates: string[]
  holidayMap?: Map<string, { name: string; day_type: string }>
  className: string
  fromDate: string
  toDate: string
  classRecordKeys: ReadonlySet<string>
  today: string
  /** Loại buổi đang xuất: thu5 | cn | all — quyết định tiêu đề */
  attendanceType?: 'all' | 'thu5' | 'cn'
}

export function getAttendanceReportTitle(attendanceType?: 'all' | 'thu5' | 'cn'): string {
  if (attendanceType === 'thu5') return 'ĐIỂM DANH ĐI LỄ THỨ NĂM'
  if (attendanceType === 'cn') return 'ĐIỂM DANH HỌC GIÁO LÝ & ĐI LỄ CHÚA NHẬT'
  return 'ĐIỂM DANH THAM DỰ THÁNH LỄ THỨ NĂM VÀ CHÚA NHẬT'
}

interface ScoreColumns {
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

interface ScoreReportProps {
  type: 'score'
  students: ScoreReportStudent[]
  className: string
  schoolYear: string
  scoreColumns?: ScoreColumns
}

type ReportExportTemplateProps = AttendanceReportProps | ScoreReportProps

// Format date to dd/mm
const formatShortDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

// Format date to dd/mm/yyyy
const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

const ReportExportTemplate = forwardRef<HTMLDivElement, ReportExportTemplateProps>((props, ref) => {
  const today = new Date()
  const todayFormatted = formatFullDate(today.toISOString())

  return (
    <div
      ref={ref}
      className="bg-white p-8"
      // Ghim màu chữ đen: mẫu này ép nền trắng nhưng trước đây để chữ thừa hưởng
      // màu của app, mà chế độ tối đặt --foreground là #e5e5e5 nên ảnh xuất ra bị
      // chữ xám nhạt trên nền trắng, gần như không đọc được
      style={{ width: '800px', fontFamily: 'Arial, sans-serif', color: '#000000' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Logo Left */}
        <div className="w-[70px] h-[70px] flex items-center justify-center">
          <img
            src="/logo-tntt.png"
            alt="Logo TNTT"
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>

        {/* Center Text */}
        <div className="text-center flex-1 px-4">
          <h1 className="text-[#1a5f2a] font-bold text-lg">Phong trào thiếu nhi thánh thể Việt Nam</h1>
          <p className="text-[#1a5f2a] italic text-sm">Giáo xứ Thiên Ân - Xứ đoàn Fatima</p>
        </div>

        {/* Logo Right */}
        <div className="w-[70px] h-[70px] flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Logo Giáo xứ"
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-center text-[#c41e3a] font-bold text-xl mb-2">
        {props.type === 'attendance'
          ? getAttendanceReportTitle(props.attendanceType)
          : getScoreReportTitle(props.schoolYear)
        }
      </h2>

      {/* Class Name */}
      <p className="text-center text-base mb-4">
        Lớp: <span className="font-semibold">{props.className}</span>
      </p>

      {/* Table */}
      {props.type === 'attendance' ? (
        <>
          <AttendanceTable
            students={props.students}
            dates={props.dates}
            holidayMap={props.holidayMap}
            classRecordKeys={props.classRecordKeys}
            today={props.today}
          />
          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-gray-500" aria-label="Ký hiệu điểm danh">
            <span><strong className="text-black">{REPORT_CELL_SYMBOL.present}</strong> Có mặt</span>
            <span>Ô trống: Vắng mặt</span>
            <span><strong className="text-gray-500">{REPORT_CELL_SYMBOL.unmarked}</strong> Chưa điểm danh</span>
            <span>Nghỉ: Nghỉ lễ</span>
          </div>
        </>
      ) : (
        <ScoreTable students={props.students} scoreColumns={props.scoreColumns} />
      )}

      {/* Footer */}
      <p className="text-center text-xs text-gray-500 mt-4">
        {props.type === 'attendance'
          ? `Báo cáo được tạo ngày: ${todayFormatted} | Thời gian: ${props.fromDate} đến ${props.toDate}`
          : `Báo cáo được tạo ngày: ${todayFormatted} | Năm học: ${props.schoolYear}`
        }
      </p>
    </div>
  )
})

ReportExportTemplate.displayName = 'ReportExportTemplate'

// Attendance Table Component
function AttendanceTable({ students, dates, holidayMap, classRecordKeys, today }: {
  students: AttendanceReportStudent[]
  dates: string[]
  holidayMap?: Map<string, { name: string; day_type: string }>
  classRecordKeys: ReadonlySet<string>
  today: string
}) {
  // Chủ nhật (không nghỉ lễ) tách 2 cột con: GL (học giáo lý) | Lễ (đi lễ)
  const isSplit = (date: string) => isSundayDate(date) && !holidayMap?.has(date)
  const hasSplit = dates.some(isSplit)
  // Không dùng rowSpan: html-to-image render rowSpan lệch → hàng 2 dùng ô trống (bỏ viền trên) để nối liền ô hàng 1
  const topCls = 'border border-gray-400 border-b-0 px-2 py-2 text-center'
  const bottomCls = 'border border-gray-400 border-t-0 px-1 py-1 text-center'
  const renderCell = (
    record: 'present' | 'absent' | null | undefined,
    date: string,
    dayType: string,
    key: string,
  ) => {
    const status = reportCellStatus({
      record,
      date,
      today,
      isHoliday: false,
      classHasAnyRecord: classRecordKeys.has(reportRecordKey(date, dayType)),
    })
    const symbol = status === 'holiday' ? '' : REPORT_CELL_SYMBOL[status]
    return (
      <td key={key} className="border border-gray-400 px-2 py-2 text-center align-middle">
        {symbol && (
          <span className={status === 'present' ? 'text-black font-semibold' : 'text-gray-500'}>{symbol}</span>
        )}
      </td>
    )
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-[#fff3cd]">
          <th className={`${hasSplit ? topCls : 'border border-gray-400 px-2 py-2 text-center'} w-[50px]`}>STT</th>
          <th className={`${hasSplit ? topCls : 'border border-gray-400 px-2 py-2 text-center'} w-[120px]`}>Tên thánh</th>
          <th className={hasSplit ? topCls : 'border border-gray-400 px-2 py-2 text-center'} colSpan={2}>Họ và tên</th>
          {dates.map(date => {
            const holiday = holidayMap?.get(date)
            const split = isSplit(date)
            return (
              <th
                key={date}
                colSpan={split ? 2 : 1}
                className={`${!split && hasSplit ? topCls : 'border border-gray-400 px-2 py-2 text-center'} w-[50px] ${holiday ? 'bg-amber-100' : ''}`}
              >
                {formatShortDate(date)}
                {holiday && (
                  <div className="text-[8px] font-normal text-amber-700 leading-tight mt-0.5">{holiday.name}</div>
                )}
              </th>
            )
          })}
        </tr>
        {hasSplit && (
          <tr className="bg-[#fff3cd]">
            <th className={bottomCls} />
            <th className={bottomCls} />
            <th className={bottomCls} colSpan={2} />
            {dates.map(date => {
              if (!isSplit(date)) {
                return <th key={date} className={`${bottomCls} ${holidayMap?.has(date) ? 'bg-amber-100' : ''}`} />
              }
              return (
                <Fragment key={date}>
                  <th className="border border-gray-400 px-1 py-1 text-center text-[11px] font-medium">GL</th>
                  <th className="border border-gray-400 px-1 py-1 text-center text-[11px] font-medium">Lễ</th>
                </Fragment>
              )
            })}
          </tr>
        )}
      </thead>
      <tbody>
        {students.map((student, index) => {
          const nameParts = student.full_name.split(' ')
          const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
          const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''

          return (
            <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-2 py-2 text-center">{index + 1}</td>
              <td className="border border-gray-400 px-2 py-2 text-center">{student.saint_name || ''}</td>
              <td className="border border-gray-400 px-2 py-2">{familyMiddleName}</td>
              <td className="border border-gray-400 px-2 py-2 text-center font-medium">{givenName}</td>
              {dates.map(date => {
                const holiday = holidayMap?.get(date)
                if (holiday) {
                  return (
                    <td key={date} className="border border-gray-400 px-2 py-2 text-center bg-amber-50">
                      <span className="text-amber-600 italic text-xs">Nghỉ</span>
                    </td>
                  )
                }
                if (isSplit(date)) {
                  return [
                    renderCell(student.attendance[date], date, 'cn', `${date}-gl`),
                    renderCell(student.attendance_mass?.[date], date, 'cn_le', `${date}-le`),
                  ]
                }
                return renderCell(student.attendance[date], date, 'thu5', date)
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// Score Table Component
function ScoreTable({ students, scoreColumns }: { students: ScoreReportStudent[], scoreColumns?: ScoreColumns }) {
  // Determine which columns to show
  const anySelected = scoreColumns ? Object.values(scoreColumns).some(v => v) : false
  const showAll = !anySelected
  const showDiLeT5 = showAll || scoreColumns?.diLeT5
  const showHocGL = showAll || scoreColumns?.hocGL
  const showDiLeCN = showAll || scoreColumns?.diLeCN
  const showDiemTB = showAll || scoreColumns?.diemTB
  const show45HK1 = showAll || scoreColumns?.score45HK1
  const showExamHK1 = showAll || scoreColumns?.scoreExamHK1
  const show45HK2 = showAll || scoreColumns?.score45HK2
  const showExamHK2 = showAll || scoreColumns?.scoreExamHK2
  const showDiemTong = showAll || scoreColumns?.diemTong
  const showXepLoai = showAll || scoreColumns?.xepLoai
  const showKetQua = showAll || scoreColumns?.ketQua

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-[#fff3cd]">
          <th className="border border-gray-400 px-1 py-2 text-center w-[40px]">STT</th>
          <th className="border border-gray-400 px-1 py-2 text-center w-[100px]">Tên thánh</th>
          <th className="border border-gray-400 px-1 py-2 text-center" colSpan={2}>Họ và tên</th>
          {showDiLeT5 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Đi Lễ<br/>T5</th>}
          {showHocGL && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Học<br/>GL</th>}
          {showDiLeCN && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Đi Lễ<br/>CN</th>}
          {showDiemTB && <th className="border border-gray-400 px-1 py-2 text-center w-[50px] bg-[#e8f5e9]">Điểm<br/>TB</th>}
          {show45HK1 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">45p<br/>HK1</th>}
          {showExamHK1 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Thi<br/>HK1</th>}
          {show45HK2 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">45p<br/>HK2</th>}
          {showExamHK2 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Thi<br/>HK2</th>}
          {showDiemTong && <th className="border border-gray-400 px-1 py-2 text-center w-[55px] bg-[#ffecb3]">TB<br/>Năm</th>}
          {showXepLoai && <th className="border border-gray-400 px-1 py-2 text-center w-[70px]">Xếp<br/>loại</th>}
          {showKetQua && <th className="border border-gray-400 px-1 py-2 text-center w-[60px] bg-[#e3f2fd]">Kết<br/>quả</th>}
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => {
          const nameParts = student.full_name.split(' ')
          const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
          const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
          const summary = scoreSummary({
            score_45_hk1: student.score_45_hk1,
            score_exam_hk1: student.score_exam_hk1,
            score_45_hk2: student.score_45_hk2,
            score_exam_hk2: student.score_exam_hk2,
            t5: student.diem_t5,
            cn: student.diem_gl,
          })

          return (
            <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-1 py-2 text-center">{index + 1}</td>
              <td className="border border-gray-400 px-1 py-2 text-center">{student.saint_name || ''}</td>
              <td className="border border-gray-400 px-1 py-2">{familyMiddleName}</td>
              <td className="border border-gray-400 px-1 py-2 text-center font-medium">{givenName}</td>
              {showDiLeT5 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.diem_t5)}
                </td>
              )}
              {showHocGL && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.diem_gl)}
                </td>
              )}
              {showDiLeCN && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.diem_le_cn)}
                </td>
              )}
              {showDiemTB && (
                <td className="border border-gray-400 px-1 py-2 text-center font-semibold bg-[#e8f5e9]">
                  {fmtScore(student.diem_tb)}
                </td>
              )}
              {show45HK1 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.score_45_hk1)}
                </td>
              )}
              {showExamHK1 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.score_exam_hk1)}
                </td>
              )}
              {show45HK2 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.score_45_hk2)}
                </td>
              )}
              {showExamHK2 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {fmtScore(student.score_exam_hk2)}
                </td>
              )}
              {showDiemTong && (
                <td className="border border-gray-400 px-1 py-2 text-center font-bold bg-[#ffecb3]">
                  {fmtScore(summary.tbNam)}
                </td>
              )}
              {showXepLoai && (
                <td className="border border-gray-400 px-1 py-2 text-center font-semibold">
                  {summary.xepLoai}
                </td>
              )}
              {showKetQua && (() => {
                const kq = summary.ketQua
                return (
                  <td className={`border border-gray-400 px-1 py-2 text-center font-semibold ${kq === 'Đạt' ? 'text-green-600' : kq === 'Ở lại' ? 'text-red-600' : 'text-gray-500'} bg-[#e3f2fd]`}>
                    {kq}
                  </td>
                )
              })()}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default ReportExportTemplate
