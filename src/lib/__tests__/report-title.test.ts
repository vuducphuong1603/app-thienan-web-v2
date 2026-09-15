import { describe, it, expect } from 'vitest'
import { getAttendanceReportTitle } from '@/components/ReportExportTemplate'

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
