# Đăng ký làm lại thẻ → Google Sheet

Trang: **Hoạt động → Đăng ký làm thẻ** (`/admin/activities/card-reissue`).
Mỗi lần xác nhận, app lưu vào bảng `card_reissue_requests` rồi ghi tiếp vào Google Sheet
"Danh sách làm lại thẻ thiếu nhi", tab **Làm Thẻ**, đúng cột file mẫu
(STT | MÃ | TÊN THÁNH | HỌ VÀ TÊN LÓT | TÊN | LỚP | TÊN GLV NHẬP | GHI CHÚ), bắt đầu từ dòng trống đầu tiên của cột B.

## Cấu hình 1 lần (bắt buộc để đẩy lên sheet)

1. Google Cloud Console → tạo project (hoặc dùng project sẵn) → **APIs & Services → Enable "Google Sheets API"**.
2. **IAM & Admin → Service Accounts → Create** → tạo key JSON, tải về.
3. Mở file sheet → **Chia sẻ** cho email service account (dạng `xxx@yyy.iam.gserviceaccount.com`) quyền **Người chỉnh sửa**.
4. Thêm biến môi trường (local `.env.local`, production: Vercel → Settings → Environment Variables):

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@yyy.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
CARD_REISSUE_SHEET_ID=1VL99rao6-G0HPURXvIDenqyYlJtFhC0zaQ7HZjE4vzg   # tuỳ chọn, mặc định đã là file này
CARD_REISSUE_SHEET_TAB=Làm Thẻ                                       # tuỳ chọn
```

`GOOGLE_PRIVATE_KEY` lấy từ trường `private_key` trong file JSON; giữ nguyên các `\n`.

Chưa cấu hình → app vẫn lưu đăng ký (trạng thái `failed`, lỗi "Chưa cấu hình Google Sheets") và báo vàng cho người dùng.

## Trạng thái cấu hình (12/09/2026)

- Google Cloud project: `thien-an-kids`, Sheets API đã bật.
- Service account: `card-reissue-sheets@thien-an-kids.iam.gserviceaccount.com` (đã share Editor trên file sheet).
- Env đã đặt ở `.env.local` và Vercel **Production**. Muốn chạy trên Preview thì thêm env cho môi trường Preview.
- Xoay key: IAM & Admin → Service Accounts → card-reissue-sheets → Keys → Add key, rồi cập nhật `GOOGLE_PRIVATE_KEY` ở Vercel.
