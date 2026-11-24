'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, Loader2, Plus } from 'lucide-react'
import html2canvas from 'html2canvas'
import { supabase } from '@/lib/supabase'
import type { Class, SchoolYear } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/queries'
import { filterByBranch } from '@/lib/branch-scope'
import type { BranchScope } from '@/lib/branch-scope'
import { monthOverlapsSchoolYear, monthRange, sessionDates } from '@/lib/priest-report'
import {
  buildPunctualityReport,
  defaultWeekAnchor,
  punctualityFileBase,
  weekRangeOf,
} from '@/lib/punctuality-report'
import type {
  PunctualityMode,
  PunctualityRecord,
  PunctualityReportData,
} from '@/lib/punctuality-report'
import PunctualityReportTemplate from '@/components/PunctualityReportTemplate'

export interface PunctualityReportSectionProps {
  /** Cùng đối tượng page.tsx truyền cho filterByBranch (PĐT chỉ thấy ngành của mình). */
  scope: BranchScope
  /** scopedBranches(scope) — thứ tự ngành của báo cáo. */
  reportBranches: string[]
  /** Năm học hiện tại của trang (dùng khi khoảng ngày không trùng năm học nào). */
  schoolYear: SchoolYear | null
  schoolYears: SchoolYear[] | undefined
  notify: (type: 'success' | 'error', message: string) => void
  /** Gọi sau khi xuất ảnh / Excel thành công, kèm thông báo (trang mở modal "Đã xuất…"). */
  onExported?: (message: string) => void
}

// ───────────────────────── Helper thuần (có test) ─────────────────────────

/** Số ngày tối đa của một báo cáo (tính cả hai đầu). */
export const PUNCTUALITY_MAX_DAYS = 366
export const PUNCTUALITY_NO_SESSION_MESSAGE = 'Khoảng ngày đã chọn không có buổi Thứ 5 / Chủ nhật nào'

export interface PunctualityRangeInput {
  mode: PunctualityMode
  weekDate: string
  /** 0..11 */
  month: number
  year: number
  day: string
  customFrom: string
  customTo: string
}

export type PunctualityRangeResult =
  | { ok: true; from: string; to: string }
  | { ok: false; message: string }

function parseYmd(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Số ngày giữa hai ngày local, tính cả hai đầu (from = to → 1). */
export function inclusiveDayCount(from: string, to: string): number {
  const a = parseYmd(from)
  const b = parseYmd(to)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
}

/** Kiểm tra bộ lọc thời gian và trả về khoảng ngày [from, to] hoặc thông báo lỗi. */
export function validatePunctualityRange(input: PunctualityRangeInput): PunctualityRangeResult {
  let from: string
  let to: string

  switch (input.mode) {
    case 'week': {
      if (!input.weekDate) return { ok: false, message: 'Vui lòng chọn ngày' }
      const range = weekRangeOf(input.weekDate)
      from = range.from
      to = range.to
      break
    }
    case 'day': {
      if (!input.day) return { ok: false, message: 'Vui lòng chọn ngày' }
      from = input.day
      to = input.day
      break
    }
    case 'month': {
      const range = monthRange(input.year, input.month)
      from = range.from
      to = range.to
      break
    }
    default: {
      if (!input.customFrom || !input.customTo) {
        return { ok: false, message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc' }
      }
      if (input.customFrom > input.customTo) {
        return { ok: false, message: 'Ngày bắt đầu không được sau ngày kết thúc' }
      }
      from = input.customFrom
      to = input.customTo
    }
  }

  if (inclusiveDayCount(from, to) > PUNCTUALITY_MAX_DAYS) {
    return { ok: false, message: 'Khoảng ngày tối đa 1 năm' }
  }
  return { ok: true, from, to }
}

function formatDmy(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** Nhãn tuần hiển thị cạnh ô chọn ngày: `Tuần: dd/mm/yyyy - dd/mm/yyyy`; '' nếu chưa chọn ngày. */
export function weekLabelOf(date: string): string {
  if (!date) return ''
  const { from, to } = weekRangeOf(date)
  return `Tuần: ${formatDmy(from)} - ${formatDmy(to)}`
}

export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// ───────────────────────── Component ─────────────────────────

const MODE_OPTIONS: { value: PunctualityMode; label: string }[] = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'day', label: 'Một ngày' },
  { value: 'custom', label: 'Tuỳ chọn' },
]

const LOGO_URL = '/images/tntt-logo-priest-report.jpeg'
const inputClass =
  'w-full h-[52px] px-5 bg-white dark:bg-white/10 text-black dark:text-white rounded-full border border-[#e5e1dc] dark:border-white/10'
const exportButtonClass =
  'h-[38px] rounded-[19px] border border-brand px-4 text-sm text-brand transition-colors hover:bg-brand/5 disabled:opacity-50'

type ClassRow = Pick<Class, 'id' | 'name' | 'branch' | 'display_order'>

function waitForImages(root: HTMLElement): Promise<void> {
  const pending = Array.from(root.querySelectorAll('img'))
    .filter(img => !img.complete)
    .map(
      img =>
        new Promise<void>(resolve => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    )
  if (pending.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(pending).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 3000)),
  ])
}

function downloadUrl(url: string, fileName: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function PunctualityReportSection({
  scope,
  reportBranches,
  schoolYear,
  schoolYears,
  notify,
  onExported,
}: PunctualityReportSectionProps) {
  const uid = useId()
  const now = new Date()
  const [mode, setMode] = useState<PunctualityMode>('week')
  const [weekDate, setWeekDate] = useState(() => defaultWeekAnchor(localDateString(new Date())))
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [day, setDay] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PunctualityReportData | null>(null)
  // Khi true: đang dựng bản ẩn (ngoài màn hình) để html2canvas chụp.
  const [imageJob, setImageJob] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const currentYear = now.getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
  if (!yearOptions.includes(year)) yearOptions.push(year)

  const generate = async () => {
    const range = validatePunctualityRange({ mode, weekDate, month, year, day, customFrom, customTo })
    if (!range.ok) {
      notify('error', range.message)
      return
    }
    const { from: fromDate, to: toDate } = range

    setLoading(true)
    try {
      const years = schoolYears ?? []
      const reportSY = years.find(sy => monthOverlapsSchoolYear({ from: fromDate, to: toDate }, sy)) ?? schoolYear
      const today = localDateString(new Date())
      const clip = reportSY
        ? { clipFrom: reportSY.start_date, clipTo: reportSY.end_date < today ? reportSY.end_date : today }
        : { clipTo: today }

      const { data: allClasses, error: classError } = await supabase
        .from('classes')
        .select('id, name, branch, display_order')
        .eq('status', 'ACTIVE')
        .order('display_order', { ascending: true })
      if (classError || !allClasses) throw classError || new Error('No classes found')
      const scopedClasses = filterByBranch(allClasses as ClassRow[], scope)
      const classIds = new Set(scopedClasses.map(item => item.id))

      const [students, records, holidayResult] = await Promise.all([
        fetchAllRows<{ id: string; class_id: string | null }>((rangeFrom, rangeTo) =>
          supabase
            .from('thieu_nhi')
            .select('id, class_id')
            .eq('status', 'ACTIVE')
            .order('id', { ascending: true })
            .range(rangeFrom, rangeTo),
        ),
        fetchAllRows<PunctualityRecord & { id: string }>((rangeFrom, rangeTo) =>
          supabase
            .from('attendance_records')
            .select('id, student_id, status, day_type, attendance_date, is_late')
            .gte('attendance_date', fromDate)
            .lte('attendance_date', toDate)
            .eq('status', 'present')
            .in('day_type', ['thu5', 'cn', 'cn_le'])
            .order('id', { ascending: true })
            .range(rangeFrom, rangeTo),
        ),
        supabase
          .from('holidays')
          .select('holiday_date, day_type')
          .gte('holiday_date', fromDate)
          .lte('holiday_date', toDate),
      ])
      if (holidayResult.error) throw holidayResult.error

      const sessions = sessionDates(fromDate, toDate, holidayResult.data ?? [], clip)
      if (sessions.thu5.length + sessions.cn.length === 0) {
        setData(null)
        notify('error', PUNCTUALITY_NO_SESSION_MESSAGE)
        return
      }

      const report = buildPunctualityReport({
        mode,
        fromDate,
        toDate,
        classes: scopedClasses.map(item => ({
          id: item.id,
          name: item.name,
          branch: item.branch,
          display_order: item.display_order ?? null,
        })),
        branchOrder: reportBranches,
        students: students.filter(student => student.class_id !== null && classIds.has(student.class_id)),
        sessions,
        records,
      })
      setData(report)
      notify('success', 'Đã tạo báo cáo thống kê đúng giờ')
    } catch (error) {
      console.error('Error generating punctuality report:', error)
      notify('error', 'Không thể tạo báo cáo thống kê đúng giờ')
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    if (!data) return
    try {
      let logo: ArrayBuffer | undefined
      try {
        const response = await fetch(LOGO_URL)
        if (response.ok) logo = await response.arrayBuffer()
      } catch {
        // Logo là tuỳ chọn: vẫn xuất báo cáo nếu không tải được.
      }
      const { buildPunctualityReportWorkbook } = await import('@/lib/punctuality-report-excel')
      const workbook = await buildPunctualityReportWorkbook(data, logo)
      const bytes = await workbook.xlsx.writeBuffer()
      const blob = new Blob([new Uint8Array(bytes)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      downloadUrl(url, `${punctualityFileBase(data.fromDate, data.toDate)}.xlsx`)
      URL.revokeObjectURL(url)
      onExported?.('Đã xuất Excel thành công!')
    } catch (error) {
      console.error('Error exporting punctuality Excel:', error)
      notify('error', 'Lỗi khi xuất Excel')
    }
  }

  const exportImage = () => {
    if (!data || imageJob) return
    setImageJob(true)
  }

  // Bản ẩn vừa được dựng → đợi logo rồi chụp ảnh.
  useEffect(() => {
    if (!imageJob || !data) return
    let cancelled = false
    const run = async () => {
      try {
        const element = exportRef.current
        if (!element) throw new Error('Export template not mounted')
        await waitForImages(element)
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        })
        if (cancelled) return
        downloadUrl(canvas.toDataURL('image/png'), `${punctualityFileBase(data.fromDate, data.toDate)}.png`)
        onExported?.('Đã xuất ảnh thành công!')
      } catch (error) {
        console.error('Error exporting punctuality image:', error)
        if (!cancelled) notify('error', 'Lỗi khi xuất ảnh')
      } finally {
        if (!cancelled) setImageJob(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // onExported / notify là callback của trang, đổi identity mỗi lần render — chỉ chạy lại theo imageJob.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageJob])

  const radioId = (value: string) => `${uid}-mode-${value}`

  return (
    <section data-testid="punct-section">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6 mb-6">
        <div className="w-full lg:w-[300px]">
          <h1 className="text-[26px] font-semibold text-black dark:text-white">Thống kê đúng giờ</h1>
          <p className="text-sm font-medium text-[#666d80] mt-1">Tỉ lệ thiếu nhi có mặt đúng giờ - tất cả các lớp</p>
        </div>

        <div className="flex-1 bg-white dark:bg-white/10 border border-[#e5e1dc] rounded-2xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-y-2 py-2 lg:py-0 lg:h-12 px-4">
            <span id={`${uid}-mode-label`} className="flex-1 text-base font-semibold text-black dark:text-white">
              Chọn thời gian
            </span>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
              role="radiogroup"
              aria-labelledby={`${uid}-mode-label`}
            >
              {MODE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  id={radioId(option.value)}
                  type="button"
                  role="radio"
                  aria-checked={mode === option.value}
                  data-testid={`punct-mode-${option.value}`}
                  onClick={() => setMode(option.value)}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      mode === option.value ? 'border-brand' : 'border-gray-300 dark:border-white/30'
                    }`}
                  >
                    {mode === option.value && <div className="w-2 h-2 rounded-full bg-brand" />}
                  </div>
                  <span className="text-sm font-medium text-black dark:text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#e5e1dc] mb-6" />

      <div className="flex flex-col md:flex-row md:items-start gap-3 mb-6">
        {mode === 'week' && (
          <div className="flex w-full md:w-[65%] flex-col sm:flex-row gap-3 sm:items-end">
            <label htmlFor={`${uid}-week-date`} className="block flex-1">
              <span className="block text-sm font-medium text-[#666d80] mb-2">Chọn ngày trong tuần</span>
              <input
                id={`${uid}-week-date`}
                type="date"
                data-testid="punct-week-date"
                value={weekDate}
                onChange={event => setWeekDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <span
              data-testid="punct-week-label"
              className="flex h-[52px] items-center gap-2 text-sm font-medium text-black dark:text-white"
            >
              <Calendar className="w-5 h-5 text-[#8A8C90]" aria-hidden="true" />
              {weekLabelOf(weekDate)}
            </span>
          </div>
        )}

        {mode === 'month' && (
          <div className="flex w-full md:w-[65%] flex-col sm:flex-row gap-3">
            <label htmlFor={`${uid}-month`} className="block flex-1">
              <span className="block text-sm font-medium text-[#666d80] mb-2">Chọn tháng</span>
              <select
                id={`${uid}-month`}
                data-testid="punct-month"
                value={month}
                onChange={event => setMonth(Number(event.target.value))}
                className={inputClass}
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index} value={index}>
                    Tháng {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${uid}-year`} className="block flex-1">
              <span className="block text-sm font-medium text-[#666d80] mb-2">Năm</span>
              <select
                id={`${uid}-year`}
                data-testid="punct-year"
                value={year}
                onChange={event => setYear(Number(event.target.value))}
                className={inputClass}
              >
                {yearOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {mode === 'day' && (
          <label htmlFor={`${uid}-day`} className="block w-full md:w-[40%]">
            <span className="block text-sm font-medium text-[#666d80] mb-2">Chọn ngày</span>
            <input
              id={`${uid}-day`}
              type="date"
              data-testid="punct-day"
              value={day}
              onChange={event => setDay(event.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {mode === 'custom' && (
          <div className="flex w-full md:w-[65%] flex-col sm:flex-row gap-3">
            <label htmlFor={`${uid}-from`} className="block flex-1">
              <span className="block text-sm font-medium text-[#666d80] mb-2">Từ ngày</span>
              <input
                id={`${uid}-from`}
                type="date"
                data-testid="punct-from"
                value={customFrom}
                onChange={event => setCustomFrom(event.target.value)}
                className={inputClass}
              />
            </label>
            <label htmlFor={`${uid}-to`} className="block flex-1">
              <span className="block text-sm font-medium text-[#666d80] mb-2">Đến ngày</span>
              <input
                id={`${uid}-to`}
                type="date"
                data-testid="punct-to"
                value={customTo}
                onChange={event => setCustomTo(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}
      </div>

      <div className="h-px bg-[#e5e1dc] mb-6" />

      <div className="flex justify-end mb-6">
        <button
          type="button"
          data-testid="punct-generate"
          onClick={generate}
          disabled={loading}
          className="h-[49px] px-6 bg-brand border border-white/60 rounded-full flex items-center gap-1 text-lg text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" aria-label="Đang tạo báo cáo" />
          ) : (
            <>
              <Plus className="w-6 h-6" aria-hidden="true" />
              <span>Tạo báo cáo</span>
            </>
          )}
        </button>
      </div>

      {data && (
        <div data-testid="punct-result" className="rounded-[24px] bg-white p-4 sm:p-6 dark:bg-white/10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#666D80]">
                Xem trước báo cáo: <span className="font-medium text-black dark:text-white">Thống kê đúng giờ</span>
              </span>
              <span className="flex h-[26px] items-center rounded-[13px] bg-[#8A8C90] px-4 text-xs font-medium uppercase text-white">
                {data.timeLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="punct-export-image"
                onClick={exportImage}
                disabled={imageJob}
                className={exportButtonClass}
              >
                Xuất ảnh
              </button>
              <button type="button" data-testid="punct-export-excel" onClick={exportExcel} className={exportButtonClass}>
                Xuất Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto" role="region" aria-label="Bản xem trước thống kê đúng giờ">
            <PunctualityReportTemplate data={data} />
          </div>
        </div>
      )}

      {data && imageJob && (
        <div className="fixed left-[-9999px] top-0" aria-hidden="true">
          <PunctualityReportTemplate ref={exportRef} data={data} />
        </div>
      )}
    </section>
  )
}
