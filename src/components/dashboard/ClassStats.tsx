'use client'

interface BranchData {
  name: string
  stats: {
    label: string
    value: number
    percentage: number
  }[]
}

const branchesData: BranchData[] = [
  {
    name: 'Chiên con',
    stats: [
      { label: 'Lớp', value: 7, percentage: 65 },
      { label: 'Thiếu nhi', value: 178, percentage: 18 },
      { label: 'Giáo lý viên', value: 87, percentage: 95 },
    ],
  },
  {
    name: 'Ấu nhi',
    stats: [
      { label: 'Lớp', value: 7, percentage: 70 },
      { label: 'Thiếu nhi', value: 178, percentage: 25 },
      { label: 'Giáo lý viên', value: 87, percentage: 80 },
    ],
  },
  {
    name: 'Thiếu nhi',
    stats: [
      { label: 'Lớp', value: 7, percentage: 55 },
      { label: 'Thiếu nhi', value: 178, percentage: 30 },
      { label: 'Giáo lý viên', value: 87, percentage: 70 },
    ],
  },
  {
    name: 'Nghĩa sĩ',
    stats: [
      { label: 'Lớp', value: 7, percentage: 60 },
      { label: 'Thiếu nhi', value: 178, percentage: 20 },
      { label: 'Giáo lý viên', value: 87, percentage: 85 },
    ],
  },
]

// Chart data points (percentage values for Y position)
const chartData = {
  attendance: [45, 15, 75, 35], // Chiên con, Ấu nhi, Thiếu nhi, Nghĩa sĩ
  learning: [30, 25, 55, 45],
  labels: ['Chiên con', 'Ấu nhi', 'Thiếu nhi', 'Nghĩa sĩ'],
  tooltips: [
    { show: true, value: 18, position: 0 },
    { show: false, value: 0, position: 1 },
    { show: false, value: 0, position: 2 },
    { show: true, value: 125, position: 3 },
  ],
}

// Sparkle Icon Component
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.6144 17.7956C10.277 18.5682 9.20776 18.5682 8.8704 17.7956L7.99275 15.7854C7.21171 13.9966 5.80589 12.5726 4.0523 11.7942L1.63658 10.7219C0.868536 10.381 0.868537 9.26368 1.63658 8.92276L3.97685 7.88394C5.77553 7.08552 7.20657 5.60881 7.97427 3.75892L8.8633 1.61673C9.19319 0.821768 10.2916 0.821766 10.6215 1.61673L11.5105 3.75894C12.2782 5.60881 13.7092 7.08552 15.5079 7.88394L17.8482 8.92276C18.6162 9.26368 18.6162 10.381 17.8482 10.7219L15.4325 11.7942C13.6789 12.5726 12.2731 13.9966 11.492 15.7854L10.6144 17.7956ZM4.53956 9.82234C6.8254 10.837 8.68402 12.5048 9.74238 14.7996C10.8008 12.5048 12.6594 10.837 14.9452 9.82234C12.6321 8.79557 10.7676 7.04647 9.74239 4.71088C8.71719 7.04648 6.85267 8.79557 4.53956 9.82234ZM19.4014 22.6899L19.6482 22.1242C20.0882 21.1156 20.8807 20.3125 21.8695 19.8732L22.6299 19.5353C23.0412 19.3526 23.0412 18.7549 22.6299 18.5722L21.9121 18.2532C20.8978 17.8026 20.0911 16.9698 19.6586 15.9269L19.4052 15.3156C19.2285 14.8896 18.6395 14.8896 18.4628 15.3156L18.2094 15.9269C17.777 16.9698 16.9703 17.8026 15.956 18.2532L15.2381 18.5722C14.8269 18.7549 14.8269 19.3526 15.2381 19.5353L15.9985 19.8732C16.9874 20.3125 17.7798 21.1156 18.2198 22.1242L18.4667 22.6899C18.6473 23.104 19.2207 23.104 19.4014 22.6899ZM18.3745 19.0469L18.937 18.4883L19.4878 19.0469L18.937 19.5898L18.3745 19.0469Z"
        fill="black"
      />
    </svg>
  )
}

// Arrow Icon Component
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.5 8.5L8.5 3.5M8.5 3.5H4.5M8.5 3.5V7.5"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BranchCard({ branch }: { branch: BranchData }) {
  return (
    <div className="bg-[#F6F6F6] border border-white/20 rounded-[14px] px-[18px] py-[7px]">
      {/* Branch Name */}
      <p className="text-xs text-black mb-4">{branch.name}</p>

      {/* Stats Rows */}
      <div className="space-y-2">
        {branch.stats.map((stat, index) => (
          <div key={index}>
            {/* Label and Value Row */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#666D80]">{stat.label}</span>
              <span className="text-[10px] text-[#666D80]">{stat.value}</span>
            </div>
            {/* Progress Bar */}
            <div className="flex h-[9px]">
              <div
                className="bg-[#FA865E] rounded-l-[5px]"
                style={{ width: `${stat.percentage}%` }}
              />
              <div
                className="bg-[#E5E1DC] rounded-r-[5px] flex-1"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart() {
  const width = 300
  const height = 80
  const padding = { left: 10, right: 10, top: 25, bottom: 5 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate points for lines
  const getX = (index: number) => padding.left + (index * chartWidth) / (chartData.attendance.length - 1)
  const getY = (value: number) => padding.top + chartHeight - (value / 100) * chartHeight

  // Generate path for attendance line (orange)
  const attendancePath = chartData.attendance
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
    .join(' ')

  // Generate path for learning line (gray)
  const learningPath = chartData.learning
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
    .join(' ')

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="relative">
        {/* Chart SVG */}
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Baseline */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="black"
            strokeWidth="1"
          />

          {/* Learning line (gray/beige) */}
          <path
            d={learningPath}
            fill="none"
            stroke="#E5E1DC"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Attendance line (orange) */}
          <path
            d={attendancePath}
            fill="none"
            stroke="#FA865E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Attendance points (orange) */}
          {chartData.attendance.map((val, i) => (
            <circle
              key={`att-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3"
              fill="#FA865E"
            />
          ))}

          {/* Learning points (gray/beige) */}
          {chartData.learning.map((val, i) => (
            <circle
              key={`learn-${i}`}
              cx={getX(i)}
              cy={getY(val)}
              r="3"
              fill="#E5E1DC"
            />
          ))}

          {/* Tooltips */}
          {chartData.tooltips.map((tooltip, i) => {
            if (!tooltip.show) return null
            const x = getX(tooltip.position)
            const y = getY(chartData.attendance[tooltip.position])
            return (
              <g key={`tooltip-${i}`}>
                {/* Tooltip box */}
                <rect
                  x={x - 18}
                  y={y - 28}
                  width="36"
                  height="20"
                  rx="4"
                  fill="#FA865E"
                />
                {/* Tooltip arrow */}
                <polygon
                  points={`${x - 5},${y - 8} ${x + 5},${y - 8} ${x},${y - 3}`}
                  fill="#FA865E"
                />
                {/* Tooltip text */}
                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="500"
                >
                  {tooltip.value}
                </text>
              </g>
            )
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-1 px-2">
          {chartData.labels.map((label, i) => (
            <span key={i} className="text-[10px] text-[#666D80]">{label}</span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#FA865E] rounded-full"></div>
          <span className="text-[10px] text-[#666D80]">Điểm danh trung bình</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-[#E5E1DC] rounded-full"></div>
          <span className="text-[10px] text-[#666D80]">Học tập trung bình</span>
        </div>
      </div>
    </div>
  )
}

export default function ClassStats() {
  return (
    <div className="bg-white rounded-[15px] p-4 border border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-6 h-6" />
          <h3 className="text-base font-semibold text-black">Thống kê lớp</h3>
        </div>
        <button className="w-[48px] h-[48px] bg-[#F6F6F6] hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <ArrowIcon />
        </button>
      </div>

      {/* Branch Cards */}
      <div className="flex-1 space-y-3 overflow-auto">
        {branchesData.map((branch, index) => (
          <BranchCard key={index} branch={branch} />
        ))}
      </div>

      {/* Line Chart */}
      <LineChart />
    </div>
  )
}
