/** Icon cuối câu chào trên dashboard. Mặc định 👋; một số SĐT được đổi thành ❤️. */
const HEART_PHONES = new Set(['0357377064'])

/** Chuẩn hoá SĐT về dạng 0xxxxxxxxx (bỏ khoảng trắng, +84/84 → 0). */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  let p = phone.replace(/[\s.-]/g, '')
  if (p.startsWith('+84')) p = '0' + p.slice(3)
  else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2)
  return p
}

export function getGreetingIcon(phone: string | null | undefined): string {
  return HEART_PHONES.has(normalizePhone(phone)) ? '❤️' : '👋'
}
