import type { QueryClient } from '@tanstack/react-query'

// Danh sách query key cần làm mới sau khi thêm/sửa/xoá thiếu nhi.
// Chuyển lớp một em làm sai lệch cả danh sách thiếu nhi lẫn sĩ số lớp, chi tiết
// lớp và thống kê — chỉ invalidate mỗi 'students' thì trang lớp vẫn hiện dữ liệu
// cũ tới 10 phút (staleTime), khiến người dùng tưởng thao tác chuyển lớp thất bại.
export const STUDENT_CHANGE_KEYS: readonly (readonly string[])[] = [
  ['students'],
  ['classes'],
  ['classDetail'],
  ['classStats'],
  ['dashboardStats'],
  ['glvDashboardStats'],
  ['glvPerStudentStats'],
  ['glvClassTrend'],
  ['attendanceStudents'],
]

// Sau khi thêm/sửa/xoá giáo lý viên (hoặc đổi lớp phụ trách): danh sách người
// dùng, lớp (kèm GLV phụ trách), chi tiết lớp và danh bạ GLV đều phải làm mới.
export const USER_CHANGE_KEYS: readonly (readonly string[])[] = [
  ['users'],
  ['classes'],
  ['classDetail'],
  ['teacherDirectory'],
]

function invalidateKeys(queryClient: QueryClient, keys: readonly (readonly string[])[]) {
  return Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] }))
  )
}

export function invalidateStudentData(queryClient: QueryClient) {
  return invalidateKeys(queryClient, STUDENT_CHANGE_KEYS)
}

export function invalidateUserData(queryClient: QueryClient) {
  return invalidateKeys(queryClient, USER_CHANGE_KEYS)
}
