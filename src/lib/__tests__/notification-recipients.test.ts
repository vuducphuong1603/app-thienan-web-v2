import { describe, expect, it } from 'vitest'
import {
  branchRecipientIds,
  chunk,
  NOTIFICATION_BATCH_SIZE,
  type RecipientClass,
  type RecipientUser,
} from '../notification-recipients'

const activeClassA: RecipientClass = { id: 'class-a', branch: 'A', status: 'ACTIVE' }
const activeClassB: RecipientClass = { id: 'class-b', branch: 'B', status: 'ACTIVE' }

describe('branchRecipientIds', () => {
  it('includes an active user with a selected branch and no class', () => {
    const users: RecipientUser[] = [{ id: 'u-branch', branch: 'A', class_id: null, status: 'ACTIVE' }]
    expect(branchRecipientIds(users, [], ['A'])).toEqual(['u-branch'])
  })

  it('includes an active user with a selected class and no user branch', () => {
    const users: RecipientUser[] = [{ id: 'u-class', branch: null, class_id: 'class-a', status: 'ACTIVE' }]
    expect(branchRecipientIds(users, [activeClassA], ['A'])).toEqual(['u-class'])
  })

  it('unions branch and class matches and deduplicates a user found by both', () => {
    const users: RecipientUser[] = [
      { id: 'u-both', branch: 'A', class_id: 'class-a', status: 'ACTIVE' },
      { id: 'u-class', branch: null, class_id: 'class-a', status: 'ACTIVE' },
    ]
    expect(branchRecipientIds(users, [activeClassA], ['A'])).toEqual(['u-both', 'u-class'])
  })

  it('excludes inactive users even when their branch or class matches', () => {
    const users: RecipientUser[] = [
      { id: 'u-inactive-branch', branch: 'A', class_id: null, status: 'INACTIVE' },
      { id: 'u-inactive-class', branch: null, class_id: 'class-a', status: 'INACTIVE' },
    ]
    expect(branchRecipientIds(users, [activeClassA], ['A'])).toEqual([])
  })

  it('excludes users whose matching class is inactive', () => {
    const users: RecipientUser[] = [{ id: 'u-inactive-class', branch: null, class_id: 'class-old', status: 'ACTIVE' }]
    const classes: RecipientClass[] = [{ id: 'class-old', branch: 'A', status: 'INACTIVE' }]
    expect(branchRecipientIds(users, classes, ['A'])).toEqual([])
  })

  it('returns no recipients for an empty branch selection', () => {
    const users: RecipientUser[] = [{ id: 'u-branch', branch: 'A', class_id: null, status: 'ACTIVE' }]
    expect(branchRecipientIds(users, [activeClassA], [])).toEqual([])
  })

  it('supports multiple selected branches', () => {
    const users: RecipientUser[] = [
      { id: 'u-a', branch: 'A', status: 'ACTIVE' },
      { id: 'u-b', branch: 'B', status: 'ACTIVE' },
      { id: 'u-c', branch: 'C', status: 'ACTIVE' },
      { id: 'u-class-b', class_id: 'class-b', status: 'ACTIVE' },
    ]
    expect(branchRecipientIds(users, [activeClassB], ['A', 'B'])).toEqual(['u-a', 'u-b', 'u-class-b'])
  })

  it('requires an active class branch to match the selected branches', () => {
    const users: RecipientUser[] = [
      { id: 'u-a', class_id: 'class-a', status: 'ACTIVE' },
      { id: 'u-missing', class_id: 'class-missing', status: 'ACTIVE' },
    ]
    expect(branchRecipientIds(users, [activeClassA], ['B'])).toEqual([])
  })

  it('does not include users without either a matching branch or class', () => {
    const users: RecipientUser[] = [
      { id: 'u-none', branch: null, class_id: null, status: 'ACTIVE' },
      { id: 'u-other', branch: 'B', class_id: null, status: 'ACTIVE' },
    ]
    expect(branchRecipientIds(users, [activeClassA], ['A'])).toEqual([])
  })

  it('deduplicates repeated user rows while preserving first-seen order', () => {
    const users: RecipientUser[] = [
      { id: 'u-a', branch: 'A', status: 'ACTIVE' },
      { id: 'u-a', branch: 'A', class_id: 'class-a', status: 'ACTIVE' },
      { id: 'u-b', branch: 'A', status: 'ACTIVE' },
    ]
    expect(branchRecipientIds(users, [activeClassA], ['A'])).toEqual(['u-a', 'u-b'])
  })
})

describe('chunk', () => {
  it('uses batches of 500 by default', () => {
    const batches = chunk(Array.from({ length: 500 }, (_, i) => i))
    expect(NOTIFICATION_BATCH_SIZE).toBe(500)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(500)
  })

  it('splits 1001 values into 500, 500, and 1', () => {
    const batches = chunk(Array.from({ length: 1001 }, (_, i) => i))
    expect(batches.map(batch => batch.length)).toEqual([500, 500, 1])
  })

  it('returns no batches for an empty input', () => {
    expect(chunk([])).toEqual([])
  })

  it('supports a custom positive batch size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('rejects a non-positive batch size', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError)
  })
})
