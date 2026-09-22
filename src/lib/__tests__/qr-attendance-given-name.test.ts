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
  it('em có tên riêng khớp đứng trước em chỉ khớp tên đệm', () => {
    const out = ids(filterManualStudents([yenNhi, vuYen, hoangYen], 'yen'))
    expect(out).toEqual(['hoang-yen', 'vu-yen', 'yen-nhi'])
  })

  it('tên riêng đúng không bị cắt mất khi có > 20 em khớp tên đệm', () => {
    const middle = Array.from({ length: 25 }, (_, i) => mk(`m${i}`, `Anh Văn Yến Nhi${i}`))
    const out = ids(filterManualStudents([...middle, vuYen, hoangYen], 'yến'))
    expect(out.slice(0, 2)).toEqual(['hoang-yen', 'vu-yen'])
    expect(out).toHaveLength(20)
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
