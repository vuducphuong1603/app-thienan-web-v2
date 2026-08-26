import { supabase } from './supabase'
import { computeSundayCount } from './sunday-attendance'

interface SchoolYearRange {
  id?: string
  start_date?: string | null
  end_date?: string | null
}

/**
 * Đếm lại số buổi Thứ 5 / Chủ nhật của một thiếu nhi trong năm học và ghi vào thieu_nhi.
 * Chủ nhật: (số buổi giáo lý 'cn' + số buổi đi lễ 'cn_le') / 2.
 * Thứ 5 giữ nguyên cách đếm cũ (không ảnh hưởng điểm T5).
 * Chỉ đếm bản ghi có attendance_date nằm trong [start_date, end_date] của năm học.
 */
export async function recalcAttendanceCount(
  studentId: string,
  schoolYear: SchoolYearRange | string | null | undefined
) {
  const sy: SchoolYearRange | null =
    typeof schoolYear === 'string' ? { id: schoolYear } : schoolYear || null
  if (!sy?.id) return
  try {
    const base = () => {
      let q = supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'present')
        .eq('school_year_id', sy.id!)
      if (sy.start_date) q = q.gte('attendance_date', sy.start_date)
      if (sy.end_date) q = q.lte('attendance_date', sy.end_date)
      return q
    }

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
