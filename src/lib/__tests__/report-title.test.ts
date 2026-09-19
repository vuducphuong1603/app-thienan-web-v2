import { describe, it, expect } from 'vitest'
import { getAttendanceReportTitle } from '@/components/ReportExportTemplate'
import { getScoreReportTitle } from '@/lib/score-report-excel'

describe('getAttendanceReportTitle', () => {
  it('thứ 5 chỉ ghi thứ Năm', () => {
    expect(getAttendanceReportTitle('thu5')).toBe('ĐIỂM DANH ĐI LỄ THỨ NĂM')
  })
  it('chủ nhật chỉ ghi Chúa Nhật', () => {
    expect(getAttendanceReportTitle('cn')).toBe('ĐIỂM DANH HỌC GIÁO LÝ & ĐI LỄ CHÚA NHẬT')
  })
  it('tất cả ghi cả hai buổi', () => {
    expect(getAttendanceReportTitle('all')).toContain('THỨ NĂM VÀ CHÚA NHẬT')
    expect(getAttendanceReportTitle(undefined)).toContain('THỨ NĂM VÀ CHÚA NHẬT')
  })
})

describe('getScoreReportTitle — tiêu đề ảnh và Excel bảng điểm dùng chung', () => {
  it('ghi năm học giống file Excel', () => {
    expect(getScoreReportTitle('2026 - 2027')).toBe('BẢNG ĐIỂM NĂM HỌC GIÁO LÝ 2026 - 2027')
  })
  it('không có năm học thì bỏ khoảng trắng thừa', () => {
    expect(getScoreReportTitle('')).toBe('BẢNG ĐIỂM NĂM HỌC GIÁO LÝ')
  })
})
