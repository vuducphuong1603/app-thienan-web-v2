import { describe, it, expect } from 'vitest'
import { givenNameOf, sortByGivenName } from '../student-sort'

const s = (full_name: string) => ({ full_name })

describe('givenNameOf', () => {
  it('lấy chữ cuối của họ tên làm tên gọi', () => {
    expect(givenNameOf('Nguyễn Văn An')).toBe('An')
    expect(givenNameOf('  Trần   Bình  ')).toBe('Bình')
    expect(givenNameOf('An')).toBe('An')
    expect(givenNameOf('')).toBe('')
  })
})

describe('sortByGivenName', () => {
  it('xếp theo tên gọi đúng thứ tự bảng chữ cái tiếng Việt (a ă â b... d đ)', () => {
    const list = [
      s('Lê Đăng'),
      s('Nguyễn Văn An'),
      s('Trần Ân'),
      s('Phạm Bình'),
      s('Võ Anh'),
      s('Hoàng Dũng'),
    ]
    expect(sortByGivenName(list).map(x => x.full_name)).toEqual([
      'Nguyễn Văn An',
      'Võ Anh',
      'Trần Ân',
      'Phạm Bình',
      'Hoàng Dũng',
      'Lê Đăng',
    ])
  })

  it('trùng tên gọi thì xếp tiếp theo họ và tên đệm', () => {
    const list = [s('Vũ Duy Khang'), s('Đỗ Duy Khang'), s('Nguyễn Duy Khang')]
    expect(sortByGivenName(list).map(x => x.full_name)).toEqual([
      'Đỗ Duy Khang',
      'Nguyễn Duy Khang',
      'Vũ Duy Khang',
    ])
  })

  it('không thay đổi mảng gốc', () => {
    const list = [s('Trần Bình'), s('Lê An')]
    sortByGivenName(list)
    expect(list.map(x => x.full_name)).toEqual(['Trần Bình', 'Lê An'])
  })
})
