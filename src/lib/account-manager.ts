import { UserRole } from './supabase'

const STORAGE_KEY = 'thien_an_accounts'

export interface StoredAccount {
  userId: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
  phone: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export function getStoredAccounts(): StoredAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveAccount(account: StoredAccount): void {
  const accounts = getStoredAccounts()
  const index = accounts.findIndex((a) => a.userId === account.userId)
  if (index >= 0) {
    accounts[index] = account
  } else {
    accounts.push(account)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function removeAccount(userId: string): void {
  const accounts = getStoredAccounts().filter((a) => a.userId !== userId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function updateAccountTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const accounts = getStoredAccounts()
  const index = accounts.findIndex((a) => a.userId === userId)
  if (index >= 0) {
    accounts[index].accessToken = accessToken
    accounts[index].refreshToken = refreshToken
    accounts[index].expiresAt = expiresAt
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }
}
