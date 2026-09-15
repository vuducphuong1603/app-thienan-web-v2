# SPEC — Tìm thiếu nhi nhất quán giữa Danh bạ và Quét QR

## 1. Mission
Người dùng phản hồi "trang Danh bạ tìm thấy thiếu nhi nhưng ô tìm thủ công trong Quét QR điểm danh thì không".
Nguyên nhân đã xác định (orchestrator đã đối chiếu DB thật, 1328 em ACTIVE):
- Quét QR tìm bằng `ilike` trên DB (có dấu), `.limit(50)` TRƯỚC khi lọc client "chỉ khớp tên cuối" → tên phổ biến
  (Anh: 161 dòng ilike, 83 em tên cuối Anh) bị mất; gõ không dấu ("phuong") ra 0 kết quả; tên kép ("Quỳnh" → "Quỳnh Anh") không ra.
- Danh bạ mặc định "Tất cả trạng thái" nên hiện cả 132 em INACTIVE (vẫn gắn lớp đang hoạt động) → người dùng tưởng đang học.
Deliverable: (A) tìm thủ công trong Quét QR lọc phía client trên danh sách em ACTIVE tải một lần, bỏ dấu, quy tắc khớp nới hơn;
(B) Danh bạ mặc định lọc "Đang học". Dữ liệu DB (1 em tên NFD) orchestrator tự sửa, KHÔNG thuộc phạm vi đội.

## 2. Tech stack (cố định)
Next.js 15 app router, React, TypeScript, Tailwind, Supabase JS client, Vitest (`src/lib/__tests__/*.test.ts`). Không thêm dependency, không migration DB.

## 3. Yêu cầu
### A. `src/lib/qr-attendance.ts` + `src/components/QRScanAttendanceModal.tsx`
A1. Thêm hàm thuần `filterManualStudents(students, text, classId?)` (tên có thể khác nhưng phải export + test) làm toàn bộ việc lọc phía client:
   - dùng `normalizeSearchText` (src/lib/search.ts) cho cả từ khoá và dữ liệu → gõ không dấu / có dấu / NFD đều khớp.
   - mỗi từ khoá phải khớp ít nhất một trong: (a) đầu của bất kỳ từ nào trong họ tên TRỪ từ đầu tiên (họ) — "quynh" khớp "Trần Ngọc Quỳnh Anh", "tran" KHÔNG khớp; (b) cả cụm từ khoá là đoạn cuối của họ tên ("huyen tram"); (c) tên thánh, mã, tên lớp chứa từ khoá; (d) SĐT phụ huynh chứa chuỗi số (≥3 số).
   - có classId → chỉ em thuộc lớp đó; từ khoá rỗng + có classId → cả lớp.
   - kết quả sắp theo full_name (localeCompare 'vi'), giới hạn `manualSearchLimit(classId)` (giữ hàm cũ: 200 có lớp / 20 không lớp).
   Giữ `matchesStudentSearch`, `studentSearchOrFilter` cũ nếu còn test dùng, hoặc cập nhật test tương ứng — không được để test cũ đỏ vì bỏ hàm.
A2. Modal: khi mở (isOpen) tải MỘT lần toàn bộ em ACTIVE bằng `fetchAllRows` (đã có trong src/lib/queries.ts, Supabase trả tối đa 1000 dòng/request) với cột `id, full_name, saint_name, student_code, class_id, parent_phone, classes(name)`, cache trong state/ref của modal; `runSearch` không gọi DB tìm kiếm nữa, chỉ gọi hàm A1 (giữ debounce hiện tại, giữ phần query `attendance_records` để đánh dấu đã điểm danh). Trong lúc chưa tải xong hiển thị trạng thái "Đang tải danh sách…" thay vì "Không tìm thấy". Giữ nguyên các hành vi khác của modal (lịch sử, toast, nút X/check vừa sửa ở commit 3e99d9d).
A3. Bỏ phần tìm `classes` bằng ilike trong runSearch (tên lớp đã có trong dữ liệu cache).
### B. `src/app/admin/management/students/page.tsx`
B1. `filterStatus` mặc định `'ACTIVE'` thay vì `'all'`. Người dùng vẫn chọn "Tất cả trạng thái" / "Nghỉ học" như cũ. Không đổi gì khác.

## 4. Commands (chạy từ project root, nguyên văn)
- `npm test` — Vitest toàn bộ (phải 0 fail)
- `npx tsc --noEmit -p .` — 0 lỗi
- `npx eslint src/lib/qr-attendance.ts src/components/QRScanAttendanceModal.tsx src/app/admin/management/students/page.tsx src/lib/__tests__/qr-attendance.test.ts` — 0 error (warning có sẵn ở QRScanAttendanceModal dòng ~146 react-hooks/exhaustive-deps được phép)
- KHÔNG chạy `npm run test:live` (chạm DB prod).

## 5. Definition of Done
| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | `npm test` | tất cả pass, ≥ 8 test mới cho hàm A1 (không dấu, NFD, tên kép, họ không khớp, cụm cuối, tên thánh/mã/lớp, SĐT, classId, limit) |
| 2 | `npx tsc --noEmit -p .` | 0 lỗi |
| 3 | eslint 3 file trên | 0 error |
| 4 | `grep -n "ilike" src/components/QRScanAttendanceModal.tsx` | không còn dòng nào |
| 5 | `grep -n "useState<FilterStatus>('ACTIVE')" src/app/admin/management/students/page.tsx` | 1 dòng |
| 6 | Review lead: modal chỉ gọi DB đọc thieu_nhi 1 lần mỗi lần mở; không gọi lại mỗi lần gõ | đạt |
| 7 | `git status` chỉ chứa 4 file: qr-attendance.ts, test của nó, QRScanAttendanceModal.tsx, students/page.tsx | đạt |
Không commit — orchestrator commit sau khi tự kiểm chứng.
