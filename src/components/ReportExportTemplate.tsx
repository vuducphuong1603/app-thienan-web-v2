import { forwardRef } from 'react'

interface AttendanceReportStudent {
  id: string
  student_code?: string
  full_name: string
  saint_name?: string
  attendance: Record<string, 'present' | 'absent' | null>
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
}

interface AttendanceReportProps {
  type: 'attendance'
  students: AttendanceReportStudent[]
  dates: string[]
  className: string
  fromDate: string
  toDate: string
}

interface ScoreColumns {
  diLeT5: boolean
  hocGL: boolean
  diemTB: boolean
  score45HK1: boolean
  scoreExamHK1: boolean
  score45HK2: boolean
  scoreExamHK2: boolean
  diemTong: boolean
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
      style={{ width: '800px', fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Logo Left */}
        <div className="w-[70px] h-[70px] flex items-center justify-center">
          <img
            src="/logo.png"
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
        <AttendanceTable students={props.students} dates={props.dates} />
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
function AttendanceTable({ students, dates }: { students: AttendanceReportStudent[], dates: string[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-[#fff3cd]">
          <th className="border border-gray-400 px-2 py-2 text-center w-[50px]">STT</th>
          <th className="border border-gray-400 px-2 py-2 text-center w-[120px]">Tên thánh</th>
          <th className="border border-gray-400 px-2 py-2 text-center" colSpan={2}>Họ và tên</th>
          {dates.map(date => (
            <th key={date} className="border border-gray-400 px-2 py-2 text-center w-[50px]">
              {formatShortDate(date)}
            </th>
          ))}
        </tr>
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
              {dates.map(date => (
                <td key={date} className="border border-gray-400 px-2 py-2 text-center">
                  {student.attendance[date] === 'absent' ? (
                    <span className="text-red-600 font-bold">x</span>
                  ) : student.attendance[date] === 'present' ? (
                    <span className="text-green-600">&#10003;</span>
                  ) : (
                    ''
                  )}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// Score Table Component
function ScoreTable({ students, scoreColumns }: { students: ScoreReportStudent[], scoreColumns?: ScoreColumns }) {
  // Get classification
  const getClassification = (avgYear: number | null) => {
    if (avgYear === null) return { text: '-', color: 'text-gray-500' }
    if (avgYear >= 8.0) return { text: 'Giỏi', color: 'text-green-600' }
    if (avgYear >= 6.5) return { text: 'Khá', color: 'text-blue-600' }
    if (avgYear >= 5.0) return { text: 'TB', color: 'text-yellow-600' }
    return { text: 'Yếu', color: 'text-red-600' }
  }

  // Determine which columns to show
  const anySelected = scoreColumns ? Object.values(scoreColumns).some(v => v) : false
  const showAll = !anySelected
  const showDiLeT5 = showAll || scoreColumns?.diLeT5
  const showHocGL = showAll || scoreColumns?.hocGL
  const show45HK1 = showAll || scoreColumns?.score45HK1
  const showExamHK1 = showAll || scoreColumns?.scoreExamHK1
  const show45HK2 = showAll || scoreColumns?.score45HK2
  const showExamHK2 = showAll || scoreColumns?.scoreExamHK2
  const showDiemTong = showAll || scoreColumns?.diemTong

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-[#fff3cd]">
          <th className="border border-gray-400 px-1 py-2 text-center w-[40px]">STT</th>
          <th className="border border-gray-400 px-1 py-2 text-center w-[100px]">Tên thánh</th>
          <th className="border border-gray-400 px-1 py-2 text-center" colSpan={2}>Họ và tên</th>
          {showDiLeT5 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Đi Lễ<br/>T5</th>}
          {showHocGL && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Học<br/>GL</th>}
          {show45HK1 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">45p<br/>HK1</th>}
          {showExamHK1 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Thi<br/>HK1</th>}
          {(show45HK1 || showExamHK1) && <th className="border border-gray-400 px-1 py-2 text-center w-[50px] bg-[#e8f5e9]">TB<br/>HK1</th>}
          {show45HK2 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">45p<br/>HK2</th>}
          {showExamHK2 && <th className="border border-gray-400 px-1 py-2 text-center w-[50px]">Thi<br/>HK2</th>}
          {(show45HK2 || showExamHK2) && <th className="border border-gray-400 px-1 py-2 text-center w-[50px] bg-[#e8f5e9]">TB<br/>HK2</th>}
          {showDiemTong && <th className="border border-gray-400 px-1 py-2 text-center w-[55px] bg-[#ffecb3]">TB<br/>Năm</th>}
          <th className="border border-gray-400 px-1 py-2 text-center w-[60px]">Xếp<br/>loại</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => {
          const nameParts = student.full_name.split(' ')
          const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ''
          const familyMiddleName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
          const classification = getClassification(student.average_year)

          return (
            <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-400 px-1 py-2 text-center">{index + 1}</td>
              <td className="border border-gray-400 px-1 py-2 text-center">{student.saint_name || ''}</td>
              <td className="border border-gray-400 px-1 py-2">{familyMiddleName}</td>
              <td className="border border-gray-400 px-1 py-2 text-center font-medium">{givenName}</td>
              {showDiLeT5 && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.score_di_le_t5 !== null ? student.score_di_le_t5 : '-'}
                </td>
              )}
              {showHocGL && (
                <td className="border border-gray-400 px-1 py-2 text-center">
                  {student.score_hoc_gl !== null ? student.score_hoc_gl : '-'}
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
              {(show45HK1 || showExamHK1) && (
                <td className="border border-gray-400 px-1 py-2 text-center font-semibold bg-[#e8f5e9]">
                  {student.average_hk1 !== null ? student.average_hk1 : '-'}
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
              <td className={`border border-gray-400 px-1 py-2 text-center font-semibold ${classification.color}`}>
                {classification.text}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default ReportExportTemplate
