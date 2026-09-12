import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildCardReissueRows, findFirstEmptyRow, CARD_SHEET_FIRST_DATA_ROW, type CardStudent } from '@/lib/card-reissue'
import { a1, getSheetValues, updateSheetValues, isSheetsConfigured } from '@/lib/google-sheets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** File "Danh sách làm lại thẻ thiếu nhi", tab "Làm Thẻ" */
const DEFAULT_CARD_SHEET_ID = '1VL99rao6-G0HPURXvIDenqyYlJtFhC0zaQ7HZjE4vzg'
const SHEET_ID = process.env.CARD_REISSUE_SHEET_ID || DEFAULT_CARD_SHEET_ID
const SHEET_TAB = process.env.CARD_REISSUE_SHEET_TAB || 'Làm Thẻ'
const MAX_PER_REQUEST = 100

interface Body {
  studentIds?: string[]
  note?: string
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }) }
  const studentIds = Array.from(new Set((body.studentIds || []).filter(id => typeof id === 'string' && id)))
  if (studentIds.length === 0) return NextResponse.json({ error: 'Chưa chọn thiếu nhi nào' }, { status: 400 })
  if (studentIds.length > MAX_PER_REQUEST) return NextResponse.json({ error: `Tối đa ${MAX_PER_REQUEST} em mỗi lần` }, { status: 400 })
  const note = (body.note || '').trim().slice(0, 500)

  const [{ data: profile }, { data: students, error: stuError }, { data: year }] = await Promise.all([
    supabase.from('users').select('full_name, saint_name').eq('id', user.id).maybeSingle(),
    supabase.from('thieu_nhi').select('id, student_code, saint_name, full_name, class_id, status, classes(name)').in('id', studentIds),
    supabase.from('school_years').select('id').eq('is_current', true).maybeSingle(),
  ])
  if (stuError) return NextResponse.json({ error: 'Không đọc được danh sách thiếu nhi' }, { status: 500 })
  if (!students || students.length === 0) return NextResponse.json({ error: 'Không tìm thấy thiếu nhi' }, { status: 404 })

  const teacherName = (profile?.full_name || user.email || 'GLV').trim()

  // Giữ đúng thứ tự người dùng đã chọn
  const byId = new Map(students.map(s => [s.id, s]))
  const ordered = studentIds.map(id => byId.get(id)).filter(Boolean) as typeof students
  const cardStudents: CardStudent[] = ordered.map(s => ({
    id: s.id,
    student_code: s.student_code,
    saint_name: s.saint_name,
    full_name: s.full_name,
    class_name: (s.classes as unknown as { name?: string } | null)?.name ?? '',
  }))

  // 1. Lưu vào app trước (trạng thái pending) — không mất dữ liệu nếu Google Sheet lỗi
  const { data: inserted, error: insError } = await supabase
    .from('card_reissue_requests')
    .insert(ordered.map(s => ({
      student_id: s.id,
      class_id: s.class_id,
      class_name: (s.classes as unknown as { name?: string } | null)?.name ?? null,
      school_year_id: year?.id ?? null,
      requested_by: user.id,
      requested_by_name: teacherName,
      note: note || null,
      sheet_status: 'pending',
    })))
    .select('id')
  if (insError || !inserted) {
    console.error('card_reissue insert error', insError)
    return NextResponse.json({ error: 'Không lưu được đăng ký' }, { status: 500 })
  }
  const requestIds = inserted.map(r => r.id)

  // 2. Đẩy lên Google Sheet
  if (!isSheetsConfigured()) {
    await supabase.from('card_reissue_requests').update({ sheet_status: 'failed', sheet_error: 'Chưa cấu hình Google Sheets' }).in('id', requestIds)
    return NextResponse.json({
      ok: true, count: ordered.length, synced: false,
      sheetError: 'Server chưa cấu hình Google Sheets (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY). Đăng ký đã được lưu trong app.',
    })
  }

  try {
    const colB = await getSheetValues(SHEET_ID, a1(SHEET_TAB, `B${CARD_SHEET_FIRST_DATA_ROW}:B`))
    const startRow = findFirstEmptyRow(colB, CARD_SHEET_FIRST_DATA_ROW)
    const rows = buildCardReissueRows(cardStudents, { teacherName, startStt: startRow - CARD_SHEET_FIRST_DATA_ROW + 1, note })
    const endRow = startRow + rows.length - 1
    await updateSheetValues(SHEET_ID, a1(SHEET_TAB, `A${startRow}:H${endRow}`), rows)

    await Promise.all(requestIds.map((id, i) =>
      supabase.from('card_reissue_requests').update({ sheet_status: 'synced', sheet_row: startRow + i, sheet_error: null }).eq('id', id)
    ))
    return NextResponse.json({ ok: true, count: rows.length, synced: true, startRow, endRow })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('card_reissue sheet error', message)
    await supabase.from('card_reissue_requests').update({ sheet_status: 'failed', sheet_error: message.slice(0, 1000) }).in('id', requestIds)
    return NextResponse.json({ ok: true, count: ordered.length, synced: false, sheetError: message })
  }
}
