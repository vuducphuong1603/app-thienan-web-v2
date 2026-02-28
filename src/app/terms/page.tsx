import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

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
          <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 01/01/2025</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Chấp nhận điều khoản</h2>
            <p>
              Khi sử dụng ứng dụng Giáo Xứ Thiên Ân, bạn đồng ý tuân thủ các điều khoản sử dụng được nêu dưới đây.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Tài khoản người dùng</h2>
            <p>
              Tài khoản được cấp bởi ban quản trị giáo xứ. Bạn có trách nhiệm bảo mật thông tin đăng nhập và thông báo ngay nếu phát hiện truy cập trái phép.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Quy tắc sử dụng</h2>
            <p>
              Ứng dụng chỉ được sử dụng cho mục đích quản lý hoạt động giáo xứ. Nghiêm cấm sử dụng ứng dụng vào mục đích gây hại hoặc vi phạm pháp luật.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Giới hạn trách nhiệm</h2>
            <p>
              Giáo Xứ Thiên Ân không chịu trách nhiệm về những thiệt hại phát sinh từ việc sử dụng hoặc không thể sử dụng ứng dụng do lỗi kỹ thuật hoặc bảo trì hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Thay đổi điều khoản</h2>
            <p>
              Chúng tôi có quyền cập nhật điều khoản sử dụng bất cứ lúc nào. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên ứng dụng.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
