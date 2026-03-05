# Bảng Kế Hoạch: Giao Diện & Chức Năng Cho Role Giáo Lý Viên

## Phân Tích Hiện Trạng

### Đã có (hoạt động tốt)
| Trang | Đường dẫn | Chức năng |
|-------|-----------|-----------|
| Tổng quan | `/dashboard` | Thống kê (sĩ số, tỷ lệ điểm danh T5/CN), lịch tuần, ghi chú nhanh, biểu đồ điểm danh, DS vắng, cảnh báo |
| Thống kê | `/dashboard/performance` | Xu hướng điểm danh 3 tuần, thống kê từng em, so sánh T5 vs CN |
| Hiển thị | `/dashboard/display` | Dark mode, font size, compact mode |
| Trợ giúp | `/dashboard/help` | Trang hỗ trợ |

### Vấn đề hiện tại
- Thanh navigation của GLV trỏ đến `/admin/*` (Quản lý, Hoạt động, Hệ thống) nhưng bị chặn bởi admin guard
- GLV không có trang quản lý thiếu nhi, điểm danh, nhập điểm, xem kế hoạch tuần
- Thiếu trang cài đặt cá nhân (đổi mật khẩu, sửa thông tin)

---

## Navigation Mới Đề Xuất

```
┌──────────┬──────────────┬──────────────┬──────────┐
│ Tổng quan │ Lớp của tôi  │  Hoạt động   │  Cá nhân │
│ /dashboard│ /dashboard/  │ /dashboard/  │/dashboard│
│           │   class      │  activities  │ /settings│
└──────────┴──────────────┴──────────────┴──────────┘
```

---

## Chi Tiết Các Trang & Chức Năng

---

### 1. Tổng Quan — `/dashboard` — ✅ ĐÃ CÓ

| Chức năng | Mô tả |
|-----------|-------|
| Cards thống kê | Tên ngành, sĩ số thiếu nhi, tỷ lệ điểm danh T5, tỷ lệ điểm danh CN |
| Lịch tuần | Hiển thị kế hoạch/sự kiện tuần này |
| Ghi chú nhanh | Widget tạo & xem ghi chú cá nhân |
| Biểu đồ điểm danh | Chart điểm danh lớp theo tuần |
| DS thiếu nhi vắng | Danh sách em vắng gần đây |
| Cảnh báo | Thông báo quan trọng từ hệ thống |
| Thông báo popup | Xem thông báo mới từ admin |

---

### 2. Lớp Của Tôi — `/dashboard/class` — 🆕 CẦN TẠO

> Trung tâm quản lý thiếu nhi. Dữ liệu tự động giới hạn theo lớp được phân công.

#### 2.1 Danh sách thiếu nhi (Tab/Trang chính) — Ưu tiên: **P0**

| Chức năng | Mô tả |
|-----------|-------|
| Xem danh sách | Bảng: tên thánh, họ tên, mã số TN, ngày sinh, giới tính, SĐT phụ huynh |
| Tìm kiếm | Tìm theo tên, tên thánh, mã số thiếu nhi |
| Lọc trạng thái | Đang học / Nghỉ học |
| Xem chi tiết | Bấm vào từng em → xem thông tin đầy đủ + lịch sử điểm danh |
| Sửa thông tin cơ bản | Sửa: SĐT phụ huynh, địa chỉ, ghi chú |

> **Lưu ý:** GLV KHÔNG có quyền thêm/xóa thiếu nhi, không đổi lớp/trạng thái (chỉ admin)

#### 2.2 Bảng điểm — Ưu tiên: **P0**

| Chức năng | Mô tả |
|-----------|-------|
| Xem bảng điểm | Họ tên, điểm 45 phút HK1, điểm thi HK1, điểm 45 phút HK2, điểm thi HK2 |
| Nhập/sửa điểm | Bấm trực tiếp vào ô để nhập điểm (inline edit) |
| Tính điểm tự động | TB giáo lý, điểm điểm danh T5/CN, TB điểm danh, TB tổng hợp |
| Sắp xếp | Theo tên, theo điểm, theo tỷ lệ điểm danh |

> **Công thức:** TB giáo lý = (45p_HK1 + 45p_HK2 + thi_HK1×2 + thi_HK2×2) / 6

#### 2.3 Chi tiết từng thiếu nhi — Ưu tiên: **P1**

| Chức năng | Mô tả |
|-----------|-------|
| Thông tin cá nhân | Họ tên, tên thánh, ngày sinh, giới tính, SĐT, phụ huynh 1 & 2, địa chỉ |
| Lịch sử điểm danh | Bảng điểm danh T5 + CN theo từng tuần |
| Điểm số | Hiển thị 4 cột điểm + các trung bình |
| Ghi chú | Ghi chú riêng của GLV về thiếu nhi |

---

### 3. Hoạt Động — `/dashboard/activities` — 🆕 CẦN TẠO

#### 3.1 Điểm danh — Ưu tiên: **P0** ⭐ (Chức năng quan trọng nhất)

| Chức năng | Mô tả |
|-----------|-------|
| Điểm danh Thứ 5 / Chủ Nhật | Chọn ngày → hiện danh sách thiếu nhi → check có mặt/vắng |
| Chọn ngày | Bộ chọn ngày, mặc định hôm nay |
| Tự động xác định loại | Thứ 5 → điểm danh T5, Chủ Nhật → điểm danh CN |
| Điểm danh thủ công | Bấm nút check để đánh dấu có mặt từng em |
| Điểm danh QR | Quét mã QR của thiếu nhi để điểm danh nhanh |
| Điểm danh bù | Các ngày khác (T2-T4, T6-T7): điểm danh bù cho em vắng T5 |
| Hiển thị trạng thái | Số có mặt / tổng số, badge màu xanh/đỏ |
| Cảnh báo ngày lễ | Thông báo nếu ngày được chọn là ngày lễ nghỉ |

> **Khác với admin:** Lớp tự động chọn sẵn (lớp của GLV), không hiện dropdown chọn lớp/ngành

#### 3.2 Kế hoạch tuần — Ưu tiên: **P0**

| Chức năng | Mô tả |
|-----------|-------|
| Xem lịch tuần | Hiển thị kế hoạch theo tuần (dạng timeline/calendar) |
| Chuyển tuần | Nút: Tuần trước / Tuần sau / Hôm nay |
| Xem chi tiết sự kiện | Bấm vào → thời gian, địa điểm, mô tả, danh mục |
| Lọc tự động | Chỉ hiện kế hoạch liên quan đến lớp/ngành của GLV |

> **Lưu ý:** GLV chỉ XEM kế hoạch, KHÔNG tạo/sửa/xóa (chỉ admin quản lý)

---

### 4. Thống Kê & Báo Cáo — `/dashboard/performance` — ✅ ĐÃ CÓ

| Chức năng | Mô tả |
|-----------|-------|
| Xu hướng 3 tuần | Biểu đồ cột: điểm danh T5/CN qua 3 tuần gần nhất |
| Thống kê từng em | Bảng: tỷ lệ T5, CN, tổng hợp, số buổi vắng |
| So sánh T5 vs CN | Chart so sánh 2 loại điểm danh |
| Top vắng nhiều | Danh sách em vắng nhiều nhất |

---

### 5. Ghi Chú — `/dashboard/notes` — 🆕 CẦN TẠO — Ưu tiên: **P1**

| Chức năng | Mô tả |
|-----------|-------|
| Xem tất cả ghi chú | Danh sách ghi chú với chế độ xem Ngày / Tuần / Tháng |
| Tạo ghi chú | Tiêu đề, mô tả, ngày, giờ, màu sắc, địa điểm, liên kết |
| Sửa / Xóa | Chỉnh sửa inline + xóa ghi chú |
| Yêu thích | Đánh dấu / bỏ đánh dấu yêu thích |
| Hoàn thành | Đánh dấu đã hoàn thành |
| Nhắc nhở | Đặt reminder: 30 phút, 2 giờ, 1 ngày trước |
| Mã màu | Phân loại ghi chú bằng màu sắc |

> **Mở rộng từ:** Widget ghi chú nhanh trên Dashboard → phiên bản đầy đủ

---

### 6. Cài Đặt Cá Nhân — `/dashboard/settings` — 🆕 CẦN TẠO — Ưu tiên: **P1**

| Chức năng | Mô tả |
|-----------|-------|
| Xem thông tin | Tên thánh, họ tên, SĐT, email, vai trò, lớp phụ trách, ngành |
| Sửa thông tin | Sửa: tên thánh, họ tên, SĐT, địa chỉ |
| Đổi ảnh đại diện | Upload / xóa avatar |
| Đổi mật khẩu | Nhập: mật khẩu cũ → mật khẩu mới → xác nhận |
| Cài đặt hiển thị | Dark mode, cỡ chữ, chế độ compact (link đến `/dashboard/display`) |

> **Lưu ý:** GLV KHÔNG thể đổi vai trò, lớp, ngành (chỉ admin)

---

### 7. Thông Báo — `/dashboard/notifications` — 🆕 CẦN TẠO — Ưu tiên: **P2**

| Chức năng | Mô tả |
|-----------|-------|
| Danh sách thông báo | Tất cả thông báo từ admin (full-page, thay vì popup nhỏ) |
| Đánh dấu đã đọc | Bấm để đánh dấu đã đọc |
| Lọc ưu tiên | Cao / Bình thường / Thấp |
| Sắp xếp | Mới nhất hiện trước |
| Badge chưa đọc | Hiển thị số thông báo chưa đọc trên icon |

---

## Sơ Đồ Tổng Hợp Các Trang

```
/dashboard                              ✅ Tổng quan (đã có)
│
├── /dashboard/class                    🆕 Danh sách thiếu nhi     [P0]
│   ├── /dashboard/class/scores         🆕 Bảng điểm + nhập điểm  [P0]
│   └── /dashboard/class/students/[id]  🆕 Chi tiết thiếu nhi     [P1]
│
├── /dashboard/activities               🆕 Điểm danh T5/CN/bù     [P0] ⭐
│   └── /dashboard/activities/weekly-plan  🆕 Kế hoạch tuần        [P0]
│
├── /dashboard/performance              ✅ Thống kê & báo cáo (đã có)
│
├── /dashboard/notes                    🆕 Ghi chú đầy đủ         [P1]
├── /dashboard/settings                 🆕 Cài đặt cá nhân        [P1]
├── /dashboard/notifications            🆕 Thông báo               [P2]
│
├── /dashboard/display                  ✅ Cài đặt hiển thị (đã có)
└── /dashboard/help                     ✅ Trợ giúp (đã có)
```

---

## Luồng Công Việc Hàng Ngày Của GLV

| Bước | Hành động | Trang | Trạng thái |
|------|-----------|-------|------------|
| 1 | Mở app, xem tổng quan lớp | `/dashboard` | ✅ Đã có |
| 2 | Kiểm tra kế hoạch hôm nay | `/dashboard/activities/weekly-plan` | 🆕 Cần tạo |
| 3 | Điểm danh T5 hoặc CN | `/dashboard/activities` | 🆕 Cần tạo |
| 4 | Điểm danh bù (nếu cần) | `/dashboard/activities` | 🆕 Cần tạo |
| 5 | Kiểm tra em nào vắng | `/dashboard` (DS vắng) | ✅ Đã có |
| 6 | Xem xu hướng điểm danh | `/dashboard/performance` | ✅ Đã có |
| 7 | Nhập điểm sau kiểm tra | `/dashboard/class/scores` | 🆕 Cần tạo |
| 8 | Đọc thông báo từ admin | `/dashboard` (popup) | ✅ Đã có |
| 9 | Ghi chú cá nhân | `/dashboard/notes` | 🆕 Cần tạo |
| 10 | Cập nhật thông tin cá nhân | `/dashboard/settings` | 🆕 Cần tạo |

---

## Thứ Tự Triển Khai Đề Xuất

### Phase 1 — Cốt lõi (P0)
1. Sửa thanh navigation cho GLV (bỏ link admin)
2. **Điểm danh** — `/dashboard/activities`
3. **Kế hoạch tuần** — `/dashboard/activities/weekly-plan`
4. **Danh sách thiếu nhi** — `/dashboard/class`
5. **Bảng điểm** — `/dashboard/class/scores`

### Phase 2 — Hoàn thiện (P1)
6. **Cài đặt cá nhân** — `/dashboard/settings`
7. **Ghi chú đầy đủ** — `/dashboard/notes`
8. **Chi tiết thiếu nhi** — `/dashboard/class/students/[id]`

### Phase 3 — Bổ sung (P2)
9. **Thông báo full-page** — `/dashboard/notifications`

---

## Bảng So Sánh Quyền: Admin vs GLV

| Chức năng | Admin | GLV |
|-----------|-------|-----|
| Xem tất cả lớp/ngành | ✅ | ❌ Chỉ lớp mình |
| Thêm/xóa thiếu nhi | ✅ | ❌ |
| Sửa thông tin TN cơ bản | ✅ | ✅ (SĐT, địa chỉ, ghi chú) |
| Điểm danh | ✅ Mọi lớp | ✅ Chỉ lớp mình |
| Nhập điểm | ✅ Mọi lớp | ✅ Chỉ lớp mình |
| Tạo kế hoạch tuần | ✅ | ❌ Chỉ xem |
| Quản lý user/GLV | ✅ | ❌ |
| Quản lý lớp | ✅ | ❌ |
| Gửi thông báo | ✅ | ❌ Chỉ nhận |
| Quản lý cảnh báo | ✅ | ❌ Chỉ xem |
| Cài đặt năm học | ✅ | ❌ |
| Cài đặt cá nhân | ✅ | ✅ |
| Xem báo cáo | ✅ Toàn bộ | ✅ Chỉ lớp mình |
