# SPEC — Báo cáo tổng hợp cho Cha: "Nghỉ" = số em vắng trọn kỳ + cảnh báo vắng 2 tháng liên tiếp

## 1. Mission
Mục "Báo cáo tổng hợp điểm danh" (báo cáo gửi Cha, `reportStyle` priest) trong `src/app/admin/activities/page.tsx`
(`generatePriestReport`, `handlePriestExportImage`, `handlePriestExportExcel`, khối xem trước "Priest Report Result Section")
và `src/components/PriestReportTemplate.tsx`.

Yêu cầu nguyên văn của người dùng: "chỗ Nghỉ thì hiển thị con số thiếu nhi đã nghỉ kiểu không đi buổi nào trong tháng đó,
nếu vẫn được điểm danh 1 lần thì không tính. Tới tháng sau (liên tiếp) mà vẫn không đi thì hiện cảnh báo: tên, lớp và số
điện thoại phụ huynh. Tháng 1 không đi, tháng 2 đi, tháng 3 không đi → KHÔNG cảnh báo; chỉ cảnh báo khi 2 tháng liên tiếp.
Đây là mục xuất báo cáo cho Cha — coi chừng đụng nhầm code qua mục khác." Cảnh báo phải IN CHUNG vào ảnh + Excel xuất ra.

## 2. Tech stack (cố định)
Next.js 15 app router, React, TypeScript, Tailwind, Supabase JS, Vitest (`src/lib/__tests__/*.test.ts`).
Không thêm dependency, không migration DB, không ghi vào DB.

## 3. Yêu cầu
1. **Logic thuần mới** `src/lib/priest-report.ts` (TDD, test ở `src/lib/__tests__/priest-report.test.ts`):
   - `monthRange(year, monthIndex0)` → `{ from, to }` chuỗi `YYYY-MM-DD` theo ngày ĐỊA PHƯƠNG (không dùng `toISOString`,
     vốn lệch 1 ngày ở UTC+7: hiện tháng 9 ra `2026-08-31..2026-09-29` — lỗi có sẵn, sửa luôn cho chế độ tháng).
   - `previousMonth(year, monthIndex0)` → `{ year, monthIndex0 }` (tháng 1 → tháng 12 năm trước).
   - Hàm đếm theo lớp số em ACTIVE KHÔNG có bản ghi `present` nào trong kỳ (input: danh sách em + tập student_id có mặt).
   - Hàm tạo danh sách cảnh báo: em vắng trọn kỳ hiện tại VÀ vắng trọn tháng liền trước → `{ studentId, saintName, fullName,
     className, parentPhones: string[] }` (bỏ SĐT rỗng/trùng; `parent_phone`, `parent_phone_2`), sắp theo thứ tự lớp
     (display_order của lớp) rồi tên.
2. **"Có đi" = có ÍT NHẤT 1 bản ghi `status='present'`** của em đó trong kỳ, bất kỳ buổi nào thuộc loại điểm danh đang chọn
   (`all` = thu5/cn/cn_le; `thu5`; `cn` = cn hoặc cn_le). Chủ nhật: chỉ đi giáo lý HOẶC chỉ đi lễ cũng tính là có đi (dùng bản ghi
   thô, KHÔNG dùng `mergeSundayRecords` cho phần này). Xác định theo `student_id` (không lọc theo `class_id`, em chuyển lớp vẫn đúng).
3. **Cột "Nghỉ"** (bảng xem trước, ảnh, Excel, dòng cộng ngành, tổng cộng) = số em vắng trọn kỳ theo #2. Áp dụng mọi chế độ
   (tuần/tháng/năm) để nghĩa của cột thống nhất. Thẻ thống kê "Tổng lượt nghỉ" đổi nhãn thành "Số em nghỉ cả kỳ" (hoặc
   tương đương rõ nghĩa). Cột "Đi" và "Tỉ lệ (%)" GIỮ NGUYÊN cách tính hiện tại (lượt có mặt / tổng lượt, có mergeSundayRecords).
   Thêm 1 dòng chú thích nhỏ dưới bảng trong ảnh: "Nghỉ: số em không đi buổi nào trong kỳ báo cáo".
4. **Cảnh báo 2 tháng liên tiếp** — chỉ ở chế độ **Tháng**: tính thêm tập có mặt của tháng liền trước (cùng loại điểm danh).
   Chỉ cảnh báo khi cả hai tháng đều có ≥ 1 ngày điểm danh hợp lệ (không phải tháng toàn nghỉ lễ). Hiển thị mục
   "⚠ CẢNH BÁO: vắng 2 tháng liên tiếp (tháng M-1 và M)" gồm bảng STT | Tên thánh + Họ tên | Lớp | SĐT phụ huynh:
   - trong `PriestReportTemplate` (dưới bảng chính, nên nằm trong ảnh xuất), màu cảnh báo đỏ nhạt, hợp tông hiện có;
   - trong khối xem trước trên web;
   - trong Excel: sheet thứ 2 "Canh bao" (không đổi tên sheet 1).
   Không có em nào → ẩn mục (ảnh) / hiện dòng "Không có em nào vắng 2 tháng liên tiếp" trên web.
5. **Truy vấn** trong `generatePriestReport`: dữ liệu `attendance_records` có thể > 1000 dòng → dùng `fetchAllRows`
   (export sẵn trong `src/lib/queries.ts`) với khoá sắp xếp duy nhất (`.order('id')`) cho mọi truy vấn điểm danh của báo cáo.
   Danh sách em ACTIVE (`id, saint_name, full_name, class_id, parent_phone, parent_phone_2`) lấy 1 lần bằng `fetchAllRows`
   thay cho vòng lặp đếm từng lớp; sĩ số lớp = đếm từ danh sách đó (kết quả phải giống cũ).
6. **Phạm vi file** (ngoài danh sách này = vi phạm): `src/lib/priest-report.ts` (mới), `src/lib/__tests__/priest-report.test.ts`
   (mới), `src/components/PriestReportTemplate.tsx`, `src/app/admin/activities/page.tsx` — trong page.tsx CHỈ được sửa
   `generatePriestReport`, `handlePriestExportExcel`, khối JSX xem trước báo cáo Cha (Priest Report Result Section) và import.
   Không đụng báo cáo phụ huynh / sổ điểm / tab điểm danh / `mergeSundayRecords` / `fetchAllRows`.
7. Chạy `gitnexus impact` trước khi sửa symbol có sẵn (theo CLAUDE.md dự án).

## 4. Commands
- `npm test` (vitest run — toàn bộ, không chạm DB)
- `npx tsc --noEmit -p .`
- `npx eslint src/lib/priest-report.ts src/lib/__tests__/priest-report.test.ts src/components/PriestReportTemplate.tsx src/app/admin/activities/page.tsx`
- KHÔNG chạy `npm run test:live`, KHÔNG `git push`, KHÔNG commit (orchestrator commit).

## 5. Definition of Done
| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | `npm test` | tất cả xanh, tổng ≥ 228 + 12 test mới |
| 2 | test mới phủ | monthRange (tháng 9/2026 = 2026-09-01..2026-09-30, tháng 2 năm nhuận, tháng 12), previousMonth (tháng 1→12 năm trước), đi 1 buổi → không tính nghỉ, chỉ đi lễ CN → không tính nghỉ, vắng T1+T2 → cảnh báo, vắng T1 đi T2 → không, đi T1 vắng T2 → không, SĐT rỗng/trùng bị bỏ, sắp xếp theo lớp rồi tên |
| 3 | `npx tsc --noEmit -p .` | 0 lỗi |
| 4 | eslint lệnh trên | 0 error |
| 5 | `git diff --stat` | chỉ 4 file trong #6; diff page.tsx chỉ nằm trong các vùng cho phép |
| 6 | Review orchestrator | cột Nghỉ/cộng ngành/tổng = số em; cảnh báo có tên + lớp + SĐT phụ huynh, có trong ảnh (template) và Excel sheet 2; chỉ ở chế độ Tháng |
