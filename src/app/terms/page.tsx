import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata = {
  title: 'Điều khoản sử dụng - Thiếu Nhi Thiên Ân',
  description: 'Điều khoản sử dụng của ứng dụng Thiếu Nhi Thiên Ân',
}

export default function TermsPage() {
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
          <FileText className="w-8 h-8 text-brand" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Điều khoản sử dụng</h1>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 25/03/2026</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Chấp nhận điều khoản</h2>
            <p>
              Khi tạo tài khoản và sử dụng ứng dụng Thiếu Nhi Thiên Ân (&quot;Ứng dụng&quot;), bạn đồng ý tuân thủ
              các điều khoản sử dụng được nêu dưới đây. Nếu bạn không đồng ý với bất kỳ điều khoản nào,
              vui lòng không sử dụng ứng dụng.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Mô tả dịch vụ</h2>
            <p>
              Ứng dụng Thiếu Nhi Thiên Ân là công cụ quản lý hoạt động thiếu nhi dành cho giáo lý viên
              và quản trị viên tại Giáo Xứ Thiên Ân. Ứng dụng cung cấp các tính năng:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Điểm danh thiếu nhi bằng mã QR</li>
              <li>Quản lý danh sách thiếu nhi theo lớp và ngành</li>
              <li>Xem báo cáo và thống kê điểm danh</li>
              <li>Gửi thông báo đến giáo lý viên</li>
              <li>Quản lý tài khoản người dùng</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Tài khoản người dùng</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tài khoản được cấp bởi quản trị viên giáo xứ hoặc đăng ký qua ứng dụng.</li>
              <li>Bạn có trách nhiệm bảo mật thông tin đăng nhập của mình.</li>
              <li>Bạn phải thông báo ngay cho quản trị viên nếu phát hiện truy cập trái phép vào tài khoản.</li>
              <li>Bạn có quyền xóa tài khoản bất cứ lúc nào thông qua Cài đặt &gt; Xóa tài khoản.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Quy tắc sử dụng</h2>
            <p>Khi sử dụng ứng dụng, bạn đồng ý:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Chỉ sử dụng ứng dụng cho mục đích quản lý hoạt động giáo xứ</li>
              <li>Không chia sẻ thông tin cá nhân của thiếu nhi ra bên ngoài phạm vi giáo xứ</li>
              <li>Không sử dụng ứng dụng vào mục đích gây hại, quấy rối hoặc vi phạm pháp luật</li>
              <li>Cung cấp thông tin chính xác và cập nhật</li>
              <li>Không cố gắng truy cập trái phép vào hệ thống hoặc dữ liệu của người dùng khác</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Quyền sở hữu trí tuệ</h2>
            <p>
              Ứng dụng và tất cả nội dung liên quan (bao gồm nhưng không giới hạn ở thiết kế, mã nguồn, logo)
              thuộc quyền sở hữu của Giáo Xứ Thiên Ân. Bạn không được sao chép, phân phối hoặc sử dụng
              bất kỳ phần nào của ứng dụng cho mục đích thương mại mà không có sự đồng ý bằng văn bản.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Giới hạn trách nhiệm</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ứng dụng được cung cấp miễn phí và &quot;nguyên trạng&quot; (as-is).</li>
              <li>Giáo Xứ Thiên Ân không chịu trách nhiệm về mất mát dữ liệu do lỗi kỹ thuật, bảo trì hệ thống,
              hoặc nguyên nhân ngoài tầm kiểm soát.</li>
              <li>Chúng tôi nỗ lực duy trì ứng dụng hoạt động ổn định nhưng không đảm bảo dịch vụ liên tục 100%.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">7. Chấm dứt</h2>
            <p>
              Quản trị viên giáo xứ có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu phát hiện
              vi phạm các điều khoản sử dụng. Bạn cũng có quyền ngừng sử dụng ứng dụng bất cứ lúc nào
              bằng cách xóa tài khoản.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">8. Thay đổi điều khoản</h2>
            <p>
              Chúng tôi có quyền cập nhật các điều khoản sử dụng này. Mọi thay đổi sẽ được thông báo
              qua ứng dụng. Việc tiếp tục sử dụng ứng dụng sau khi điều khoản được cập nhật đồng nghĩa
              với việc bạn chấp nhận các điều khoản mới.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">9. Liên hệ</h2>
            <p>
              Mọi thắc mắc về điều khoản sử dụng, vui lòng liên hệ:
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
