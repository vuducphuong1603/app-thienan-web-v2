'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { X, Camera, CameraOff, CheckCircle2, Clock, XCircle, Users, ScanLine, Search, UserPlus, Phone, Loader2, ChevronDown, Undo2 } from 'lucide-react'
import { supabase, SchoolYear, UserProfile, Class } from '@/lib/supabase'
import { getBranchScope, filterByBranch } from '@/lib/branch-scope'
import { todayForAttendance } from '@/lib/debug-date'
import { recalcAttendanceCount } from '@/lib/attendance-count'
import { playFeedback, primeAudio } from '@/lib/attendance-feedback'
import { SundaySession, SUNDAY_SESSION_LABELS, SUNDAY_SESSIONS, holidayDayTypesFor, DayType } from '@/lib/sunday-attendance'
import { BookOpen, Church } from 'lucide-react'
import { parseStudentCode, decodeQrText, getScanTarget, shouldThrottleScan, splitSearchWords, studentSearchOrFilter, matchesStudentSearch, mapRestoredScanEntry, RestoredAttendanceRecord, removeStudentFromHistory, shouldRunManualSearch, manualSearchLimit } from '@/lib/qr-attendance'

type ScanEntry = {
  id: string
  /** id thiếu nhi — dùng để gỡ khỏi lịch sử khi hủy điểm danh */
  studentId?: string
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

/** Đối tượng cần hủy điểm danh: dùng chung cho kết quả tìm kiếm lẫn lịch sử quét */
type UnmarkTarget = {
  id: string
  displayName: string
  studentCode: string | null
  className: string
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
  const [searchResults, setSearchResults] = useState<ManualStudent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [manualMarking, setManualMarking] = useState<string | null>(null)
  const [markedStudents, setMarkedStudents] = useState<Set<string>>(new Set())
  // Xác nhận hủy điểm danh khi bấm lại vào nút đã điểm danh
  const [unmarkConfirm, setUnmarkConfirm] = useState<UnmarkTarget | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Lọc lớp trong điểm danh thủ công
  const [classOptions, setClassOptions] = useState<Pick<Class, 'id' | 'name'>[]>([])
  const [filterClassId, setFilterClassId] = useState('')
  const filterClassRef = useRef('')
  const searchQueryRef = useRef('')
  searchQueryRef.current = searchQuery

  // Chủ nhật: phải chọn buổi (học giáo lý / đi lễ) trước khi điểm danh
  const [sundaySession, setSundaySession] = useState<SundaySession | null>(null)
  const sessionRef = useRef<SundaySession | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lastDecodeRef = useRef(0)
  const scanLockRef = useRef(false)
  const recentScansRef = useRef<Map<string, number>>(new Map())
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successCountRef = useRef(0)
  const decodePausedRef = useRef(false)
  const modalOpenRef = useRef(false)
  const unmarkConfirmRef = useRef<UnmarkTarget | null>(null)

  const scanTarget = useRef(getScanTarget(todayForAttendance()))

  const pad = (n: number) => n.toString().padStart(2, '0')

  const showFeedback = useCallback((type: Feedback['type'], message: string, resumeDelay = 1500) => {
    setFeedback({ type, message })
    playFeedback(type) // bíp + rung (rung chỉ có trên Android)
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback({ type: null, message: '' })
      scanLockRef.current = false
    }, resumeDelay)
  }, [])

  const pauseDecode = useCallback(() => {
    decodePausedRef.current = true
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const scrollSearchInputIntoView = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!modalOpenRef.current) return
    const panel = panelRef.current
    const input = searchInputRef.current
    if (!panel || !input) return
    const inputRect = input.getBoundingClientRect()
    const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? panel.getBoundingClientRect().top
    const targetTop = panel.scrollTop + inputRect.top - headerBottom - 8
    panel.scrollTo({ top: Math.max(0, targetTop), behavior })
  }, [])

  // Đồng bộ lại số buổi điểm danh trong thieu_nhi (giống điểm danh thủ công)
  const updateAttendanceCount = useCallback(async (studentId: string) => {
    await recalcAttendanceCount(studentId, schoolYear)
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
          .select('id, full_name, saint_name, student_code, class_id, status, classes(name)')
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

        // Em đã nghỉ học (kể cả em năm trước còn giữ thẻ QR cũ) không được ghi điểm danh
        if (student.status !== 'ACTIVE') {
          setScanHistory(prev => [{
            id: `${Date.now()}`,
            studentName: displayName,
            studentCode: student.student_code || studentCode,
            className,
            time: timeDisplay,
            status: 'not_found' as const,
          }, ...prev.slice(0, 4)])
          showFeedback('not_found', `${student.full_name} đã nghỉ học, không điểm danh`)
          return
        }

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
          studentId: student.id,
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

  // Danh sách lớp cho bộ lọc (theo phạm vi ngành của user)
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    supabase
      .from('classes')
      .select('id, name, branch')
      .eq('status', 'ACTIVE')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return
        const scoped = filterByBranch(data as Pick<Class, 'id' | 'name' | 'branch'>[], getBranchScope(user))
        setClassOptions(scoped.map(c => ({ id: c.id, name: c.name })))
      })
    return () => { cancelled = true }
  }, [isOpen, user])

  // --- Điểm danh thủ công: tìm kiếm theo tên / tên thánh / mã, có thể lọc theo lớp ---
  const runSearch = useCallback((text: string, classId: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!shouldRunManualSearch(text, classId)) {
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
        if (classId) query = query.eq('class_id', classId)

        // Tìm lớp có tên khớp từ khóa để hỗ trợ tìm theo lớp
        const words = splitSearchWords(text)
        const matchedClassIds: string[] = []
        const { data: classRows } = words.length > 0
          ? await supabase
              .from('classes')
              .select('id, name')
              .or(words.map(w => `name.ilike.%${w.replace(/[,()]/g, '')}%`).join(','))
          : { data: [] as { id: string; name: string }[] }
        for (const word of words) {
          const lw = word.toLowerCase()
          const classIds = (classRows || [])
            .filter(c => (c.name as string).toLowerCase().includes(lw))
            .map(c => c.id as string)
          matchedClassIds.push(...classIds)
          query = query.or(studentSearchOrFilter(word, classIds))
        }

        const { data: rawData, error } = await query.order('full_name').limit(classId ? 500 : 50)
        // DB ilike khớp cả họ / tên đệm → lọc lại: chỉ lấy khớp tên cuối (hoặc tên thánh / mã / SĐT / lớp)
        const data = rawData?.filter((s) => matchesStudentSearch({
          full_name: s.full_name as string,
          saint_name: s.saint_name as string | null,
          student_code: s.student_code as string | null,
          class_id: s.class_id as string,
          className: (s as { classes?: { name?: string } | null }).classes?.name,
          parent_phone: s.parent_phone as string | null,
        }, text, matchedClassIds)).slice(0, manualSearchLimit(classId))

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
    }, classId && text.trim().length === 0 ? 0 : 300)
  }, [])

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text)
    runSearch(text, filterClassRef.current)
  }, [runSearch])

  const handleFilterClass = useCallback((classId: string) => {
    filterClassRef.current = classId
    setFilterClassId(classId)
    runSearch(searchQueryRef.current, classId)
  }, [runSearch])

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
        studentId: student.id,
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

  /** Bấm nhầm: bấm lại nút xanh lần nữa để hủy điểm danh (xoá bản ghi vừa tạo từ quét QR / thủ công) */
  const handleManualUnmark = useCallback(async (student: { id: string; full_name: string }) => {
    if (manualMarking) return
    const dayType = resolveDayType()
    if (!dayType) return
    setManualMarking(student.id)
    const { dateStr } = scanTarget.current

    try {
      const { data: removed, error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('attendance_date', dateStr)
        .eq('day_type', dayType)
        .eq('student_id', student.id)
        .in('check_in_method', ['qr_scan', 'manual'])
        .select('id')

      if (error) {
        showFeedback('not_found', `Lỗi hủy: ${error.message}`)
        return
      }
      if (!removed || removed.length === 0) {
        showFeedback('not_found', `${student.full_name} được điểm danh từ sổ lớp, hãy hủy trong tab Điểm danh`)
        return
      }

      setMarkedStudents(prev => {
        const next = new Set(prev)
        next.delete(student.id)
        return next
      })
      setScanHistory(prev => removeStudentFromHistory(prev, student.id))
      setScanCount(c => Math.max(0, c - 1))
      // Dữ liệu đã đổi → khi đóng modal vẫn báo cho trang cha tải lại
      successCountRef.current += 1
      showFeedback('success', `Đã hủy điểm danh: ${student.full_name}`, 800)
      updateAttendanceCount(student.id)
    } catch {
      showFeedback('not_found', 'Có lỗi xảy ra. Thử lại.')
    } finally {
      setManualMarking(null)
    }
  }, [manualMarking, showFeedback, updateAttendanceCount])

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
      .select('id, student_id, check_in_time, thieu_nhi(full_name, saint_name, student_code, classes(name))')
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
    if (isCancelled() || !modalOpenRef.current) return
    if (hist) {
      setScanHistory(hist.map((r) => mapRestoredScanEntry(r as unknown as RestoredAttendanceRecord)))
    }
    setScanCount(todayCount ?? hist?.length ?? 0)
    if (markedRows) {
      setMarkedStudents(new Set(markedRows.map((r) => r.student_id as string)))
    }

  }, [user?.id])

  const decodeLoop = useCallback(() => {
    rafRef.current = 0
    if (!modalOpenRef.current || decodePausedRef.current) return

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
          const text = decodeQrText(code)
          if (text) handleDecoded(text)
        }
      }
    }
    rafRef.current = requestAnimationFrame(decodeLoop)
  }, [handleDecoded])

  const resumeDecode = useCallback(() => {
    if (!modalOpenRef.current || unmarkConfirmRef.current) return
    decodePausedRef.current = false
    if (streamRef.current && videoRef.current && !rafRef.current) {
      rafRef.current = requestAnimationFrame(decodeLoop)
    }
  }, [decodeLoop])

  const setUnmarkDialog = useCallback((target: UnmarkTarget | null) => {
    unmarkConfirmRef.current = target
    setUnmarkConfirm(target)
    if (target) pauseDecode()
    else resumeDecode()
  }, [pauseDecode, resumeDecode])

  /** Xác nhận hủy điểm danh từ hộp thoại */
  const confirmUnmark = useCallback(async () => {
    const student = unmarkConfirm
    if (!student || manualMarking) return
    await handleManualUnmark({ id: student.id, full_name: student.displayName })
    setUnmarkDialog(null)
  }, [unmarkConfirm, manualMarking, handleManualUnmark, setUnmarkDialog])

  // Reset phiên làm việc khi modal thực sự mở lại. Retry chỉ khởi động lại camera,
  // giữ nguyên mode, bộ lọc và lịch sử hiện tại.
  useEffect(() => {
    modalOpenRef.current = isOpen
    if (!isOpen) {
      pauseDecode()
      unmarkConfirmRef.current = null
      setUnmarkConfirm(null)
      return
    }

    decodePausedRef.current = false
    scanTarget.current = getScanTarget(todayForAttendance())
    successCountRef.current = 0
    primeAudio() // mở modal từ thao tác người dùng → trình duyệt di động cho phép phát tiếng
    setCameraStatus('loading')
    setErrorMessage('')
    setHolidayName(null)
    setScanHistory([])
    setScanCount(0)
    setFeedback({ type: null, message: '' })
    scanLockRef.current = false
    recentScansRef.current.clear()
    setSearchQuery('')
    setSearchResults([])
    setSearchLoading(false)
    setFilterClassId('')
    filterClassRef.current = ''
    setManualMarking(null)
    setMarkedStudents(new Set())
    setSundaySession(null)
    sessionRef.current = null
    unmarkConfirmRef.current = null
    setUnmarkConfirm(null)
  }, [isOpen, pauseDecode])

  // Mở/đóng camera theo trạng thái modal
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    modalOpenRef.current = true
    scanTarget.current = getScanTarget(todayForAttendance())
    scanLockRef.current = false

    const videoEl = videoRef.current
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
      if (cancelled || !modalOpenRef.current) return
      if (holiday) {
        setHolidayName(holiday.name)
        return
      }

      // Thứ 5: khôi phục ngay. Chủ nhật: khôi phục sau khi chọn buổi (chooseSession).
      if (dayType === 'thu5') await restoreForDayType(dayType, () => cancelled || !modalOpenRef.current)
      // restoreForDayType có thể chờ mạng; modal có thể đã đóng trong lúc chờ.
      if (cancelled || !modalOpenRef.current) return

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
        if (cancelled || !modalOpenRef.current) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach(t => t.stop())
          streamRef.current = null
          throw new Error('Không thể hiển thị camera')
        }

        video.srcObject = stream
        try {
          await video.play()
        } catch (error: unknown) {
          if (cancelled || !modalOpenRef.current || streamRef.current !== stream) return
          stream.getTracks().forEach(track => track.stop())
          streamRef.current = null
          if (video.srcObject === stream) video.srcObject = null
          throw error
        }

        if (cancelled || !modalOpenRef.current || streamRef.current !== stream) {
          stream.getTracks().forEach(t => t.stop())
          if (video.srcObject === stream) video.srcObject = null
          return
        }

        setCameraStatus('active')
        if (!unmarkConfirmRef.current) {
          decodePausedRef.current = false
          if (!rafRef.current) rafRef.current = requestAnimationFrame(decodeLoop)
        } else {
          decodePausedRef.current = true
        }
      } catch (error: unknown) {
        if (cancelled || !modalOpenRef.current) return
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

    return () => {
      cancelled = true
      modalOpenRef.current = false
      pauseDecode()
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
      if (document.activeElement === searchInputRef.current) scrollSearchInputIntoView('auto')
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
  }, [isOpen, scrollSearchInputIntoView])

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
    // Sau khi bàn phím mở, đưa ô tìm kiếm xuống ngay dưới header sticky.
    setTimeout(() => {
      window.scrollTo(0, 0)
      if (document.activeElement === searchInputRef.current) scrollSearchInputIntoView('smooth')
    }, 300)
  }

  const handleClose = () => {
    modalOpenRef.current = false
    pauseDecode()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    unmarkConfirmRef.current = null
    setUnmarkConfirm(null)
    if (successCountRef.current > 0) onAttendanceMarked?.()
    onClose()
  }

  if (!isOpen) return null

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

      <div ref={panelRef} className="relative flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-[#0F172A] p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[calc(100vh-32px)] sm:w-[520px] sm:max-w-[calc(100vw-32px)] sm:rounded-[24px] sm:p-6 shadow-2xl">
        {/* Header stays visible while the manual list or keyboard is scrolling. */}
        <div ref={headerRef} className="sticky top-0 z-30 -mx-4 -mt-4 mb-3 shrink-0 bg-[#0F172A]/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 shrink-0 text-white" />
                <h2 className="whitespace-nowrap text-lg font-bold text-white sm:text-xl">Quét QR điểm danh</h2>
              </div>
              <p className="mt-0.5 text-xs leading-4 text-[#94A3B8] sm:mt-1 sm:text-sm sm:leading-5">
                <span className="sm:hidden">
                  {dayType === 'cn' ? 'Chủ nhật' : 'Thứ 5'} {dateDisplay}{scanCount > 0 ? ` · ${scanCount} lượt` : ''}
                </span>
                <span className="hidden sm:inline">
                  {dayType === 'cn' ? 'Chủ nhật' : 'Thứ 5'} ngày {dateDisplay}
                  {dayType === 'cn' && sundaySession ? ` · ${SUNDAY_SESSION_LABELS[sundaySession]}` : ''} — quét QR hoặc tìm kiếm thủ công
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {scanCount > 0 && (
                <div className="hidden items-center gap-1 rounded-full bg-[#16A34A] px-2 py-1 text-xs sm:flex sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
                  <Users className="h-3.5 w-3.5 text-white" />
                  <span className="text-sm font-bold text-white">{scanCount}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng cửa sổ điểm danh"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {feedback.type && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs sm:mt-3 sm:gap-2.5 sm:px-3.5 sm:py-3 sm:text-sm ${
                feedback.type === 'success' ? 'bg-[#16A34A]/95'
                : feedback.type === 'duplicate' ? 'bg-[#F59E0B]/95'
                : 'bg-[#DC2626]/95'
              }`}
            >
              {feedback.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />}
              {feedback.type === 'duplicate' && <Clock className="mt-0.5 h-4 w-4 shrink-0 text-white" />}
              {feedback.type === 'not_found' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />}
              <span className="min-w-0 break-words text-xs font-semibold leading-4 text-white sm:text-sm sm:leading-5">{feedback.message}</span>
            </div>
          )}
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Chọn buổi điểm danh</p>
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
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                            active
                              ? 'border-brand bg-brand text-white'
                              : 'border-white/10 bg-white/5 text-[#CBD5E1] hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {SUNDAY_SESSION_LABELS[session]}
                        </button>
                      )
                    })}
                  </div>
                </div>
            )}

            {/* Camera và tìm kiếm thủ công cùng hiển thị trên một màn hình. */}
            <div className="relative mb-4 aspect-[4/3] w-full shrink-0 overflow-hidden rounded-[16px] bg-black">
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

                </>
              )}
            </div>

            {/* Điểm danh thủ công */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-brand" />
                <span className="text-sm font-bold text-white">Điểm danh thủ công</span>
              </div>

              <div className="mb-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full shrink-0 sm:w-auto">
                  <select
                    value={filterClassId}
                    onChange={(e) => handleFilterClass(e.target.value)}
                    aria-label="Lọc theo lớp"
                    className={`w-full appearance-none rounded-xl py-2.5 pl-3 pr-8 text-sm font-semibold outline-none transition-colors sm:w-auto ${
                      filterClassId ? 'bg-brand text-white' : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <option value="" className="text-black">Tất cả lớp</option>
                    {classOptions.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/80" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5">
                  <Search className="w-4 h-4 text-[#94A3B8] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={handleSearchFocus}
                    aria-label="Tìm thiếu nhi để điểm danh thủ công"
                    placeholder={filterClassId ? 'Tìm trong lớp...' : 'Tìm tên, mã, lớp, SĐT phụ huynh...'}
                    autoCorrect="off"
                    className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-white placeholder-[#64748B] outline-none"
                  />
                  {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSearch('')}
                    className="shrink-0 text-[#64748B] hover:text-white transition-colors"
                    aria-label="Xóa tìm kiếm"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                </div>
              </div>

              {searchLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  <span className="text-xs text-[#94A3B8]">Đang tìm kiếm...</span>
                </div>
              )}

              {!searchLoading && shouldRunManualSearch(searchQuery, filterClassId) && searchResults.length === 0 && (
                <p className="text-center text-sm text-[#64748B] py-4">Không tìm thấy thiếu nhi nào</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 mt-2 sm:max-h-[240px] sm:overflow-y-auto pr-1">
                  {filterClassId && (
                    <p className="text-xs text-[#94A3B8] px-1">
                      {searchResults.length} thiếu nhi • đã điểm danh {searchResults.filter(s => markedStudents.has(s.id)).length}
                    </p>
                  )}
                  {searchResults.map((student) => {
                    const isMarked = markedStudents.has(student.id)
                    const isMarking = manualMarking === student.id
                    return (
                      <button
                        key={student.id}
                        onClick={() => {
                          primeAudio()
                          if (isMarked) {
                            setUnmarkDialog({
                              id: student.id,
                              displayName: `${student.saint_name ? `${student.saint_name} ` : ''}${student.full_name}`,
                              studentCode: student.student_code,
                              className: student.className,
                            })
                          } else {
                            handleManualAttendance(student)
                          }
                        }}
                        disabled={isMarking || (dayType === 'cn' && !sundaySession)}
                        aria-label={isMarked ? `Mở xác nhận hủy điểm danh cho ${student.full_name}` : `Điểm danh cho ${student.full_name}`}
                        title={isMarked ? 'Bấm để hủy điểm danh' : 'Điểm danh'}
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
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isMarking ? 'bg-[#94A3B8]' : isMarked ? 'bg-white/10' : 'bg-[#16A34A]'
                        }`}>
                          {isMarking ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : isMarked ? (
                            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Lịch sử quét */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Lịch sử điểm danh</span>
              <span className="text-xs text-[#94A3B8]">Hôm nay: {scanCount}</span>
            </div>
            <div className="space-y-2">
              {scanHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-5">
                  <ScanLine className="w-6 h-6 text-[#475569]" />
                  <span className="text-sm text-[#64748B]">Chưa có lượt điểm danh nào hôm nay</span>
                </div>
              ) : (
                scanHistory.map(scan => {
                  const isSuccess = scan.status === 'success' && !!scan.studentId
                  const borderCls =
                    scan.status === 'success' ? 'border-[#22c55e]'
                    : scan.status === 'duplicate' ? 'border-[#f59e0b]'
                    : 'border-[#ef4444]'

                  const content = (
                    <>
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
                    </>
                  )

                  if (isSuccess) {
                    return (
                      <button
                        key={scan.id}
                        type="button"
                        onClick={() => {
                          primeAudio()
                          setUnmarkDialog({
                            id: scan.studentId!,
                            displayName: scan.studentName,
                            studentCode: scan.studentCode || null,
                            className: scan.className,
                          })
                        }}
                        title="Bấm để hủy điểm danh"
                        className={`flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2.5 border-l-[3px] text-left transition-colors ${borderCls}`}
                      >
                        {content}
                        <Undo2 className="h-4 w-4 shrink-0 text-[#94A3B8] hover:text-white" />
                      </button>
                    )
                  }

                  return (
                    <div
                      key={scan.id}
                      className={`flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 border-l-[3px] ${borderCls}`}
                    >
                      {content}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Xác nhận hủy điểm danh */}
      {unmarkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUnmarkDialog(null)} />
          <div className="relative w-full max-w-[400px] rounded-[16px] bg-white p-6 shadow-xl dark:bg-[#1a1a1a]">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center mb-3">
                <X className="w-6 h-6 text-red-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-1">
                Hủy điểm danh thiếu nhi này?
              </h3>
              <p className="text-sm font-medium text-black/80 dark:text-white/90 mb-1">
                {unmarkConfirm.displayName}
              </p>
              <p className="text-xs text-[#8B8685] mb-4">
                {unmarkConfirm.className}{unmarkConfirm.studentCode ? ` • ${unmarkConfirm.studentCode}` : ''}
              </p>
              <p className="text-sm text-[#666d80] mb-6">
                Em sẽ trở về trạng thái chưa điểm danh cho buổi này.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUnmarkDialog(null)}
                disabled={manualMarking === unmarkConfirm.id}
                className="flex-1 h-[48px] bg-[#F6F6F6] dark:bg-white/10 text-black dark:text-white text-sm font-medium rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Giữ lại
              </button>
              <button
                onClick={confirmUnmark}
                disabled={manualMarking === unmarkConfirm.id}
                className="flex-1 h-[48px] bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {manualMarking === unmarkConfirm.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Xác nhận hủy'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
