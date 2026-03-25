import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'

export const metadata = {
  title: 'Chính sách bảo mật - Thiếu Nhi Thiên Ân',
  description: 'Chính sách bảo mật của ứng dụng Thiếu Nhi Thiên Ân',
}

export default function PrivacyPage() {
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
          <Lock className="w-8 h-8 text-brand" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chính sách bảo mật</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 25/03/2026</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Giới thiệu</h2>
            <p>
              Ứng dụng Thiếu Nhi Thiên Ân (&quot;Ứng dụng&quot;) là công cụ quản lý hoạt động thiếu nhi dành cho
              giáo lý viên và quản trị viên tại Giáo Xứ Thiên Ân, TP. Hồ Chí Minh.
              Ứng dụng được thiết kế để người lớn (giáo lý viên, phân đoàn trưởng, quản trị viên) sử dụng,
              không dành cho trẻ em trực tiếp sử dụng. Chính sách bảo mật này mô tả cách chúng tôi thu thập,
              sử dụng và bảo vệ thông tin của bạn.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Thông tin chúng tôi thu thập</h2>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">2.1 Thông tin tài khoản người dùng</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Họ và tên, tên thánh</li>
              <li>Số điện thoại</li>
              <li>Địa chỉ email</li>
              <li>Ảnh đại diện (nếu bạn chọn tải lên)</li>
              <li>Vai trò (giáo lý viên, phân đoàn trưởng, quản trị viên)</li>
            </ul>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">2.2 Dữ liệu thiếu nhi được quản lý</h3>
            <p>
              Giáo lý viên và quản trị viên nhập và quản lý thông tin thiếu nhi bao gồm:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Họ tên, tên thánh, ngày sinh</li>
              <li>Thông tin lớp học và ngành</li>
              <li>Dữ liệu điểm danh</li>
              <li>Số điện thoại phụ huynh (do giáo lý viên cung cấp)</li>
            </ul>
            <p className="mt-2">
              <strong>Lưu ý quan trọng:</strong> Dữ liệu thiếu nhi được nhập và quản lý bởi giáo lý viên (người lớn)
              theo ủy quyền của giáo xứ và sự đồng ý của phụ huynh. Trẻ em không trực tiếp sử dụng ứng dụng này.
            </p>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">2.3 Dữ liệu sử dụng</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Lịch sử điểm danh và hoạt động trong ứng dụng</li>
              <li>Cài đặt giao diện (chế độ sáng/tối)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Mục đích sử dụng thông tin</h2>
            <p>Chúng tôi sử dụng thông tin thu thập được cho các mục đích sau:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Xác thực và quản lý tài khoản người dùng</li>
              <li>Quản lý điểm danh thiếu nhi hàng tuần</li>
              <li>Tạo báo cáo điểm danh và thống kê</li>
              <li>Gửi thông báo liên quan đến hoạt động giáo xứ</li>
              <li>Cải thiện trải nghiệm sử dụng ứng dụng</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Chia sẻ thông tin</h2>
            <p>
              Chúng tôi <strong>không chia sẻ, bán hoặc cho thuê</strong> thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào.
              Thông tin chỉ được truy cập bởi quản trị viên giáo xứ được ủy quyền.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Lưu trữ và bảo mật dữ liệu</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dữ liệu được lưu trữ trên nền tảng Supabase với mã hóa khi truyền tải (HTTPS/TLS)</li>
              <li>Mật khẩu được mã hóa bằng thuật toán bcrypt, không lưu dưới dạng văn bản thuần</li>
              <li>Token xác thực trên thiết bị di động được lưu trữ an toàn bằng SecureStore (iOS Keychain / Android Keystore)</li>
              <li>Quyền truy cập dữ liệu được kiểm soát bằng Row Level Security (RLS)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Quyền của người dùng</h2>
            <p>Bạn có các quyền sau đối với dữ liệu cá nhân của mình:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Quyền truy cập:</strong> Xem thông tin cá nhân trong phần Hồ sơ của ứng dụng</li>
              <li><strong>Quyền chỉnh sửa:</strong> Cập nhật thông tin trong phần Chỉnh sửa hồ sơ</li>
              <li><strong>Quyền xóa tài khoản:</strong> Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu trong Cài đặt &gt; Xóa tài khoản</li>
              <li><strong>Quyền yêu cầu xóa dữ liệu:</strong> Liên hệ email bên dưới để yêu cầu xóa dữ liệu</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Bảo vệ dữ liệu trẻ em</h2>
            <p>
              Ứng dụng này được thiết kế cho <strong>người lớn</strong> (giáo lý viên, quản trị viên) sử dụng để quản lý
              hoạt động thiếu nhi. Trẻ em không trực tiếp tạo tài khoản hoặc sử dụng ứng dụng.
              Dữ liệu thiếu nhi được nhập bởi giáo lý viên theo sự ủy quyền của giáo xứ và phụ huynh.
            </p>
            <p>
              Chúng tôi cam kết bảo vệ dữ liệu thiếu nhi và chỉ sử dụng cho mục đích quản lý hoạt động giáo lý.
              Phụ huynh có quyền yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu con em mình bằng cách liên hệ quản trị viên giáo xứ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Dịch vụ bên thứ ba</h2>
            <p>Ứng dụng sử dụng các dịch vụ sau:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase:</strong> Lưu trữ dữ liệu và xác thực người dùng. Supabase không sử dụng dữ liệu của bạn cho mục đích riêng.</li>
            </ul>
            <p>Ứng dụng <strong>không sử dụng</strong> bất kỳ dịch vụ quảng cáo, theo dõi hay phân tích nào.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">9. Thay đổi chính sách</h2>
            <p>
              Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Mọi thay đổi sẽ được thông báo
              qua ứng dụng hoặc trên trang web. Việc tiếp tục sử dụng ứng dụng sau khi có thay đổi đồng nghĩa
              với việc bạn chấp nhận chính sách mới.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">10. Liên hệ</h2>
            <p>
              Nếu bạn có câu hỏi về chính sách bảo mật hoặc muốn thực hiện quyền liên quan đến dữ liệu cá nhân,
              vui lòng liên hệ:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Email:</strong> thieunhi.thienan@gmail.com</li>
              <li><strong>Địa chỉ:</strong> Giáo Xứ Thiên Ân, TP. Hồ Chí Minh</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
