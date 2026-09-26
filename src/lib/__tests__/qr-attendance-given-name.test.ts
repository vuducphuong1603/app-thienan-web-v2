import { describe, it, expect } from 'vitest'
import { filterManualStudents } from '../qr-attendance'

// Tìm thủ công theo TÊN RIÊNG (từ cuối của họ tên) — lỗi 22/09/2026:
// gõ "yến" ra lẫn "Yến Nhi", "Yên Chi", sắp theo họ rồi cắt 20 nên mất "Vũ Ngọc Yến".
type S = { id: string; full_name: string; class_id?: string | null }
const ids = (rows: S[]) => rows.map(s => s.id)
const mk = (id: string, full_name: string): S => ({ id, full_name, class_id: 'c1' })

const hoangYen = mk('hoang-yen', 'Đinh Phạm Hoàng Yến')
const vuYen = mk('vu-yen', 'Vũ Ngọc Yến')
const yenNhi = mk('yen-nhi', 'Nguyễn Yến Nhi')
const yenChi = mk('yen-chi', 'Nguyễn Thị Yên Chi')
const anYen = mk('an-yen', 'Phạm An Yên')

describe('filterManualStudents — ưu tiên tên riêng', () => {
  it('gõ 1 từ: chỉ ra em có tên riêng khớp, bỏ em chỉ khớp tên đệm', () => {
    const out = ids(filterManualStudents([yenNhi, vuYen, hoangYen], 'yen'))
    expect(out).toEqual(['hoang-yen', 'vu-yen'])
  })

  it('tên riêng đúng không bị cắt mất khi có > 20 em khớp tên đệm', () => {
    const middle = Array.from({ length: 25 }, (_, i) => mk(`m${i}`, `Anh Văn Yến Nhi${i}`))
    const out = ids(filterManualStudents([...middle, vuYen, hoangYen], 'yến'))
    expect(out).toEqual(['hoang-yen', 'vu-yen'])
  })

  it('khớp đúng tên riêng xếp trước khớp đầu tên riêng', () => {
    const yenTen = mk('yen', 'Vũ Thị Yến')
    const yenPrefix = mk('yenn', 'Anh Thị Yếnn')
    expect(ids(filterManualStudents([yenPrefix, yenTen], 'yến'))).toEqual(['yen', 'yenn'])
  })
})

describe('filterManualStudents — gõ có dấu thì khớp đúng dấu', () => {
  it('"yến" không ra "Yên"', () => {
    const out = ids(filterManualStudents([hoangYen, yenChi, anYen], 'yến'))
    expect(out).toEqual(['hoang-yen'])
  })

  it('"yên" (cũng là lúc đang gõ dở "yến") xếp "Yên" đúng dấu lên trước', () => {
    expect(ids(filterManualStudents([hoangYen, anYen], 'yên'))).toEqual(['an-yen', 'hoang-yen'])
  })

  it('gõ không dấu vẫn ra tất cả', () => {
    expect(ids(filterManualStudents([hoangYen, anYen], 'yen')).sort()).toEqual(['an-yen', 'hoang-yen'])
  })

  it('gõ dở dấu (bộ gõ Telex: "yê") vẫn khớp "Yến" và "Yên"', () => {
    expect(ids(filterManualStudents([hoangYen, anYen], 'yê')).sort()).toEqual(['an-yen', 'hoang-yen'])
  })

  it('"Đuc" khớp "Đức" nhưng "đ" không khớp "d"', () => {
    const duc = mk('duc', 'Nguyễn Văn Đức')
    const dung = mk('dung', 'Nguyễn Văn Dũng')
    expect(ids(filterManualStudents([duc, dung], 'Đuc'))).toEqual(['duc'])
    expect(ids(filterManualStudents([duc, dung], 'đ'))).toEqual(['duc'])
    expect(ids(filterManualStudents([duc, dung], 'd')).sort()).toEqual(['duc', 'dung'])
  })

  it('cụm cuối họ tên có dấu: "hải yến" không ra "Hải Yên"', () => {
    const haiYen = mk('hai-yen', 'Lưu Nguyễn Hải Yến')
    const haiYen2 = mk('hai-yen2', 'Lê Hải Yên')
    expect(ids(filterManualStudents([haiYen, haiYen2], 'hải yến'))).toEqual(['hai-yen'])
  })
})

// Lỗi 26/09/2026: gõ 1 tên vẫn lẫn em khớp tên đệm / tên thánh / tên lớp
// ("nghĩa" ra cả lớp Nghĩa 1A, "tâm" ra cả lớp Khai Tâm).
describe('filterManualStudents — gõ 1 từ: có em khớp tên riêng thì chỉ hiện các em đó', () => {
  type R = S & { saint_name?: string; className?: string; student_code?: string }
  const r = (id: string, full_name: string, extra: Partial<R> = {}): R => ({ id, full_name, class_id: 'c1', ...extra })

  it('"tâm" không ra em lớp Khai Tâm / tên đệm Tâm', () => {
    const tam = r('tam', 'Nguyễn Minh Tâm')
    const khaiTam = r('kt', 'Lê Văn Bình', { className: 'Khai Tâm A' })
    const middle = r('mid', 'Trần Tâm Như')
    expect(ids(filterManualStudents([khaiTam, middle, tam], 'tâm'))).toEqual(['tam'])
  })

  it('"an" không ra em tên thánh Gioan / Anna', () => {
    const an = r('an', 'Phạm Bình An')
    const gioan = r('gioan', 'Lê Văn Bình', { saint_name: 'Gioan' })
    const anna = r('anna', 'Lê Thị Hoa', { saint_name: 'Anna' })
    expect(ids(filterManualStudents([gioan, anna, an], 'an'))).toEqual(['an'])
  })

  it('không em nào khớp tên riêng thì vẫn tìm theo lớp / tên đệm / mã', () => {
    const a = r('a', 'Lê Văn Bình', { className: 'Hiệp Sĩ 1' })
    const b = r('b', 'Trần Ngọc Như', { student_code: 'TN-123' })
    expect(ids(filterManualStudents([a, b], 'hiệp'))).toEqual(['a'])
    expect(ids(filterManualStudents([a, b], 'ngọc'))).toEqual(['b'])
    expect(ids(filterManualStudents([a, b], 'tn-123'))).toEqual(['b'])
  })

  it('gõ nhiều từ vẫn tìm theo lớp như cũ ("nghĩa 1a" ra cả lớp)', () => {
    const nghia = r('nghia', 'Lê Văn Nghĩa', { className: 'Nghĩa 1A' })
    const other = r('other', 'Lê Văn Bình', { className: 'Nghĩa 1A' })
    expect(ids(filterManualStudents([other, nghia], 'nghĩa 1a'))).toEqual(['nghia', 'other'])
  })
})
