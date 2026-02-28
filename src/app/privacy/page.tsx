import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'

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
          <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 01/01/2025</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Thu thập thông tin</h2>
            <p>
              Ứng dụng Giáo Xứ Thiên Ân thu thập các thông tin cần thiết để quản lý hoạt động giáo xứ, bao gồm: họ tên, ngày sinh, thông tin liên hệ và thông tin điểm danh của học viên.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Sử dụng thông tin</h2>
            <p>
              Thông tin được sử dụng nhằm mục đích quản lý điểm danh, theo dõi hoạt động giáo lý và hỗ trợ công tác quản lý giáo xứ. Chúng tôi không chia sẻ thông tin cá nhân với bên thứ ba.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Bảo mật dữ liệu</h2>
            <p>
              Chúng tôi áp dụng các biện pháp bảo mật phù hợp để bảo vệ thông tin cá nhân khỏi truy cập trái phép, thay đổi hoặc tiết lộ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Quyền của người dùng</h2>
            <p>
              Bạn có quyền yêu cầu truy cập, chỉnh sửa hoặc xóa thông tin cá nhân của mình bằng cách liên hệ ban quản trị giáo xứ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Liên hệ</h2>
            <p>
              Nếu bạn có thắc mắc về chính sách bảo mật, vui lòng liên hệ ban quản trị Giáo Xứ Thiên Ân.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
