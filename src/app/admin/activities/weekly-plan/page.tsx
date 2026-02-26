'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, List, FileText, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { supabase, PlanCategory, WeeklyPlan, Class } from '@/lib/supabase'
import { WeeklyPlanCalendar, PlanModal, DeletePlanModal } from '@/components/weekly-plan'

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
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [plans, setPlans] = useState<WeeklyPlan[]>([])
  const [categories, setCategories] = useState<PlanCategory[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editPlan, setEditPlan] = useState<WeeklyPlan | null>(null)
  const [deletePlan, setDeletePlan] = useState<WeeklyPlan | null>(null)

  // Current date display
  const today = new Date()
  const dayOfWeek = today.toLocaleDateString('vi-VN', { weekday: 'long' })
  const formattedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)
  const formattedDate = `${formattedDayOfWeek}, ${today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  // Fetch categories + classes once
  useEffect(() => {
    const fetchStatic = async () => {
      const [catRes, classRes] = await Promise.all([
        supabase.from('plan_categories').select('*').order('display_order'),
        supabase.from('classes').select('*').eq('status', 'ACTIVE').order('display_order'),
      ])
      if (catRes.data) setCategories(catRes.data)
      if (classRes.data) setClasses(classRes.data)
    }
    fetchStatic()
  }, [])

  // Fetch plans when weekStart changes
  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*, plan_categories(*)')
      .gte('plan_date', toDateString(weekStart))
      .lte('plan_date', toDateString(weekEnd))
      .order('plan_date')
      .order('time_start')

    if (error) {
      console.error('Error fetching plans:', error)
      setNotification({ type: 'error', message: 'Lỗi tải kế hoạch' })
    } else {
      setPlans(data || [])
    }
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

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
    <div className="flex gap-5">
      {/* Left Sidebar - Tab Navigation */}
      <div className="w-[208px] flex flex-col gap-2">
        <Link
          href="/admin/activities"
          className="h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <List className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">Điểm danh</span>
        </Link>

        <Link
          href="/admin/activities"
          className="h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition-colors bg-[#f6f6f6] dark:bg-white/5 hover:bg-[#eee] dark:hover:bg-white/10"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-[rgba(250,134,94,0.2)]">
            <FileText className="w-5 h-5 text-brand" />
          </div>
          <span className="text-base font-semibold text-black dark:text-white opacity-80">Báo cáo</span>
        </Link>

        <div className="h-[56px] rounded-full flex items-center gap-5 px-2 shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] bg-brand">
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-[4.244px] bg-white/20">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold text-white">Kế hoạch</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h1 className="text-[40px] font-bold italic text-gray-900 dark:text-white mb-5 leading-tight">
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
        <div className="flex items-center justify-between mb-5">
          {/* Left: Date + Today Button */}
          <div className="flex items-center gap-4">
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

          {/* Right: Navigation + Date Range + Add Button */}
          <div className="flex items-center gap-3">
            {/* Week Navigation */}
            <div className="flex items-center">
              <button
                onClick={goToPreviousWeek}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-white" />
              </button>
              <button
                onClick={goToNextWeek}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors -ml-px"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-white" />
              </button>
            </div>

            {/* Date Range Display */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 border border-[#E5E1DC] dark:border-white/10 rounded-full">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-white">
                {formatWeekRange(weekStart)}
              </span>
            </div>

            {/* Add Plan Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-full hover:bg-[#e8764f] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm kế hoạch
            </button>
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
            onEditPlan={plan => setEditPlan(plan)}
            onDeletePlan={plan => setDeletePlan(plan)}
          />
        )}
      </div>

      {/* Add Plan Modal */}
      <PlanModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
        mode="add"
        categories={categories}
        classes={classes}
      />

      {/* Edit Plan Modal */}
      <PlanModal
        isOpen={!!editPlan}
        onClose={() => setEditPlan(null)}
        onSuccess={handleEditSuccess}
        mode="edit"
        plan={editPlan}
        categories={categories}
        classes={classes}
      />

      {/* Delete Plan Modal */}
      <DeletePlanModal
        isOpen={!!deletePlan}
        onClose={() => setDeletePlan(null)}
        onConfirm={handleDeleteConfirm}
        planTitle={deletePlan?.title}
      />
    </div>
  )
}
