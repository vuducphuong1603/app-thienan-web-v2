'use client'

import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Search, User, Users, GraduationCap, CalendarCheck, Award, Eye, Phone, Mail } from 'lucide-react'
import { useClassDetail } from '@/lib/queries'
import { normalizeSearchText } from '@/lib/search'

const STATUS_BADGE_STYLES = {
  ACTIVE: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Đang học' },
  INACTIVE: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Nghỉ học' },
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('vi-VN')
}

function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-brand ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

export default function ViewClassPage() {
  const params = useParams()
  const classId = params.id as string
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, isError, error, refetch } = useClassDetail(classId)

  const trimmedQuery = searchQuery.trim()
  const searchNormalized = normalizeSearchText(trimmedQuery)
  // Chỉ dò số điện thoại khi người dùng gõ chuỗi dạng số, và bỏ mọi ký tự ngăn
  // cách để "0901 000 001" khớp với "0901000001"
  const searchDigits = /^[\d\s+.()-]+$/.test(trimmedQuery) ? trimmedQuery.replace(/\D/g, '') : ''

  const filteredStudents = useMemo(() => {
    const students = data?.students || []
    if (searchNormalized === '') return students
    return students.filter((s) => {
      // Ghép tên thánh + họ tên để gõ "Maria Nguyễn" khớp đúng như bảng hiển thị
      const fullNameWithSaint = normalizeSearchText(
        `${s.saint_name ?? ''} ${s.full_name ?? ''}`.trim()
      )
      return (
        fullNameWithSaint.includes(searchNormalized) ||
        normalizeSearchText(s.student_code || '').includes(searchNormalized) ||
        normalizeSearchText(s.parent_name || '').includes(searchNormalized) ||
        (searchDigits.length >= 3 && (s.parent_phone || '').replace(/\D/g, '').includes(searchDigits))
      )
    })
  }, [data?.students, searchNormalized, searchDigits])

  if (isLoading) {
    return (
      <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-[#666d80]">Đang tải...</span>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl min-h-[calc(100vh-140px)] flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">
          Không tải được thông tin lớp: {(error as Error)?.message || 'Không tìm thấy lớp'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-brand text-white text-sm rounded-xl hover:bg-orange-500 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => router.push('/admin/management/classes')}
            className="px-4 py-2 bg-white dark:bg-white/10 text-black dark:text-white text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    )
  }

  const { classInfo, teachers, activeCount, inactiveCount, classAvg, attendance } = data
  const totalCount = data.students.length

  return (
    <div className="bg-[#F6F6F6] dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => router.push('/admin/management/classes')}
              className="flex items-center gap-1.5 text-[#666d80] hover:text-black dark:hover:text-white transition-colors w-fit"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">Quay trở lại</span>
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black dark:text-white leading-tight">
              Chi tiết lớp học
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/admin/management/classes?edit=${classInfo.id}`)}
              className="h-10 px-6 bg-brand rounded-full text-sm font-bold text-white hover:bg-orange-500 transition-colors"
            >
              Chỉnh sửa
            </button>
            <button
              onClick={() => router.push('/admin/management/classes')}
              className="h-10 px-6 bg-white dark:bg-white/10 rounded-full text-sm font-bold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      <div className="mx-4 sm:mx-6 mb-6 flex flex-col gap-4">
        {/* Class Summary Card */}
        <div className="bg-white dark:bg-white/10 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-[72px] h-[72px] rounded-2xl bg-brand/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-9 h-9 text-brand" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-black dark:text-white">{classInfo.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-brand/10 text-brand">
                  Ngành {classInfo.branch}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                    classInfo.status === 'ACTIVE' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'
                  }`}
                >
                  {classInfo.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F6F6F6] dark:bg-white/10 text-[#8B8685]">
                  Tạo ngày {formatDate(classInfo.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Stat Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="bg-[#F6F6F6] dark:bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#666d80]">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Sĩ số</span>
              </div>
              <span className="text-2xl font-bold text-black dark:text-white">{totalCount}</span>
              {/* Hiện đủ ba con số. Trước đây ô này chỉ hiện số em đang học, còn dòng
                  "Hiển thị x/y thiếu nhi" ở khối danh sách lại đếm cả em nghỉ học — hai
                  số lệch nhau mà không chỗ nào giải thích. Nay số lớn là tổng nên khớp
                  với dòng đó, và phần tách đang học / nghỉ học nằm ngay bên dưới. */}
              <span className="text-xs text-[#8B8685]">
                {activeCount} đang học · {inactiveCount} nghỉ học
              </span>
            </div>

            <div className="bg-[#F6F6F6] dark:bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#666d80]">
                <User className="w-4 h-4" />
                <span className="text-xs font-medium">Giáo lý viên</span>
              </div>
              <span className="text-2xl font-bold text-black dark:text-white">{teachers.length}</span>
              <span className="text-xs text-[#8B8685]">người phụ trách</span>
            </div>

            <div className="bg-[#F6F6F6] dark:bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#666d80]">
                <CalendarCheck className="w-4 h-4" />
                <span className="text-xs font-medium">Điểm danh gần nhất</span>
              </div>
              <span className="text-2xl font-bold text-black dark:text-white">
                {attendance.rateThu5}% <span className="text-sm font-medium text-[#8B8685]">/ {attendance.rateCn}%</span>
              </span>
              <span className="text-xs text-[#8B8685]">
                T5 {formatDate(attendance.lastThu5)} · CN {formatDate(attendance.lastCN)}
              </span>
            </div>

            <div className="bg-[#F6F6F6] dark:bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#666d80]">
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium">Điểm TB lớp</span>
              </div>
              <span className="text-2xl font-bold text-brand">{classAvg.toFixed(1)}</span>
              <span className="text-xs text-[#8B8685]">TB Giáo lý × 0.6 + TB Điểm danh × 0.4</span>
            </div>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="bg-white dark:bg-white/10 rounded-3xl p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-black dark:text-white">Giáo lý viên phụ trách</h2>
            <p className="text-xs text-[#666d80] mt-1">{teachers.length} giáo lý viên được phân công cho lớp này</p>
          </div>

          {teachers.length === 0 ? (
            <p className="text-sm text-primary-3 py-6 text-center">Chưa có giáo lý viên nào được phân công</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {teachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => router.push(`/admin/management/users/${teacher.id}/view`)}
                  className="flex items-center gap-3 p-3 bg-[#F6F6F6] dark:bg-white/5 rounded-2xl text-left hover:bg-[#EFEFEF] dark:hover:bg-white/10 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-[#E5E1DC] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {teacher.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-primary-3">
                        {teacher.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">
                      {teacher.saint_name ? `${teacher.saint_name} ` : ''}
                      {teacher.full_name}
                    </p>
                    <p className="text-xs text-[#666d80] flex items-center gap-1 truncate">
                      {teacher.phone ? (
                        <>
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {teacher.phone}
                        </>
                      ) : teacher.email ? (
                        <>
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {teacher.email}
                        </>
                      ) : (
                        'Chưa có liên hệ'
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Students Card */}
        <div className="bg-white dark:bg-white/10 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">Danh sách thiếu nhi</h2>
              <p className="text-xs text-[#666d80] mt-1">
                Hiển thị {filteredStudents.length}/{data.students.length} thiếu nhi
              </p>
            </div>
            <div className="flex items-center gap-2 h-[42px] px-3 bg-[#F6F6F6] dark:bg-white/5 rounded-xl w-full sm:w-[300px]">
              <Search className="w-5 h-5 text-primary-3" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã, phụ huynh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-full bg-transparent text-sm text-black dark:text-white placeholder:text-primary-3 border-none focus:outline-none"
              />
            </div>
          </div>

          {data.students.length === 0 ? (
            <p className="text-sm text-primary-3 py-8 text-center">Lớp này chưa có thiếu nhi nào</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-sm text-primary-3 py-8 text-center">Không tìm thấy thiếu nhi phù hợp</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                {/* Table Header */}
                <div className="grid grid-cols-[50px_1.7fr_110px_1.3fr_110px_90px_110px_70px] gap-3 px-3 py-3 bg-[#FAFAFA] dark:bg-white/5 rounded-xl">
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">STT</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Họ và tên</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Ngày sinh</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider">Phụ huynh</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider text-center">Điểm danh</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider text-center">TB</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider text-center">Trạng thái</div>
                  <div className="text-xs font-semibold text-primary-3 uppercase tracking-wider text-center">Xem</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-[#E5E1DC] dark:divide-white/10">
                  {filteredStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="grid grid-cols-[50px_1.7fr_110px_1.3fr_110px_90px_110px_70px] gap-3 px-3 py-3 items-center hover:bg-[#FAFAFA] dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="text-sm text-primary-3">{index + 1}</div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#F5EAF6] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {student.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-[#C4B5C7]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">
                            {student.saint_name ? `${student.saint_name} ` : ''}
                            {student.full_name}
                          </p>
                          <p className="text-xs text-primary-3 truncate">{student.student_code || '-'}</p>
                        </div>
                      </div>

                      <div className="text-sm text-primary-3">{formatDate(student.date_of_birth)}</div>

                      <div className="min-w-0">
                        <p className="text-sm text-black dark:text-white truncate">{student.parent_name || '-'}</p>
                        <p className="text-xs text-primary-3 truncate">{student.parent_phone || '-'}</p>
                      </div>

                      <div className="text-sm text-primary-3 text-center">
                        {student.attendance_thu5 || 0} / {student.attendance_cn || 0}
                      </div>

                      <div className="text-sm font-semibold text-brand text-center">{student.totalAvg.toFixed(1)}</div>

                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            STATUS_BADGE_STYLES[student.status].bg
                          } ${STATUS_BADGE_STYLES[student.status].text}`}
                        >
                          {STATUS_BADGE_STYLES[student.status].label}
                        </span>
                      </div>

                      <div className="flex justify-center">
                        <button
                          onClick={() => router.push(`/admin/management/students/${student.id}/view`)}
                          className="w-8 h-8 rounded-lg bg-[#F6F6F6] dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                          title="Xem chi tiết thiếu nhi"
                        >
                          <Eye className="w-4 h-4 text-primary-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
