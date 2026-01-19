'use client'

import { MoreHorizontal } from 'lucide-react'

interface WeeklyCalendarProps {
  currentWeek?: number
  activitiesCount?: number
}

interface DayData {
  day: string
  date: number
  hasRing: boolean
  ringColor?: string // hex color for the progress ring
  progress?: number // 0-100 for ring progress
}

const daysData: DayData[] = [
  { day: 'CN', date: 21, hasRing: true, ringColor: '#E5E1DC', progress: 0 },
  { day: 'T2', date: 22, hasRing: false },
  { day: 'T3', date: 23, hasRing: true, ringColor: '#FA865E', progress: 75 },
  { day: 'T4', date: 24, hasRing: false },
  { day: 'T5', date: 25, hasRing: true, ringColor: '#86D4FF', progress: 50 },
  { day: 'T6', date: 26, hasRing: false },
  { day: 'T7', date: 27, hasRing: true, ringColor: '#E178FF', progress: 60 },
]

// Progress bar component for stats
function ProgressBars({ filled, total, filledColor, emptyColor }: { filled: number; total: number; filledColor: string; emptyColor: string }) {
  return (
    <div className="flex flex-col gap-[2px] w-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-[2px] w-full"
          style={{ backgroundColor: i < (total - filled) ? emptyColor : filledColor }}
        />
      ))}
    </div>
  )
}

export default function WeeklyCalendar({ currentWeek = 3, activitiesCount = 3 }: WeeklyCalendarProps) {
  const radius = 27
  const circumference = 2 * Math.PI * radius

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-black">Kế hoạch tuần này</h3>
        <button className="w-[52px] h-[52px] bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Week Days Row */}
      <div className="flex items-start gap-[18px] mb-6">
        {daysData.map((item) => {
          if (item.hasRing) {
            // Day with progress ring
            const strokeDashoffset = item.progress
              ? circumference - (item.progress / 100) * circumference
              : circumference

            return (
              <div key={item.day} className="flex flex-col items-center gap-[5px] w-[62px]">
                <span className="text-xs text-black">{item.day}</span>
                <div className="relative w-[62px] h-[62px]">
                  {/* Progress Ring SVG */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 62 62">
                    {/* Background circle */}
                    <circle
                      cx="31"
                      cy="31"
                      r={radius}
                      fill="none"
                      stroke="#E5E1DC"
                      strokeWidth="4"
                    />
                    {/* Progress circle */}
                    {item.progress && item.progress > 0 && (
                      <circle
                        cx="31"
                        cy="31"
                        r={radius}
                        fill="none"
                        stroke={item.ringColor}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  {/* Inner Circle with Date */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[50px] h-[50px] rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-lg text-black">{item.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          } else {
            // Day without ring - just text
            return (
              <div key={item.day} className="flex flex-col items-center gap-[23px] w-8">
                <span className="text-xs text-black text-center w-full">{item.day}</span>
                <span className="text-lg text-black text-center w-full">{item.date}</span>
              </div>
            )
          }
        })}
      </div>

      {/* Main Content - Donut Chart and Stats */}
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-[243px] h-[243px] flex-shrink-0">
          {/* SVG Donut Chart */}
          <svg className="w-full h-full" viewBox="0 0 243 243" fill="none">
            {/* Background segments (gray) */}
            <path d="M215.062 185.652C218.732 188.169 223.772 187.246 226.04 183.417C235.846 166.861 241.6 148.177 242.775 128.894C244.115 106.925 239.461 85.0041 229.312 65.4737C219.163 45.9434 203.899 29.5369 185.151 18.0065C168.695 7.88607 150.098 1.85587 130.914 0.365171C126.477 0.0204249 122.825 3.61486 122.775 8.06454C122.725 12.5142 126.298 16.13 130.731 16.5197C146.993 17.9494 162.74 23.1423 176.709 31.733C192.97 41.7341 206.21 55.9646 215.013 72.9046C223.816 89.8446 227.852 108.858 226.69 127.913C225.693 144.281 220.891 160.152 212.715 174.282C210.486 178.134 211.392 183.136 215.062 185.652Z" fill="#E5E1DC"/>
            <path d="M31.8677 191.036C28.3517 193.763 27.6931 198.845 30.6478 202.172C41.3167 214.188 54.282 223.988 68.8088 230.98C85.7599 239.138 104.374 243.249 123.184 242.988C141.995 242.728 160.488 238.102 177.206 229.477C191.534 222.086 204.222 211.93 214.554 199.623C217.416 196.215 216.616 191.154 213.026 188.524C209.436 185.895 204.417 186.698 201.521 190.077C192.687 200.385 181.927 208.909 169.818 215.156C155.317 222.637 139.277 226.649 122.961 226.875C106.645 227.101 90.5003 223.536 75.7974 216.459C63.5194 210.55 52.5274 202.327 43.4113 192.268C40.4231 188.971 35.3837 188.308 31.8677 191.036Z" fill="#E5E1DC"/>
            <path d="M117.746 8.11953C117.598 3.672 113.869 0.158288 109.441 0.599959C90.4072 2.49845 72.0501 8.86924 55.8873 19.2397C37.4594 31.0637 22.5689 47.6475 12.7905 67.2378C3.01209 86.828 -1.29087 108.697 0.336596 130.531C1.76401 149.682 7.70695 168.182 17.6306 184.534C19.9392 188.338 24.9892 189.207 28.6321 186.651C32.2751 184.096 33.1271 179.085 30.8571 175.257C22.58 161.301 17.6183 145.587 16.4068 129.333C14.9952 110.395 18.7274 91.4266 27.2089 74.4347C35.6904 57.4427 48.6059 43.0584 64.5897 32.8027C78.3076 24.0009 93.8481 18.5208 109.977 16.7466C114.4 16.2601 117.893 12.5671 117.746 8.11953Z" fill="#E5E1DC"/>
            {/* Blue segment (Đang thực hiện) */}
            <path d="M130.855 234.556C131.222 238.991 135.121 242.316 139.522 241.656C154.029 239.48 168.046 234.691 180.883 227.5C193.72 220.308 205.124 210.856 214.557 199.62C217.418 196.212 216.618 191.151 213.028 188.522C209.438 185.893 204.419 186.695 201.523 190.074C193.478 199.462 183.83 207.378 173.007 213.441C162.184 219.504 150.395 223.598 138.188 225.556C133.794 226.26 130.488 230.121 130.855 234.556Z" fill="#86D4FF"/>
            {/* Purple segment (Chờ thực hiện) */}
            <path d="M9.08257 106.287C4.6728 105.69 0.586013 108.782 0.282672 113.221C-1.42456 138.208 4.63559 163.121 17.629 184.532C19.9377 188.336 24.988 189.205 28.6309 186.65C32.2739 184.094 33.1258 179.083 30.8559 175.255C20.1466 157.198 15.074 136.345 16.2926 115.386C16.5508 110.944 13.4923 106.884 9.08257 106.287Z" fill="#E178FF"/>
            {/* Orange segment (Hoàn thành) */}
            <path d="M215.029 185.7C218.698 188.218 223.739 187.298 226.009 183.47C235.83 166.908 241.594 148.211 242.774 128.915C244.118 106.932 239.462 84.9976 229.303 65.4566C219.144 45.9156 203.865 29.5034 185.1 17.9751C168.627 7.85555 150.012 1.83326 130.814 0.357411C126.377 0.0163422 122.728 3.6138 122.681 8.06352C122.635 12.5132 126.21 16.126 130.644 16.5121C146.919 17.9294 162.682 23.1157 176.664 31.7057C192.941 41.7051 206.194 55.9405 215.005 72.8897C223.816 89.8389 227.855 108.864 226.689 127.932C225.688 144.312 220.878 160.193 212.688 174.329C210.457 178.179 211.36 183.181 215.029 185.7Z" fill="#FA865E"/>
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Badge */}
            <div className="bg-[#6E62E5] text-white text-sm font-medium px-5 py-3.5 rounded-full mb-6">
              T3 23
            </div>

            {/* Week Info */}
            <div className="flex items-center gap-2 mb-1.5">
              {/* Apple Icon */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 13.333C20 11.667 21.445 8.333 25 8.333" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.0833 16.6667C12.9167 16.6667 10 20.8333 10 25C10 29.1667 12.9167 33.3333 16.6667 33.3333C18.3333 33.3333 19.1667 32.5 20 32.5C20.8333 32.5 21.6667 33.3333 23.3333 33.3333C27.0833 33.3333 30 29.1667 30 25C30 20.8333 27.0833 16.6667 22.9167 16.6667C21.6667 16.6667 20.8333 17.0833 20 17.0833C19.1667 17.0833 18.3333 16.6667 17.0833 16.6667Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[34px] font-medium text-black">Tuần {currentWeek}</span>
            </div>
            <span className="text-lg text-black/40">{activitiesCount} hoạt động</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-8">
          {/* Hoàn thành */}
          <div className="flex items-center gap-4">
            <ProgressBars filled={14} total={14} filledColor="#FA865E" emptyColor="#E5E1DC" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[22px] font-semibold text-black">100%</span>
              <span className="text-xs text-[#FA865E]">Hoàn thành</span>
            </div>
          </div>

          {/* Đang thực hiện */}
          <div className="flex items-center gap-4">
            <ProgressBars filled={8} total={14} filledColor="#86D4FF" emptyColor="#E5E1DC" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[22px] font-semibold text-black">50%</span>
              <span className="text-xs text-[#86D4FF]">Đang thực hiện</span>
            </div>
          </div>

          {/* Chờ thực hiện */}
          <div className="flex items-center gap-4">
            <ProgressBars filled={8} total={14} filledColor="#E178FF" emptyColor="#E5E1DC" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[22px] font-semibold text-black">0%</span>
              <span className="text-xs text-[#E178FF]">Chờ thực hiện</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
