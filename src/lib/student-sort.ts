// Sắp xếp thiếu nhi theo TÊN GỌI (chữ cuối của họ tên) đúng thứ tự bảng chữ cái
// tiếng Việt (a ă â b c d đ e ê...), trùng tên thì xếp tiếp theo họ + tên đệm.
// DB order('full_name') xếp theo họ nên cột "Tên" trên bảng trông lộn xộn.

const collator = new Intl.Collator('vi')

export function givenNameOf(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/)
  return parts[parts.length - 1] ?? ''
}

export function compareByGivenName(
  a: { full_name: string | null },
  b: { full_name: string | null }
): number {
  const byGiven = collator.compare(givenNameOf(a.full_name), givenNameOf(b.full_name))
  if (byGiven !== 0) return byGiven
  return collator.compare(a.full_name ?? '', b.full_name ?? '')
}

/** Trả về mảng MỚI đã sắp xếp theo tên gọi, không đổi mảng gốc */
export function sortByGivenName<T extends { full_name: string | null }>(list: T[]): T[] {
  return [...list].sort(compareByGivenName)
}
