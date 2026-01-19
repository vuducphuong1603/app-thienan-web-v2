'use client'

import { ArrowUpRight, BarChart3 } from 'lucide-react'

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
  attendance: [72, 68, 85, 78], // Điểm danh trung bình
  study: [65, 58, 75, 70], // Học tập trung bình
}

export default function ClassStats() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-gray-900">Thống kê lớp</h3>
        </div>
        <button className="w-6 h-6 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center justify-center transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Branch Statistics */}
      <div className="flex-1 space-y-4 overflow-auto">
        {branchStats.map((branch, index) => (
          <div key={index}>
            <h4 className="text-xs font-semibold text-gray-900 mb-2">{branch.name}</h4>

            {/* Lớp row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-gray-500 w-14">Lớp</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(branch.classes / branch.maxClasses) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-700 w-6 text-right">{branch.classes}</span>
            </div>

            {/* Thiếu nhi row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-gray-500 w-14">Thiếu nhi</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(branch.students / branch.maxStudents) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-700 w-6 text-right">{branch.students}</span>
            </div>

            {/* Giáo lý viên row */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-14">Giáo lý viên</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(branch.teachers / branch.maxTeachers) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-700 w-6 text-right">{branch.teachers}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Line Chart Section */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="h-16 relative">
          <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="15" x2="200" y2="15" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="30" x2="200" y2="30" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="45" x2="200" y2="45" stroke="#f3f4f6" strokeWidth="1" />

            {/* Data point markers - vertical lines */}
            <line x1="25" y1="0" x2="25" y2="60" stroke="#f9fafb" strokeWidth="1" />
            <line x1="75" y1="0" x2="75" y2="60" stroke="#f9fafb" strokeWidth="1" />
            <line x1="125" y1="0" x2="125" y2="60" stroke="#f9fafb" strokeWidth="1" />
            <line x1="175" y1="0" x2="175" y2="60" stroke="#f9fafb" strokeWidth="1" />

            {/* Attendance line (orange/brand) */}
            <path
              d={`M25 ${60 - chartData.attendance[0] * 0.6} L75 ${60 - chartData.attendance[1] * 0.6} L125 ${60 - chartData.attendance[2] * 0.6} L175 ${60 - chartData.attendance[3] * 0.6}`}
              fill="none"
              stroke="#FA865E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Attendance points */}
            {chartData.attendance.map((val, i) => (
              <circle
                key={`att-${i}`}
                cx={25 + i * 50}
                cy={60 - val * 0.6}
                r="3"
                fill="#FA865E"
              />
            ))}

            {/* Study line (gray dashed) */}
            <path
              d={`M25 ${60 - chartData.study[0] * 0.6} L75 ${60 - chartData.study[1] * 0.6} L125 ${60 - chartData.study[2] * 0.6} L175 ${60 - chartData.study[3] * 0.6}`}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Study points */}
            {chartData.study.map((val, i) => (
              <circle
                key={`study-${i}`}
                cx={25 + i * 50}
                cy={60 - val * 0.6}
                r="3"
                fill="#9ca3af"
              />
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[9px] text-gray-400">Chiên con</span>
          <span className="text-[9px] text-gray-400">Ấu nhi</span>
          <span className="text-[9px] text-gray-400">Thiếu nhi</span>
          <span className="text-[9px] text-gray-400">Nghĩa sĩ</span>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-0.5 bg-brand rounded-full" />
            <span className="text-[9px] text-gray-500">Điểm danh trung bình</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-0.5 bg-gray-400 rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 2px, transparent 2px, transparent 4px)' }} />
            <span className="text-[9px] text-gray-500">Học tập trung bình</span>
          </div>
        </div>
      </div>
    </div>
  )
}
