import { normalizeSearchText } from './search'
// Logic thuần cho điểm danh quét QR (đồng bộ với app mobile TN Thiên Ân)

export const SCAN_THROTTLE_MS = 3000

/**
 * Chuẩn hoá mã về dạng lưu trong DB: NFC, và Ð/ð (U+00D0/F0, bảng mã Latin-1)
 * → Đ/đ (U+0110/0111) — thẻ in bằng bảng mã 1 byte cho ra chữ Ð trông giống hệt Đ.
 */
export function normalizeStudentCode(code: string): string {
  return code.normalize('NFC').replace(/Ð/g, 'Đ').replace(/ð/g, 'đ').trim()
}

/**
 * Mẫu dùng cho `.ilike('student_code', ...)` khi tra mã quét được: Postgres `ilike`
 * không phân biệt hoa thường nên "dl202650" khớp "DL202650" và ngược lại (mã in trên
 * thẻ và mã trong DB từng lệch nhau ở chữ hoa/thường). Các ký tự đại diện của LIKE
 * (\ % _) được thoát để mã lạ không khớp nhầm em khác.
 */
export function studentCodePattern(code: string): string {
  return normalizeStudentCode(code).replace(/[\\%_]/g, (m) => `\\${m}`)
}

/**
 * Dạng chuẩn của mã khi lưu vào DB: chuẩn hoá rồi viết HOA. Mã thiếu nhi theo quy ước
 * luôn viết hoa; lưu thống nhất giúp danh sách, xuất Excel và thẻ QR không lệch nhau.
 */
export function canonicalStudentCode(code: string): string {
  return normalizeStudentCode(code).toUpperCase()
}

/** QR có thể chứa "MÃ - Họ tên" hoặc chỉ mã thiếu nhi */
export function parseStudentCode(raw: string): string {
  return normalizeStudentCode(raw.includes(' - ') ? raw.split(' - ')[0] : raw)
}

/** Phần kết quả jsQR cần dùng (data, byte gốc, các đoạn đã giải) */
export interface QrDecodeResult {
  data: string
  binaryData?: ArrayLike<number>
  chunks?: ReadonlyArray<{ type: string; text?: string; bytes?: ArrayLike<number> }>
}

/**
 * jsQR chỉ giải đoạn byte theo UTF-8; thẻ in bằng bảng mã 1 byte (Đ = 0xD0) làm đoạn đó
 * giải lỗi → jsQR bỏ mất chữ Đ (vd "ĐK152283" thành "K152283") hoặc trả chuỗi rỗng.
 * Khi có đoạn byte giải lỗi, giải lại toàn bộ byte gốc theo Windows-1258 (bảng mã tiếng Việt).
 */
export function decodeQrText(code: QrDecodeResult | null | undefined): string {
  if (!code) return ''
  const binary = code.binaryData
  const byteChunkFailed = (code.chunks || []).some(
    c => c.type === 'byte' && !!c.bytes && c.bytes.length > 0 && !c.text,
  )
  if ((code.data && !byteChunkFailed) || !binary || binary.length === 0) return code.data
  try {
    return new TextDecoder('windows-1258').decode(Uint8Array.from(binary))
  } catch {
    return String.fromCharCode(...Array.from(binary))
  }
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Ngày điểm danh mục tiêu khi quét QR:
 * - Chủ nhật → chính hôm đó (day_type 'cn')
 * - Các ngày còn lại → Thứ 5 của tuần đó (day_type 'thu5')
 */
export function getScanTarget(now: Date): { dateStr: string; dayType: 'cn' | 'thu5' } {
  if (now.getDay() === 0) {
    return { dateStr: toLocalDateStr(now), dayType: 'cn' }
  }
  const thursday = new Date(now)
  thursday.setDate(now.getDate() + (4 - now.getDay()))
  return { dateStr: toLocalDateStr(thursday), dayType: 'thu5' }
}

/** Tách chuỗi tìm kiếm thành các từ khóa */
export function splitSearchWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(w => w.length > 0)
}

/** Các cột text của thieu_nhi được tìm kiếm thủ công */
export const STUDENT_SEARCH_COLUMNS = [
  'full_name', 'saint_name', 'student_code',
  'phone', 'parent_name', 'parent_phone', 'parent_name_2', 'parent_phone_2',
  'address', 'notes',
] as const

/**
 * Bộ lọc `or` của Supabase: khớp mọi dữ liệu text của thiếu nhi
 * (tên, tên thánh, mã, SĐT, phụ huynh, địa chỉ, ghi chú) và lớp (qua danh sách class_id).
 * Ký tự , ( ) bị loại bỏ vì phá cú pháp filter của PostgREST.
 */
export function studentSearchOrFilter(word: string, classIds: string[] = []): string {
  const w = word.replace(/[,()]/g, '')
  const parts = STUDENT_SEARCH_COLUMNS.map(col => `${col}.ilike.%${w}%`)
  if (classIds.length > 0) parts.push(`class_id.in.(${classIds.join(',')})`)
  return parts.join(',')
}

/**
 * Chống quét trùng: cùng một mã trong SCAN_THROTTLE_MS thì bỏ qua.
 * Trả về true nếu cần bỏ qua; ngược lại ghi nhận thời điểm quét và dọn mã hết hạn.
 */
export function shouldThrottleScan(
  code: string,
  recentScans: Map<string, number>,
  now: number,
): boolean {
  const last = recentScans.get(code)
  if (last !== undefined && now - last < SCAN_THROTTLE_MS) return true
  recentScans.forEach((time, key) => {
    if (now - time >= SCAN_THROTTLE_MS) recentScans.delete(key)
  })
  recentScans.set(code, now)
  return false
}

/** Bản ghi điểm danh (kèm join thieu_nhi) đọc từ DB để khôi phục lịch sử quét */
export type RestoredAttendanceRecord = {
  id: string
  student_id?: string | null
  check_in_time: string | null
  thieu_nhi?: {
    full_name?: string
    saint_name?: string | null
    student_code?: string
    classes?: { name?: string } | null
  } | null
}

/**
 * Chuyển bản ghi DB thành mục lịch sử quét hiển thị trong modal.
 * Dùng khi mở lại modal (sau reload) để dữ liệu đã điểm danh không "biến mất".
 */
export function mapRestoredScanEntry(record: RestoredAttendanceRecord): {
  id: string
  studentId?: string
  studentName: string
  studentCode: string
  className: string
  time: string
  status: 'success'
} {
  const tn = record.thieu_nhi
  return {
    id: record.id,
    studentId: record.student_id || undefined,
    studentName: `${tn?.saint_name ? `${tn.saint_name} ` : ''}${tn?.full_name || 'Không xác định'}`,
    studentCode: tn?.student_code || '',
    className: tn?.classes?.name || '',
    time: record.check_in_time?.substring(0, 5) || '',
    status: 'success',
  }
}

/** Tên cuối (từ cuối cùng) của họ tên: "Mai Ngọc Huyền Trâm" → "Trâm" */
export function lastNameOf(fullName: string | null | undefined): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

export interface SearchableStudent {
  full_name: string
  saint_name?: string | null
  student_code?: string | null
  class_id?: string | null
  className?: string | null
  parent_phone?: string | null
}

type LetterCluster = { base: string; marks: string }

/** Tách chữ thành từng cụm "chữ gốc + dấu" (NFD): "yến" → y, e+̂+́, n */
function toLetterClusters(text: string): LetterCluster[] {
  const clusters: LetterCluster[] = []
  for (const ch of text.toLowerCase().normalize('NFD')) {
    if (/[\u0300-\u036f]/.test(ch) && clusters.length > 0) clusters[clusters.length - 1].marks += ch
    else clusters.push({ base: ch, marks: '' })
  }
  return clusters
}

/**
 * Từ khóa khớp đầu một từ trong tên, tôn trọng dấu người dùng đã gõ:
 * chữ gõ không dấu khớp mọi dấu ("yen" → Yên, Yến; "d" → Đ), chữ gõ có dấu
 * thì từ trong tên phải có đủ các dấu đó ("yến" không ra "Yên", "yê" vẫn ra "Yến").
 */
function accentPrefixMatch(query: LetterCluster[], word: LetterCluster[], whole = false): boolean {
  if (query.length > word.length || (whole && query.length !== word.length)) return false
  return query.every((q, i) => {
    const w = word[i]
    const sameBase = q.base === w.base || (q.base === 'd' && w.base === 'đ')
    return sameBase && [...q.marks].every(mark => w.marks.includes(mark))
  })
}

/**
 * Lọc danh sách thiếu nhi đã tải về phía client cho tìm thủ công.
 * Mỗi từ khóa phải khớp một tiền tố của từ trong tên (bỏ qua họ), một trường
 * text phụ, hoặc một đoạn số điện thoại phụ huynh có ít nhất 3 chữ số.
 * Kết quả ưu tiên em có TÊN RIÊNG (từ cuối) khớp đúng, rồi khớp đầu tên riêng,
 * rồi mới tới em chỉ khớp tên đệm / trường phụ — để giới hạn số dòng không cắt mất em cần tìm.
 * Gõ 1 từ mà có em khớp tên riêng thì chỉ trả về các em đó.
 */
export function filterManualStudents<T extends SearchableStudent>(
  students: readonly T[],
  text: string,
  classId?: string | null,
): T[] {
  const hasClassFilter = Boolean(classId)
  const rawWords = splitSearchWords(text).filter(word => normalizeSearchText(word))
  const words = rawWords.map(normalizeSearchText)
  const queryClusters = rawWords.map(toLetterClusters)

  const ranked: { student: T; rank: number }[] = []
  for (const student of students) {
    if (hasClassFilter && student.class_id !== classId) continue
    if (words.length === 0) {
      if (hasClassFilter) ranked.push({ student, rank: 0 })
      continue
    }

    const allNameWords = (student.full_name || '').trim().split(/\s+/).filter(Boolean).map(toLetterClusters)
    const givenName = allNameWords[allNameWords.length - 1]

    // Cả cụm từ khóa là phần cuối họ tên ("huyền trâm" → "Mai Ngọc Huyền Trâm"), kể cả họ.
    const tail = allNameWords.slice(-queryClusters.length)
    const matchesTail = tail.length === queryClusters.length
      && queryClusters.every((q, i) => accentPrefixMatch(q, tail[i], true))

    const nameWords = allNameWords.slice(1)
    const textFields = [student.saint_name, student.student_code, student.className]
      .map(value => normalizeSearchText(value || ''))
    const phoneDigits = (student.parent_phone || '').replace(/\D/g, '')

    const matches = matchesTail || words.every((word, i) => {
      const matchesName = nameWords.some(nameWord => accentPrefixMatch(queryClusters[i], nameWord))
      const matchesTextField = textFields.some(field => field.includes(word))
      const matchesPhone = /^\d{3,}$/.test(word) && phoneDigits.includes(word)
      return matchesName || matchesTextField || matchesPhone
    })
    if (!matches) continue

    // Hạng: 0 = tên riêng đúng y dấu, 1 = đúng tên riêng, 2 = khớp đầu tên riêng, 3 = tên đệm / trường phụ.
    const givenIsExact = queryClusters.some(q => q.length === givenName.length
      && q.every((c, i) => c.base === givenName[i].base && c.marks === givenName[i].marks))
    const rank = givenIsExact ? 0
      : matchesTail || queryClusters.some(q => accentPrefixMatch(q, givenName, true)) ? 1
      : queryClusters.some(q => accentPrefixMatch(q, givenName)) ? 2
      : 3
    ranked.push({ student, rank })
  }

  // Gõ 1 từ mà có em khớp tên riêng → chỉ hiện các em đó, bỏ em chỉ khớp tên đệm / tên thánh / lớp
  // ("tâm" không kéo theo cả lớp Khai Tâm). Không em nào khớp tên riêng mới tìm rộng ra.
  const givenOnly = words.length === 1 && ranked.some(entry => entry.rank < 3)

  return ranked
    .filter(entry => !givenOnly || entry.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.student.full_name.localeCompare(b.student.full_name, 'vi'))
    .slice(0, manualSearchLimit(classId))
    .map(entry => entry.student)
}

/**
 * Lọc phía client sau khi DB trả về (ilike trên full_name khớp cả tên đệm):
 * mỗi từ khóa chỉ được khớp tên cuối của thiếu nhi (không khớp họ / tên đệm),
 * hoặc khớp tên thánh, mã, SĐT phụ huynh, tên lớp / class_id.
 * Ngoại lệ: cả cụm từ khóa là phần cuối của họ tên ("huyền trâm" → "Mai Ngọc Huyền Trâm").
 */
export function matchesStudentSearch(student: SearchableStudent, text: string, classIds: string[] = []): boolean {
  const words = splitSearchWords(text).map(normalizeSearchText)
  if (words.length === 0) return true
  const fullName = normalizeSearchText(student.full_name || '')
  if (fullName.endsWith(words.join(' '))) return true

  const last = normalizeSearchText(lastNameOf(student.full_name))
  const others = [student.saint_name, student.student_code, student.parent_phone, student.className]
    .map(v => normalizeSearchText(v || ''))
    .filter(Boolean)
  const inClass = !!student.class_id && classIds.includes(student.class_id)

  return words.every(w => last.includes(w) || others.some(o => o.includes(w)) || inClass)
}

/**
 * Hủy điểm danh (bấm nhầm): bỏ mọi mục lịch sử "success" của thiếu nhi đó.
 * Mục duplicate / not_found và mục không gắn studentId được giữ nguyên.
 */
export function removeStudentFromHistory<T extends { studentId?: string; status: string }>(
  history: T[],
  studentId: string,
): T[] {
  return history.filter(e => !(e.status === 'success' && e.studentId === studentId))
}

/**
 * Điểm danh thủ công có thêm bộ lọc lớp:
 * - Chọn lớp → tải ngay danh sách thiếu nhi lớp đó (không cần gõ)
 * - Không chọn lớp → cần gõ ít nhất 2 ký tự như cũ
 */
export function shouldRunManualSearch(text: string, classId: string | null | undefined): boolean {
  return !!classId || text.trim().length >= 2
}

/** Giới hạn kết quả: có lọc lớp thì hiện cả lớp, còn lại tối đa 20 */
export function manualSearchLimit(classId: string | null | undefined): number {
  return classId ? 200 : 20
}

/** Trần số dòng lịch sử giữ trong bộ nhớ — đủ cho cả buổi, tránh phình DOM vô hạn. */
export const SCAN_HISTORY_LIMIT = 500

/** Thêm lượt điểm danh mới lên đầu lịch sử, giữ toàn bộ lượt cũ (chỉ cắt khi vượt trần). */
export function prependScanHistory<T>(history: T[], entry: T): T[] {
  return [entry, ...history].slice(0, SCAN_HISTORY_LIMIT)
}
