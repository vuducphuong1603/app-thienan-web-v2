import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  classifyLate,
  predictLate,
  validateWindowDraft,
  sortWindows,
  windowsForSession,
  formatWindow,
  punctualityOf,
  nextLateValue,
  canEditLate,
  localTodayISO,
  PUNCTUALITY_LABELS,
  type AttendanceTimeWindow,
  type PunctualitySession,
} from '../attendance-punctuality'

let seq = 0
function win(
  session: PunctualitySession,
  start: string,
  end: string,
  extra: Partial<AttendanceTimeWindow> = {},
): AttendanceTimeWindow {
  seq += 1
  return { id: `w${seq}`, session_type: session, start_time: start, end_time: end, label: null, ...extra }
}

// Cấu hình đo được trên hàm SQL attendance_is_late (SPEC §4.1)
const PARITY_WINDOWS: AttendanceTimeWindow[] = [
  win('cn', '06:45:00', '07:15:00'),
  win('cn', '09:45:00', '10:15:00'),
  win('cn_le', '07:30:00', '08:00:00'),
]

describe('timeToMinutes', () => {
  it('đọc HH:MM', () => {
    expect(timeToMinutes('06:45')).toBe(6 * 60 + 45)
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59)
  })

  it('đọc HH:MM:SS và bỏ phần giây (làm tròn xuống)', () => {
    expect(timeToMinutes('07:15:59')).toBe(7 * 60 + 15)
    expect(timeToMinutes('07:16:00')).toBe(7 * 60 + 16)
  })

  it('chấp nhận giờ 1 chữ số và phần lẻ giây', () => {
    expect(timeToMinutes('7:05')).toBe(7 * 60 + 5)
    expect(timeToMinutes('07:15:59.750')).toBe(7 * 60 + 15)
  })

  it('rỗng / null / undefined → null', () => {
    expect(timeToMinutes('')).toBeNull()
    expect(timeToMinutes('   ')).toBeNull()
    expect(timeToMinutes(null)).toBeNull()
    expect(timeToMinutes(undefined)).toBeNull()
  })

  it('sai định dạng hoặc ngoài khoảng → null', () => {
    expect(timeToMinutes('abc')).toBeNull()
    expect(timeToMinutes('7')).toBeNull()
    expect(timeToMinutes('24:00')).toBeNull()
    expect(timeToMinutes('12:60')).toBeNull()
    expect(timeToMinutes('12:30:61')).toBeNull()
    expect(timeToMinutes('-1:30')).toBeNull()
    expect(timeToMinutes('12:3')).toBeNull()
  })
})

describe('classifyLate — 12 vector đối chiếu với SQL', () => {
  const cases: Array<[PunctualitySession, string | null, boolean | null]> = [
    ['cn', '06:44:59', true],
    ['cn', '06:45:00', false],
    ['cn', '07:15:59', false],
    ['cn', '07:16:00', true],
    ['cn', '08:30', true],
    ['cn', '09:45', false],
    ['cn', '10:15:30', false],
    ['cn', '10:16', true],
    ['cn_le', '07:30', false],
    ['cn_le', '08:01', true],
    ['cn', null, null],
  ]
  for (const [session, time, expected] of cases) {
    it(`${session} ${time ?? 'null'} → ${expected}`, () => {
      expect(classifyLate(time, PARITY_WINDOWS, session)).toBe(expected)
    })
  }

  it('buổi không có khung giờ nào (07:00) → null', () => {
    const onlyCn = PARITY_WINDOWS.filter(w => w.session_type === 'cn')
    expect(classifyLate('07:00', onlyCn, 'cn_le')).toBeNull()
  })
})

describe('classifyLate — các trường hợp khác', () => {
  it('danh sách khung giờ rỗng → null', () => {
    expect(classifyLate('07:00', [], 'cn')).toBeNull()
  })

  it('giờ sai định dạng → null', () => {
    expect(classifyLate('xx:yy', PARITY_WINDOWS, 'cn')).toBeNull()
    expect(classifyLate('', PARITY_WINDOWS, 'cn')).toBeNull()
    expect(classifyLate(undefined, PARITY_WINDOWS, 'cn')).toBeNull()
  })

  it('khung giờ của buổi khác không ảnh hưởng', () => {
    // 07:45 nằm trong khung cn_le? Không (07:30–08:00 → có). Nhưng với cn thì phải trễ
    expect(classifyLate('07:45', PARITY_WINDOWS, 'cn')).toBe(true)
    expect(classifyLate('07:45', PARITY_WINDOWS, 'cn_le')).toBe(false)
  })

  it('đến sớm hơn giờ bắt đầu cũng nằm ngoài khung → trễ', () => {
    expect(classifyLate('05:00', PARITY_WINDOWS, 'cn')).toBe(true)
  })

  it('khung giờ lưu dạng HH:MM (không giây) vẫn hoạt động', () => {
    const ws = [win('cn', '06:45', '07:15')]
    expect(classifyLate('07:15', ws, 'cn')).toBe(false)
    expect(classifyLate('07:16', ws, 'cn')).toBe(true)
  })

  it('bỏ qua khung giờ hỏng thay vì ném lỗi', () => {
    const ws = [win('cn', 'bad', 'worse'), win('cn', '06:45:00', '07:15:00')]
    expect(classifyLate('07:00', ws, 'cn')).toBe(false)
    expect(classifyLate('08:00', ws, 'cn')).toBe(true)
  })

  it('chỉ có khung hỏng → coi như chưa cấu hình (null)', () => {
    expect(classifyLate('07:00', [win('cn', 'bad', 'worse')], 'cn')).toBeNull()
  })
})

describe('predictLate', () => {
  const base = { windows: PARITY_WINDOWS, session: 'cn' as PunctualitySession }

  it('khác ngày hôm nay → null (điểm danh bù không xét)', () => {
    expect(predictLate({ ...base, attendanceDate: '2026-11-15', today: '2026-11-22', time: '08:30' })).toBeNull()
  })

  it('đúng ngày hôm nay → dùng classifyLate', () => {
    expect(predictLate({ ...base, attendanceDate: '2026-11-22', today: '2026-11-22', time: '08:30' })).toBe(true)
    expect(predictLate({ ...base, attendanceDate: '2026-11-22', today: '2026-11-22', time: '07:00' })).toBe(false)
  })

  it('đúng ngày nhưng chưa có khung giờ → null', () => {
    expect(
      predictLate({ attendanceDate: '2026-11-22', today: '2026-11-22', time: '07:00', windows: [], session: 'cn' }),
    ).toBeNull()
  })

  it('đúng ngày nhưng thiếu giờ → null', () => {
    expect(predictLate({ ...base, attendanceDate: '2026-11-22', today: '2026-11-22', time: null })).toBeNull()
  })
})

describe('localTodayISO', () => {
  it('dùng getter giờ địa phương, không lệch UTC', () => {
    // 00:30 giờ địa phương ngày 22/11 — toISOString() có thể trả ngày 21 ở múi giờ dương
    expect(localTodayISO(new Date(2026, 10, 22, 0, 30, 0))).toBe('2026-11-22')
    expect(localTodayISO(new Date(2026, 10, 22, 23, 59, 59))).toBe('2026-11-22')
  })

  it('đệm số 0 cho tháng và ngày', () => {
    expect(localTodayISO(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05')
  })

  it('không truyền tham số → định dạng YYYY-MM-DD', () => {
    expect(localTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('validateWindowDraft', () => {
  const existing: AttendanceTimeWindow[] = [
    win('cn', '06:45:00', '07:15:00', { id: 'a' }),
    win('cn', '09:45:00', '10:15:00', { id: 'b' }),
    win('cn_le', '07:30:00', '08:00:00', { id: 'c' }),
  ]

  it('hợp lệ → chuẩn hoá HH:MM:00, nhãn null khi trống', () => {
    const r = validateWindowDraft({ start: '08:00', end: '08:30' }, existing, 'cn')
    expect(r).toEqual({ ok: true, value: { start_time: '08:00:00', end_time: '08:30:00', label: null } })
  })

  it('cắt khoảng trắng của nhãn; nhãn toàn khoảng trắng → null', () => {
    const r1 = validateWindowDraft({ start: '08:00', end: '08:30', label: '  Ca sáng  ' }, existing, 'cn')
    expect(r1.ok && r1.value.label).toBe('Ca sáng')
    const r2 = validateWindowDraft({ start: '08:00', end: '08:30', label: '   ' }, existing, 'cn')
    expect(r2.ok && r2.value.label).toBeNull()
    const r3 = validateWindowDraft({ start: '08:00', end: '08:30', label: null }, existing, 'cn')
    expect(r3.ok && r3.value.label).toBeNull()
  })

  it('nhận HH:MM:SS và bỏ giây khi chuẩn hoá', () => {
    const r = validateWindowDraft({ start: '08:00:45', end: '08:30:10' }, existing, 'cn')
    expect(r).toEqual({ ok: true, value: { start_time: '08:00:00', end_time: '08:30:00', label: null } })
  })

  it('đệm số 0 cho giờ 1 chữ số', () => {
    const r = validateWindowDraft({ start: '8:00', end: '8:30' }, existing, 'cn')
    expect(r.ok && r.value.start_time).toBe('08:00:00')
  })

  it('từ chối giờ bắt đầu / kết thúc sai định dạng hoặc trống', () => {
    for (const draft of [
      { start: '', end: '08:30' },
      { start: '08:00', end: '' },
      { start: 'abc', end: '08:30' },
      { start: '08:00', end: '25:00' },
    ]) {
      const r = validateWindowDraft(draft, existing, 'cn')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0)
    }
  })

  it('từ chối kết thúc <= bắt đầu', () => {
    const equal = validateWindowDraft({ start: '08:00', end: '08:00' }, existing, 'cn')
    expect(equal.ok).toBe(false)
    const before = validateWindowDraft({ start: '08:30', end: '08:00' }, existing, 'cn')
    expect(before.ok).toBe(false)
    // chỉ khác nhau ở giây → sau khi bỏ giây là bằng nhau
    const sameMinute = validateWindowDraft({ start: '08:00:10', end: '08:00:50' }, existing, 'cn')
    expect(sameMinute.ok).toBe(false)
  })

  it('từ chối chồng lấn với khung cùng buổi', () => {
    const r = validateWindowDraft({ start: '07:00', end: '07:30' }, existing, 'cn')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/chồng|trùng/i)
  })

  it('khung bao trùm khung cũ → chồng lấn', () => {
    expect(validateWindowDraft({ start: '06:00', end: '11:00' }, existing, 'cn').ok).toBe(false)
  })

  it('khung nằm gọn trong khung cũ → chồng lấn', () => {
    expect(validateWindowDraft({ start: '06:50', end: '07:00' }, existing, 'cn').ok).toBe(false)
  })

  it('chung đúng 1 phút biên cũng là chồng lấn', () => {
    expect(validateWindowDraft({ start: '07:15', end: '07:45' }, existing, 'cn').ok).toBe(false)
    expect(validateWindowDraft({ start: '06:15', end: '06:45' }, existing, 'cn').ok).toBe(false)
  })

  it('sát nhau 1 phút (không chung phút nào) → hợp lệ', () => {
    expect(validateWindowDraft({ start: '07:16', end: '07:45' }, existing, 'cn').ok).toBe(true)
    expect(validateWindowDraft({ start: '06:15', end: '06:44' }, existing, 'cn').ok).toBe(true)
  })

  it('khung của buổi khác không gây chồng lấn', () => {
    // 07:30–08:00 đã có ở cn_le, nhưng thêm vào cn là OK vì cn chỉ có 06:45–07:15 và 09:45–10:15
    expect(validateWindowDraft({ start: '07:30', end: '08:00' }, existing, 'cn').ok).toBe(true)
    // và ngược lại: 06:45–07:15 của cn không chặn cn_le
    expect(validateWindowDraft({ start: '06:45', end: '07:15' }, existing, 'cn_le').ok).toBe(true)
  })

  it('khi sửa, bỏ qua chính khung đang sửa', () => {
    const r = validateWindowDraft({ start: '06:40', end: '07:20' }, existing, 'cn', 'a')
    expect(r.ok).toBe(true)
  })

  it('khi sửa vẫn bị chặn nếu chồng lấn khung khác', () => {
    const r = validateWindowDraft({ start: '06:40', end: '09:50' }, existing, 'cn', 'a')
    expect(r.ok).toBe(false)
  })

  it('so chồng lấn theo phút, bỏ qua giây đã lưu', () => {
    const ws = [win('cn', '06:45:30', '07:15:45', { id: 'z' })]
    expect(validateWindowDraft({ start: '07:15', end: '07:30' }, ws, 'cn').ok).toBe(false)
    expect(validateWindowDraft({ start: '07:16', end: '07:30' }, ws, 'cn').ok).toBe(true)
  })

  it('danh sách hiện có rỗng → luôn hợp lệ nếu định dạng đúng', () => {
    expect(validateWindowDraft({ start: '00:00', end: '23:59' }, [], 'cn_le').ok).toBe(true)
  })
})

describe('sortWindows / windowsForSession', () => {
  it('sắp theo giờ bắt đầu rồi giờ kết thúc, trả mảng mới', () => {
    const a = win('cn', '09:45:00', '10:15:00')
    const b = win('cn', '06:45:00', '07:15:00')
    const c = win('cn', '06:45:00', '06:59:00')
    const input = [a, b, c]
    const out = sortWindows(input)
    expect(out).toEqual([c, b, a])
    expect(out).not.toBe(input)
    expect(input).toEqual([a, b, c]) // không đổi mảng gốc
  })

  it('sắp theo phút thật, không theo chuỗi', () => {
    const a = win('cn', '10:00:00', '10:30:00')
    const b = win('cn', '9:00:00', '9:30:00')
    expect(sortWindows([a, b])).toEqual([b, a])
  })

  it('mảng rỗng → mảng rỗng', () => {
    expect(sortWindows([])).toEqual([])
  })

  it('windowsForSession lọc đúng buổi và sắp xếp', () => {
    const out = windowsForSession([...PARITY_WINDOWS].reverse(), 'cn')
    expect(out.map(w => w.start_time)).toEqual(['06:45:00', '09:45:00'])
    expect(windowsForSession(PARITY_WINDOWS, 'cn_le')).toHaveLength(1)
    expect(windowsForSession([], 'cn')).toEqual([])
  })
})

describe('formatWindow', () => {
  it('HH:MM – HH:MM với dấu gạch ngang en dash', () => {
    expect(formatWindow({ start_time: '06:45:00', end_time: '07:15:00' })).toBe('06:45 – 07:15')
  })

  it('nhận cả HH:MM và đệm số 0', () => {
    expect(formatWindow({ start_time: '6:45', end_time: '07:15' })).toBe('06:45 – 07:15')
  })
})

describe('punctualityOf / PUNCTUALITY_LABELS / nextLateValue', () => {
  it('ánh xạ is_late → trạng thái', () => {
    expect(punctualityOf(true)).toBe('late')
    expect(punctualityOf(false)).toBe('on_time')
    expect(punctualityOf(null)).toBe('unknown')
    expect(punctualityOf(undefined)).toBe('unknown')
  })

  it('nhãn tiếng Việt', () => {
    expect(PUNCTUALITY_LABELS).toEqual({ late: 'Trễ', on_time: 'Đúng giờ', unknown: 'Chưa xét' })
  })

  it('nextLateValue: true → false, còn lại → true', () => {
    expect(nextLateValue(true)).toBe(false)
    expect(nextLateValue(false)).toBe(true)
    expect(nextLateValue(null)).toBe(true)
    expect(nextLateValue(undefined)).toBe(true)
  })

  it('chu kỳ bấm: Chưa xét → Trễ → Đúng giờ → Trễ', () => {
    let v: boolean | null = null
    v = nextLateValue(v)
    expect(punctualityOf(v)).toBe('late')
    v = nextLateValue(v)
    expect(punctualityOf(v)).toBe('on_time')
    v = nextLateValue(v)
    expect(punctualityOf(v)).toBe('late')
  })
})

describe('canEditLate (chỉ admin được sửa tay Trễ ↔ Đúng giờ)', () => {
  it('admin → true', () => {
    expect(canEditLate('admin')).toBe(true)
  })
  it('các vai trò khác / chưa biết vai trò → false', () => {
    for (const role of ['phan_doan_truong', 'giao_ly_vien', 'ADMIN', '', null, undefined]) {
      expect(canEditLate(role)).toBe(false)
    }
  })
})
