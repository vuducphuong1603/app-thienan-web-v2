// QA đối kháng cho attendance-punctuality: biên, dữ liệu hỏng, Unicode, không đột biến đầu vào.
import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  classifyLate,
  predictLate,
  localTodayISO,
  validateWindowDraft,
  sortWindows,
  windowsForSession,
  formatWindow,
  punctualityOf,
  nextLateValue,
  type AttendanceTimeWindow,
} from '../attendance-punctuality'

const w = (
  id: string,
  session: 'cn' | 'cn_le',
  start: string,
  end: string,
  label: string | null = null,
): AttendanceTimeWindow => ({ id, session_type: session, start_time: start, end_time: end, label })

describe('timeToMinutes — đầu vào xấu', () => {
  it.each([
    ['24:00', null],
    ['23:60', null],
    ['07:15:60', null],
    ['7:5', null],
    ['07-15', null],
    ['07:15 PM', null],
    ['', null],
    ['   ', null],
    ['-1:00', null],
    ['٠٧:١٥', null], // chữ số Ả Rập không được chấp nhận
    ['07:15:30.999', 7 * 60 + 15], // phần thập phân của giây bị bỏ
    ['  07:15  ', 7 * 60 + 15],
    ['0:00', 0],
    ['23:59:59', 23 * 60 + 59],
  ])('%j → %j', (input, expected) => {
    expect(timeToMinutes(input as string)).toBe(expected)
  })

  it('không ném lỗi với kiểu không phải chuỗi', () => {
    expect(timeToMinutes(undefined)).toBeNull()
    expect(timeToMinutes(null)).toBeNull()
    expect(timeToMinutes(715 as unknown as string)).toBeNull()
    expect(timeToMinutes({} as unknown as string)).toBeNull()
  })
})

describe('classifyLate — biên & dữ liệu hỏng', () => {
  const cn = [w('1', 'cn', '06:45:00', '07:15:00')]

  it('khung 00:00–23:59: mọi phút đều đúng giờ', () => {
    const all = [w('1', 'cn', '00:00:00', '23:59:00')]
    expect(classifyLate('00:00', all, 'cn')).toBe(false)
    expect(classifyLate('23:59:59', all, 'cn')).toBe(false)
  })

  it('khung đảo ngược (start > end, dữ liệu hỏng) không chứa giờ nào → trễ, không ném lỗi', () => {
    const bad = [w('1', 'cn', '08:00:00', '07:00:00')]
    expect(classifyLate('07:30', bad, 'cn')).toBe(true)
    expect(classifyLate('08:00', bad, 'cn')).toBe(true)
  })

  it('khung có giờ không đọc được bị bỏ qua; nếu chỉ còn khung hỏng thì "chưa xét"', () => {
    const corrupt = [w('1', 'cn', 'abc', '07:00:00')]
    expect(classifyLate('06:00', corrupt, 'cn')).toBeNull()
    const mixed = [w('1', 'cn', 'abc', '07:00:00'), ...cn]
    expect(classifyLate('06:50', mixed, 'cn')).toBe(false)
    expect(classifyLate('09:00', mixed, 'cn')).toBe(true)
  })

  it('chỉ có khung của buổi KHÁC → chưa xét', () => {
    expect(classifyLate('07:00', [w('1', 'cn_le', '07:30:00', '08:00:00')], 'cn')).toBeNull()
  })

  it('danh sách rỗng → chưa xét', () => {
    expect(classifyLate('07:00', [], 'cn')).toBeNull()
  })

  it('giờ không hợp lệ → null dù có khung', () => {
    expect(classifyLate('25:00', cn, 'cn')).toBeNull()
    expect(classifyLate('', cn, 'cn')).toBeNull()
    expect(classifyLate(undefined, cn, 'cn')).toBeNull()
  })

  it('nhiều khung chồng/nối nhau: rơi vào khung nào cũng đúng giờ', () => {
    const many = [w('1', 'cn', '06:00:00', '06:30:00'), w('2', 'cn', '06:30:00', '07:00:00')]
    expect(classifyLate('06:30', many, 'cn')).toBe(false)
    expect(classifyLate('07:01', many, 'cn')).toBe(true)
  })

  it('không đột biến mảng windows', () => {
    const arr = [w('2', 'cn', '09:00:00', '10:00:00'), w('1', 'cn', '06:00:00', '07:00:00')]
    const copy = JSON.parse(JSON.stringify(arr))
    classifyLate('06:30', arr, 'cn')
    expect(arr).toEqual(copy)
  })
})

describe('predictLate / localTodayISO', () => {
  const win = [w('1', 'cn', '06:45:00', '07:15:00')]

  it('ngày khác hôm nay (cả quá khứ và tương lai) → null', () => {
    expect(predictLate({ attendanceDate: '2026-11-22', today: '2026-11-23', time: '06:50', windows: win, session: 'cn' })).toBeNull()
    expect(predictLate({ attendanceDate: '2026-11-24', today: '2026-11-23', time: '06:50', windows: win, session: 'cn' })).toBeNull()
  })

  it('đúng hôm nay → classifyLate', () => {
    expect(predictLate({ attendanceDate: '2026-11-23', today: '2026-11-23', time: '08:00', windows: win, session: 'cn' })).toBe(true)
  })

  it('localTodayISO dùng getter địa phương: 00:30 và 23:59 cùng ngày, không lệch UTC', () => {
    expect(localTodayISO(new Date(2026, 10, 23, 0, 30))).toBe('2026-11-23')
    expect(localTodayISO(new Date(2026, 10, 23, 23, 59, 59))).toBe('2026-11-23')
    expect(localTodayISO(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
    expect(localTodayISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('validateWindowDraft — đối kháng', () => {
  const existing = [w('a', 'cn', '06:45:00', '07:15:00'), w('b', 'cn_le', '07:30:00', '08:00:00')]

  it('giờ 24:00 và 23:60 bị từ chối', () => {
    expect(validateWindowDraft({ start: '10:00', end: '24:00' }, [], 'cn').ok).toBe(false)
    expect(validateWindowDraft({ start: '10:00', end: '23:60' }, [], 'cn').ok).toBe(false)
  })

  it('start rỗng / end rỗng → lỗi tiếng Việt', () => {
    const r1 = validateWindowDraft({ start: '', end: '10:00' }, [], 'cn')
    const r2 = validateWindowDraft({ start: '09:00', end: '' }, [], 'cn')
    expect(r1.ok).toBe(false)
    expect(r2.ok).toBe(false)
    if (!r1.ok) expect(r1.error).toMatch(/[ạăâêôơưđáàảãéèíìóòúùýỳ]/i)
  })

  it('bằng nhau (start == end) bị từ chối; chênh đúng 1 phút được chấp nhận', () => {
    expect(validateWindowDraft({ start: '10:00', end: '10:00' }, [], 'cn').ok).toBe(false)
    expect(validateWindowDraft({ start: '10:00', end: '10:01' }, [], 'cn').ok).toBe(true)
  })

  it('chung phút biên với khung có sẵn bị coi là chồng (cả hai phía)', () => {
    expect(validateWindowDraft({ start: '07:15', end: '08:00' }, existing, 'cn').ok).toBe(false) // start == end cũ
    expect(validateWindowDraft({ start: '06:00', end: '06:45' }, existing, 'cn').ok).toBe(false) // end == start cũ
  })

  it('liền kề nhưng không chung phút (07:16) hợp lệ', () => {
    expect(validateWindowDraft({ start: '07:16', end: '07:30' }, existing, 'cn').ok).toBe(true)
    expect(validateWindowDraft({ start: '06:00', end: '06:44' }, existing, 'cn').ok).toBe(true)
  })

  it('bao trùm hoàn toàn khung cũ / nằm gọn trong khung cũ đều bị chặn', () => {
    expect(validateWindowDraft({ start: '06:00', end: '09:00' }, existing, 'cn').ok).toBe(false)
    expect(validateWindowDraft({ start: '06:50', end: '07:00' }, existing, 'cn').ok).toBe(false)
  })

  it('cùng giờ nhưng KHÁC buổi không chồng', () => {
    expect(validateWindowDraft({ start: '06:45', end: '07:15' }, existing, 'cn_le').ok).toBe(true)
  })

  it('sửa chính khung đang sửa không tự chồng; vẫn chồng với khung khác', () => {
    expect(validateWindowDraft({ start: '06:40', end: '07:20' }, existing, 'cn', 'a').ok).toBe(true)
    const two = [...existing, w('c', 'cn', '09:00:00', '10:00:00')]
    expect(validateWindowDraft({ start: '06:40', end: '09:30' }, two, 'cn', 'a').ok).toBe(false)
  })

  it('chuẩn hoá giờ về HH:MM:00 (bỏ giây), nhãn rỗng/khoảng trắng → null, nhãn Unicode được giữ & trim', () => {
    const r = validateWindowDraft({ start: '6:45:30', end: '07:15:59', label: '  Ca sáng — Thánh lễ ☀️  ' }, [], 'cn')
    expect(r).toEqual({
      ok: true,
      value: { start_time: '06:45:00', end_time: '07:15:00', label: 'Ca sáng — Thánh lễ ☀️' },
    })
    const blank = validateWindowDraft({ start: '06:45', end: '07:15', label: '   ' }, [], 'cn')
    expect(blank.ok && blank.value.label).toBeNull()
    const undef = validateWindowDraft({ start: '06:45', end: '07:15' }, [], 'cn')
    expect(undef.ok && undef.value.label).toBeNull()
    const nul = validateWindowDraft({ start: '06:45', end: '07:15', label: null }, [], 'cn')
    expect(nul.ok && nul.value.label).toBeNull()
  })

  it('khung có sẵn bị hỏng không làm vỡ việc kiểm tra', () => {
    const bad = [w('x', 'cn', 'zz', 'yy')]
    expect(validateWindowDraft({ start: '06:00', end: '07:00' }, bad, 'cn').ok).toBe(true)
  })

  it('không đột biến existing', () => {
    const snap = JSON.parse(JSON.stringify(existing))
    validateWindowDraft({ start: '06:00', end: '07:00' }, existing, 'cn')
    expect(existing).toEqual(snap)
  })
})

describe('sortWindows / windowsForSession / formatWindow / punctuality', () => {
  it('sắp tăng dần theo start rồi end; khung hỏng xuống cuối; không đột biến', () => {
    const arr = [
      w('4', 'cn', 'bad', 'bad'),
      w('3', 'cn', '09:45:00', '10:15:00'),
      w('2', 'cn', '06:45:00', '07:30:00'),
      w('1', 'cn', '06:45:00', '07:15:00'),
    ]
    const ids = sortWindows(arr).map(x => x.id)
    expect(ids).toEqual(['1', '2', '3', '4'])
    expect(arr.map(x => x.id)).toEqual(['4', '3', '2', '1'])
  })

  it('windowsForSession lọc đúng buổi', () => {
    const arr = [w('1', 'cn', '06:45:00', '07:15:00'), w('2', 'cn_le', '07:30:00', '08:00:00')]
    expect(windowsForSession(arr, 'cn_le').map(x => x.id)).toEqual(['2'])
    expect(windowsForSession([], 'cn')).toEqual([])
  })

  it('formatWindow dùng en dash + khoảng trắng, bỏ giây; giờ hỏng giữ nguyên', () => {
    expect(formatWindow({ start_time: '06:45:00', end_time: '07:15:00' })).toBe('06:45 – 07:15')
    expect(formatWindow({ start_time: '6:05', end_time: 'oops' })).toBe('06:05 – oops')
  })

  it('punctualityOf / nextLateValue chuỗi chuyển trạng thái Chưa xét → Trễ → Đúng giờ → Trễ', () => {
    let v: boolean | null | undefined = null
    const seen: string[] = [punctualityOf(v)]
    for (let i = 0; i < 3; i++) {
      v = nextLateValue(v)
      seen.push(punctualityOf(v))
    }
    expect(seen).toEqual(['unknown', 'late', 'on_time', 'late'])
    expect(punctualityOf(undefined)).toBe('unknown')
    expect(nextLateValue(undefined)).toBe(true)
  })
})
