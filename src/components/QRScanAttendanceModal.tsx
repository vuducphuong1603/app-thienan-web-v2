'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { X, Camera, CameraOff, CheckCircle2, Clock, XCircle, Users, ScanLine, Search, UserPlus, Phone, Loader2 } from 'lucide-react'
import { supabase, SchoolYear, UserProfile } from '@/lib/supabase'
import { todayForAttendance } from '@/lib/debug-date'
import { recalcAttendanceCount } from '@/lib/attendance-count'
import { SundaySession, SUNDAY_SESSION_LABELS, SUNDAY_SESSIONS, holidayDayTypesFor, DayType } from '@/lib/sunday-attendance'
import { BookOpen, Church } from 'lucide-react'
import { parseStudentCode, getScanTarget, shouldThrottleScan, splitSearchWords, studentSearchOrFilter, mapRestoredScanEntry, RestoredAttendanceRecord } from '@/lib/qr-attendance'

type ScanEntry = {
  id: string
  studentName: string
  studentCode: string
  className: string
  time: string
  status: 'success' | 'duplicate' | 'not_found'
}

type Feedback = {
  type: 'success' | 'duplicate' | 'not_found' | null
  message: string
}

type ManualStudent = {
  id: string
  full_name: string
  saint_name: string | null
  student_code: string | null
  class_id: string
  className: string
  parent_phone: string | null
}

interface QRScanAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  schoolYear: SchoolYear | null | undefined
  user: UserProfile | null
  /** Gọi khi đóng modal nếu có ít nhất 1 lượt điểm danh thành công */
  onAttendanceMarked?: () => void
}

export default function QRScanAttendanceModal({
  isOpen,
  onClose,
  schoolYear,
  user,
  onAttendanceMarked,
}: QRScanAttendanceModalProps) {
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [feedback, setFeedback] = useState<Feedback>({ type: null, message: '' })
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([])
  const [scanCount, setScanCount] = useState(0)
  const [holidayName, setHolidayName] = useState<string | null>(null)

  // Điểm danh thủ công
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<ManualStudent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [manualMarking, setManualMarking] = useState<string | null>(null)
  const [markedStudents, setMarkedStudents] = useState<Set<string>>(new Set())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Chủ nhật: phải chọn buổi (học giáo lý / đi lễ) trước khi điểm danh
  const [sundaySession, setSundaySession] = useState<SundaySession | null>(null)
  const sessionRef = useRef<SundaySession | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lastDecodeRef = useRef(0)
  const scanLockRef = useRef(false)
  const recentScansRef = useRef<Map<string, number>>(new Map())
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successCountRef = useRef(0)

  const scanTarget = useRef(getScanTarget(todayForAttendance()))

  const pad = (n: number) => n.toString().padStart(2, '0')

  const showFeedback = useCallback((type: Feedback['type'], message: string, resumeDelay = 1500) => {
    setFeedback({ type, message })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback({ type: null, message: '' })
      scanLockRef.current = false
    }, resumeDelay)
  }, [])

  // Đồng bộ lại số buổi điểm danh trong thieu_nhi (giống điểm danh thủ công)
  const updateAttendanceCount = useCallback(async (studentId: string) => {
    await recalcAttendanceCount(studentId, schoolYear?.id)
  }, [schoolYear?.id])

  /** day_type thực tế để ghi: CN thì theo buổi đã chọn, T5 giữ nguyên */
  const resolveDayType = (): DayType | null => {
    const { dayType } = scanTarget.current
    if (dayType === 'cn') return sessionRef.current
    return dayType
  }

  const handleDecoded = useCallback((raw: string) => {
    if (scanLockRef.current) return
    const studentCode = parseStudentCode(raw)
    if (!studentCode) return
    const dayType = resolveDayType()
    if (!dayType) return
    if (shouldThrottleScan(studentCode, recentScansRef.current, Date.now())) return

    scanLockRef.current = true

    const d = new Date()
    const timeNow = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const timeDisplay = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const { dateStr } = scanTarget.current

    const run = async () => {
      try {
        const { data: student, error: lookupError } = await supabase
          .from('thieu_nhi')
          .select('id, full_name, saint_name, student_code, class_id, classes(name)')
          .eq('student_code', studentCode)
          .maybeSingle()

        if (lookupError) {
          showFeedback('not_found', 'Lỗi kết nối. Thử lại.')
          return
        }

        if (!student) {
          setScanHistory(prev => [{
            id: `${Date.now()}`,
            studentName: 'Không xác định',
            studentCode,
            className: '',
            time: timeDisplay,
            status: 'not_found' as const,
          }, ...prev.slice(0, 4)])
          showFeedback('not_found', `Mã QR không đúng: ${studentCode}`)
          return
        }

        const className = (student as { classes?: { name?: string } | null }).classes?.name || ''
        const displayName = `${student.saint_name ? `${student.saint_name} ` : ''}${student.full_name}`

        const { data: existing } = await supabase
          .from('attendance_records')
          .select('id, check_in_time')
          .eq('attendance_date', dateStr)
          .eq('day_type', dayType)
          .eq('student_id', student.id)
          .maybeSingle()

        if (existing) {
          setScanHistory(prev => [{
            id: `${Date.now()}`,
            studentName: displayName,
            studentCode: student.student_code || studentCode,
            className,
            time: timeDisplay,
            status: 'duplicate' as const,
          }, ...prev.slice(0, 4)])
          showFeedback('duplicate', `${student.full_name} đã điểm danh lúc ${existing.check_in_time?.substring(0, 5) || '--:--'}`)
          return
        }

        const insertData: Record<string, unknown> = {
          student_id: student.id,
          class_id: student.class_id,
          attendance_date: dateStr,
          day_type: dayType,
          status: 'present',
          check_in_time: timeNow,
          check_in_method: 'qr_scan',
        }
        if (user?.id) insertData.created_by = user.id
        if (schoolYear?.id) insertData.school_year_id = schoolYear.id

        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert(insertData)

        if (insertError) {
          if (insertError.code === '23505') {
            showFeedback('duplicate', `${student.full_name} đã được điểm danh rồi`)
          } else {
            showFeedback('not_found', `Lỗi lưu: ${insertError.message}`)
          }
          return
        }

        setScanHistory(prev => [{
          id: `${Date.now()}`,
          studentName: displayName,
          studentCode: student.student_code || studentCode,
          className,
          time: timeDisplay,
          status: 'success' as const,
        }, ...prev.slice(0, 4)])
        setScanCount(c => c + 1)
        successCountRef.current += 1
        showFeedback('success', `Đã điểm danh: ${student.full_name}`, 800)
        updateAttendanceCount(student.id)
      } catch {
        showFeedback('not_found', 'Có lỗi xảy ra. Thử lại.')
      }
    }
    run()
  }, [schoolYear?.id, user?.id, showFeedback, updateAttendanceCount])

  // --- Điểm danh thủ công: tìm kiếm theo tên / tên thánh / mã ---
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (text.trim().length < 2) {
      setSearchResults([])
      return
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        let query = supabase
          .from('thieu_nhi')
          .select('id, full_name, saint_name, student_code, class_id, parent_phone, classes(name)')
          .eq('status', 'ACTIVE')

        // Tìm lớp có tên khớp từ khóa để hỗ trợ tìm theo lớp
        const words = splitSearchWords(text)
        const { data: classRows } = await supabase
          .from('classes')
          .select('id, name')
          .or(words.map(w => `name.ilike.%${w.replace(/[,()]/g, '')}%`).join(','))
        for (const word of words) {
          const lw = word.toLowerCase()
          const classIds = (classRows || [])
            .filter(c => (c.name as string).toLowerCase().includes(lw))
            .map(c => c.id as string)
          query = query.or(studentSearchOrFilter(word, classIds))
        }

        const { data, error } = await query.order('full_name').limit(20)

        if (!error && data) {
          const { dateStr } = scanTarget.current
          const dayType = resolveDayType()
          const studentIds = data.map((s) => s.id)
          const { data: attendanceData } = dayType
            ? await supabase
                .from('attendance_records')
                .select('student_id')
                .eq('attendance_date', dateStr)
                .eq('day_type', dayType)
                .in('student_id', studentIds)
            : { data: null }

          if (attendanceData) {
            setMarkedStudents(prev => {
              const next = new Set(prev)
              attendanceData.forEach((r) => next.add(r.student_id as string))
              return next
            })
          }

          setSearchResults(data.map((s) => ({
            id: s.id as string,
            full_name: s.full_name as string,
            saint_name: (s.saint_name as string | null) ?? null,
            student_code: (s.student_code as string | null) ?? null,
            class_id: s.class_id as string,
            className: (s as { classes?: { name?: string } | null }).classes?.name || '',
            parent_phone: (s.parent_phone as string | null) ?? null,
          })))
        }
      } catch {
        // Bỏ qua lỗi tìm kiếm
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  const handleManualAttendance = useCallback(async (student: ManualStudent) => {
    if (manualMarking) return
    const dayType = resolveDayType()
    if (!dayType) {
      showFeedback('not_found', 'Vui lòng chọn buổi: Học giáo lý hoặc Đi lễ')
      return
    }
    setManualMarking(student.id)

    const d = new Date()
    const timeNow = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const timeDisplay = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const { dateStr } = scanTarget.current
    const displayName = `${student.saint_name ? `${student.saint_name} ` : ''}${student.full_name}`

    try {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id, check_in_time')
        .eq('attendance_date', dateStr)
        .eq('day_type', dayType)
        .eq('student_id', student.id)
        .maybeSingle()

      if (existing) {
        showFeedback('duplicate', `${student.full_name} đã điểm danh lúc ${existing.check_in_time?.substring(0, 5) || '--:--'}`)
        setMarkedStudents(prev => new Set(prev).add(student.id))
        return
      }

      const insertData: Record<string, unknown> = {
        student_id: student.id,
        class_id: student.class_id,
        attendance_date: dateStr,
        day_type: dayType,
        status: 'present',
        check_in_time: timeNow,
        check_in_method: 'manual',
      }
      if (user?.id) insertData.created_by = user.id
      if (schoolYear?.id) insertData.school_year_id = schoolYear.id

      const { error } = await supabase.from('attendance_records').insert(insertData)

      if (error) {
        if (error.code === '23505') {
          showFeedback('duplicate', `${student.full_name} đã được điểm danh rồi`)
          setMarkedStudents(prev => new Set(prev).add(student.id))
        } else {
          showFeedback('not_found', `Lỗi lưu: ${error.message}`)
        }
        return
      }

      setScanHistory(prev => [{
        id: `${Date.now()}`,
        studentName: displayName,
        studentCode: student.student_code || '',
        className: student.className,
        time: timeDisplay,
        status: 'success' as const,
      }, ...prev.slice(0, 4)])
      setScanCount(c => c + 1)
      successCountRef.current += 1
      setMarkedStudents(prev => new Set(prev).add(student.id))
      showFeedback('success', `Đã điểm danh: ${student.full_name}`, 800)
      updateAttendanceCount(student.id)
    } catch {
      showFeedback('not_found', 'Có lỗi xảy ra. Thử lại.')
    } finally {
      setManualMarking(null)
    }
  }, [manualMarking, schoolYear?.id, user?.id, showFeedback, updateAttendanceCount])

  // Vòng lặp giải mã QR từ khung hình video
  /** Khôi phục lịch sử / danh sách đã điểm danh của buổi đang chọn (sau reload hoặc đổi buổi) */
  const restoreForDayType = useCallback(async (dayType: DayType, isCancelled: () => boolean = () => false) => {
    const { dateStr } = scanTarget.current
    // Khôi phục dữ liệu điểm danh trong ngày (cả quét QR lẫn thủ công),
    // để reload / mở lại modal không làm "mất" dữ liệu đã điểm danh.
    // Lịch sử + bộ đếm chỉ lấy của CHÍNH người đang đăng nhập (created_by);
    // markedStudents vẫn lấy toàn bộ để chặn điểm danh trùng.
    let histQuery = supabase
      .from('attendance_records')
      .select('id, check_in_time, thieu_nhi(full_name, saint_name, student_code, classes(name))')
      .eq('attendance_date', dateStr)
      .eq('day_type', dayType)
      .in('check_in_method', ['qr_scan', 'manual'])
    let countQuery = supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('attendance_date', dateStr)
      .eq('day_type', dayType)
      .in('check_in_method', ['qr_scan', 'manual'])
    if (user?.id) {
      histQuery = histQuery.eq('created_by', user.id)
      countQuery = countQuery.eq('created_by', user.id)
    }
    const [{ data: hist }, { count: todayCount }, { data: markedRows }] = await Promise.all([
      histQuery.order('created_at', { ascending: false }).limit(5),
      countQuery,
      supabase
        .from('attendance_records')
        .select('student_id')
        .eq('attendance_date', dateStr)
        .eq('day_type', dayType),
    ])
    if (isCancelled()) return
    if (hist) {
      setScanHistory(hist.map((r) => mapRestoredScanEntry(r as unknown as RestoredAttendanceRecord)))
    }
    setScanCount(todayCount ?? hist?.length ?? 0)
    if (markedRows) {
      setMarkedStudents(new Set(markedRows.map((r) => r.student_id as string)))
    }

  }, [user?.id])

  const decodeLoop = useCallback(() => {
    const video = videoRef.current
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const now = performance.now()
      if (now - lastDecodeRef.current > 150 && !scanLockRef.current && resolveDayType()) {
        lastDecodeRef.current = now
        if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
        const canvas = canvasRef.current
        const scale = Math.min(1, 480 / video.videoWidth)
        canvas.width = Math.floor(video.videoWidth * scale)
        canvas.height = Math.floor(video.videoHeight * scale)
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code?.data) handleDecoded(code.data)
        }
      }
    }
    rafRef.current = requestAnimationFrame(decodeLoop)
  }, [handleDecoded])

  // Mở/đóng camera theo trạng thái modal
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    scanTarget.current = getScanTarget(todayForAttendance())
    successCountRef.current = 0
    setHolidayName(null)
    setScanHistory([])
    setScanCount(0)
    setFeedback({ type: null, message: '' })
    scanLockRef.current = false
    recentScansRef.current.clear()
    setSearchQuery('')
    setSearchFocused(false)
    setSearchResults([])
    setSearchLoading(false)
    setManualMarking(null)
    setMarkedStudents(new Set())
    setSundaySession(null)
    sessionRef.current = null

    const init = async () => {
      // Kiểm tra ngày nghỉ lễ cho ngày điểm danh mục tiêu
      const { dateStr, dayType } = scanTarget.current
      let holidayQuery = supabase
        .from('holidays')
        .select('name')
        .eq('holiday_date', dateStr)
        .in('day_type', holidayDayTypesFor(dayType))
      if (schoolYear?.id) holidayQuery = holidayQuery.eq('school_year_id', schoolYear.id)
      const { data: holiday } = await holidayQuery.maybeSingle()
      if (cancelled) return
      if (holiday) {
        setHolidayName(holiday.name)
        return
      }

      // Thứ 5: khôi phục ngay. Chủ nhật: khôi phục sau khi chọn buổi (chooseSession).
      if (dayType === 'thu5') await restoreForDayType(dayType, () => cancelled)

      // Khởi động camera
      setCameraStatus('loading')
      setErrorMessage('')
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ camera')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraStatus('active')
          rafRef.current = requestAnimationFrame(decodeLoop)
        }
      } catch (error: unknown) {
        if (cancelled) return
        setCameraStatus('error')
        const err = error as { name?: string; message?: string }
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Vui lòng cấp quyền truy cập camera')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('Không tìm thấy camera')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMessage('Camera đang được sử dụng bởi ứng dụng khác')
        } else {
          setErrorMessage(err.message || 'Không thể kết nối camera')
        }
      }
    }
    init()

    const videoEl = videoRef.current
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoEl) videoEl.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, retryKey, user?.id])

  // Giữ modal cố định khi bàn phím ảo mở (iOS Safari đẩy trang lên gây trống màn hình):
  // khoá cuộn body, co panel theo chiều cao visualViewport và kéo về vị trí 0
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const vv = window.visualViewport
    const syncViewport = () => {
      window.scrollTo(0, 0)
      const panel = panelRef.current
      if (!panel) return
      if (window.innerWidth < 640 && vv) {
        panel.style.height = `${vv.height}px`
        panel.style.transform = `translateY(${vv.offsetTop}px)`
      } else {
        panel.style.height = ''
        panel.style.transform = ''
      }
    }
    vv?.addEventListener('resize', syncViewport)
    vv?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
    return () => {
      document.body.style.overflow = prevOverflow
      vv?.removeEventListener('resize', syncViewport)
      vv?.removeEventListener('scroll', syncViewport)
      window.removeEventListener('resize', syncViewport)
    }
  }, [isOpen])

  const chooseSession = (session: SundaySession) => {
    if (sessionRef.current === session) return
    sessionRef.current = session
    setSundaySession(session)
    setScanHistory([])
    setScanCount(0)
    setMarkedStudents(new Set())
    setFeedback({ type: null, message: '' })
    scanLockRef.current = false
    recentScansRef.current.clear()
    restoreForDayType(session)
  }

  const handleSearchFocus = () => {
    setSearchFocused(true)
    // Sau khi bàn phím mở, kéo panel về đầu để ô tìm kiếm + kết quả luôn hiện phía trên bàn phím
    setTimeout(() => {
      window.scrollTo(0, 0)
      panelRef.current?.scrollTo({ top: 0 })
    }, 300)
  }

  const handleClose = () => {
    if (successCountRef.current > 0) onAttendanceMarked?.()
    onClose()
  }

  if (!isOpen) return null

  // Trên mobile: khi đang tìm kiếm thì thu gọn camera để ô tìm + kết quả không bị bàn phím che
  const searchActive = searchFocused || searchQuery.trim().length > 0

  const { dateStr, dayType } = scanTarget.current
  const dateDisplay = dateStr.split('-').reverse().join('/')

  const frameColor =
    feedback.type === 'success' ? 'border-[#22c55e]'
    : feedback.type === 'duplicate' ? 'border-[#f59e0b]'
    : feedback.type === 'not_found' ? 'border-[#ef4444]'
    : 'border-white'

  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div ref={panelRef} className="relative bg-[#0F172A] w-full h-full overflow-y-auto overscroll-contain p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:rounded-[24px] sm:w-[520px] sm:h-auto sm:max-w-[calc(100vw-32px)] sm:max-h-[calc(100vh-32px)] sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Quét QR điểm danh</h2>
            </div>
            <p className="text-sm text-[#94A3B8] mt-1">
              {dayType === 'cn' ? 'Chủ nhật' : 'Thứ 5'} ngày {dateDisplay}
              {dayType === 'cn' && sundaySession ? ` · ${SUNDAY_SESSION_LABELS[sundaySession]}` : ''} — quét QR hoặc tìm kiếm thủ công
            </p>
          </div>
          <div className="flex items-center gap-3">
            {scanCount > 0 && (
              <div className="flex items-center gap-1.5 bg-[#16A34A] rounded-full px-3 py-1.5">
                <Users className="w-3.5 h-3.5 text-white" />
                <span className="text-sm font-bold text-white">{scanCount}</span>
              </div>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {holidayName ? (
          <div className="rounded-[16px] bg-white/5 px-8 py-12 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-lg font-bold text-red-400 mb-2">Hôm nay là ngày nghỉ lễ</p>
            <p className="text-base text-[#CBD5E1] mb-2">{holidayName}</p>
            <p className="text-sm text-[#94A3B8]">
              Không thể điểm danh vào ngày nghỉ lễ. Vui lòng quay lại vào ngày học tiếp theo.
            </p>
          </div>
        ) : (
          <>
            {dayType === 'cn' && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">Chọn buổi điểm danh</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUNDAY_SESSIONS.map((session) => {
                    const active = sundaySession === session
                    const Icon = session === 'cn' ? BookOpen : Church
                    return (
                      <button
                        key={session}
                        type="button"
                        onClick={() => chooseSession(session)}
                        aria-pressed={active}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors border ${
                          active
                            ? 'bg-brand border-brand text-white'
                            : 'bg-white/5 border-white/10 text-[#CBD5E1] hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {SUNDAY_SESSION_LABELS[session]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Camera - thu gọn trên mobile khi đang tìm kiếm để bàn phím không che kết quả */}
            <div className={`relative w-full aspect-[4/3] rounded-[16px] overflow-hidden bg-black mb-4 ${searchActive ? 'hidden sm:block' : ''}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
              />

              {cameraStatus === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-white text-sm">Đang kết nối camera...</p>
                </div>
              )}

              {cameraStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <CameraOff className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-300 text-sm text-center mb-4">{errorMessage}</p>
                  <button
                    onClick={() => setRetryKey(k => k + 1)}
                    className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-orange-500 transition-colors flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Thử lại
                  </button>
                </div>
              )}

              {dayType === 'cn' && !sundaySession && cameraStatus !== 'error' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
                  <ScanLine className="w-8 h-8 text-brand mb-2" />
                  <p className="text-white text-sm font-semibold">Chọn buổi trước khi quét</p>
                  <p className="text-[#94A3B8] text-xs mt-1">Học giáo lý hoặc Đi lễ — mỗi buổi được nửa điểm Chủ nhật</p>
                </div>
              )}

              {cameraStatus === 'active' && (
                <>
                  {/* Khung quét */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-[200px] h-[200px]">
                      <div className={`absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 rounded-tl-lg transition-colors ${frameColor}`} />
                      <div className={`absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 rounded-tr-lg transition-colors ${frameColor}`} />
                      <div className={`absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 rounded-bl-lg transition-colors ${frameColor}`} />
                      <div className={`absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 rounded-br-lg transition-colors ${frameColor}`} />
                    </div>
                  </div>

                  {/* Banner phản hồi */}
                  {feedback.type && (
                    <div className={`absolute bottom-4 left-4 right-4 flex items-center gap-2.5 rounded-xl px-3.5 py-3 ${
                      feedback.type === 'success' ? 'bg-[#16A34A]/95'
                      : feedback.type === 'duplicate' ? 'bg-[#F59E0B]/95'
                      : 'bg-[#DC2626]/95'
                    }`}>
                      {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                      {feedback.type === 'duplicate' && <Clock className="w-4 h-4 text-white shrink-0" />}
                      {feedback.type === 'not_found' && <XCircle className="w-4 h-4 text-white shrink-0" />}
                      <span className="text-sm font-semibold text-white truncate">{feedback.message}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Điểm danh thủ công */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-brand" />
                <span className="text-sm font-bold text-white">Điểm danh thủ công</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5">
                <Search className="w-4 h-4 text-[#94A3B8] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Tìm tên, mã, lớp, SĐT phụ huynh..."
                  autoCorrect="off"
                  className="flex-1 bg-transparent text-base sm:text-sm text-white placeholder-[#64748B] outline-none"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                    className="shrink-0 text-[#64748B] hover:text-white transition-colors"
                    aria-label="Xóa tìm kiếm"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {searchLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  <span className="text-xs text-[#94A3B8]">Đang tìm kiếm...</span>
                </div>
              )}

              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-sm text-[#64748B] py-4">Không tìm thấy thiếu nhi nào</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 mt-2 sm:max-h-[240px] sm:overflow-y-auto pr-1">
                  {searchResults.map((student) => {
                    const isMarked = markedStudents.has(student.id)
                    const isMarking = manualMarking === student.id
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleManualAttendance(student)}
                        disabled={isMarking || isMarked || (dayType === 'cn' && !sundaySession)}
                        className="w-full flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2.5 text-left transition-colors disabled:cursor-default disabled:hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {student.saint_name ? `${student.saint_name} ` : ''}{student.full_name}
                          </p>
                          <p className="text-xs text-[#94A3B8] truncate">
                            {student.className}{student.student_code ? ` • ${student.student_code}` : ''}
                          </p>
                          {student.parent_phone && (
                            <p className="flex items-center gap-1 text-xs text-[#64748B] mt-0.5">
                              <Phone className="w-3 h-3 shrink-0" />
                              {student.parent_phone}
                            </p>
                          )}
                        </div>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isMarking ? 'bg-[#94A3B8]' : isMarked ? 'bg-white/10' : 'bg-[#16A34A]'
                        }`}>
                          {isMarking ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <CheckCircle2 className={`w-4 h-4 ${isMarked ? 'text-[#22c55e]' : 'text-white'}`} />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Lịch sử quét - ẩn trên mobile khi đang tìm kiếm */}
            <div className={`items-center justify-between mb-2 ${searchActive ? 'hidden sm:flex' : 'flex'}`}>
              <span className="text-sm font-bold text-white">Lịch sử điểm danh</span>
              <span className="text-xs text-[#94A3B8]">Hôm nay: {scanCount}</span>
            </div>
            <div className={`space-y-2 ${searchActive ? 'hidden sm:block' : ''}`}>
              {scanHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-5">
                  <ScanLine className="w-6 h-6 text-[#475569]" />
                  <span className="text-sm text-[#64748B]">Chưa có lượt điểm danh nào hôm nay</span>
                </div>
              ) : (
                scanHistory.map(scan => (
                  <div
                    key={scan.id}
                    className={`flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 border-l-[3px] ${
                      scan.status === 'success' ? 'border-[#22c55e]'
                      : scan.status === 'duplicate' ? 'border-[#f59e0b]'
                      : 'border-[#ef4444]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      {scan.status === 'success' && <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />}
                      {scan.status === 'duplicate' && <Clock className="w-4 h-4 text-[#f59e0b]" />}
                      {scan.status === 'not_found' && <XCircle className="w-4 h-4 text-[#ef4444]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{scan.studentName}</p>
                      <p className="text-xs text-[#94A3B8] truncate">
                        {scan.className}{scan.className && ' • '}{scan.studentCode}{scan.time && ` • ${scan.time}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
