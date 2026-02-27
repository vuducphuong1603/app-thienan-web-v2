'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAbsentStudents } from '@/lib/queries'

// Avatar color palette based on name initial
const avatarPalette: [string, string][] = [
  ['#FEE2E2', '#DC2626'], // rose
  ['#DBEAFE', '#2563EB'], // blue
  ['#D1FAE5', '#059669'], // emerald
  ['#EDE9FE', '#7C3AED'], // violet
  ['#FEF3C7', '#D97706'], // amber
  ['#CFFAFE', '#0891B2'], // cyan
  ['#FCE7F3', '#DB2777'], // pink
  ['#E0E7FF', '#4F46E5'], // indigo
]

function getAvatarColor(name: string): [string, string] {
  const code = name?.charCodeAt(0) || 0
  return avatarPalette[code % avatarPalette.length]
}

// Sparkle Icon (reused from ClassStats pattern)
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M10.6144 17.7956C10.277 18.5682 9.20776 18.5682 8.8704 17.7956L7.99275 15.7854C7.21171 13.9966 5.80589 12.5726 4.0523 11.7942L1.63658 10.7219C0.868536 10.381 0.868537 9.26368 1.63658 8.92276L3.97685 7.88394C5.77553 7.08552 7.20657 5.60881 7.97427 3.75892L8.8633 1.61673C9.19319 0.821768 10.2916 0.821766 10.6215 1.61673L11.5105 3.75894C12.2782 5.60881 13.7092 7.08552 15.5079 7.88394L17.8482 8.92276C18.6162 9.26368 18.6162 10.381 17.8482 10.7219L15.4325 11.7942C13.6789 12.5726 12.2731 13.9966 11.492 15.7854L10.6144 17.7956ZM4.53956 9.82234C6.8254 10.837 8.68402 12.5048 9.74238 14.7996C10.8008 12.5048 12.6594 10.837 14.9452 9.82234C12.6321 8.79557 10.7676 7.04647 9.74239 4.71088C8.71719 7.04648 6.85267 8.79557 4.53956 9.82234ZM19.4014 22.6899L19.6482 22.1242C20.0882 21.1156 20.8807 20.3125 21.8695 19.8732L22.6299 19.5353C23.0412 19.3526 23.0412 18.7549 22.6299 18.5722L21.9121 18.2532C20.8978 17.8026 20.0911 16.9698 19.6586 15.9269L19.4052 15.3156C19.2285 14.8896 18.6395 14.8896 18.4628 15.3156L18.2094 15.9269C17.777 16.9698 16.9703 17.8026 15.956 18.2532L15.2381 18.5722C14.8269 18.7549 14.8269 19.3526 15.2381 19.5353L15.9985 19.8732C16.9874 20.3125 17.7798 21.1156 18.2198 22.1242L18.4667 22.6899C18.6473 23.104 19.2207 23.104 19.4014 22.6899ZM18.3745 19.0469L18.937 18.4883L19.4878 19.0469L18.937 19.5898L18.3745 19.0469Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3.5 8.5L8.5 3.5M8.5 3.5H4.5M8.5 3.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface AbsentStudentsListProps {
  classId: string | undefined
  className?: string
}

export default function AbsentStudentsList({ classId, className: clsName }: AbsentStudentsListProps) {
  const router = useRouter()
  const [dayType, setDayType] = useState<'cn' | 'thu5'>('cn')
  const { data, isLoading } = useAbsentStudents(classId, dayType)

  const totalStudents = data?.totalStudents || 0
  const presentCount = data?.presentCount || 0
  const absentCount = data?.absentCount || 0
  const absentStudents = data?.absentStudents || []
  const presentPct = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0
  const absentPct = totalStudents > 0 ? (absentCount / totalStudents) * 100 : 0

  const getAge = (dob?: string) => {
    if (!dob) return null
    const birthDate = new Date(dob)
    return Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  return (
    <div className="bg-white dark:bg-white/10 rounded-[15px] p-4 border border-gray-100 dark:border-white/10 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-6 h-6 text-black dark:text-white flex-shrink-0" />
          <h3 className="text-lg font-semibold text-black dark:text-white leading-snug">
            Danh sách các em vắng đi lễ<br />và học giáo lý
          </h3>
        </div>
        <button
          onClick={() => router.push('/dashboard/performance')}
          className="w-[48px] h-[48px] bg-[#F6F6F6] dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          title="Xem hiệu suất lớp"
        >
          <ArrowIcon className="text-black dark:text-white" />
        </button>
      </div>

      {/* Class name + Day toggle */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        {clsName && (
          <div className="bg-[#F6F6F6] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{clsName}</span>
          </div>
        )}
        <div className="flex bg-[#F6F6F6] dark:bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setDayType('cn')}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
              dayType === 'cn'
                ? 'bg-brand text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            CN
          </button>
          <button
            onClick={() => setDayType('thu5')}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
              dayType === 'thu5'
                ? 'bg-brand text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            T5
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Stats summary */}
          <div className="space-y-1.5 mb-3 flex-shrink-0">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#666D80] dark:text-gray-400">Tổng số</span>
              <span className="text-[11px] font-medium text-gray-900 dark:text-white">{totalStudents}</span>
            </div>

            {/* Present bar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#666D80] dark:text-gray-400 w-12 flex-shrink-0">Có mặt</span>
              <div className="flex-1 h-[8px] bg-[#E5E1DC] dark:bg-white/10 rounded-full overflow-hidden">
                {presentPct > 0 && (
                  <div className="h-full bg-[#FA865E] rounded-full" style={{ width: `${presentPct}%` }} />
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-900 dark:text-white w-6 text-right flex-shrink-0">{presentCount}</span>
            </div>

            {/* Absent bar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#666D80] dark:text-gray-400 w-12 flex-shrink-0">Vắng</span>
              <div className="flex-1 h-[8px] bg-[#E5E1DC] dark:bg-white/10 rounded-full overflow-hidden">
                {absentPct > 0 && (
                  <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${absentPct}%` }} />
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-900 dark:text-white w-6 text-right flex-shrink-0">{absentCount}</span>
            </div>
          </div>

          {/* Absent students list - scrollable */}
          <div className="flex-1 overflow-y-scroll min-h-0 -mx-4 px-4">
            {absentStudents.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500">
                Không có em nào vắng
              </div>
            ) : (
              absentStudents.map((student, index) => {
                const age = getAge(student.date_of_birth)
                const initial = student.full_name?.charAt(0) || '?'
                const [bgColor, textColor] = getAvatarColor(student.full_name || '')
                return (
                  <div key={student.id}>
                    {index > 0 && <div className="border-t border-gray-100 dark:border-white/10" />}
                    <div className="flex items-center gap-3 py-2.5">
                      {/* Colored Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {student.saint_name ? `${student.saint_name} ` : ''}{student.full_name}
                        </p>
                        {student.student_code && (
                          <p className="text-[10px] text-[#666D80] dark:text-gray-400">{student.student_code}</p>
                        )}
                      </div>

                      {/* Age badge */}
                      {age && (
                        <span className="bg-brand/10 text-brand text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0">
                          {age}t
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
