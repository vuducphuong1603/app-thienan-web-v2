'use client'

import { TrendingUp, Users, Clock, Timer } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: 'branch' | 'class' | 'student' | 'teacher'
  variant?: 'primary' | 'default'
  chart?: 'line' | 'bar' | 'people' | 'wave'
}

export default function StatsCard({ title, value, icon = 'branch', variant = 'default', chart }: StatsCardProps) {
  const isPrimary = variant === 'primary'

  const renderChart = () => {
    if (chart === 'line') {
      return (
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
          <defs>
            <linearGradient id="lineGradient1" x1="0" y1="21.5" x2="120" y2="21.5" gradientUnits="userSpaceOnUse">
              <stop stopColor={isPrimary ? 'white' : '#FA865E'} stopOpacity="0"/>
              <stop offset="0.257" stopColor={isPrimary ? 'white' : '#FA865E'}/>
              <stop offset="0.527" stopColor={isPrimary ? 'white' : '#FA865E'}/>
              <stop offset="0.789" stopColor={isPrimary ? 'white' : '#FA865E'}/>
              <stop offset="1" stopColor={isPrimary ? 'white' : '#FA865E'} stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="lineGradient2" x1="0" y1="23.6" x2="120" y2="23.6" gradientUnits="userSpaceOnUse">
              <stop stopColor={isPrimary ? 'white' : '#FA865E'} stopOpacity="0"/>
              <stop offset="0.597" stopColor={isPrimary ? 'white' : '#FA865E'}/>
              <stop offset="1" stopColor={isPrimary ? 'white' : '#FA865E'} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* First wave line - goes up then down */}
          <path
            d="M0 27.7C20 -6.5 20 35.2 55 26.9C61 20.2 75 11.9 90 29.5C100 35 110 32 120 28"
            stroke="url(#lineGradient1)"
            strokeWidth="2.6"
            fill="none"
          />
          {/* Second wave line - goes down then up */}
          <path
            d="M0 24.3C35 49.2 28 -3.8 60 28.5C65 36.8 80 44.6 100 18.6C110 10 115 12 120 15"
            stroke="url(#lineGradient2)"
            strokeWidth="2.6"
            fill="none"
          />
          {/* Orange dot with white border */}
          <circle cx="35" cy="7.2" r="3.1" fill="#FA865E" stroke="white" strokeWidth="1"/>
        </svg>
      )
    }
    if (chart === 'bar') {
      // Bar chart matching Figma design - 8 bars with varying heights
      const bars = [
        { height: 4.8, filled: false },
        { height: 8.4, filled: false },
        { height: 13.2, filled: false },
        { height: 24, filled: true },
        { height: 36, filled: true },
        { height: 21.6, filled: true },
        { height: 14.4, filled: false },
        { height: 4.8, filled: false },
      ]
      const maxHeight = 36
      const barWidth = 10
      const barGap = 2

      return (
        <svg width="100" height="32" viewBox="0 0 100 36" fill="none">
          {bars.map((bar, i) => {
            const x = i * (barWidth + barGap)
            const height = (bar.height / maxHeight) * 32
            const y = 36 - height
            const fillColor = isPrimary
              ? bar.filled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
              : bar.filled ? '#FA865E' : '#E5E1DC'
            const rx = Math.min(height / 2, 4)

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={rx}
                fill={fillColor}
              />
            )
          })}
        </svg>
      )
    }
    if (chart === 'people') {
      // People chart pattern matching the SVG provided
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
      const fillColor = isPrimary ? 'rgba(255,255,255,0.8)' : '#FA865E'
      const emptyColor = isPrimary ? 'rgba(255,255,255,0.3)' : 'rgba(250,134,94,0.3)'

      return (
        <svg width="110" height="32" viewBox="0 0 145 34" fill="none">
          {people.map((p, i) => {
            const x = 5.3 + i * 13.2
            const color = p.filled ? fillColor : emptyColor
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={0}
                  width="2.56"
                  height={p.top}
                  rx="1.28"
                  fill={p.filled ? emptyColor : fillColor}
                />
                <rect
                  x={x}
                  y={p.top + 2}
                  width="2.56"
                  height={p.main}
                  rx="1.28"
                  fill={color}
                />
                <circle
                  cx={x + 1.28}
                  cy={31.4}
                  r="1.92"
                  fill={color}
                />
              </g>
            )
          })}
        </svg>
      )
    }
    if (chart === 'wave') {
      // Wave area chart with vertical indicator matching Figma design
      const fillColor = isPrimary ? 'rgba(255,255,255,0.5)' : 'rgba(250,134,94,0.5)'
      const strokeColor = isPrimary ? 'white' : '#FA865E'
      const pillFillStart = isPrimary ? 'rgba(255,255,255,0)' : 'rgba(250,134,94,0)'
      const pillFillEnd = isPrimary ? 'rgba(255,255,255,0.6)' : 'rgba(250,134,94,0.6)'

      return (
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
          <defs>
            <linearGradient id="waveGradient" x1="60" y1="0" x2="60" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor={isPrimary ? 'white' : '#FA865E'} stopOpacity="0.5"/>
              <stop offset="1" stopColor={isPrimary ? 'white' : '#FA865E'} stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="pillGradient" x1="95" y1="2" x2="95" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor={pillFillStart}/>
              <stop offset="1" stopColor={pillFillEnd}/>
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d="M0 7C15 20 18 -1 40 3C60 8 58 15 85 2C90 -0.5 100 -0.3 120 3.4L120 40L0 40Z"
            fill="url(#waveGradient)"
          />
          {/* Stroke line */}
          <path
            d="M0 7C15 20 18 -1 40 3C60 8 58 15 85 2C90 -0.5 100 -0.3 120 3.4"
            stroke={strokeColor}
            strokeWidth="0.6"
            fill="none"
          />
          {/* Vertical pill indicator */}
          <rect
            x="91"
            y="2"
            width="8"
            height="19"
            rx="4"
            fill="url(#pillGradient)"
          />
          {/* Circle dot at top of pill */}
          <circle
            cx="95"
            cy="5.5"
            r="1.5"
            fill={isPrimary ? 'white' : 'white'}
            stroke={strokeColor}
            strokeWidth="0.6"
          />
        </svg>
      )
    }
    return null
  }

  const renderIcon = () => {
    const iconColor = isPrimary ? 'rgba(255,255,255,0.7)' : '#9ca3af'
    switch (icon) {
      case 'branch':
        return <TrendingUp className="w-5 h-5" style={{ color: iconColor }} />
      case 'class':
        // Pulse/Activity line icon
        return (
          <svg width="20" height="20" viewBox="0 0 44 44" fill="none">
            <path
              d="M19.4601 18.2248L24.5371 30.0709L27.6335 22.846H31.3063V21.1537H26.5176L24.5371 25.7748L19.4601 13.9287L16.3637 21.1537H12.6909V22.846H17.4796L19.4601 18.2248Z"
              fill={iconColor}
            />
          </svg>
        )
      case 'student':
        return <Users className="w-5 h-5" style={{ color: iconColor }} />
      case 'teacher':
        return <Timer className="w-5 h-5" style={{ color: iconColor }} />
      default:
        return null
    }
  }

  return (
    <div
      className={`rounded-2xl p-4 ${
        isPrimary
          ? 'bg-gradient-to-br from-brand to-orange-400 text-white'
          : 'bg-white border border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-sm font-medium ${isPrimary ? 'text-white/90' : 'text-gray-500'}`}>
          {title}
        </span>
        <button className={`p-1.5 rounded-lg ${isPrimary ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}>
          {renderIcon()}
        </button>
      </div>

      <div className="flex items-end justify-between">
        <span className={`text-3xl font-bold ${isPrimary ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </span>
        {renderChart()}
      </div>
    </div>
  )
}
