'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useMyNotesData, useInvalidateQueries } from '@/lib/queries'
import { supabase } from '@/lib/supabase'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

export default function MyNotes() {
  const { user, isAdmin } = useAuth()
  const { data, isLoading } = useMyNotesData(user)
  const { invalidateMyNotes } = useInvalidateQueries()
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterMenu])

  const classCount = data?.classCount ?? 0
  const studentCount = data?.studentCount ?? 0
  const todayPlans = data?.todayPlans ?? []
  const completionPercentage = data?.completionPercentage ?? 0
  const nextActivity = data?.nextActivity ?? null

  // Get unique categories from today's plans for filter menu
  const categories = todayPlans.reduce<{ id: string; name: string; color: string }[]>((acc, plan) => {
    const catId = plan.category_id || 'none'
    if (!acc.find(c => c.id === catId)) {
      acc.push({
        id: catId,
        name: plan.plan_categories?.name || 'Không phân loại',
        color: plan.plan_categories?.color || '#999',
      })
    }
    return acc
  }, [])

  // Filter plans by selected category
  const filteredPlans = filterCategory
    ? todayPlans.filter(p => (p.category_id || 'none') === filterCategory)
    : todayPlans

  const totalBars = 26
  const filledBars = Math.round((completionPercentage / 100) * totalBars)

  const handleAddPlan = () => {
    if (isAdmin) {
      router.push('/admin/activities/weekly-plan')
    } else {
      router.push('/dashboard')
    }
  }

  const handleDelete = async (planId: string) => {
    if (!confirm('Bạn có chắc muốn hủy hoạt động này?')) return
    setDeletingId(planId)
    try {
      const { error } = await supabase.from('weekly_plans').delete().eq('id', planId)
      if (!error) {
        await invalidateMyNotes()
      }
    } finally {
      setDeletingId(null)
    }
  }

  const statusConfig = {
    pending: { text: 'Chưa bắt đầu', color: 'text-black/40 dark:text-white/50' },
    in_progress: { text: 'Đang thực hiện', color: 'text-brand' },
    completed: { text: 'Đã hoàn thành', color: 'text-green-500' },
  }

  return (
    <div className="bg-white dark:bg-white/10 rounded-[15px] p-4 border border-gray-100 dark:border-white/10 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-10 mb-3 flex-shrink-0">
        <h3 className="text-base font-semibold text-black dark:text-white">Ghi chú của tôi</h3>
        <button
          onClick={() => router.push('/admin/activities/weekly-plan')}
          className="w-12 h-12 bg-[#F6F6F6] dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        >
          <MoreHorizontal className="w-[22px] h-[22px] text-black/40 dark:text-white/50" />
        </button>
      </div>

      {/* Cards Row */}
      <div className="flex gap-2 mb-4 flex-1">
        {/* Add Card */}
        <div
          onClick={handleAddPlan}
          className="w-[100px] h-full bg-[#F6F6F6] dark:bg-white/5 rounded-2xl flex items-center justify-center border border-dashed border-black/20 dark:border-white/20 hover:border-brand hover:bg-brand/5 cursor-pointer transition-all flex-shrink-0"
        >
          <Plus className="w-5 h-5 text-black/40 dark:text-white/50" />
        </div>

        {/* Class Card */}
        <div className="flex-1 h-full bg-[#F6F6F6] dark:bg-white/5 rounded-[20px] p-3 flex flex-col justify-between">
          <div className="w-6 h-6">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 4.875C10.3 4.875 8.125 7.05 8.125 9.75C8.125 12.45 10.3 14.625 13 14.625C15.7 14.625 17.875 12.45 17.875 9.75C17.875 7.05 15.7 4.875 13 4.875Z" fill="#FA865E" />
              <path d="M20.5833 19.5C20.5833 16.1167 17.1958 13.4167 13 13.4167C8.80416 13.4167 5.41666 16.1167 5.41666 19.5V21.125H20.5833V19.5Z" fill="#FA865E" fillOpacity="0.4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-light text-black/40 dark:text-white/50">Lớp đang dạy</p>
            {isLoading ? (
              <div className="space-y-1 mt-1">
                <div className="h-7 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-medium text-black dark:text-white leading-[1.2]">
                  {classCount} <span className="text-base font-normal text-black/40 dark:text-white/50">lớp</span>
                </p>
                <p className="text-xs text-black dark:text-white">{studentCount} thiếu nhi</p>
              </>
            )}
          </div>
        </div>

        {/* Activity Card */}
        <div className="flex-1 h-full bg-[#F6F6F6] dark:bg-white/5 rounded-2xl p-3 flex flex-col justify-between">
          <div className="w-6 h-6">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 22.75L11.3425 21.2475C5.85 16.26 2.16666 12.935 2.16666 8.9375C2.16666 5.6125 4.78749 3.25 8.11249 3.25C9.94583 3.25 11.7 4.095 13 5.4925C14.3 4.095 16.0542 3.25 17.8875 3.25C21.2125 3.25 23.8333 5.6125 23.8333 8.9375C23.8333 12.935 20.15 16.26 14.6575 21.2475L13 22.75Z" fill="#FA865E" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-light text-black/40 dark:text-white/50">Tham gia hoạt động</p>
            {isLoading ? (
              <div className="space-y-1 mt-1">
                <div className="h-7 w-14 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              </div>
            ) : nextActivity ? (
              <>
                <p className="text-[22px] font-semibold text-black dark:text-white leading-tight">
                  {formatDate(nextActivity.plan_date)}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#DF1C41]">{nextActivity.location || 'Chưa có địa điểm'}</span>
                  <span className="text-black dark:text-white">{formatTime(nextActivity.time_start)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-black/40 dark:text-white/50 mt-1">Không có hoạt động sắp tới</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-[#F6F6F6] dark:bg-white/5 rounded-3xl p-4 h-[106px] mb-4 flex-shrink-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-[11px]">
            <div className="w-[49px] h-[49px] bg-white dark:bg-white/10 rounded-3xl flex items-center justify-center">
              <span className="text-[22px]">🔥</span>
            </div>
            <span className="text-sm font-medium text-black dark:text-white">Hoàn thành</span>
          </div>
          <div className="flex items-baseline">
            {isLoading ? (
              <div className="h-7 w-10 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-[24px] font-medium text-black dark:text-white">{completionPercentage}</span>
                <span className="text-sm text-black/20 dark:text-white/30">%</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-[14px] rounded-[6px] ${i < filledBars ? 'bg-brand' : 'bg-[#E5E1DC] dark:bg-white/20'}`}
            />
          ))}
        </div>
      </div>

      {/* Today's Plans Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-medium text-black dark:text-white">
          Kế hoạch hoạt động hôm nay
          {filterCategory && <span className="text-xs text-brand ml-1">({categories.find(c => c.id === filterCategory)?.name})</span>}
        </h3>
        <div className="flex items-center gap-[15px] w-[60px]">
          {/* Filter button */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`hover:opacity-70 transition-opacity ${filterCategory ? 'text-brand' : ''}`}
            >
              <svg width="23" height="23" viewBox="0 0 23 23" fill="none">
                <path d="M2.875 6.70833H20.125M5.75 11.5H17.25M8.625 16.2917H14.375" stroke="currentColor" className={filterCategory ? 'text-brand' : 'text-black/40 dark:text-white/50'} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 min-w-[160px]">
                <button
                  onClick={() => { setFilterCategory(null); setShowFilterMenu(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${!filterCategory ? 'text-brand font-medium' : 'text-black/70 dark:text-white/70'}`}
                >
                  Tất cả
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setFilterCategory(cat.id); setShowFilterMenu(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 ${filterCategory === cat.id ? 'text-brand font-medium' : 'text-black/70 dark:text-white/70'}`}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* More button -> go to weekly plan page */}
          <button
            onClick={() => router.push('/admin/activities/weekly-plan')}
            className="hover:opacity-70 transition-opacity"
          >
            <MoreHorizontal className="w-[22px] h-[22px] text-black/40 dark:text-white/50" />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2 flex-shrink-0">
        {isLoading ? (
          <div className="flex items-center gap-[15px]">
            <div className="w-[79px] h-[79px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
            <div className="w-[70px] h-[50px] bg-gray-200 dark:bg-white/10 rounded-[28px] animate-pulse flex-shrink-0" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-black/40 dark:text-white/50">
              {filterCategory ? 'Không có hoạt động trong danh mục này' : 'Không có hoạt động hôm nay'}
            </p>
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const categoryColor = plan.plan_categories?.color || '#FA865E'
            const categoryName = plan.plan_categories?.name || ''
            const categoryLetter = categoryName.charAt(0).toUpperCase() || '?'
            const status = statusConfig[plan.derivedStatus]
            const canCancel = plan.derivedStatus !== 'completed'

            return (
              <div key={plan.id} className="flex items-center gap-[15px]">
                {/* Category Circle */}
                <div
                  className="w-[79px] h-[79px] rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: categoryColor + '20' }}
                >
                  <span className="text-2xl font-semibold" style={{ color: categoryColor }}>
                    {categoryLetter}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-black dark:text-white mb-[6px] truncate">{plan.title}</h4>

                  <div className="flex items-center gap-[15px] text-xs text-black/40 dark:text-white/50 mb-[8px]">
                    <div className="flex items-center gap-[3px]">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M7.5 1.25C4.05 1.25 1.25 4.05 1.25 7.5C1.25 10.95 4.05 13.75 7.5 13.75C10.95 13.75 13.75 10.95 13.75 7.5C13.75 4.05 10.95 1.25 7.5 1.25ZM7.5 12.5C4.7375 12.5 2.5 10.2625 2.5 7.5C2.5 4.7375 4.7375 2.5 7.5 2.5C10.2625 2.5 12.5 4.7375 12.5 7.5C12.5 10.2625 10.2625 12.5 7.5 12.5ZM7.8125 4.375H6.875V8.125L10.1562 10.0937L10.625 9.325L7.8125 7.65625V4.375Z" fill="currentColor" />
                      </svg>
                      <span>{formatTime(plan.time_start)}</span>
                    </div>
                    {categoryName && (
                      <>
                        <div className="w-px h-[19px] bg-black/20 dark:bg-white/20" />
                        <span className="truncate">{categoryName}</span>
                      </>
                    )}
                    {plan.location && (
                      <>
                        <div className="w-px h-[19px] bg-black/20 dark:bg-white/20" />
                        <span className="truncate">{plan.location}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-[8px]">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M19.25 9.16667H18.3333V8.25C18.3333 7.51667 17.7833 6.875 16.9583 6.875C16.225 6.875 15.5833 7.425 15.5833 8.25V9.16667H6.41667V8.25C6.41667 7.51667 5.775 6.875 5.04167 6.875C4.21667 6.875 3.66667 7.425 3.66667 8.25V9.16667H2.75C2.29167 9.16667 1.83333 9.625 1.83333 10.0833V11.9167C1.83333 12.375 2.29167 12.8333 2.75 12.8333H3.66667V13.75C3.66667 14.4833 4.21667 15.125 5.04167 15.125C5.775 15.125 6.41667 14.575 6.41667 13.75V12.8333H15.5833V13.75C15.5833 14.4833 16.225 15.125 16.9583 15.125C17.7833 15.125 18.3333 14.575 18.3333 13.75V12.8333H19.25C19.7083 12.8333 20.1667 12.375 20.1667 11.9167V10.0833C20.1667 9.625 19.7083 9.16667 19.25 9.16667Z" fill="#FA865E" />
                    </svg>
                    <span className={`text-xs ${status.color}`}>{status.text}</span>
                  </div>
                </div>

                {/* Cancel Button */}
                {canCancel && (
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deletingId === plan.id}
                    className="w-[70px] h-[50px] bg-brand text-white text-sm font-medium rounded-[28px] hover:bg-brand/90 transition-colors flex-shrink-0 flex items-center justify-center disabled:opacity-50"
                  >
                    {deletingId === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'HỦY'
                    )}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
