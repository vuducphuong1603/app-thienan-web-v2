export interface RecipientUser {
  id: string
  branch?: string | null
  class_id?: string | null
  status?: string | null
}

export interface RecipientClass {
  id: string
  branch?: string | null
  status?: string | null
}

export function branchRecipientIds(
  users: RecipientUser[],
  classes: RecipientClass[],
  branches: string[],
): string[] {
  const selectedBranches = new Set(branches)
  if (selectedBranches.size === 0) return []

  const selectedClassIds = new Set(
    classes
      .filter(cls => cls.status === 'ACTIVE' && cls.branch != null && selectedBranches.has(cls.branch))
      .map(cls => cls.id),
  )

  const seen = new Set<string>()
  const recipientIds: string[] = []

  for (const user of users) {
    if (user.status !== 'ACTIVE') continue

    const matchesUserBranch = user.branch != null && selectedBranches.has(user.branch)
    const matchesUserClass = user.class_id != null && selectedClassIds.has(user.class_id)
    if ((!matchesUserBranch && !matchesUserClass) || seen.has(user.id)) continue

    seen.add(user.id)
    recipientIds.push(user.id)
  }

  return recipientIds
}

export const NOTIFICATION_BATCH_SIZE = 500

export function chunk<T>(arr: T[], size = NOTIFICATION_BATCH_SIZE): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError('Chunk size must be a positive integer')
  }

  const chunks: T[][] = []
  for (let index = 0; index < arr.length; index += size) {
    chunks.push(arr.slice(index, index + size))
  }
  return chunks
}
