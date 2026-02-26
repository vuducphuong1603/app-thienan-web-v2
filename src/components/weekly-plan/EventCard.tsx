'use client'

import { MoreHorizontal, Clock } from 'lucide-react'

export interface EventData {
  id: string
  title: string
  timeStart: string
  timeEnd: string
  type: 'meeting' | 'planning'
  status: 'join' | 'upcoming'
  avatars: { src?: string; color: string; initial?: string }[]
}

// Google Meet icon
function GoogleMeetIcon() {
  return (
    <div className="w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-[#00AC47] via-[#00897B] to-[#00AC47] flex items-center justify-center flex-shrink-0 shadow-sm">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="10" height="12" rx="1" fill="white"/>
        <path d="M14 10L19 7V17L14 14V10Z" fill="#FBBC04"/>
        <path d="M14 10L19 7V12L14 10Z" fill="#EA4335"/>
        <path d="M14 14L19 17V12L14 14Z" fill="#34A853"/>
        <rect x="4" y="6" width="5" height="6" fill="#4285F4"/>
        <rect x="9" y="6" width="5" height="6" fill="#EA4335"/>
        <rect x="4" y="12" width="5" height="6" fill="#0D652D"/>
        <rect x="9" y="12" width="5" height="6" fill="#E37400"/>
      </svg>
    </div>
  )
}

// Google Calendar icon
function GoogleCalendarIcon() {
  return (
    <div className="w-[38px] h-[38px] rounded-[10px] bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="white" stroke="#4285F4" strokeWidth="1.5"/>
        <rect x="3" y="3" width="18" height="6" rx="2" fill="#4285F4"/>
        <text x="12" y="18" textAnchor="middle" fill="#1A73E8" fontSize="9" fontWeight="bold">31</text>
      </svg>
    </div>
  )
}

// Google Meet small icon for button
function MeetSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M17 10.5V7C17 6.45 16.55 6 16 6H5C4.45 6 4 6.45 4 7V17C4 17.55 4.45 18 5 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="white"/>
    </svg>
  )
}

export default function EventCard({ event }: { event: EventData }) {
  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-[14px] p-3.5 shadow-[0px_1px_4px_rgba(0,0,0,0.06)] border border-gray-50 dark:border-white/5 h-full flex flex-col gap-2">
      {/* Top row: icon + menu */}
      <div className="flex items-start justify-between">
        {event.type === 'meeting' ? <GoogleMeetIcon /> : <GoogleCalendarIcon />}
        <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors -mr-1 -mt-0.5">
          <MoreHorizontal className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight mt-0.5">
        {event.title}
      </h4>

      {/* Time */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
          {event.timeStart} - {event.timeEnd}
        </span>
      </div>

      {/* Avatars */}
      <div className="flex items-center -space-x-2">
        {event.avatars.map((avatar, index) => (
          <div
            key={index}
            className="w-[28px] h-[28px] rounded-full border-[2px] border-white dark:border-[#2a2a2a] overflow-hidden flex-shrink-0"
            style={{ zIndex: event.avatars.length - index }}
          >
            {avatar.src ? (
              <img
                src={avatar.src}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[10px] font-medium text-white"
                style={{ backgroundColor: avatar.color }}
              >
                {avatar.initial || ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="mt-auto pt-0.5">
        {event.status === 'join' ? (
          <button className="flex items-center gap-1.5 px-3.5 py-[7px] bg-[#EA4335] rounded-[10px] text-white text-[11px] font-semibold hover:bg-[#d33426] transition-colors">
            <MeetSmallIcon />
            Join a Meeting
          </button>
        ) : (
          <span className="text-[13px] font-semibold text-brand">
            Upcoming
          </span>
        )}
      </div>
    </div>
  )
}
