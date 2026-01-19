'use client'

import { Sparkles, ChevronDown } from 'lucide-react'

interface BranchStat {
  name: string
  classes: number
  students: number
  teachers: number
  maxClasses: number
  maxStudents: number
  maxTeachers: number
}

const branchStats: BranchStat[] = [
  { name: 'Chiên con', classes: 7, students: 178, teachers: 87, maxClasses: 10, maxStudents: 200, maxTeachers: 100 },
  { name: 'Ấu nhi', classes: 7, students: 178, teachers: 87, maxClasses: 10, maxStudents: 200, maxTeachers: 100 },
  { name: 'Thiếu nhi', classes: 7, students: 178, teachers: 87, maxClasses: 10, maxStudents: 200, maxTeachers: 100 },
  { name: 'Nghĩa sĩ', classes: 7, students: 178, teachers: 87, maxClasses: 10, maxStudents: 200, maxTeachers: 100 },
]

// Chart data points for line graph
const chartData = {
  labels: ['Chiên con', 'Ấu nhi', 'Thiếu nhi', 'Nghĩa sĩ'],
  attendance: [178, 150, 85, 120], // Điểm danh trung bình
  study: [140, 120, 83, 100], // Học tập trung bình
}

function ProgressBar({ value, max, showLeftRound = true, showRightRound = true }: {
  value: number
  max: number
  showLeftRound?: boolean
  showRightRound?: boolean
}) {
  const percentage = (value / max) * 100
  const filledPercentage = Math.min(percentage, 100)

  return (
    <div className="flex w-full h-[9px]">
      {/* Filled part */}
      <div
        className={`bg-[#fa865e] h-full ${showLeftRound ? 'rounded-l-[5px]' : ''} ${filledPercentage >= 100 && showRightRound ? 'rounded-r-[5px]' : ''}`}
        style={{ width: `${filledPercentage}%` }}
      />
      {/* Unfilled part */}
      {filledPercentage < 100 && (
        <div
          className={`bg-[#e5e1dc] h-full ${showRightRound ? 'rounded-r-[5px]' : ''} ${filledPercentage <= 0 && showLeftRound ? 'rounded-l-[5px]' : ''}`}
          style={{ width: `${100 - filledPercentage}%` }}
        />
      )}
    </div>
  )
}

function LineChart() {
  const width = 287
  const height = 68
  const padding = { top: 10, right: 10, bottom: 10, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(...chartData.attendance, ...chartData.study)
  const minValue = Math.min(...chartData.attendance, ...chartData.study) * 0.8

  const getX = (index: number) => padding.left + (index / (chartData.labels.length - 1)) * chartWidth
  const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight

  const attendancePath = chartData.attendance.map((val, i) =>
    `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(val)}`
  ).join(' ')

  const studyPath = chartData.study.map((val, i) =>
    `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(val)}`
  ).join(' ')

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Horizontal line at bottom */}
        <line
          x1={padding.left}
          y1={height - padding.bottom + 5}
          x2={width - padding.right}
          y2={height - padding.bottom + 5}
          stroke="black"
          strokeWidth="1"
        />

        {/* Attendance line (orange) */}
        <path
          d={attendancePath}
          fill="none"
          stroke="#fa865e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Study line (beige) */}
        <path
          d={studyPath}
          fill="none"
          stroke="#e5e1dc"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Attendance points */}
        {chartData.attendance.map((val, i) => (
          <circle
            key={`att-${i}`}
            cx={getX(i)}
            cy={getY(val)}
            r="3"
            fill="#fa865e"
          />
        ))}

        {/* Study points */}
        {chartData.study.map((val, i) => (
          <circle
            key={`study-${i}`}
            cx={getX(i)}
            cy={getY(val)}
            r="3"
            fill="#e5e1dc"
          />
        ))}

        {/* Data labels for first point */}
        <text x={getX(0)} y={getY(chartData.attendance[0]) - 8} fontSize="10" fill="#666d80" textAnchor="middle">
          {chartData.attendance[0]}
        </text>

        {/* Data label for third point (Thiếu nhi) */}
        <text x={getX(2)} y={getY(chartData.study[2]) + 15} fontSize="10" fill="#666d80" textAnchor="middle">
          8.3
        </text>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-2">
        {chartData.labels.map((label, i) => (
          <span key={i} className="text-[10px] text-[#666d80]">{label}</span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <span className="w-[3px] h-[3px] rounded-full bg-[#fa865e]" />
            <span className="w-6 h-0.5 bg-[#fa865e]" />
            <span className="w-[3px] h-[3px] rounded-full bg-[#fa865e]" />
          </div>
          <span className="text-[10px] text-[#8a8c90]">Điểm danh trung bình</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <span className="w-[3px] h-[3px] rounded-full bg-[#e5e1dc]" />
            <span className="w-6 h-0.5 bg-[#e5e1dc]" />
            <span className="w-[3px] h-[3px] rounded-full bg-[#e5e1dc]" />
          </div>
          <span className="text-[10px] text-[#8a8c90]">Học tập trung bình</span>
        </div>
      </div>
    </div>
  )
}

export default function ClassStats() {
  return (
    <div className="bg-white rounded-[15px] border border-white/60 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gray-700" />
          <h3 className="text-base font-semibold text-black">Thống kê lớp</h3>
        </div>
        <button className="w-[55px] h-[55px] bg-[#f6f6f6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <ChevronDown className="w-4 h-4 text-black" />
        </button>
      </div>

      {/* Branch Statistics Cards */}
      <div className="flex-1 px-4 pb-3 space-y-3 overflow-auto">
        {branchStats.map((branch, index) => (
          <div
            key={index}
            className="bg-[#f6f6f6] border border-white/20 rounded-[14px] p-4"
          >
            {/* Branch name */}
            <p className="text-xs text-black mb-3">{branch.name}</p>

            {/* Lớp row */}
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#666d80]">Lớp</span>
                <span className="text-[10px] text-[#666d80]">{branch.classes}</span>
              </div>
              <ProgressBar value={branch.classes} max={branch.maxClasses} />
            </div>

            {/* Thiếu nhi row */}
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#666d80]">Thiếu nhi</span>
                <span className="text-[10px] text-[#666d80]">{branch.students}</span>
              </div>
              <ProgressBar value={branch.students} max={branch.maxStudents} />
            </div>

            {/* Giáo lý viên row */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#666d80]">Giáo lý viên</span>
                <span className="text-[10px] text-[#666d80]">{branch.teachers}</span>
              </div>
              <ProgressBar value={branch.teachers} max={branch.maxTeachers} />
            </div>
          </div>
        ))}
      </div>

      {/* Line Chart Section */}
      <div className="px-4 pb-4">
        <LineChart />
      </div>
    </div>
  )
}
