/**
 * Giả lập "hôm nay" khi phát triển (vd. để thử điểm danh Chủ nhật vào ngày thường).
 * Đặt NEXT_PUBLIC_DEBUG_TODAY=YYYY-MM-DD trong .env.local. Bị bỏ qua khi build production.
 */
export function todayForAttendance(): Date {
  const fake = process.env.NEXT_PUBLIC_DEBUG_TODAY
  if (process.env.NODE_ENV !== 'production' && fake && /^\d{4}-\d{2}-\d{2}$/.test(fake)) {
    const [y, m, d] = fake.split('-').map(Number)
    const now = new Date()
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
  }
  return new Date()
}
