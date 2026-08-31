// Xử lý ảnh đại diện thiếu nhi: validate file, dựng đường dẫn lưu trong
// Supabase Storage (bucket student-photos) và trích lại storage path từ
// public URL để xoá ảnh cũ khi thay/xoá avatar.
import type { SupabaseClient } from '@supabase/supabase-js'

export const STUDENT_PHOTOS_BUCKET = 'student-photos'
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/** Trả về thông báo lỗi (tiếng Việt) nếu file không hợp lệ, null nếu OK */
export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) {
    return 'File không phải là hình ảnh. Vui lòng chọn ảnh JPG, PNG hoặc chụp từ camera.'
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return 'File quá lớn. Dung lượng tối đa 5MB.'
  }
  if (file.size <= 0) {
    return 'File rỗng. Vui lòng chọn ảnh khác.'
  }
  return null
}

/** Đường dẫn lưu ảnh trong bucket: students/<studentId>/<timestamp>.<ext> */
export function buildAvatarPath(
  studentId: string,
  mimeType: string,
  now: number = Date.now()
): string {
  const ext = EXT_BY_MIME[mimeType.toLowerCase()] || 'jpg'
  return `students/${studentId}/${now}.${ext}`
}

/**
 * Từ public URL của Supabase Storage, lấy lại path bên trong bucket để xoá.
 * Trả null nếu URL không thuộc bucket này (vd avatar cũ dạng base64).
 */
export function extractStoragePath(
  url: string | null | undefined,
  bucket: string = STUDENT_PHOTOS_BUCKET
): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

/** Upload ảnh mới lên bucket student-photos, trả về public URL */
export async function uploadStudentAvatar(
  supabase: SupabaseClient,
  studentId: string,
  file: File
): Promise<string> {
  const path = buildAvatarPath(studentId, file.type)
  const { error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from(STUDENT_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Xoá ảnh cũ trên storage (best-effort, bỏ qua nếu không phải URL storage) */
export async function deleteStudentAvatar(
  supabase: SupabaseClient,
  avatarUrl: string | null | undefined
): Promise<void> {
  const path = extractStoragePath(avatarUrl)
  if (!path) return
  try {
    await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([path])
  } catch {
    // best-effort: ảnh mồ côi trên storage không ảnh hưởng dữ liệu
  }
}
