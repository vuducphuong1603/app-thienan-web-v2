import { canonicalStudentCode } from '@/lib/qr-attendance'

/**
 * Chia các dòng import thành "thêm mới" và "bỏ qua" chỉ theo Mã TN (đã chuẩn hoá).
 * Trùng họ tên + tên thánh KHÔNG tính là trùng — nhiều em khác nhau có thể trùng tên.
 * Mã đã có trong hệ thống (kể cả em đã nghỉ) hoặc lặp lại trong cùng file → bỏ qua.
 */
export function splitByStudentCode<T extends { student_code: string }>(
  rows: T[],
  existingCodes: Iterable<string>,
): { toInsert: T[]; skipped: T[] } {
  const seen = new Set(Array.from(existingCodes, canonicalStudentCode))
  const toInsert: T[] = []
  const skipped: T[] = []
  for (const r of rows) {
    const code = canonicalStudentCode(r.student_code)
    if (seen.has(code)) {
      skipped.push(r)
    } else {
      seen.add(code)
      toInsert.push(r)
    }
  }
  return { toInsert, skipped }
}
