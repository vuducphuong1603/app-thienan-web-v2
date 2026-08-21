/**
 * Chuẩn hoá chuỗi để tìm kiếm không phân biệt hoa thường và dấu tiếng Việt:
 * "vo thi y" khớp "VÕ THỊ Ý", "au 1a" khớp "Ấu 1A", "duc" khớp "Đức".
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
}
