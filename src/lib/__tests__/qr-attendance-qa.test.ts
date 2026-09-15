import { describe, it, expect } from 'vitest'
import { filterManualStudents } from '../qr-attendance'

// QA adversarial cases for filterManualStudents (SPEC A1). Only this file is owned by qa.
type S = {
  id: string
  full_name: string
  saint_name?: string | null
  student_code?: string | null
  class_id?: string | null
  className?: string | null
  parent_phone?: string | null
}

const ids = (rows: S[]) => rows.map(s => s.id)

const duc: S = { id: 'duc', full_name: 'Nguyễn Văn Đức', saint_name: 'Phêrô', student_code: 'DUC01', class_id: 'c1', className: 'Ấu 1A', parent_phone: '0912345678' }
const toan: S = { id: 'toan', full_name: 'Nguyễn Văn Toan', saint_name: null, student_code: null, class_id: 'c1', className: 'Ấu 1A', parent_phone: null }
const quynhAnh: S = { id: 'quynh-anh', full_name: 'Trần Ngọc Quỳnh Anh', saint_name: 'Maria', student_code: 'QA001', class_id: 'c2', className: 'Thiếu 2B', parent_phone: '0987654321' }
const huyenTram: S = { id: 'huyen-tram', full_name: 'Mai Ngọc Huyền Trâm', saint_name: 'Têrêsa', student_code: 'HT003', class_id: 'c2', className: 'Thiếu 2B', parent_phone: '0901234567' }
const single: S = { id: 'single', full_name: 'Nguyễn', saint_name: null, student_code: null, class_id: 'c1', className: null, parent_phone: null }
const noClass: S = { id: 'no-class', full_name: 'Lê Quỳnh', class_id: null }
const all = [duc, toan, quynhAnh, huyenTram, single, noClass]

describe('filterManualStudents — đ/Đ và dấu', () => {
  it('gõ duc / Duc / ĐỨC / đức đều ra "Đức"', () => {
    for (const q of ['duc', 'Duc', 'ĐỨC', 'đức', 'Đuc']) {
      expect(ids(filterManualStudents(all, q)), q).toEqual(['duc'])
    }
  })
  it('Đ trong dữ liệu NFD (D + dấu ngang không tồn tại) vẫn bỏ dấu qua lowercase', () => {
    const upper: S = { id: 'u', full_name: 'NGUYỄN VĂN ĐỨC' }
    expect(ids(filterManualStudents([upper], 'duc'))).toEqual(['u'])
  })
})

describe('filterManualStudents — NFD hai chiều', () => {
  const nfdData: S = { id: 'nfd', full_name: 'Trần Ngọc Quỳnh Anh'.normalize('NFD'), saint_name: 'Maria'.normalize('NFD'), className: 'Thiếu 2B'.normalize('NFD'), class_id: 'c2' }
  it('dữ liệu NFD, từ khoá NFC', () => {
    expect(ids(filterManualStudents([nfdData], 'Quỳnh'))).toEqual(['nfd'])
    expect(ids(filterManualStudents([nfdData], 'Thiếu'))).toEqual(['nfd'])
  })
  it('dữ liệu NFC, từ khoá NFD', () => {
    expect(ids(filterManualStudents([quynhAnh], 'Quỳnh Anh'.normalize('NFD')))).toEqual(['quynh-anh'])
  })
  it('cả hai NFD', () => {
    expect(ids(filterManualStudents([nfdData], 'quỳnh anh'.normalize('NFD')))).toEqual(['nfd'])
  })
})

describe('filterManualStudents — khoảng trắng & hoa thường', () => {
  it('thừa khoảng trắng đầu/cuối/giữa, tab, xuống dòng', () => {
    expect(ids(filterManualStudents(all, '   quynh    anh  '))).toEqual(['quynh-anh'])
    expect(ids(filterManualStudents(all, '\thuyen\ntram\t'))).toEqual(['huyen-tram'])
  })
  it('viết hoa toàn bộ: tên, tên thánh, mã, lớp', () => {
    expect(ids(filterManualStudents(all, 'QUYNH'))).toEqual(['no-class', 'quynh-anh'])
    expect(ids(filterManualStudents(all, 'MARIA'))).toEqual(['quynh-anh'])
    expect(ids(filterManualStudents(all, 'qa001'))).toEqual(['quynh-anh'])
    expect(ids(filterManualStudents(all, 'ẤU 1A'))).toEqual(['duc', 'toan'])
  })
  it('thứ tự từ khoá không quan trọng với quy tắc tiền tố', () => {
    expect(ids(filterManualStudents(all, 'anh quynh'))).toEqual(['quynh-anh'])
  })
})

describe('filterManualStudents — ranh giới từ ở đoạn cuối', () => {
  it('"an" không khớp "Toan" (không phải ranh giới từ), "toan" thì khớp', () => {
    expect(filterManualStudents([toan], 'an')).toEqual([])
    expect(ids(filterManualStudents([toan], 'toan'))).toEqual(['toan'])
    expect(ids(filterManualStudents([toan], 'van toan'))).toEqual(['toan'])
    expect(filterManualStudents([toan], 'n van toan')).toEqual([])
  })
  it('nguyên họ tên là đoạn cuối → khớp (kể cả họ)', () => {
    expect(ids(filterManualStudents([toan], 'nguyen van toan'))).toEqual(['toan'])
  })
})

describe('filterManualStudents — classId', () => {
  it('classId + chuỗi toàn khoảng trắng → cả lớp, đã sắp theo tên', () => {
    expect(ids(filterManualStudents(all, '   ', 'c1'))).toEqual(['single', 'duc', 'toan'])
    expect(ids(filterManualStudents(all, '\t\n', 'c2'))).toEqual(['huyen-tram', 'quynh-anh'])
  })
  it('classId không tồn tại → rỗng; classId + từ khoá lớp khác → rỗng', () => {
    expect(filterManualStudents(all, '', 'nope')).toEqual([])
    expect(filterManualStudents(all, 'quynh', 'c1')).toEqual([])
  })
  it('em class_id null bị loại khi có classId nhưng vẫn tìm được khi không lọc lớp', () => {
    expect(filterManualStudents(all, 'quynh', 'c1')).not.toContain(noClass)
    expect(ids(filterManualStudents(all, 'quynh'))).toEqual(['no-class', 'quynh-anh'])
  })
  it('không classId + chuỗi rỗng/khoảng trắng → rỗng dù có dữ liệu', () => {
    expect(filterManualStudents(all, '')).toEqual([])
    expect(filterManualStudents(all, '   ')).toEqual([])
    expect(filterManualStudents(all, '', null)).toEqual([])
    expect(filterManualStudents(all, '', undefined)).toEqual([])
  })
})

describe('filterManualStudents — tên một từ & trường null', () => {
  it('họ tên chỉ có 1 từ: khớp khi gõ đúng cả từ (quy tắc đoạn cuối), không khớp tiền tố họ', () => {
    expect(ids(filterManualStudents([single], 'nguyen'))).toEqual(['single'])
    expect(filterManualStudents([single], 'ngu')).toEqual([])
  })
  it('saint/code/phone/className null hoặc thiếu: không ném lỗi, tên vẫn khớp, SĐT không khớp', () => {
    expect(() => filterManualStudents([toan, noClass], '090')).not.toThrow()
    expect(filterManualStudents([toan, noClass], '090')).toEqual([])
    expect(ids(filterManualStudents([toan, noClass], 'quynh'))).toEqual(['no-class'])
  })
  it('họ tên rỗng không ném lỗi', () => {
    expect(() => filterManualStudents([{ id: 'e', full_name: '' }], 'a')).not.toThrow()
    expect(filterManualStudents([{ id: 'e', full_name: '' }], 'a')).toEqual([])
  })
})

describe('filterManualStudents — SĐT', () => {
  it('chỉ từ khoá toàn chữ số ≥3 mới tìm theo SĐT; tách nhiều cụm số đều phải nằm trong SĐT', () => {
    expect(ids(filterManualStudents(all, '091 2345'))).toEqual(['duc'])
    expect(filterManualStudents(all, '09')).toEqual([])
    expect(filterManualStudents(all, '0912abc')).toEqual([])
    expect(filterManualStudents(all, '091-234')).toEqual([])
  })
  it('SĐT có dấu gạch / khoảng trắng trong dữ liệu vẫn khớp chuỗi số liên tục', () => {
    const dashed: S = { id: 'd', full_name: 'Lê An', parent_phone: '090 123-4567' }
    expect(ids(filterManualStudents([dashed], '1234'))).toEqual(['d'])
  })
})

describe('filterManualStudents — ký tự đặc biệt, không đột biến, giới hạn', () => {
  it('ký tự regex trong từ khoá không ném lỗi và không khớp bừa', () => {
    for (const q of ['a.*', '(', '[', '\\', '%', '_', '.*']) {
      expect(() => filterManualStudents(all, q), q).not.toThrow()
      expect(filterManualStudents(all, q), q).toEqual([])
    }
  })
  it('không đột biến mảng đầu vào', () => {
    const input = [quynhAnh, huyenTram, duc]
    const snapshot = [...input]
    filterManualStudents(input, 'ngoc')
    expect(input).toEqual(snapshot)
  })
  it('vượt giới hạn: trả 20 em ĐẦU theo thứ tự tên (sắp trước khi cắt), không phải 20 em đầu mảng', () => {
    const many: S[] = Array.from({ length: 30 }, (_, i) => ({
      id: `s${i}`,
      // Đảo thứ tự để phần tử đầu mảng có tên xếp sau
      full_name: `Nguyễn Văn Anh ${String(29 - i).padStart(2, '0')}`,
      class_id: 'big',
    }))
    const out = filterManualStudents(many, 'anh')
    expect(out).toHaveLength(20)
    expect(out[0].full_name).toBe('Nguyễn Văn Anh 00')
    expect(out[19].full_name).toBe('Nguyễn Văn Anh 19')
    expect(filterManualStudents(many, '', 'big')).toHaveLength(30)
  })
  it('Unicode ngoài tiếng Việt (emoji, chữ Hán) không ném lỗi', () => {
    const odd: S = { id: 'o', full_name: '阮 文 😀', saint_name: '😀' }
    expect(() => filterManualStudents([odd], '😀')).not.toThrow()
    expect(ids(filterManualStudents([odd], '😀'))).toEqual(['o'])
  })
})
