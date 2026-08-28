import { forwardRef, Fragment } from 'react'
import { isSundayDate } from '@/lib/sunday-attendance'

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
          ? 'ĐIỂM DANH THAM DỰ THÁNH LỄ THỨ NĂM VÀ CHÚA NHẬT'
          : 'BÁO CÁO ĐIỂM SỐ HỌC TẬP GIÁO LÝ'
        }
      </h2>

      {/* Class Name */}
      <p className="text-center text-base mb-4">
        Lớp: <span className="font-semibold">{props.className}</span>
      </p>

      {/* Table */}
      {props.type === 'attendance' ? (
        <AttendanceTable students={props.students} dates={props.dates} holidayMap={props.holidayMap} />
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
function AttendanceTable({ students, dates, holidayMap }: { students: AttendanceReportStudent[], dates: string[], holidayMap?: Map<string, { name: string; day_type: string }> }) {
  // Chủ nhật (không nghỉ lễ) tách 2 cột con: GL (học giáo lý) | Lễ (đi lễ)
  const isSplit = (date: string) => isSundayDate(date) && !holidayMap?.has(date)
  const hasSplit = dates.some(isSplit)
  // Không dùng rowSpan: html-to-image render rowSpan lệch → hàng 2 dùng ô trống (bỏ viền trên) để nối liền ô hàng 1
  const topCls = 'border border-gray-400 border-b-0 px-2 py-2 text-center'
  const bottomCls = 'border border-gray-400 border-t-0 px-1 py-1 text-center'
  const renderCell = (status: 'present' | 'absent' | null | undefined, key: string) => (
    <td key={key} className="border border-gray-400 px-2 py-2 text-center">
      {status === 'absent' ? (
        <span className="text-red-600 font-bold">x</span>
      ) : status === 'present' ? (
        <span className="text-green-600">&#10003;</span>
      ) : (
        ''
      )}
    </td>
  )
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
                    renderCell(student.attendance[date], `${date}-gl`),
                    renderCell(student.attendance_mass?.[date], `${date}-le`),
                  ]
                }
                return renderCell(student.attendance[date], date)
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
  const showKetQua = scoreColumns?.ketQua ?? false

  const getKetQua = (s: ScoreReportStudent) => {
    const scoreThu5 = s.score_di_le_t5
    const scoreCn = s.score_hoc_gl
    const s45hk1 = s.score_45_hk1
    const s45hk2 = s.score_45_hk2
    const examHk1 = s.score_exam_hk1
    const examHk2 = s.score_exam_hk2

    const avgCatechism = (s45hk1 !== null && s45hk2 !== null && examHk1 !== null && examHk2 !== null)
      ? (s45hk1 + s45hk2 + examHk1 * 2 + examHk2 * 2) / 6
      : null
    const avgAttendance = (scoreThu5 !== null && scoreCn !== null)
      ? scoreThu5 + scoreCn
      : null
    const totalAvg = (avgCatechism !== null && avgAttendance !== null)
      ? avgCatechism * 0.6 + avgAttendance * 0.4
      : null

    if (
      (scoreThu5 !== null && scoreThu5 < 2.5) ||
      (scoreCn !== null && scoreCn < 2.5) ||
      (avgCatechism !== null && avgCatechism < 2.5) ||
      (totalAvg !== null && totalAvg < 5)
    ) {
      return 'Ở lại'
    }
    return 'Đạt'
  }

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
          {(show45HK2 || showExamHK2) && <th className="border border-gray-400 px-1 py-2 text-center w-[50px] bg-[#e8f5e9]">TB<br/>HK2</th>}
          {showDiemTong && <th className="border border-gray-400 px-1 py-2 text-center w-[55px] bg-[#ffecb3]">TB<br/>Năm</th>}
          {showKetQua && <th className="border border-gray-400 px-1 py-2 text-center w-[60px] bg-[#e3f2fd]">Kết<br/>quả</th>}
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => {
          const nameParts = student.full_name.split(' ')
          const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
          const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''

          return (
            <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-1 py-2 text-center">{index + 1}</td>
              <td className="border border-gray-400 px-1 py-2 text-center">{student.saint_name || ''}</td>
              <td className="border border-gray-400 px-1 py-2">{familyMiddleName}</td>
              <td className="border border-gray-400 px-1 py-2 text-center font-medium">{givenName}</td>
              {showDiLeT5 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.diem_t5 !== null ? student.diem_t5 : '-'}
                </td>
              )}
              {showHocGL && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.diem_gl !== null ? student.diem_gl : '-'}
                </td>
              )}
              {showDiLeCN && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.diem_le_cn !== null ? student.diem_le_cn : '-'}
                </td>
              )}
              {showDiemTB && (
                <td className="border border-gray-400 px-1 py-2 text-center font-semibold bg-[#e8f5e9]">
                  {student.diem_tb !== null ? student.diem_tb : '-'}
                </td>
              )}
              {show45HK1 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.score_45_hk1 !== null ? student.score_45_hk1 : '-'}
                </td>
              )}
              {showExamHK1 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.score_exam_hk1 !== null ? student.score_exam_hk1 : '-'}
                </td>
              )}
              {show45HK2 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.score_45_hk2 !== null ? student.score_45_hk2 : '-'}
                </td>
              )}
              {showExamHK2 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.score_exam_hk2 !== null ? student.score_exam_hk2 : '-'}
                </td>
              )}
              {(show45HK2 || showExamHK2) && (
                <td className="border border-gray-400 px-1 py-2 text-center font-semibold bg-[#e8f5e9]">
                  {student.average_hk2 !== null ? student.average_hk2 : '-'}
                </td>
              )}
              {showDiemTong && (
                <td className="border border-gray-400 px-1 py-2 text-center font-bold bg-[#ffecb3]">
                  {student.average_year !== null ? student.average_year : '-'}
                </td>
              )}
              {showKetQua && (() => {
                const kq = getKetQua(student)
                return (
                  <td className={`border border-gray-400 px-1 py-2 text-center font-semibold ${kq === 'Đạt' ? 'text-green-600' : 'text-red-600'} bg-[#e3f2fd]`}>
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
