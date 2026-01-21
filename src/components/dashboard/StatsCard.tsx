'use client'

import { useRouter } from 'next/navigation'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: 'branch' | 'class' | 'student' | 'teacher'
  variant?: 'primary' | 'default'
  chart?: 'line' | 'bar' | 'people' | 'wave'
  href?: string
}

export default function StatsCard({ title, value, icon = 'branch', variant = 'default', chart, href }: StatsCardProps) {
  const router = useRouter()
  const isPrimary = variant === 'primary'

  const renderChart = () => {
    if (chart === 'line') {
      // Double line chart matching the design - for "Tổng số ngành"
      return (
        <div className="relative w-28 h-14">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 115 60" fill="none">
            {/* First line (orange solid) */}
            <path
              d="M0 50C47.32 -16.64 47.06 85.03 81.12 46.81C87.15 40.05 101.82 31.73 115 49.41"
              stroke="url(#lineGrad1)"
              strokeWidth="2.6"
              fill="none"
            />
            {/* Second line (orange dashed look) */}
            <path
              d="M0 44C43.16 78.84 34.58 -4.1 72.8 48.15C77.48 56.47 94.12 64.27 115 38.27"
              stroke="url(#lineGrad2)"
              strokeWidth="2.6"
              fill="none"
            />
            {/* Highlight dot */}
            <circle cx="28" cy="26" r="4" fill="#FA865E" stroke="white" strokeWidth="1.5"/>
            <defs>
              <linearGradient id="lineGrad1" x1="0" y1="40" x2="115" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0"/>
                <stop offset="0.26" stopColor="white"/>
                <stop offset="0.53" stopColor="white"/>
                <stop offset="0.79" stopColor="white"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="lineGrad2" x1="0" y1="43" x2="115" y2="43" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0"/>
                <stop offset="0.6" stopColor="white"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      )
    }
    if (chart === 'bar') {
      // Bar chart for "Tổng số lớp"
      const bars = [
        { height: 4.8, color: '#E5E1DC' },
        { height: 8.4, color: '#E5E1DC' },
        { height: 13.2, color: '#E5E1DC' },
        { height: 24, color: '#FA865E' },
        { height: 36, color: '#FA865E' },
        { height: 21.6, color: '#FA865E' },
        { height: 14.4, color: '#E5E1DC' },
        { height: 4.8, color: '#E5E1DC' },
      ]
      return (
        <div className="flex items-end gap-1 h-10">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="w-4 rounded-md"
              style={{
                height: `${bar.height}px`,
                backgroundColor: bar.color,
                minHeight: '4px'
              }}
            />
          ))}
        </div>
      )
    }
    if (chart === 'people') {
      // People/bar chart for "Tổng thiếu nhi"
      const people = [
        { top: 3.8, main: 21.8, filled: true },
        { top: 6.4, main: 19.2, filled: true },
        { top: 3.2, main: 22.4, filled: false },
        { top: 2.6, main: 23, filled: true },
        { top: 3.2, main: 22.4, filled: false },
        { top: 2.6, main: 23, filled: true },
        { top: 3.2, main: 22.4, filled: false },
        { top: 3.2, main: 22.4, filled: false },
        { top: 6.4, main: 19.2, filled: true },
        { top: 3.2, main: 22.4, filled: false },
        { top: 8.3, main: 17.3, filled: true },
      ]
      const fillColor = '#000000'
      const emptyColor = '#ffffff'

      return (
        <svg width="130" height="34" viewBox="0 0 145 34" fill="none">
          {people.map((p, i) => {
            const x = 5 + i * 13
            const mainColor = p.filled ? fillColor : emptyColor
            const topColor = p.filled ? emptyColor : fillColor
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={0}
                  width="2.56"
                  height={p.top}
                  rx="1.28"
                  fill={topColor}
                />
                <rect
                  x={x}
                  y={p.top + 2}
                  width="2.56"
                  height={p.main}
                  rx="1.28"
                  fill={mainColor}
                />
                <circle
                  cx={x + 1.28}
                  cy={31.4}
                  r="1.92"
                  fill={mainColor}
                />
              </g>
            )
          })}
        </svg>
      )
    }
    if (chart === 'wave') {
      // Wave/line chart for "Giáo lý viên"
      return (
        <div className="relative w-28 h-10">
          <svg className="w-full h-full" viewBox="0 0 115 40" fill="none">
            {/* Gradient fill under the line */}
            <defs>
              <linearGradient id="waveGrad" x1="57.5" y1="0" x2="57.5" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FA865E" stopOpacity="0.5"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path
              d="M0 25C30 10 25 30 50 20C75 10 80 15 97 15C105 15 110 13 115 12V40H0V25Z"
              fill="url(#waveGrad)"
            />
            {/* Line */}
            <path
              d="M0 25C30 10 25 30 50 20C75 10 80 15 97 15C105 15 110 13 115 12"
              stroke="#FA865E"
              strokeWidth="1"
              fill="none"
            />
            {/* Vertical line with dot */}
            <rect x="83" y="15" width="8" height="20" rx="4" fill="url(#dotGrad)" fillOpacity="0.6"/>
            <circle cx="87" cy="18" r="2.5" fill="white" stroke="#FA865E" strokeWidth="1"/>
            <defs>
              <linearGradient id="dotGrad" x1="87" y1="15" x2="87" y2="35" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FA865E" stopOpacity="0"/>
                <stop offset="1" stopColor="#FA865E"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      )
    }
    return null
  }

  // Custom icons matching the design
  const renderIcon = () => {
    if (icon === 'branch') {
      // Graph/chart icon for "Tổng số ngành"
      return (
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isPrimary ? 'bg-white/10' : 'bg-gray-50'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M16 10L13.5 14L11.5 12L8 16M8 10V16M16 16V14"
              stroke={isPrimary ? 'white' : '#6B7280'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    }
    if (icon === 'class') {
      // Heartbeat/pulse icon for "Tổng số lớp"
      return (
        <div className="w-11 h-11 rounded-full bg-black/5 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12H7L10 6L14 18L17 12H21"
              stroke="#6B7280"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    }
    if (icon === 'student') {
      // Moon/night icon for "Tổng thiếu nhi"
      return (
        <div className="w-11 h-11 rounded-full bg-black/5 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C10.22 3 8.47 3.53 6.97 4.51C5.47 5.5 4.28 6.9 3.54 8.55C2.8 10.2 2.55 12.01 2.83 13.78C3.1 15.54 3.88 17.18 5.05 18.49C6.23 19.81 7.75 20.74 9.44 21.18C11.13 21.62 12.91 21.55 14.56 20.98C16.21 20.41 17.66 19.37 18.72 18C19.78 16.62 20.41 14.97 20.53 13.24"
              stroke="#6B7280"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M21 9C21 6.24 18.76 4 16 4C16 6.76 18.24 9 21 9Z"
              stroke="#6B7280"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    }
    if (icon === 'teacher') {
      // Water drop icon for "Giáo lý viên"
      return (
        <div className="w-11 h-11 rounded-full bg-black/5 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path
              d="M10.94 6.05C10.17 5.16 9.3 4.36 8.35 3.66C8.27 3.6 8.17 3.57 8.07 3.57C7.96 3.57 7.86 3.6 7.78 3.66C6.83 4.36 5.97 5.16 5.19 6.05C3.48 8.03 2.57 10.11 2.57 12.07C2.57 13.53 3.15 14.93 4.18 15.96C5.21 16.99 6.61 17.57 8.07 17.57C9.53 17.57 10.93 16.99 11.96 15.96C12.99 14.93 13.57 13.53 13.57 12.07C13.57 10.11 12.66 8.03 10.94 6.05Z"
              stroke="#6B7280"
              strokeWidth="1"
              transform="translate(0, -3)"
            />
          </svg>
        </div>
      )
    }
    return null
  }

  const handleClick = () => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`rounded-[15px] p-4 h-[120px] flex flex-col justify-between ${
        isPrimary
          ? 'bg-brand text-white'
          : 'bg-white border border-gray-100'
      } ${href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-start justify-between">
        <span className={`text-sm font-medium ${isPrimary ? 'text-white/80' : 'text-gray-500'}`}>
          {title}
        </span>
        {renderIcon()}
      </div>

      {/* Bottom row: Value and Chart */}
      <div className="flex items-end justify-between">
        <span className={`text-4xl font-bold ${isPrimary ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </span>
        {renderChart()}
      </div>
    </div>
  )
}
