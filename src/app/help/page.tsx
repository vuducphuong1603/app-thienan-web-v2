import Link from 'next/link'
import { ArrowLeft, HelpCircle, Mail, Phone, BookOpen, Users, ClipboardCheck } from 'lucide-react'

export default function HelpPage() {
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
          <HelpCircle className="w-8 h-8 text-brand" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trợ giúp</h1>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Câu hỏi thường gặp</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Làm thế nào để đăng ký tài khoản?</h3>
                    <p className="text-sm mt-1">Vui lòng liên hệ ban quản trị giáo xứ để được cấp tài khoản sử dụng ứng dụng.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Làm thế nào để điểm danh?</h3>
                    <p className="text-sm mt-1">Sau khi đăng nhập, chọn lớp giáo lý và sử dụng chức năng điểm danh trên trang quản lý.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Tôi quên mật khẩu, phải làm sao?</h3>
                    <p className="text-sm mt-1">Sử dụng chức năng &quot;Quên mật khẩu&quot; trên trang đăng nhập hoặc liên hệ ban quản trị để được hỗ trợ.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Liên hệ hỗ trợ</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand" />
                <span>Liên hệ ban quản trị Giáo Xứ Thiên Ân</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-brand" />
                <span>Liên hệ trực tiếp tại văn phòng giáo xứ</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
