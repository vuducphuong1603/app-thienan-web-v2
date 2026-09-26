import { forwardRef, Fragment } from 'react'
import type { PriestAbsentWarning } from '@/lib/priest-report'

export interface PriestReportClassData {
  classId: string
  className: string
  branch: string
  studentCount: number
  totalSlots: number
  presentCount: number
  absentCount: number
  rate: number
}

export interface PriestReportBranchData {
  branch: string
  classes: PriestReportClassData[]
  totalStudents: number
  totalSlots: number
  totalPresent: number
  totalAbsent: number
  rate: number
}

export interface PriestReportData {
  branches: PriestReportBranchData[]
  grandTotalStudents: number
  grandTotalSlots: number
  grandTotalPresent: number
  grandTotalAbsent: number
  grandRate: number
  fromDate: string
  toDate: string
  timeLabel: string
  absentWarning?: {
    prevLabel: string
    currentLabel: string
    students: PriestAbsentWarning[]
  } | null
}

interface PriestReportTemplateProps {
  data: PriestReportData
}

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

const PriestReportTemplate = forwardRef<HTMLDivElement, PriestReportTemplateProps>(({ data }, ref) => {
  const today = new Date()
  const todayFormatted = formatFullDate(today.toISOString())

  let globalIndex = 0

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
        <div className="text-center flex-1 px-4">
          <h1 className="text-[#1a5f2a] font-bold text-lg">Phong trào thiếu nhi thánh thể Việt Nam</h1>
          <p className="text-[#1a5f2a] italic text-sm">Giáo xứ Thiên Ân - Xứ đoàn Fatima</p>
        </div>
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
        BÁO CÁO TỔNG HỢP ĐIỂM DANH
      </h2>
      <p className="text-center text-base mb-4">
        {data.timeLabel}
      </p>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#fff3cd]">
            <th className="border border-gray-400 px-2 py-2 text-center w-[50px]">STT</th>
            <th className="border border-gray-400 px-2 py-2 text-left">Ngành / Lớp</th>
            <th className="border border-gray-400 px-2 py-2 text-center w-[70px]">Sĩ số</th>
            <th className="border border-gray-400 px-2 py-2 text-center w-[80px]">Đi</th>
            <th className="border border-gray-400 px-2 py-2 text-center w-[80px]">Nghỉ</th>
            <th className="border border-gray-400 px-2 py-2 text-center w-[80px]">Tỉ lệ (%)</th>
          </tr>
        </thead>
        <tbody>
          {data.branches.map((branch) => (
            <Fragment key={branch.branch}>
              {branch.classes.map((cls) => {
                globalIndex++
                return (
                  <tr key={cls.classId} className={globalIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border border-gray-400 px-2 py-2 text-center">{globalIndex}</td>
                    <td className="border border-gray-400 px-2 py-2">{cls.className}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{cls.studentCount}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{cls.presentCount}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">{cls.absentCount}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center font-medium">
                      {cls.totalSlots > 0 ? cls.rate.toFixed(1) : '-'}
                    </td>
                  </tr>
                )
              })}
              {/* Branch subtotal */}
              <tr key={`branch-${branch.branch}`} className="bg-[#fff3cd] font-semibold">
                <td className="border border-gray-400 px-2 py-2 text-center" colSpan={2}>
                  Cộng ngành {branch.branch}
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center">{branch.totalStudents}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{branch.totalPresent}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">{branch.totalAbsent}</td>
                <td className="border border-gray-400 px-2 py-2 text-center">
                  {branch.totalSlots > 0 ? branch.rate.toFixed(1) : '-'}
                </td>
              </tr>
            </Fragment>
          ))}
          {/* Grand total */}
          <tr className="bg-[#d4edda] font-bold">
            <td className="border border-gray-400 px-2 py-2 text-center" colSpan={2}>
              TỔNG CỘNG
            </td>
            <td className="border border-gray-400 px-2 py-2 text-center">{data.grandTotalStudents}</td>
            <td className="border border-gray-400 px-2 py-2 text-center">{data.grandTotalPresent}</td>
            <td className="border border-gray-400 px-2 py-2 text-center">{data.grandTotalAbsent}</td>
            <td className="border border-gray-400 px-2 py-2 text-center">
              {data.grandTotalSlots > 0 ? data.grandRate.toFixed(1) : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-2">
        Nghỉ: số em không đi buổi nào trong kỳ báo cáo
      </p>

      {data.absentWarning && data.absentWarning.students.length > 0 && (
        <section className="mt-4 border border-[#f5c6cb] bg-[#fff5f5] p-3">
          <h3 className="text-[#c41e3a] font-bold text-sm mb-2">
            ⚠ CẢNH BÁO: vắng 2 tháng liên tiếp ({data.absentWarning.prevLabel} và {data.absentWarning.currentLabel})
          </h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8d7da] text-[#721c24]">
                <th className="border border-gray-400 px-2 py-2 text-center w-[50px]">STT</th>
                <th className="border border-gray-400 px-2 py-2 text-left">Tên thánh + Họ tên</th>
                <th className="border border-gray-400 px-2 py-2 text-left">Lớp</th>
                <th className="border border-gray-400 px-2 py-2 text-left">SĐT phụ huynh</th>
              </tr>
            </thead>
            <tbody>
              {data.absentWarning.students.map((student, index) => (
                <tr key={student.studentId} className="bg-white">
                  <td className="border border-gray-400 px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-400 px-2 py-2">
                    {student.saintName} {student.fullName}
                  </td>
                  <td className="border border-gray-400 px-2 py-2">{student.className}</td>
                  <td className="border border-gray-400 px-2 py-2">{student.parentPhones.join(' / ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-gray-500 mt-4">
        Báo cáo được tạo ngày: {todayFormatted} | Thời gian: {formatFullDate(data.fromDate)} đến {formatFullDate(data.toDate)}
      </p>
    </div>
  )
})

PriestReportTemplate.displayName = 'PriestReportTemplate'

export default PriestReportTemplate
