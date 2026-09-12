'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { supabase, ThieuNhiProfile, Class, BRANCHES } from '@/lib/supabase'
import { useActiveClasses, useSchoolYears } from '@/lib/queries'
import { useAuth } from '@/lib/auth-context'
import { sortByGivenName } from '@/lib/student-sort'
import { filterCardStudents, toggleId } from '@/lib/card-reissue'
import { defaultAssignedClassId, prioritizeAssignedBranch, prioritizeAssignedClass } from '@/lib/class-teachers'
import { ArrowLeft, Search, Check, X, AlertCircle, CheckCircle2, IdCard, Loader2, ExternalLink, ChevronDown } from 'lucide-react'

const SHEET_URL = process.env.NEXT_PUBLIC_CARD_REISSUE_SHEET_URL
  || 'https://docs.google.com/spreadsheets/d/1VL99rao6-G0HPURXvIDenqyYlJtFhC0zaQ7HZjE4vzg/edit'

interface ExistingRequest {
  student_id: string
  created_at: string
  requested_by_name: string
  sheet_status: 'pending' | 'synced' | 'failed'
}

type Notice = { type: 'success' | 'error' | 'warning'; message: string }

export default function CardReissuePage() {
  const { user } = useAuth()
  const { data: classes = [] } = useActiveClasses()
  const { data: schoolYears = [] } = useSchoolYears()
  const schoolYear = schoolYears.find(y => y.is_current) || schoolYears[0] || null

  const [selectedClassId, setSelectedClassId] = useState('')
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState<ThieuNhiProfile[]>([])
  const [existing, setExisting] = useState<Record<string, ExistingRequest>>({})
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  // Ai được phân công lớp (GLV, admin kiêm nhiệm, phân đoàn trưởng) đều mặc định chọn lớp của mình
  useEffect(() => {
    if (selectedClassId) return
    const mine = defaultAssignedClassId(classes, user)
    if (mine) setSelectedClassId(mine)
  }, [classes, user, selectedClassId])

  const showNotice = (n: Notice, ms = 6000) => {
    setNotice(n)
    setTimeout(() => setNotice(null), ms)
  }

  // Dropdown: ngành và lớp được phân công lên đầu
  const classesGroupedByBranch = useMemo(() => prioritizeAssignedBranch(BRANCHES, classes, user).reduce((acc, branch) => {
    const list = prioritizeAssignedClass(classes.filter(c => c.branch === branch), user)
    if (list.length > 0) acc[branch] = list
    return acc
  }, {} as Record<string, Class[]>), [classes, user])

  const selectedClass = classes.find(c => c.id === selectedClassId)

  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) { setStudents([]); setExisting({}); return }
    setLoading(true)
    try {
      const [{ data: stu, error }, { data: reqs }] = await Promise.all([
        supabase.from('thieu_nhi').select('*').eq('class_id', selectedClassId).eq('status', 'ACTIVE'),
        (() => {
          let q = supabase.from('card_reissue_requests')
            .select('student_id, created_at, requested_by_name, sheet_status')
            .eq('class_id', selectedClassId)
            .order('created_at', { ascending: false })
          if (schoolYear?.id) q = q.eq('school_year_id', schoolYear.id)
          return q
        })(),
      ])
      if (error) throw error
      setStudents(sortByGivenName((stu || []) as ThieuNhiProfile[]))
      const map: Record<string, ExistingRequest> = {}
      for (const r of (reqs || []) as ExistingRequest[]) {
        if (!map[r.student_id]) map[r.student_id] = r // mới nhất
      }
      setExisting(map)
    } catch (e) {
      console.error(e)
      showNotice({ type: 'error', message: 'Không thể tải danh sách thiếu nhi' })
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, schoolYear?.id])

  useEffect(() => { fetchStudents() }, [fetchStudents])
  useEffect(() => { setSelectedIds([]); setSearchQuery('') }, [selectedClassId])

  const filtered = useMemo(() => filterCardStudents(students, searchQuery), [students, searchQuery])
  const allVisibleSelected = filtered.length > 0 && filtered.every(s => selectedIds.includes(s.id))
  const selectedStudents = students.filter(s => selectedIds.includes(s.id))

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(filtered.map(s => s.id))
      setSelectedIds(ids => ids.filter(id => !visible.has(id)))
    } else {
      setSelectedIds(ids => Array.from(new Set([...ids, ...filtered.map(s => s.id)])))
    }
  }

  const submit = async () => {
    if (selectedIds.length === 0 || submitting) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại')
      const res = await fetch('/api/card-reissue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ studentIds: selectedIds, note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Đăng ký thất bại')
      setConfirmOpen(false)
      setNote('')
      setSelectedIds([])
      if (json.synced) {
        showNotice({ type: 'success', message: `Đã đăng ký ${json.count} em và ghi vào Google Sheet (dòng ${json.startRow}–${json.endRow})` })
      } else {
        showNotice({ type: 'warning', message: `Đã lưu đăng ký ${json.count} em trong app nhưng CHƯA đẩy được lên Google Sheet: ${json.sheetError}` }, 12000)
      }
      fetchStudents()
    } catch (e) {
      showNotice({ type: 'error', message: e instanceof Error ? e.message : 'Đã có lỗi xảy ra' })
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN')

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/activities" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Đăng ký làm lại thẻ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chọn lớp, tích chọn thiếu nhi cần làm lại thẻ rồi xác nhận — dữ liệu tự ghi vào Google Sheet</p>
        </div>
        <a href={SHEET_URL} target="_blank" rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20">
          <ExternalLink className="w-4 h-4" /> Mở Google Sheet
        </a>
      </div>

      {/* Mobile: nút mở Google Sheet full-width dưới tiêu đề */}
      <a href={SHEET_URL} target="_blank" rel="noopener noreferrer"
        className="sm:hidden flex items-center justify-center gap-1.5 w-full px-3 py-2.5 text-sm font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20">
        <ExternalLink className="w-4 h-4" /> Mở Google Sheet
      </a>

      {notice && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-[60] px-4 py-3 rounded-lg shadow-lg flex items-start gap-2 text-white ${
          notice.type === 'success' ? 'bg-green-500' : notice.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-sm font-medium">{notice.message}</span>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Danh sách làm lại thẻ {schoolYear?.name || ''}</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Định kỳ <strong>Thứ 3</strong> sẽ đặt làm thẻ và trả về cho GLV ngay trong Chủ nhật.</li>
              <li>Nếu đăng ký sau Thứ 3, thẻ sẽ trả vào Chủ nhật tuần sau nữa.</li>
              <li>Tên GLV nhập sẽ ghi là <strong>{user?.full_name}</strong>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-white/10 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <button onClick={() => setIsClassDropdownOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/10 min-w-[180px]">
              <span className="text-sm text-gray-700 dark:text-gray-200">{selectedClass?.name || 'Chọn lớp'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            {isClassDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsClassDropdownOpen(false)} />
                <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {Object.entries(classesGroupedByBranch).map(([branch, list]) => (
                    <div key={branch}>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{branch}</div>
                      {list.map(cls => (
                        <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setIsClassDropdownOpen(false) }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/10 ${
                            selectedClassId === cls.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 dark:text-gray-200'}`}>
                          {cls.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Tìm thiếu nhi (tên, tên thánh, mã)..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} disabled={!selectedClassId}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-white/10 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> Đang tải...
          </div>
        ) : !selectedClassId ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Vui lòng chọn lớp để xem danh sách thiếu nhi</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Không có thiếu nhi nào</div>
        ) : (
          <>
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}
                  className="w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Chọn tất cả ({filtered.length} em{searchQuery ? ' đang hiển thị' : ''})
                </span>
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">Đã chọn: <strong className="text-brand">{selectedIds.length}</strong></span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {filtered.map(s => {
                const checked = selectedIds.includes(s.id)
                const ex = existing[s.id]
                return (
                  <label key={s.id} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 ${checked ? 'bg-orange-50/60 dark:bg-brand/10' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => setSelectedIds(ids => toggleId(ids, s.id))}
                      className="w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand shrink-0" />
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{s.full_name.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {s.saint_name && <span className="text-gray-500 dark:text-gray-400">{s.saint_name} </span>}{s.full_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {s.student_code ? <span className="mr-2">MS: {s.student_code}</span> : <span className="mr-2 text-red-500">Chưa có mã</span>}
                        {selectedClass?.name}
                      </p>
                    </div>
                    {ex && (
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        ex.sheet_status === 'synced' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
                        title={`${ex.requested_by_name} đăng ký`}>
                        Đã ĐK {fmtDate(ex.created_at)}{ex.sheet_status !== 'synced' ? ' (chưa lên sheet)' : ''}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-700 dark:text-gray-200">
              Đã chọn <strong className="text-brand">{selectedIds.length}</strong> em
              <button onClick={() => setSelectedIds([])} className="ml-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">Bỏ chọn</button>
            </div>
            <button onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-full font-semibold hover:opacity-90 transition">
              <IdCard className="w-5 h-5" /> Đăng ký làm lại thẻ
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !submitting && setConfirmOpen(false)}>
          <div className="bg-white dark:bg-[#1a1a1a] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Xác nhận đăng ký làm lại thẻ</h2>
              <button onClick={() => setConfirmOpen(false)} disabled={submitting} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedStudents.length} em lớp <strong>{selectedClass?.name}</strong> sẽ được ghi vào Google Sheet với tên GLV nhập là <strong>{user?.full_name}</strong>.
              </p>
              <ul className="text-sm divide-y divide-gray-100 dark:divide-white/10 border border-gray-100 dark:border-white/10 rounded-lg max-h-56 overflow-y-auto">
                {selectedStudents.map((s, i) => (
                  <li key={s.id} className="px-3 py-2 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <span className="text-gray-400 w-6">{i + 1}.</span>
                    <span className="flex-1 truncate">{s.saint_name ? `${s.saint_name} ` : ''}{s.full_name}</span>
                    <span className="text-xs text-gray-500">{s.student_code || '—'}</span>
                  </li>
                ))}
              </ul>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ghi chú (tuỳ chọn)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} placeholder="VD: mất thẻ, thẻ bị hư..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-white/10 flex gap-3 justify-end">
              <button onClick={() => setConfirmOpen(false)} disabled={submitting}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10">Huỷ</button>
              <button onClick={submit} disabled={submitting}
                className="px-5 py-2 rounded-lg bg-brand text-white font-semibold hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang ghi...</> : <><Check className="w-4 h-4" /> Xác nhận</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
