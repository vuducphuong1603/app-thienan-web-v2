import { describe, it, expect } from 'vitest'
import {
  buildCardReissueRows,
  filterCardStudents,
  findFirstEmptyRow,
  toggleId,
  CARD_SHEET_HEADER,
} from '../card-reissue'

const students = [
  { id: '1', student_code: 'TN001', saint_name: 'Maria', full_name: 'Nguyễn Thị Ngọc Anh', class_name: 'Ấu 1A' },
  { id: '2', student_code: 'TN002', saint_name: 'Giuse', full_name: 'Trần Văn Bình', class_name: 'Ấu 1A' },
  { id: '3', student_code: undefined, saint_name: undefined, full_name: 'Cường', class_name: 'Ấu 1A' },
]

describe('buildCardReissueRows', () => {
  it('dựng đúng 8 cột theo thứ tự file mẫu: STT, mã, tên thánh, họ lót, tên, lớp, GLV nhập, ghi chú', () => {
    const rows = buildCardReissueRows(students.slice(0, 2), { teacherName: 'Anna Lê Thị Hoa', startStt: 5 })
    expect(rows).toEqual([
      [5, 'TN001', 'Maria', 'Nguyễn Thị Ngọc', 'Anh', 'Ấu 1A', 'Anna Lê Thị Hoa', ''],
      [6, 'TN002', 'Giuse', 'Trần Văn', 'Bình', 'Ấu 1A', 'Anna Lê Thị Hoa', ''],
    ])
    expect(rows[0]).toHaveLength(CARD_SHEET_HEADER.length)
  })

  it('tên 1 chữ: họ lót rỗng, thiếu mã/tên thánh thì để trống, ghi chú chung áp cho mọi dòng', () => {
    const rows = buildCardReissueRows([students[2]], { teacherName: 'GLV', startStt: 1, note: 'Mất thẻ' })
    expect(rows).toEqual([[1, '', '', '', 'Cường', 'Ấu 1A', 'GLV', 'Mất thẻ']])
  })

  it('ghi chú riêng từng em ưu tiên hơn ghi chú chung', () => {
    const rows = buildCardReissueRows([{ ...students[0], note: 'Hư thẻ' }], { teacherName: 'GLV', startStt: 1, note: 'Chung' })
    expect(rows[0][7]).toBe('Hư thẻ')
  })
})

describe('filterCardStudents', () => {
  it('tìm không dấu theo tên, tên thánh và mã', () => {
    expect(filterCardStudents(students, 'ngoc anh').map(s => s.id)).toEqual(['1'])
    expect(filterCardStudents(students, 'giuse').map(s => s.id)).toEqual(['2'])
    expect(filterCardStudents(students, 'tn00').map(s => s.id)).toEqual(['1', '2'])
  })
  it('chuỗi rỗng trả về tất cả', () => {
    expect(filterCardStudents(students, '  ')).toHaveLength(3)
  })
})

describe('findFirstEmptyRow', () => {
  it('trả về dòng đầu tiên có cột mã trống, tính từ dòng bắt đầu (dòng 4 trong file mẫu)', () => {
    // values của vùng B4:B — mỗi phần tử là 1 dòng
    expect(findFirstEmptyRow([['TN001'], ['TN002'], [], ['']], 4)).toBe(6)
  })
  it('vùng trống hoàn toàn thì là dòng bắt đầu', () => {
    expect(findFirstEmptyRow([], 4)).toBe(4)
    expect(findFirstEmptyRow(undefined, 4)).toBe(4)
  })
  it('đã kín hết thì là dòng ngay sau dòng cuối', () => {
    expect(findFirstEmptyRow([['a'], ['b']], 4)).toBe(6)
  })
})

describe('toggleId', () => {
  it('thêm khi chưa có, bỏ khi đã có, không đổi mảng gốc', () => {
    const base = ['1']
    expect(toggleId(base, '2')).toEqual(['1', '2'])
    expect(toggleId(base, '1')).toEqual([])
    expect(base).toEqual(['1'])
  })
})
