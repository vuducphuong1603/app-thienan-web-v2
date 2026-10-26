import { describe, it, expect } from 'vitest'
import { recorderName } from '../attendance-recorder'

describe('recorderName', () => {
  it('ghép tên thánh + họ tên giáo lý viên', () => {
    expect(recorderName({ saint_name: 'Maria', full_name: 'Nguyễn Thị Lan' })).toBe('Maria Nguyễn Thị Lan')
  })

  it('không có tên thánh thì chỉ hiện họ tên', () => {
    expect(recorderName({ full_name: 'Nguyễn Văn An' })).toBe('Nguyễn Văn An')
    expect(recorderName({ saint_name: '  ', full_name: 'Nguyễn Văn An' })).toBe('Nguyễn Văn An')
  })

  it('không rõ người điểm danh', () => {
    expect(recorderName(undefined)).toBe('Không rõ')
    expect(recorderName({ full_name: '' })).toBe('Không rõ')
  })
})
