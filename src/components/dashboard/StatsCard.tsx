'use client'

import { TrendingUp, Users, Clock, Timer } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: 'branch' | 'class' | 'student' | 'teacher'
  variant?: 'primary' | 'default'
  chart?: 'line' | 'bar' | 'people'
}

export default function StatsCard({ title, value, icon = 'branch', variant = 'default', chart }: StatsCardProps) {
  const isPrimary = variant === 'primary'

  const renderChart = () => {
    if (chart === 'line') {
      return (
        <svg className="w-24 h-10" viewBox="0 0 96 40">
          {/* Line chart with area fill */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPrimary ? 'rgba(255,255,255,0.4)' : 'rgba(250,134,94,0.4)'} />
              <stop offset="100%" stopColor={isPrimary ? 'rgba(255,255,255,0)' : 'rgba(250,134,94,0)'} />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d="M0 35 Q12 32, 24 28 T48 24 T72 18 T96 12 L96 40 L0 40 Z"
            fill="url(#lineGradient)"
          />
          {/* Line */}
          <path
            d="M0 35 Q12 32, 24 28 T48 24 T72 18 T96 12"
            fill="none"
            stroke={isPrimary ? 'rgba(255,255,255,0.8)' : '#FA865E'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )
    }
    if (chart === 'bar') {
      // Alternating orange and light orange bars matching Figma
      const bars = [
        { height: 16, filled: true },
        { height: 24, filled: false },
        { height: 14, filled: true },
        { height: 28, filled: false },
        { height: 18, filled: true },
        { height: 22, filled: false },
        { height: 12, filled: true },
        { height: 26, filled: false },
        { height: 20, filled: true },
      ]
      return (
        <div className="flex items-end gap-0.5 h-8">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-sm ${
                isPrimary
                  ? bar.filled ? 'bg-white/70' : 'bg-white/30'
                  : bar.filled ? 'bg-brand' : 'bg-brand/30'
              }`}
              style={{ height: `${bar.height}px` }}
            />
          ))}
        </div>
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
    return null
  }

  const renderIcon = () => {
    const iconClass = isPrimary ? 'text-white/70' : 'text-gray-400'
    switch (icon) {
      case 'branch':
        return <TrendingUp className={`w-5 h-5 ${iconClass}`} />
      case 'class':
        return <TrendingUp className={`w-5 h-5 ${iconClass}`} />
      case 'student':
        return <Users className={`w-5 h-5 ${iconClass}`} />
      case 'teacher':
        return <Timer className={`w-5 h-5 ${iconClass}`} />
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
