import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { PriestReportData } from '@/components/PriestReportTemplate'
import { buildPriestReportWorkbook } from '@/lib/priest-report-excel'

export const runtime = 'nodejs'

const MAX_REQUEST_BYTES = 1024 * 1024
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isPriestReportData(value: unknown): value is PriestReportData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const data = value as Record<string, unknown>
  return Array.isArray(data.branches)
    && typeof data.fromDate === 'string'
    && DATE_PATTERN.test(data.fromDate)
    && typeof data.toDate === 'string'
    && DATE_PATTERN.test(data.toDate)
    && Array.isArray(data.subtitleLines)
    && data.subtitleLines.length === 2
    && data.subtitleLines.every(line => typeof line === 'string')
}

async function readBodyWithinLimit(request: NextRequest): Promise<Uint8Array | null> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return null

  const reader = request.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authorization = request.headers.get('authorization') ?? ''
  const tokenMatch = /^Bearer\s+(.+)$/i.exec(authorization)
  const token = tokenMatch?.[1].trim()
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  let authenticated = false
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    authenticated = !error && !!user
  } catch {
    authenticated = false
  }
  if (!authenticated) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

  const bytes = await readBodyWithinLimit(request)
  if (!bytes) return NextResponse.json({ error: 'Dữ liệu không hợp lệ hoặc vượt quá 1 MB' }, { status: 400 })

  let body: unknown
  try {
    body = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }
  if (!isPriestReportData(body)) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })

  let logo: Uint8Array | undefined
  try {
    logo = await readFile(path.join(process.cwd(), 'public/images/tntt-logo-priest-report.jpeg'))
  } catch {
    try {
      const response = await fetch(new URL('/images/tntt-logo-priest-report.jpeg', request.url), {
        signal: AbortSignal.timeout(3000),
      })
      if (response.ok) logo = new Uint8Array(await response.arrayBuffer())
    } catch {
      // The workbook is still useful without its optional logo.
    }
  }

  try {
    const workbook = await buildPriestReportWorkbook(body, logo)
    const workbookBytes = new Uint8Array(await workbook.xlsx.writeBuffer())
    return new NextResponse(workbookBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bao_cao_chuyen_can_${body.fromDate}_${body.toDate}.xlsx"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Không thể tạo báo cáo Excel' }, { status: 500 })
  }
}
