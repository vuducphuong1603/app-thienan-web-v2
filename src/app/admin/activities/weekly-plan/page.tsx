'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, List, FileText, CalendarDays, ChevronLeft, ChevronRight, Bell, ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase, WeeklyPlan } from '@/lib/supabase'
import { WeeklyPlanCalendar, PlanModal, DeletePlanModal, WeekPickerCalendar } from '@/components/weekly-plan'
import { usePlanStaticData, useWeeklyPlans, useInvalidateQueries } from '@/lib/queries'
import { useAuth } from '@/lib/auth-context'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const startStr = weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const endStr = weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

export default function WeeklyPlanPage() {
  const { isManager } = useAuth()
  // admin + phân đoàn trưởng được thêm/sửa/xoá kế hoạch (PĐT chỉ trong phân đoàn mình)
  const isAdmin = isManager
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editPlan, setEditPlan] = useState<WeeklyPlan | null>(null)
  const [deletePlan, setDeletePlan] = useState<WeeklyPlan | null>(null)
  const [showWeekPicker, setShowWeekPicker] = useState(false)

  // Current date display
  const today = new Date()
  const dayOfWeek = today.toLocaleDateString('vi-VN', { weekday: 'long' })
  const formattedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)
  const formattedDate = `${formattedDayOfWeek}, ${today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  const { data: staticData } = usePlanStaticData()
  const categories = staticData?.categories || []
  const classes = staticData?.classes || []
  const { data: plans = [], isLoading: loading } = useWeeklyPlans(weekStart)
  const { invalidateWeeklyPlans } = useInvalidateQueries()

  const fetchPlans = () => invalidateWeeklyPlans(toDateString(weekStart))

  // Auto-clear notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Navigation
  const goToPreviousWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const goToNextWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const goToToday = () => {
    setWeekStart(getMonday(new Date()))
  }

  // CRUD handlers
  const handleAddSuccess = () => {
    setNotification({ type: 'success', message: 'Đã thêm kế hoạch' })
    fetchPlans()
  }

  const handleEditSuccess = () => {
    setNotification({ type: 'success', message: 'Đã cập nhật kế hoạch' })
    fetchPlans()
  }

  const handleDeleteConfirm = async () => {
    if (!deletePlan) return
    const { error } = await supabase.from('weekly_plans').delete().eq('id', deletePlan.id)
    if (error) throw error
    setNotification({ type: 'success', message: 'Đã xóa kế hoạch' })
    fetchPlans()
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Left Sidebar - Tab Navigation */}
      <div className="w-full lg:w-[208px] flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
        <Link
          href="/admin/activities"
          className="h-[56px] flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-3 lg:gap-5 px-2 pr-5 lg:pr-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <List className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">Điểm danh</span>
        </Link>

        <Link
          href="/admin/activities"
          className="h-[56px] flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-3 lg:gap-5 px-2 pr-5 lg:pr-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <FileText className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">Báo cáo</span>
        </Link>

        <div className="h-[56px] flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-3 lg:gap-5 px-2 pr-5 lg:pr-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] bg-brand">
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-white/20">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold text-white">Kế hoạch</span>
        </div>

        <Link
          href="/admin/notifications"
          className="h-[56px] flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-3 lg:gap-5 px-2 pr-5 lg:pr-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <Bell className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">Thông báo</span>
        </Link>

        <Link
          href="/admin/alerts"
          className="h-[56px] flex-shrink-0 whitespace-nowrap rounded-full flex items-center gap-3 lg:gap-5 px-2 pr-5 lg:pr-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <ShieldAlert className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">Cảnh báo</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Back Link */}
        <Link
          href="/admin/activities"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay trở lại</span>
        </Link>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold italic text-gray-900 dark:text-white mb-5 leading-tight">
          Kế hoạch tuần này
        </h1>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {notification.message}
          </div>
        )}

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          {/* Left: Date + Today Button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formattedDate}
            </span>
            <button
              onClick={goToToday}
              className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
            >
              Hôm nay
            </button>
          </div>

          {/* Right: View Toggle + Navigation + Date Range + Add Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full overflow-hidden">
              <span className="px-5 py-2 text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-white/10">
                Tuần
              </span>
            </div>

            {/* Date Range with Navigation + Week Picker */}
            <div className="relative">
              <div className="flex items-center gap-0 bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full overflow-hidden">
                <button
                  onClick={goToPreviousWeek}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors border-r border-[#E5E1DC] dark:border-white/10"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setShowWeekPicker(!showWeekPicker)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-white whitespace-nowrap">
                    {formatWeekRange(weekStart)}
                  </span>
                </button>
                <button
                  onClick={goToNextWeek}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/20 transition-colors border-l border-[#E5E1DC] dark:border-white/10"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <WeekPickerCalendar
                isOpen={showWeekPicker}
                onClose={() => setShowWeekPicker(false)}
                currentWeekStart={weekStart}
                onSelectWeek={(newWeekStart) => setWeekStart(newWeekStart)}
              />
            </div>

            {/* Add Plan Button - admin only */}
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-[#e8764f] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm kế hoạch
              </button>
            )}
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        {loading ? (
          <div className="bg-white dark:bg-white/5 rounded-[20px] border border-[#E5E1DC] dark:border-white/10 flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400">Đang tải...</span>
            </div>
          </div>
        ) : (
          <WeeklyPlanCalendar
            weekStart={weekStart}
            plans={plans}
            categories={categories}
            classes={classes}
            onEditPlan={isAdmin ? plan => setEditPlan(plan) : undefined}
            onDeletePlan={isAdmin ? plan => setDeletePlan(plan) : undefined}
          />
        )}
      </div>

      {/* Modals - admin only */}
      {isAdmin && (
        <>
          <PlanModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={handleAddSuccess}
            mode="add"
            categories={categories}
            classes={classes}
          />
          <PlanModal
            isOpen={!!editPlan}
            onClose={() => setEditPlan(null)}
            onSuccess={handleEditSuccess}
            mode="edit"
            plan={editPlan}
            categories={categories}
            classes={classes}
          />
          <DeletePlanModal
            isOpen={!!deletePlan}
            onClose={() => setDeletePlan(null)}
            onConfirm={handleDeleteConfirm}
            planTitle={deletePlan?.title}
          />
        </>
      )}
    </div>
  )
}
