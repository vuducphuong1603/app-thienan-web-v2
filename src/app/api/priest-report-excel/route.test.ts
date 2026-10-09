import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriestReportData } from '@/components/PriestReportTemplate'

const { mockGetUser, mockReadFile } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockReadFile: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, readFile: mockReadFile }
})

import { POST } from './route'

afterEach(() => {
  vi.unstubAllGlobals()
})

function reportData(): PriestReportData {
  return {
    branches: [{
      branch: 'Chiên Con',
      label: 'CHIÊN CON',
      classes: [{
        classId: 'class-1',
        className: 'Khai Tâm A',
        studentCount: 10,
        thu5Absent: 4,
        cnAbsent: 3,
        prevThu5Rate: null,
        prevCnRate: null,
        warnedNames: [],
        note: 'Thứ 5',
      }],
    }],
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    timeLabel: 'tháng 9/2026',
    subtitleLines: ['Báo cáo tháng 9/2026', '*T5 ngày 3,10,17,24/09'],
  }
}

function makeRequest(body: string, token?: string): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new NextRequest('http://localhost/api/priest-report-excel', {
    method: 'POST',
    headers,
    body,
  })
}

async function loadWorkbook(response: Response) {
  const excelModule = await import('exceljs')
  const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(
    Buffer.from(await response.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]
  )
  return workbook
}

describe('POST /api/priest-report-excel', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockReadFile.mockReset()
    mockReadFile.mockResolvedValue(readFileSync('public/images/tntt-logo-priest-report.jpeg'))
  })

  it('returns 401 when the authorization header is missing', async () => {
    const response = await POST(makeRequest(JSON.stringify(reportData())))

    expect(response.status).toBe(401)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns 401 when the access token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } })

    const response = await POST(makeRequest(JSON.stringify(reportData()), 'invalid-token'))

    expect(response.status).toBe(401)
    expect(mockGetUser).toHaveBeenCalledWith('invalid-token')
  })

  it('returns 400 when the report data has an invalid shape', async () => {
    const response = await POST(makeRequest(JSON.stringify({
      ...reportData(),
      subtitleLines: ['only one line'],
    }), 'valid-token'))

    expect(response.status).toBe(400)
  })

  it('returns 400 when the request body exceeds 1 MB', async () => {
    const oversizedBody = JSON.stringify({ ...reportData(), extra: 'x'.repeat(1024 * 1024) })

    const response = await POST(makeRequest(oversizedBody, 'valid-token'))

    expect(response.status).toBe(400)
  })

  it('returns the Excel workbook with the expected sheet, headers, and attendance formula', async () => {
    const response = await POST(makeRequest(JSON.stringify(reportData()), 'valid-token'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="bao_cao_chuyen_can_2026-09-01_2026-09-30.xlsx"'
    )

    const workbook = await loadWorkbook(response)

    const worksheet = workbook.getWorksheet('Bao cao chuyen can')
    expect(worksheet).toBeDefined()
    expect(['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6', 'I6', 'J6'].map(address => worksheet!.getCell(address).value)).toEqual([
      'PHÂN ĐOÀN', 'LỚP', 'SỈ SỐ', 'THỨ 5', 'TỈ LỆ T5 ', 'TL CŨ', 'GIÁO LÝ', 'TỈ LỆ GL', 'TL CŨ', 'GHI CHÚ',
    ])
    const formula = worksheet!.getCell('D7').value
    expect(formula).toMatchObject({ formula: 'C7-K7' })
    expect(`=${(formula as { formula: string }).formula}`).toBe('=C7-K7')
  })

  it('fetches the public logo when the bundled file is unavailable', async () => {
    const logoBytes = readFileSync('public/images/tntt-logo-priest-report.jpeg')
    mockReadFile.mockRejectedValue(new Error('public assets are not bundled'))
    const request = makeRequest(JSON.stringify(reportData()), 'valid-token')
    const expectedLogoUrl = new URL('/images/tntt-logo-priest-report.jpeg', request.url).toString()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      expect(String(input)).toBe(expectedLogoUrl)
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return new Response(logoBytes, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const workbook = await loadWorkbook(response)
    expect(workbook.getWorksheet('Bao cao chuyen can')!.getImages()).toHaveLength(1)
  })

  it('returns the workbook without a logo when both logo sources fail', async () => {
    mockReadFile.mockRejectedValue(new Error('public assets are not bundled'))
    const fetchMock = vi.fn(async (): Promise<Response> => {
      throw new Error('network unavailable')
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(makeRequest(JSON.stringify(reportData()), 'valid-token'))

    expect(response.status).toBe(200)
    const workbook = await loadWorkbook(response)
    expect(workbook.getWorksheet('Bao cao chuyen can')!.getImages()).toHaveLength(0)
  })

  it('returns the workbook without a logo when the fallback image response is not ok', async () => {
    mockReadFile.mockRejectedValue(new Error('public assets are not bundled'))
    const fetchMock = vi.fn(async (): Promise<Response> =>
      new Response(null, { status: 404 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(makeRequest(JSON.stringify(reportData()), 'valid-token'))

    expect(response.status).toBe(200)
    const workbook = await loadWorkbook(response)
    expect(workbook.getWorksheet('Bao cao chuyen can')!.getImages()).toHaveLength(0)
  })
})
