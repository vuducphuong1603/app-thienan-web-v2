'use client'

import { useAuth } from '@/lib/auth-context'
import {
  ROLE_LABELS,
  supabase,
  AlertRecord,
  AlertRule,
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_CONDITION_KEYS,
} from '@/lib/supabase'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Lock,
  History,
  Clock,
  Monitor,
  AlertTriangle,
  ChevronDown,
  Flame,
  Inbox,
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Play,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard'
import { useAlerts, useAlertStats, useAlertRules, useAlertHistory, useInvalidateQueries } from '@/lib/queries'
import RuleModal from '@/components/alerts/RuleModal'
import DeleteRuleModal from '@/components/alerts/DeleteRuleModal'
import { runRuleEngine } from '@/lib/rule-engine'

type TabType = 'alerts' | 'rules' | 'history'

// ============ Stats Card Component (unchanged UI) ============
function AlertStatsCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: number
  icon: 'total' | 'unread' | 'high' | 'resolved'
  variant?: 'primary' | 'default'
}) {
  const getIcon = () => {
    switch (icon) {
      case 'total':
        return <Flame className="w-4 h-4 text-white" />
      case 'unread':
        return <Inbox className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
    }
  }

  const bars = useMemo(() => Array.from({ length: 9 }, () => Math.random() * 100), [])

  return (
    <div
      className={`relative rounded-[15px] p-4 h-[147px] overflow-hidden ${
        variant === 'primary'
          ? 'bg-brand text-white'
          : 'bg-white dark:bg-white/10 border border-white/60 dark:border-white/10'
      }`}
    >
      <p
        className={`text-[22px] font-semibold ${
          variant === 'primary' ? 'text-white' : 'text-black dark:text-white opacity-80'
        }`}
      >
        {title}
      </p>
      <div
        className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          variant === 'primary'
            ? 'bg-white/10 border border-white/20'
            : 'bg-black/[0.03] dark:bg-white/10'
        }`}
      >
        {getIcon()}
      </div>
      <p
        className={`text-[40px] font-bold absolute bottom-4 left-4 ${
          variant === 'primary' ? 'text-white' : 'text-black dark:text-white'
        }`}
      >
        {value}
      </p>
      {icon === 'unread' ? (
        <svg className="absolute bottom-4 right-4 w-[144px] h-[44px]" viewBox="0 0 144 44" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient-unread" x1="72" y1="0" x2="72" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FA865E" stopOpacity="0.14" />
              <stop offset="1" stopColor="#FA865E" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 2L8 7L16 0L23.5 15.5L30 21L37 12L43 10L55 21L61 19L68 28L74 16L80 12L91 19H99L106.5 28H113L123 19L131 33L144 44H0V2Z" fill="url(#gradient-unread)" />
          <path d="M0 2L8 7L16 0L23.5 15.5L30 21L37 12L43 10L55 21L61 19L68 28L74 16L80 12L91 19H99L106.5 28H113L123 19L131 33L144 44" stroke="#FA865E" strokeWidth="1" fill="none" />
        </svg>
      ) : icon === 'high' ? (
        <svg className="absolute bottom-4 right-4 w-[132px] h-[56px]" viewBox="0 0 132 56" fill="none">
          <rect x="0" y="3" width="6" height="53" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="0" y="19" width="6" height="37" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="0" y="38" width="6" height="18" rx="3" fill="#FA865E" />
          <rect x="14" y="26" width="6" height="30" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="14" y="41" width="6" height="15" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="14" y="48" width="6" height="8" rx="3" fill="#FA865E" />
          <rect x="28" y="24" width="6" height="32" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="28" y="29" width="6" height="27" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="28" y="39" width="6" height="17" rx="3" fill="#FA865E" />
          <rect x="42" y="42" width="6" height="14" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="42" y="47" width="6" height="9" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="42" y="50" width="6" height="6" rx="3" fill="#FA865E" />
          <rect x="56" y="28" width="6" height="28" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="56" y="37" width="6" height="19" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="56" y="43" width="6" height="13" rx="3" fill="#FA865E" />
          <rect x="70" y="26" width="6" height="30" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="70" y="33" width="6" height="23" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="70" y="38" width="6" height="18" rx="3" fill="#FA865E" />
          <rect x="84" y="38" width="6" height="18" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="84" y="43" width="6" height="13" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="84" y="51" width="6" height="5" rx="3" fill="#FA865E" />
          <rect x="98" y="33" width="6" height="23" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="98" y="39" width="6" height="17" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="98" y="46" width="6" height="10" rx="3" fill="#FA865E" />
          <rect x="112" y="37" width="6" height="19" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="112" y="42" width="6" height="14" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="112" y="46" width="6" height="10" rx="3" fill="#FA865E" />
          <rect x="126" y="46" width="6" height="10" rx="3" fill="#FA865E" fillOpacity="0.2" />
          <rect x="126" y="50" width="6" height="6" rx="3" fill="#FA865E" fillOpacity="0.4" />
          <rect x="126" y="53" width="6" height="3" rx="3" fill="#FA865E" />
        </svg>
      ) : icon === 'resolved' ? (
        <svg className="absolute bottom-4 right-4 w-[152px] h-[60px]" viewBox="0 0 152 60" fill="none">
          <rect x="0" y="0" width="4" height="50" rx="2" fill="#E5E1DC" />
          <rect x="0" y="52" width="4" height="8" rx="2" fill="#FA865E" />
          <rect x="12" y="0" width="4" height="18" rx="2" fill="#E5E1DC" />
          <rect x="12" y="20" width="4" height="40" rx="2" fill="#FA865E" />
          <rect x="24" y="0" width="4" height="23" rx="2" fill="#E5E1DC" />
          <rect x="24" y="24" width="4" height="26" rx="2" fill="#FA865E" />
          <rect x="24" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="36" y="0" width="4" height="25" rx="2" fill="#FA865E" />
          <rect x="36" y="27" width="4" height="11" rx="2" fill="#E5E1DC" />
          <rect x="36" y="40" width="4" height="20" rx="2" fill="#E5E1DC" />
          <rect x="48" y="0" width="4" height="30" rx="2" fill="#E5E1DC" />
          <rect x="48" y="32" width="4" height="18" rx="2" fill="#FA865E" />
          <rect x="48" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="60" y="0" width="4" height="10" rx="2" fill="#E5E1DC" />
          <rect x="60" y="12" width="4" height="27" rx="2" fill="#FA865E" />
          <rect x="60" y="41" width="4" height="19" rx="2" fill="#E5E1DC" />
          <rect x="72" y="0" width="4" height="36" rx="2" fill="#E5E1DC" />
          <rect x="72" y="38" width="4" height="12" rx="2" fill="#FA865E" />
          <rect x="72" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="84" y="0" width="4" height="10" rx="2" fill="#E5E1DC" />
          <rect x="84" y="12" width="4" height="31" rx="2" fill="#FA865E" />
          <rect x="84" y="45" width="4" height="15" rx="2" fill="#E5E1DC" />
          <rect x="96" y="0" width="4" height="50" rx="2" fill="#FA865E" />
          <rect x="96" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="108" y="0" width="4" height="24" rx="2" fill="#E5E1DC" />
          <rect x="108" y="26" width="4" height="34" rx="2" fill="#FA865E" />
          <rect x="120" y="0" width="4" height="7" rx="2" fill="#FA865E" />
          <rect x="120" y="9" width="4" height="51" rx="2" fill="#E5E1DC" />
          <rect x="132" y="0" width="4" height="26" rx="2" fill="#E5E1DC" />
          <rect x="132" y="28" width="4" height="22" rx="2" fill="#FA865E" />
          <rect x="132" y="52" width="4" height="8" rx="2" fill="#E5E1DC" />
          <rect x="144" y="0" width="4" height="50" rx="2" fill="#E5E1DC" />
          <rect x="144" y="52" width="4" height="8" rx="2" fill="#FA865E" />
        </svg>
      ) : (
        <div className="absolute bottom-4 right-4 flex items-end gap-1.5 h-[46px]">
          {bars.map((height, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div
                className={`w-1.5 rounded ${variant === 'primary' ? 'bg-white/20' : 'bg-brand/20'}`}
                style={{ height: `${46 - (height * 46) / 100}px` }}
              />
              <div
                className={`w-1.5 rounded ${variant === 'primary' ? 'bg-white' : 'bg-brand'}`}
                style={{ height: `${(height * 46) / 100}px` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Sidebar Tab Component (unchanged) ============
function SidebarTab({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-5 pl-[7px] pr-4 py-2 rounded-full transition-all ${
        active
          ? 'bg-brand text-white shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)]'
          : 'bg-[#f6f6f6] dark:bg-white/10 text-black dark:text-white shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] hover:bg-gray-100 dark:hover:bg-white/20'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          active ? 'bg-white/20' : 'bg-brand/20'
        }`}
      >
        {icon}
      </div>
      <span className="text-base font-semibold opacity-80">{label}</span>
      {count !== undefined && (
        <div
          className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm ${
            active ? 'bg-white/20' : 'bg-black/10 dark:bg-white/20'
          }`}
        >
          <span className="text-xs">{count}</span>
        </div>
      )}
    </button>
  )
}

// ============ Filter Dropdown Component ============
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLabel = options.find(o => o.value === value)?.label || label

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-[38px] px-4 bg-white dark:bg-white/10 border border-white/60 dark:border-white/10 rounded-full hover:shadow-sm transition-all"
      >
        <span className="text-sm font-medium text-black dark:text-white">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-black dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 min-w-[160px] bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-20 py-1">
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${
                value === option.value ? 'text-brand font-medium' : 'text-black dark:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Time Ago Helper ============
function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} ngày trước`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks} tuần trước`
}

// ============ Severity Badge ============
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${colors[severity] || colors.medium}`}>
      <AlertTriangle className="w-3 h-3" />
      {ALERT_SEVERITY_LABELS[severity as keyof typeof ALERT_SEVERITY_LABELS] || severity}
    </span>
  )
}

// ============ Alert Item Component ============
function AlertItem({
  alert,
  onMarkRead,
  onResolve,
  onDismiss,
  showActions = true,
}: {
  alert: AlertRecord
  onMarkRead: (id: string) => void
  onResolve: (id: string) => void
  onDismiss: (id: string) => void
  showActions?: boolean
}) {
  const statusLabel = alert.status === 'unread' ? 'Chưa đọc' : alert.status === 'read' ? 'Đã đọc' : alert.status === 'resolved' ? 'Đã xử lý' : 'Đã bỏ qua'

  return (
    <div className="bg-white dark:bg-white/10 rounded-[25px] p-3.5 flex items-center gap-4">
      {/* Thumbnail */}
      <div className="w-[178px] h-[90px] bg-[#e5e1dc] dark:bg-white/10 rounded-[20px] flex-shrink-0 flex items-center justify-center">
        <AlertTriangle className={`w-8 h-8 ${alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Status & Priority */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[#6e62e5]">{statusLabel}</span>
          <SeverityBadge severity={alert.severity} />
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-gray-600 dark:text-gray-300">
            {ALERT_TYPE_LABELS[alert.type]}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-black dark:text-white mb-0.5">{alert.title}</h4>

        {/* Description */}
        <p className="text-sm text-black/40 dark:text-white/40 font-light mb-2 truncate">
          {alert.description}
          {alert.student_name && (
            <span className="ml-1">
              - {alert.student_name}
              {alert.student_code && ` (${alert.student_code})`}
              {alert.class_name && ` - ${alert.class_name}`}
            </span>
          )}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/40 dark:text-white/40">{timeAgo(alert.created_at)}</span>
          </div>
          <div className="w-px h-4 bg-black/20 dark:bg-white/20" />
          <div className="flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            <span className="text-xs text-black/40 dark:text-white/40">{alert.source}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {alert.status === 'unread' && (
          <button
            onClick={() => onMarkRead(alert.id)}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Đã đọc
          </button>
        )}
        <button
          onClick={() => onResolve(alert.id)}
          className="px-3 py-1.5 bg-brand text-white text-xs rounded-full hover:bg-brand/90 transition-colors"
        >
          Xử lý
        </button>
        <button
          onClick={() => onDismiss(alert.id)}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-[#e5e1dc] dark:bg-white/20 hover:bg-gray-300 dark:hover:bg-white/30 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-black dark:text-white" />
        </button>
      </div>
      )}
    </div>
  )
}

// ============ Rules Tab Content ============
function RulesTabContent({
  rules,
  isLoading,
  onRefresh,
}: {
  rules: AlertRule[]
  isLoading: boolean
  onRefresh: () => void
}) {
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [ruleModalMode, setRuleModalMode] = useState<'add' | 'edit'>('add')
  const [selectedRule, setSelectedRule] = useState<AlertRule | undefined>()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteRule, setDeleteRule] = useState<{ id: string; name: string } | null>(null)
  const [viewRule, setViewRule] = useState<AlertRule | null>(null)

  const handleAdd = () => {
    setRuleModalMode('add')
    setSelectedRule(undefined)
    setRuleModalOpen(true)
  }

  const handleEdit = (rule: AlertRule) => {
    setRuleModalMode('edit')
    setSelectedRule(rule)
    setRuleModalOpen(true)
  }

  const handleDelete = (rule: AlertRule) => {
    setDeleteRule({ id: rule.id, name: rule.name })
    setDeleteModalOpen(true)
  }

  const activeRules = rules.filter(r => r.is_active)
  const highSeverityRules = rules.filter(r => r.severity === 'high')
  const attendanceRules = rules.filter(r => r.type === 'attendance')

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Quản lý quy tắc cảnh báo</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 h-[38px] px-4 bg-brand text-white rounded-full hover:bg-brand/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tạo quy tắc mới
        </button>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Lock className="w-7 h-7 text-[#8a8c90] mb-2" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#8a8c90]">Chưa có quy tắc nào</p>
          <p className="text-xs text-[#8a8c90] mt-1">Tạo quy tắc mới để bắt đầu nhận cảnh báo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="bg-white dark:bg-white/10 rounded-[20px] p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-black dark:text-white">{rule.name}</h3>
                    <SeverityBadge severity={rule.severity} />
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-gray-600 dark:text-gray-300">
                      {ALERT_TYPE_LABELS[rule.type]}
                    </span>
                    {rule.is_active ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-400">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-gray-500">
                        Tắt
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-xs text-black/40 dark:text-white/40 mb-2">{rule.description}</p>
                  )}
                  {/* Conditions */}
                  <div className="flex flex-wrap gap-1">
                    {(rule.conditions as { key: string; enabled: boolean; value?: number }[])
                      .filter(c => c.enabled)
                      .map(c => {
                        const def = ALERT_CONDITION_KEYS[rule.type]?.find(d => d.key === c.key)
                        return (
                          <span key={c.key} className="text-[10px] px-2 py-0.5 bg-brand/10 text-brand rounded-full">
                            {def?.label || c.key}: {c.value ?? rule.threshold}
                          </span>
                        )
                      })}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => setViewRule(viewRule?.id === rule.id ? null : rule)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Expanded view */}
              {viewRule?.id === rule.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
                  <div className="text-xs text-black/60 dark:text-white/60">
                    <span className="font-medium">Biểu thức:</span> <code className="text-brand">{rule.condition_expression || 'N/A'}</code>
                  </div>
                  <div className="text-xs text-black/60 dark:text-white/60">
                    <span className="font-medium">Thông báo:</span> {rule.notification_types?.join(', ') || 'system'}
                  </div>
                  <div className="text-xs text-black/60 dark:text-white/60">
                    <span className="font-medium">Ngưỡng:</span> {rule.threshold}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {rules.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Tổng quy tắc</p>
            <p className="text-lg font-bold text-black dark:text-white">{rules.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Hoạt động</p>
            <p className="text-lg font-bold text-green-600">{activeRules.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Mức độ cao</p>
            <p className="text-lg font-bold text-red-500">{highSeverityRules.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Điểm danh</p>
            <p className="text-lg font-bold text-brand">{attendanceRules.length}</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <RuleModal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSuccess={onRefresh}
        mode={ruleModalMode}
        rule={selectedRule}
      />
      {deleteRule && (
        <DeleteRuleModal
          isOpen={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setDeleteRule(null) }}
          onConfirm={onRefresh}
          ruleId={deleteRule.id}
          ruleName={deleteRule.name}
        />
      )}
    </>
  )
}

// ============ History Tab Content ============
function HistoryTabContent({
  history,
  isLoading,
  onRefresh,
}: {
  history: AlertRecord[]
  isLoading: boolean
  onRefresh: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Lịch sử cảnh báo đã xử lý</h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 h-[38px] px-4 bg-white dark:bg-white/10 border border-white/60 dark:border-white/10 rounded-full hover:shadow-sm transition-all text-sm font-medium text-black dark:text-white"
        >
          Tải lịch sử
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <History className="w-7 h-7 text-[#8a8c90] mb-2" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#8a8c90]">Chưa có lịch sử cảnh báo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(alert => (
            <div key={alert.id} className="bg-white dark:bg-white/10 rounded-[20px] p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-medium text-black dark:text-white">{alert.title}</h4>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <p className="text-xs text-black/40 dark:text-white/40 truncate">{alert.description}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-black/40 dark:text-white/40">
                  {alert.status === 'resolved' ? 'Đã xử lý' : 'Đã bỏ qua'}
                </p>
                <p className="text-xs text-black/40 dark:text-white/40">
                  {alert.resolved_at ? timeAgo(alert.resolved_at) : timeAgo(alert.updated_at || alert.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ============ Main Page ============
export default function AlertsPage() {
  // isAdmin: chỉ Ban điều hành mới quản lý quy tắc / chạy engine.
  // isManager: admin + phân đoàn trưởng được xử lý cảnh báo (PĐT chỉ thấy cảnh báo ngành mình, lọc ở hook).
  const { user, logout, isAdmin, isManager } = useAuth()
  const {
    invalidateAlerts,
    invalidateAlertRules,
    invalidateAlertStats,
    invalidateAlertHistory,
    invalidateDashboardAlerts,
  } = useInvalidateQueries()

  const [activeTab, setActiveTab] = useState<TabType>('alerts')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterTime, setFilterTime] = useState('all')
  const [isRunningEngine, setIsRunningEngine] = useState(false)

  const filters = useMemo(() => ({
    severity: filterSeverity,
    status: filterStatus,
    type: filterType,
    timeRange: filterTime,
  }), [filterSeverity, filterStatus, filterType, filterTime])

  const { data: alertsData, isLoading: alertsLoading } = useAlerts(filters)
  const { data: stats } = useAlertStats()
  const { data: rules, isLoading: rulesLoading } = useAlertRules()
  const { data: history, isLoading: historyLoading } = useAlertHistory()

  const invalidateAllAlerts = useCallback(() => {
    invalidateAlerts()
    invalidateAlertStats()
    invalidateAlertHistory()
    invalidateDashboardAlerts()
  }, [invalidateAlerts, invalidateAlertStats, invalidateAlertHistory, invalidateDashboardAlerts])

  const handleMarkRead = async (id: string) => {
    await supabase.from('alerts').update({ status: 'read', updated_at: new Date().toISOString() }).eq('id', id)
    invalidateAllAlerts()
  }

  const handleResolve = async (id: string) => {
    await supabase.from('alerts').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    invalidateAllAlerts()
  }

  const handleDismiss = async (id: string) => {
    await supabase.from('alerts').update({
      status: 'dismissed',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    invalidateAllAlerts()
  }

  const handleMarkAllRead = async () => {
    await supabase.from('alerts').update({ status: 'read', updated_at: new Date().toISOString() }).eq('status', 'unread')
    invalidateAllAlerts()
  }

  const handleRunEngine = async () => {
    setIsRunningEngine(true)
    try {
      await runRuleEngine()
      invalidateAllAlerts()
    } catch {
      // Silent fail - alerts will show current state
    } finally {
      setIsRunningEngine(false)
    }
  }

  const handleRulesRefresh = () => {
    invalidateAlertRules()
    invalidateAllAlerts()
  }

  if (!user) return null

  const firstName = user.full_name?.split(' ').pop() || user.full_name
  const today = new Date()
  const formattedDate = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  const unreadCount = stats?.unread || 0

  return (
    <div className="min-h-screen">
      <DashboardHeader
        userName={firstName || 'Admin'}
        userRole={ROLE_LABELS[user.role]}
        userEmail={user.email || ''}
        activeTab="overview"
        onLogout={logout}
        userAvatar={user.avatar_url}
      />

      <main className="px-6 pb-6">
        {/* Title Section */}
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[#666d80] dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Quay trở lại</span>
          </Link>
          <h1 className="text-[40px] font-bold text-black dark:text-white">Hệ thống cảnh báo</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <AlertStatsCard title="Tổng cảnh báo" value={stats?.total || 0} icon="total" variant="primary" />
          <AlertStatsCard title="Chưa đọc" value={stats?.unread || 0} icon="unread" />
          <AlertStatsCard title="Mức độ cao" value={stats?.high || 0} icon="high" />
          <AlertStatsCard title="Đã xử lý" value={stats?.resolved || 0} icon="resolved" />
        </div>

        {/* Content Area */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-[208px] flex-shrink-0 space-y-2">
            <SidebarTab
              icon={<Bell className="w-5 h-5" />}
              label="Cảnh báo"
              active={activeTab === 'alerts'}
              onClick={() => setActiveTab('alerts')}
            />
            {isAdmin && (
              <SidebarTab
                icon={<Lock className="w-5 h-5" />}
                label="Quy tắc"
                count={rules?.length}
                active={activeTab === 'rules'}
                onClick={() => setActiveTab('rules')}
              />
            )}
            <SidebarTab
              icon={<History className="w-5 h-5" />}
              label="Lịch sử"
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />

            {/* Run Engine button - admin only */}
            {isAdmin && (
              <button
                onClick={handleRunEngine}
                disabled={isRunningEngine}
                className="w-full flex items-center gap-3 px-4 py-3 mt-4 bg-brand/10 dark:bg-brand/20 text-brand rounded-full hover:bg-brand/20 dark:hover:bg-brand/30 transition-colors disabled:opacity-50"
              >
                {isRunningEngine ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">Chạy kiểm tra</span>
              </button>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="w-px h-full bg-[#e5e1dc] dark:bg-white/10 absolute left-[232px] top-[388px]" />

            {activeTab === 'alerts' && (
              <>
                {/* Filters */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-lg text-black dark:text-white">{capitalizedDate}</span>
                    <button
                      onClick={() => setFilterTime('today')}
                      className="h-[38px] px-4 bg-white dark:bg-white/10 border border-white/60 dark:border-white/10 rounded-full text-lg text-black dark:text-white hover:shadow-sm transition-all"
                    >
                      Hôm nay
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <FilterDropdown
                      label="Tất cả mức độ"
                      value={filterSeverity}
                      onChange={setFilterSeverity}
                      options={[
                        { value: 'all', label: 'Tất cả mức độ' },
                        { value: 'high', label: 'Cao' },
                        { value: 'medium', label: 'Trung bình' },
                        { value: 'low', label: 'Thấp' },
                      ]}
                    />
                    <FilterDropdown
                      label="Tất cả trạng thái"
                      value={filterStatus}
                      onChange={setFilterStatus}
                      options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'unread', label: 'Chưa đọc' },
                        { value: 'read', label: 'Đã đọc' },
                      ]}
                    />
                    <FilterDropdown
                      label="Tất cả loại"
                      value={filterType}
                      onChange={setFilterType}
                      options={[
                        { value: 'all', label: 'Tất cả loại' },
                        { value: 'attendance', label: 'Điểm danh' },
                        { value: 'score', label: 'Điểm số' },
                        { value: 'system', label: 'Hệ thống' },
                      ]}
                    />
                    <FilterDropdown
                      label="Tất cả thời gian"
                      value={filterTime}
                      onChange={setFilterTime}
                      options={[
                        { value: 'all', label: 'Tất cả thời gian' },
                        { value: 'today', label: 'Hôm nay' },
                        { value: '7days', label: '7 ngày qua' },
                        { value: '30days', label: '30 ngày qua' },
                      ]}
                    />
                    {isManager && unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="h-[38px] px-4 bg-brand text-white rounded-full text-sm font-medium hover:bg-brand/90 transition-colors"
                      >
                        Đọc tất cả ({unreadCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Alerts List */}
                <div className="space-y-3">
                  {alertsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <svg className="animate-spin w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : !alertsData || alertsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Bell className="w-7 h-7 text-[#8a8c90] mb-2" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-[#8a8c90]">Không có cảnh báo nào</p>
                    </div>
                  ) : (
                    (isManager ? alertsData : alertsData.filter(a => a.class_name === user.class_name)).map(alert => (
                      <AlertItem
                        key={alert.id}
                        alert={alert}
                        onMarkRead={handleMarkRead}
                        onResolve={handleResolve}
                        onDismiss={handleDismiss}
                        showActions={isManager}

                      />
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'rules' && (
              <RulesTabContent
                rules={rules || []}
                isLoading={rulesLoading}
                onRefresh={handleRulesRefresh}
              />
            )}

            {activeTab === 'history' && (
              <HistoryTabContent
                history={history || []}
                isLoading={historyLoading}
                onRefresh={() => invalidateAlertHistory()}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
