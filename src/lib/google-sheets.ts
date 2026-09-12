/**
 * Ghi Google Sheets từ server (API route) bằng Service Account — không cần thư viện googleapis.
 * Biến môi trường:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  email của service account (phải được share quyền Editor trên file sheet)
 *   GOOGLE_PRIVATE_KEY            private key PEM (có thể giữ nguyên "\n" dạng escape khi dán vào Vercel)
 */
import { createSign } from 'crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

let cachedToken: { token: string; exp: number } | null = null

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function isSheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
}

export async function getSheetsAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Chưa cấu hình GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY')

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const signature = b64url(signer.sign(key))
  const assertion = `${header}.${claim}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`Google token lỗi ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: json.access_token, exp: now + json.expires_in }
  return json.access_token
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getSheetsAccessToken()
  const res = await fetch(`${SHEETS_API}/${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Google Sheets lỗi ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Tên tab có khoảng trắng/ký tự đặc biệt phải bọc trong dấu nháy đơn */
export function a1(sheetName: string, range: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`
}

export async function getSheetValues(spreadsheetId: string, range: string): Promise<unknown[][]> {
  const json = await sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(range)}`)
  return (json.values as unknown[][]) || []
}

export async function updateSheetValues(spreadsheetId: string, range: string, values: unknown[][]): Promise<void> {
  await sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  })
}
