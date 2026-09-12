/**
 * Đăng ký làm lại thẻ thiếu nhi.
 * Dữ liệu được đẩy lên Google Sheet "Danh sách làm lại thẻ" (tab "Làm Thẻ"),
 * cột theo file mẫu: STT | MÃ T.Nhi | TÊN THÁNH | HỌ VÀ TÊN LÓT | TÊN | LỚP | TÊN GLV NHẬP | GHI CHÚ
 */
import { normalizeSearchText } from './search'
import { familyNameOf, givenNameOf } from './student-sort'

export const CARD_SHEET_HEADER = [
  'STT', 'MÃ T.Nhi (bắt buộc)', 'TÊN THÁNH', 'HỌ VÀ TÊN LÓT', 'TÊN', 'LỚP', 'TÊN GLV NHẬP', 'GHI CHÚ',
] as const

/** Dòng dữ liệu đầu tiên trong file mẫu (dòng 1-2 tiêu đề, dòng 3 header) */
export const CARD_SHEET_FIRST_DATA_ROW = 4

export interface CardStudent {
  id: string
  student_code?: string | null
  saint_name?: string | null
  full_name: string
  class_name?: string | null
  /** Ghi chú riêng cho em này (ưu tiên hơn ghi chú chung) */
  note?: string | null
}

export type CardSheetRow = [number, string, string, string, string, string, string, string]

export function buildCardReissueRows(
  students: CardStudent[],
  opts: { teacherName: string; startStt: number; note?: string | null }
): CardSheetRow[] {
  return students.map((s, i) => [
    opts.startStt + i,
    (s.student_code ?? '').trim(),
    (s.saint_name ?? '').trim(),
    familyNameOf(s.full_name),
    givenNameOf(s.full_name),
    (s.class_name ?? '').trim(),
    opts.teacherName.trim(),
    (s.note ?? opts.note ?? '').trim(),
  ])
}

export function filterCardStudents<T extends CardStudent>(students: T[], query: string): T[] {
  const q = normalizeSearchText(query.trim())
  if (!q) return students
  return students.filter(s =>
    normalizeSearchText(`${s.saint_name ?? ''} ${s.full_name} ${s.student_code ?? ''}`).includes(q)
  )
}

/**
 * Tìm dòng trống đầu tiên trong cột MÃ (cột B) để ghi tiếp, không đè dữ liệu cũ.
 * `values` là kết quả Sheets API của vùng `B{startRow}:B` — mỗi phần tử là 1 dòng.
 */
export function findFirstEmptyRow(values: unknown[][] | undefined, startRow: number): number {
  if (!values || values.length === 0) return startRow
  for (let i = 0; i < values.length; i++) {
    const cell = values[i]?.[0]
    if (cell === undefined || cell === null || String(cell).trim() === '') return startRow + i
  }
  return startRow + values.length
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
}
