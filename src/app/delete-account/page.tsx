import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

export const metadata = {
  title: 'Xóa tài khoản - Thiếu Nhi Thiên Ân',
  description: 'Hướng dẫn xóa tài khoản ứng dụng Thiếu Nhi Thiên Ân',
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Trash2 className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Xóa tài khoản</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cách xóa tài khoản trong ứng dụng</h2>
            <p>Bạn có thể tự xóa tài khoản trực tiếp trong ứng dụng Thiếu Nhi Thiên Ân:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Mở ứng dụng và đăng nhập vào tài khoản của bạn</li>
              <li>Chuyển đến tab <strong>Cài đặt</strong></li>
              <li>Cuộn xuống phần <strong>&quot;Vùng nguy hiểm&quot;</strong></li>
              <li>Nhấn vào <strong>&quot;Xóa tài khoản&quot;</strong></li>
              <li>Xác nhận xóa trong hộp thoại hiện ra</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dữ liệu sẽ bị xóa</h2>
            <p>Khi xóa tài khoản, tất cả dữ liệu sau sẽ bị xóa vĩnh viễn:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Thông tin cá nhân (họ tên, số điện thoại, email)</li>
              <li>Ảnh đại diện</li>
              <li>Ghi chú cá nhân</li>
              <li>Lịch sử thông báo</li>
              <li>Dữ liệu điểm danh do bạn thực hiện</li>
              <li>Thông tin xác thực (tài khoản đăng nhập)</li>
            </ul>
            <p className="font-semibold text-red-600 dark:text-red-400">
              Hành động này không thể hoàn tác.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Yêu cầu xóa qua email</h2>
            <p>
              Nếu bạn không thể truy cập ứng dụng, bạn có thể gửi yêu cầu xóa tài khoản qua email đến:
            </p>
            <p>
              <a
                href="mailto:thieunhi.thienan@gmail.com?subject=Yêu cầu xóa tài khoản Thiếu Nhi Thiên Ân"
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                thieunhi.thienan@gmail.com
              </a>
            </p>
            <p>
              Trong email, vui lòng cung cấp số điện thoại hoặc email đã đăng ký để chúng tôi xác minh và xử lý
              yêu cầu trong vòng 7 ngày làm việc.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
