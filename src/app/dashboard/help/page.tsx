'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronDown, ClipboardCheck, Users, BarChart3, Mail, Phone, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

const faqItems = [
  {
    question: 'Làm sao để điểm danh cho thiếu nhi?',
    answer:
      'Vào mục "Hoạt động" → chọn lớp cần điểm danh → chọn ngày → đánh dấu có mặt/vắng mặt cho từng em. Bạn cũng có thể sử dụng chức năng quét mã QR để điểm danh nhanh hơn.',
  },
  {
    question: 'Tôi quên mật khẩu, phải làm sao?',
    answer:
      'Liên hệ Ban điều hành Thiếu Nhi để được hỗ trợ đặt lại mật khẩu. Bạn có thể gọi điện hoặc nhắn tin theo thông tin liên hệ bên dưới.',
  },
  {
    question: 'Làm sao để xem báo cáo điểm danh?',
    answer:
      'Vào mục "Tổng quan" để xem tổng quan điểm danh. Đối với báo cáo chi tiết, vào "Hoạt động" → chọn lớp → xem lịch sử điểm danh theo tuần/tháng.',
  },
  {
    question: 'Tôi có thể chỉnh sửa thông tin thiếu nhi không?',
    answer:
      'Có, vào mục "Quản lý" → "Thiếu nhi" → chọn em cần chỉnh sửa → bấm nút chỉnh sửa. Lưu ý: một số thông tin chỉ được chỉnh sửa bởi Ban điều hành.',
  },
  {
    question: 'Ứng dụng có hoạt động trên điện thoại không?',
    answer:
      'Có, ứng dụng được thiết kế responsive, hoạt động tốt trên cả máy tính và điện thoại. Bạn có thể truy cập qua trình duyệt trên điện thoại.',
  },
  {
    question: 'Làm sao để thêm thiếu nhi mới vào lớp?',
    answer:
      'Vào "Quản lý" → "Thiếu nhi" → bấm nút "Thêm mới" → điền thông tin → chọn lớp → lưu. Chỉ Ban điều hành và Phân đoàn trưởng mới có quyền thêm mới.',
  },
]

const guideCards = [
  {
    icon: ClipboardCheck,
    title: 'Điểm danh',
    description: 'Điểm danh thiếu nhi mỗi buổi học thứ 5 và chủ nhật. Hỗ trợ điểm danh bù cho thiếu nhi vắng.',
  },
  {
    icon: Users,
    title: 'Quản lý thiếu nhi',
    description: 'Xem, thêm, sửa thông tin thiếu nhi. Quản lý danh sách lớp, phân chia theo ngành.',
  },
  {
    icon: BarChart3,
    title: 'Báo cáo',
    description: 'Xem thống kê điểm danh, điểm số theo tuần/tháng/năm. Xuất báo cáo để in ấn.',
  },
]

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[#e5e1dc] dark:border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-black dark:text-white pr-4">{question}</span>
        <ChevronDown
          className={`w-4 h-4 text-black/40 dark:text-white/60 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-4">
          <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#f6f6f6] dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-[#e5e1dc] dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black dark:text-white" />
          </button>
          <h1 className="text-lg font-semibold text-black dark:text-white">
            Trợ giúp và hỗ trợ
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Guide cards */}
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
            Hướng dẫn sử dụng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {guideCards.map((card) => (
              <div
                key={card.title}
                className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-[#e5e1dc] dark:border-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mb-3">
                  <card.icon className="w-5 h-5 text-brand" />
                </div>
                <p className="text-sm font-medium text-black dark:text-white mb-1">{card.title}</p>
                <p className="text-xs text-black/40 dark:text-white/60 leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
            Câu hỏi thường gặp
          </h2>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl px-5 border border-[#e5e1dc] dark:border-white/10">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
            Liên hệ hỗ trợ
          </h2>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-[#e5e1dc] dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-black/40 dark:text-white/60">Email</p>
                <p className="text-sm text-black dark:text-white">thieunhi.thienan@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-black/40 dark:text-white/60">Số điện thoại</p>
                <p className="text-sm text-black dark:text-white">0123 456 789</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-xs text-black/40 dark:text-white/60">Địa chỉ</p>
                <p className="text-sm text-black dark:text-white">Giáo xứ Thiên Ân, TP. Hồ Chí Minh</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
