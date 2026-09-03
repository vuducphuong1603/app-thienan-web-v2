// Danh sách phân đoàn (ngành). Tách riêng để module thuần logic/test không phải khởi tạo Supabase client.
export const BRANCHES = ['Chiên Con', 'Ấu Nhi', 'Thiếu Nhi', 'Nghĩa Sĩ'] as const
export type Branch = typeof BRANCHES[number]
