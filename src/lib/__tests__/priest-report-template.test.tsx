import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PriestReportTemplate, { priestRowView } from '@/components/PriestReportTemplate'
import type { PriestReportData } from '@/components/PriestReportTemplate'
import type { PriestReportClassRow } from '@/lib/priest-report'

function reportClass(overrides: Partial<PriestReportClassRow> = {}): PriestReportClassRow {
  return {
    classId: 'class-1',
    className: 'Khai Tâm A',
    studentCount: 10,
    thu5Absent: 3,
    cnAbsent: 6,
    prevThu5Rate: null,
    prevCnRate: null,
    warnedNames: [],
    note: '',
    ...overrides,
  }
}

function reportData(): PriestReportData {
  return {
    branches: [
      {
        branch: 'Chiên Con',
        label: 'CHIÊN CON',
        classes: [
          reportClass({ classId: 'class-1', className: 'Khai Tâm A', thu5Absent: 3, cnAbsent: 6 }),
          reportClass({ classId: 'class-2', className: 'Khai Tâm B', thu5Absent: 2, cnAbsent: 2 }),
        ],
      },
      {
        branch: 'Ấu Nhi',
        label: 'ẤU',
        classes: [reportClass({
          classId: 'class-3',
          className: 'Ấu 1A',
          studentCount: 0,
          thu5Absent: 0,
          cnAbsent: 0,
        })],
      },
    ],
    fromDate: '2026-09-01',
    toDate: '2026-09-30',
    timeLabel: 'tháng 9/2026',
    subtitleLines: [
      'Tỉ lệ thiếu nhi đi ít nhất 01 ngày trong tháng: (tháng 9/2026)',
      '*T5 ngày 3,10,17,24/09  ;  *GL ngày 6,13,20,27/09',
    ],
    absentWarning: {
      prevLabel: 'Tháng 8/2026',
      currentLabel: 'Tháng 9/2026',
      students: [{
        studentId: 'student-1',
        saintName: 'Têrêsa',
        fullName: 'Nguyễn Văn An',
        className: 'Khai Tâm A',
        parentPhones: ['0900000001'],
      }],
    },
  }
}

describe('priest report preview', () => {
  it('calculates present counts, rates, and the strict under-80% highlight', () => {
    expect(priestRowView(reportClass())).toEqual({
      thu5Present: 7,
      thu5Rate: 0.7,
      cnPresent: 4,
      cnRate: 0.4,
      highlight: true,
    })
    expect(priestRowView(reportClass({ thu5Absent: 2 })).highlight).toBe(false)
  })

  it('returns dash rates and no highlight for a class with zero students', () => {
    const row = reportClass({ studentCount: 0, thu5Absent: 0, cnAbsent: 0 })
    expect(priestRowView(row)).toEqual({
      thu5Present: 0,
      thu5Rate: null,
      cnPresent: 0,
      cnRate: null,
      highlight: false,
    })

    const markup = renderToStaticMarkup(createElement(PriestReportTemplate, { data: {
      ...reportData(),
      branches: [{ branch: 'Nghĩa Sĩ', label: 'NGHĨA', classes: [row] }],
      absentWarning: null,
    } }))
    expect(markup.match(/>-<\/td>/g)).toHaveLength(2)
    expect(markup).not.toContain('background-color:#FFFF00')
  })

  it('renders the template headings, branch rowSpan, table values, footnotes, and yellow attendance cell', () => {
    const markup = renderToStaticMarkup(createElement(PriestReportTemplate, { data: reportData() }))

    expect(markup).toContain('src="/images/tntt-logo-priest-report.jpeg"')
    expect(markup).toContain('Phong trào thiếu nhi thánh thể Việt Nam')
    expect(markup).toContain('Giáo xứ Thiên Ân - xứ đoàn Fatima')
    expect(markup).toContain('BÁO CÁO KẾT QUẢ CHUYÊN CẦN')
    expect(markup).toContain('rowspan="2"')
    expect(markup).toContain('CHIÊN CON')
    expect(markup).toContain('PHÂN ĐOÀN')
    expect(markup).toContain('THỨ 5')
    expect(markup).toContain('TỈ LỆ GL')
    expect(markup).toContain('70%')
    expect(markup).toContain('40%')
    expect(markup).toContain('background-color:#FFFF00')
    expect(markup).toContain('Thứ 5: vắng từ 4 em ~ khoảng dưới 90%')
    expect(markup).toContain('CN: vắng từ 3 em ~ khoảng dưới 91%')
    expect(markup).not.toContain('TỔNG CỘNG')
  })

  it('retains the two-month absence list with class and parent phone', () => {
    const markup = renderToStaticMarkup(createElement(PriestReportTemplate, { data: reportData() }))

    expect(markup).toContain('CẢNH BÁO: vắng 2 tháng liên tiếp (Tháng 8/2026 và Tháng 9/2026)')
    expect(markup).toContain('Tên thánh + Họ tên')
    expect(markup).toContain('Têrêsa Nguyễn Văn An')
    expect(markup).toContain('Khai Tâm A')
    expect(markup).toContain('0900000001')
  })
})
