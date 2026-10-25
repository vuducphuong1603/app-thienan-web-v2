import { describe, expect, it } from 'vitest'
import { splitByStudentCode } from '@/lib/student-import'

const row = (student_code: string, full_name = 'Nguyễn Thiên Phúc', saint_name = 'Giuse') => ({
  student_code,
  full_name,
  saint_name,
})

describe('splitByStudentCode', () => {
  it('trùng tên + tên thánh nhưng khác Mã TN vẫn được thêm', () => {
    const { toInsert, skipped } = splitByStudentCode([row('NP132674')], ['NP102316'])
    expect(toInsert.map((s) => s.student_code)).toEqual(['NP132674'])
    expect(skipped).toEqual([])
  })

  it('Mã TN đã có trong hệ thống thì bỏ qua (dù khác tên)', () => {
    const { toInsert, skipped } = splitByStudentCode([row('NP102316', 'Tên Khác')], ['NP102316'])
    expect(toInsert).toEqual([])
    expect(skipped.map((s) => s.student_code)).toEqual(['NP102316'])
  })

  it('so mã sau khi chuẩn hoá: chữ thường, khoảng trắng, Ð (eth) đều khớp', () => {
    const { toInsert, skipped } = splitByStudentCode(
      [row(' np102316 '), row('Ðt182619')],
      ['NP102316', 'ĐT182619'],
    )
    expect(toInsert).toEqual([])
    expect(skipped).toHaveLength(2)
  })

  it('Mã TN lặp lại trong cùng file chỉ thêm dòng đầu', () => {
    const { toInsert, skipped } = splitByStudentCode([row('NP132674'), row('np132674', 'Em khác')], [])
    expect(toInsert.map((s) => s.full_name)).toEqual(['Nguyễn Thiên Phúc'])
    expect(skipped.map((s) => s.full_name)).toEqual(['Em khác'])
  })
})
