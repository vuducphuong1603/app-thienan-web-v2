'use client'

interface AttendanceConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  studentName: string
  studentCode?: string
  studentAvatar?: string
  dateOfBirth?: string
  attendanceDate: string
  dayType: 'thu5' | 'cn'
  isLoading?: boolean
}

export default function AttendanceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  studentCode,
  studentAvatar,
  dateOfBirth,
  attendanceDate,
  dayType,
  isLoading = false,
}: AttendanceConfirmModalProps) {
  if (!isOpen) return null

  // Calculate age from date of birth
  const calculateAge = (dob?: string): number | null => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(dateOfBirth)

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }

  // Get day name
  const getDayName = (type: 'thu5' | 'cn') => {
    return type === 'thu5' ? 'Thứ Năm' : 'Chủ Nhật'
  }

  // Get session label
  const getSessionLabel = (type: 'thu5' | 'cn') => {
    return type === 'thu5' ? 'Thứ 5' : 'Chủ nhật'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[16px] w-[450px] px-8 pt-8 pb-8 shadow-xl">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-[66px] h-[66px] rounded-[12px] bg-[#E5E1DC] flex items-center justify-center overflow-hidden">
            {studentAvatar ? (
              <img
                src={studentAvatar}
                alt={studentName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-[#8B8685]">
                {studentName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Student Name */}
        <h2 className={`text-center text-lg font-bold text-black ${studentCode ? 'mb-1' : 'mb-6'}`}>
          {studentName}
        </h2>

        {/* Student Code */}
        {studentCode && (
          <p className="text-center text-sm text-black/40 mb-6">
            {studentCode}
          </p>
        )}

        {/* Attendance Info Card */}
        <div className="border border-[#E5E1DC] rounded-[16px] overflow-hidden mb-8">
          {/* Card Header */}
          <div className="px-5 py-4 border-b border-[#E5E1DC]">
            <p className="text-sm font-medium text-black">
              Điểm danh {getDayName(dayType)} ({formatDisplayDate(attendanceDate)})
            </p>
          </div>

          {/* Card Content - Info Badges */}
          <div className="px-5 py-4 flex items-center gap-40">
            {/* Age Badge */}
            {age !== null && (
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M5 7.83333L6 8.83333L9 5.83333M7 12.1667C4.05448 12.1667 1.66667 9.77885 1.66667 6.83333C1.66667 3.88781 4.05448 1.5 7 1.5C9.94552 1.5 12.3333 3.88781 12.3333 6.83333C12.3333 9.77885 9.94552 12.1667 7 12.1667Z"
                    stroke="#FA865E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm text-black">{age} tuổi</span>
              </div>
            )}

            {/* Session Badge */}
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5 7.83333L6 8.83333L9 5.83333M7 12.1667C4.05448 12.1667 1.66667 9.77885 1.66667 6.83333C1.66667 3.88781 4.05448 1.5 7 1.5C9.94552 1.5 12.3333 3.88781 12.3333 6.83333C12.3333 9.77885 9.94552 12.1667 7 12.1667Z"
                  stroke="#FA865E"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm text-black">Buổi: {getSessionLabel(dayType)}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-[56px] bg-[#F6F6F6] text-black text-base font-medium rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>

          {/* Confirm Button */}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-[56px] bg-brand text-white text-base font-medium rounded-full hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(13,13,18,0.06)]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Điểm danh'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
