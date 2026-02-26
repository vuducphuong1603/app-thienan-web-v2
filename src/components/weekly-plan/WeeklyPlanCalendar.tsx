'use client'

import EventCard, { type EventData } from './EventCard'

// Avatar image URLs for realistic look
const avatarImages = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=80&h=80&fit=crop&crop=face',
]

// Mock data matching the Figma design
const mockEvents: (EventData & { day: number; timeSlot: number })[] = [
  // Monday (Thứ 2) - 8 AM: Weekly Stand Up with Join
  {
    id: '1',
    title: 'Weekly Stand Up',
    timeStart: '8 AM',
    timeEnd: '9 AM',
    type: 'meeting',
    status: 'join',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
      { src: avatarImages[2], color: '#34A853' },
      { src: avatarImages[3], color: '#FBBC04' },
    ],
    day: 0,
    timeSlot: 0,
  },
  // Tuesday (Thứ 3) - 1 PM: Weekly Stand Up
  {
    id: '2',
    title: 'Weekly Stand Up',
    timeStart: '8 AM',
    timeEnd: '9 AM',
    type: 'meeting',
    status: 'join',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
      { src: avatarImages[2], color: '#34A853' },
      { src: avatarImages[3], color: '#FBBC04' },
    ],
    day: 1,
    timeSlot: 1,
  },
  // Thursday (Thứ 5) - 8 AM: Weekly Stand Up with Join
  {
    id: '3',
    title: 'Weekly Stand Up',
    timeStart: '8 AM',
    timeEnd: '9 AM',
    type: 'meeting',
    status: 'join',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#34A853' },
      { src: avatarImages[2], color: '#FBBC04' },
    ],
    day: 3,
    timeSlot: 0,
  },
  // Monday (Thứ 2) - 5 PM: Sprint Planning Upcoming
  {
    id: '4',
    title: 'Sprint Planning',
    timeStart: '9:30 AM',
    timeEnd: '10:30 AM',
    type: 'planning',
    status: 'upcoming',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
    ],
    day: 0,
    timeSlot: 2,
  },
  // Wednesday (Thứ 4) - 5 PM: Sprint Planning Upcoming
  {
    id: '5',
    title: 'Sprint Planning',
    timeStart: '9:30 AM',
    timeEnd: '10:30 AM',
    type: 'planning',
    status: 'upcoming',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
    ],
    day: 2,
    timeSlot: 2,
  },
  // Friday (Thứ 6) - 1 PM: Sprint Planning Upcoming
  {
    id: '6',
    title: 'Sprint Planning',
    timeStart: '9:30 AM',
    timeEnd: '10:30 AM',
    type: 'planning',
    status: 'upcoming',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
      { src: avatarImages[2], color: '#34A853' },
    ],
    day: 4,
    timeSlot: 1,
  },
  // Saturday (Thứ 7) - 5 PM: Weekly Stand Up with Join
  {
    id: '7',
    title: 'Weekly Stand Up',
    timeStart: '8 AM',
    timeEnd: '9 AM',
    type: 'meeting',
    status: 'join',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
      { src: avatarImages[2], color: '#34A853' },
    ],
    day: 5,
    timeSlot: 2,
  },
  // Sunday (Chủ nhật) - 8 AM: Sprint Planning Upcoming
  {
    id: '8',
    title: 'Sprint Planning',
    timeStart: '9:30 AM',
    timeEnd: '10:30 AM',
    type: 'planning',
    status: 'upcoming',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
    ],
    day: 6,
    timeSlot: 0,
  },
  // Sunday (Chủ nhật) - 5 PM: Weekly Stand Up with Join
  {
    id: '9',
    title: 'Weekly Stand Up',
    timeStart: '8 AM',
    timeEnd: '9 AM',
    type: 'meeting',
    status: 'join',
    avatars: [
      { src: avatarImages[0], color: '#FA865E' },
      { src: avatarImages[1], color: '#4285F4' },
      { src: avatarImages[2], color: '#34A853' },
    ],
    day: 6,
    timeSlot: 2,
  },
]

const dayHeaders = [
  { label: 'Thứ 2', date: '06' },
  { label: 'Thứ 3', date: '07' },
  { label: 'Thứ 4', date: '08' },
  { label: 'Thứ 5', date: '09' },
  { label: 'Thứ 6', date: '10' },
  { label: 'Thứ 7', date: '11' },
  { label: 'Chủ nhật', date: '12' },
]

const timeSlots = ['8 AM', '1 PM', '5 PM']

function getEventsForCell(day: number, timeSlot: number) {
  return mockEvents.filter((e) => e.day === day && e.timeSlot === timeSlot)
}

export default function WeeklyPlanCalendar() {
  return (
    <div className="bg-white dark:bg-white/5 rounded-[20px] border border-[#E5E1DC] dark:border-white/10 overflow-hidden">
      {/* Header Row */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)]">
        {/* GMT +7 cell */}
        <div className="px-3 py-4 border-b border-r border-[#E5E1DC] dark:border-white/10 bg-[#FAFAF8] dark:bg-transparent">
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">GMT +7</span>
        </div>
        {/* Day headers */}
        {dayHeaders.map((day, index) => (
          <div
            key={index}
            className={`px-4 py-4 border-b border-[#E5E1DC] dark:border-white/10 bg-[#FAFAF8] dark:bg-transparent ${
              index < dayHeaders.length - 1 ? 'border-r' : ''
            }`}
          >
            <span className="text-[13px] font-medium text-gray-800 dark:text-white">
              {day.label}, <span className="text-gray-400 dark:text-gray-500">{day.date}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Time Rows */}
      {timeSlots.map((time, timeIndex) => (
        <div key={timeIndex} className="grid grid-cols-[80px_repeat(7,1fr)]">
          {/* Time label */}
          <div
            className={`px-4 py-4 border-r border-[#E5E1DC] dark:border-white/10 ${
              timeIndex < timeSlots.length - 1 ? 'border-b' : ''
            }`}
          >
            <span className="text-[13px] font-semibold text-gray-800 dark:text-white">{time}</span>
          </div>
          {/* Day cells */}
          {dayHeaders.map((_, dayIndex) => {
            const events = getEventsForCell(dayIndex, timeIndex)
            return (
              <div
                key={dayIndex}
                className={`p-2.5 min-h-[200px] ${
                  dayIndex < dayHeaders.length - 1 ? 'border-r' : ''
                } ${timeIndex < timeSlots.length - 1 ? 'border-b' : ''} border-[#E5E1DC] dark:border-white/10`}
              >
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
