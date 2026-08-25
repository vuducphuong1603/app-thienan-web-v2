import { supabase } from './supabase'
import { computeSundayCount } from './sunday-attendance'

/**
 * Đếm lại số buổi Thứ 5 / Chủ nhật của một thiếu nhi trong năm học và ghi vào thieu_nhi.
 * Chủ nhật: (số buổi giáo lý 'cn' + số buổi đi lễ 'cn_le') / 2.
 * Thứ 5 giữ nguyên cách đếm cũ (không ảnh hưởng điểm T5).
 */
export async function recalcAttendanceCount(studentId: string, schoolYearId: string | undefined) {
  if (!schoolYearId) return
  try {
    const base = () => supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'present')
      .eq('school_year_id', schoolYearId)

    const [{ count: thu5Count }, { count: glCount }, { count: leCount }] = await Promise.all([
      base().eq('day_type', 'thu5'),
      base().eq('day_type', 'cn'),
      base().eq('day_type', 'cn_le'),
    ])

    await supabase
      .from('thieu_nhi')
      .update({
        attendance_thu5: thu5Count || 0,
        attendance_cn: computeSundayCount(glCount || 0, leCount || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
  } catch (error) {
    console.error('Error updating attendance count:', error)
  }
}
