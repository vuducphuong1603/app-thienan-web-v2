import { describe, expect, it } from 'vitest'
import { filterActiveNamedTeachers } from '../teacher-scope'

describe('filterActiveNamedTeachers', () => {
  it('keeps only ACTIVE teachers with a non-empty trimmed full name', () => {
    const teachers = [
      { id: 'active', status: 'ACTIVE', full_name: 'Nguyễn An' },
      { id: 'padded', status: 'ACTIVE', full_name: '   Trần Bình   ' },
      { id: 'inactive', status: 'INACTIVE', full_name: 'Lê Cường' },
      { id: 'blank', status: 'ACTIVE', full_name: '   ' },
      { id: 'missing', status: 'ACTIVE', full_name: null },
      { id: 'unknown-status', status: null, full_name: 'Phạm Dũng' },
    ]

    expect(filterActiveNamedTeachers(teachers).map((teacher) => teacher.id)).toEqual(['active', 'padded'])
  })

  it('returns a new empty list when no teacher is eligible', () => {
    const teachers = [{ id: 'blank', status: 'ACTIVE', full_name: '  ' }]

    expect(filterActiveNamedTeachers(teachers)).toEqual([])
  })
})
