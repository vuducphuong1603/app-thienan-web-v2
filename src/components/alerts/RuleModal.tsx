'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  supabase,
  AlertRule,
  AlertType,
  AlertSeverity,
  RuleCondition,
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_CONDITION_KEYS,
} from '@/lib/supabase'

interface RuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode: 'add' | 'edit'
  rule?: AlertRule
}

export default function RuleModal({ isOpen, onClose, onSuccess, mode, rule }: RuleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<AlertType>('attendance')
  const [severity, setSeverity] = useState<AlertSeverity>('medium')
  const [threshold, setThreshold] = useState<number>(0)
  const [conditions, setConditions] = useState<RuleCondition[]>([])
  const [notificationTypes, setNotificationTypes] = useState<string[]>(['system'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when rule changes or modal opens
  useEffect(() => {
    if (mode === 'edit' && rule) {
      setName(rule.name)
      setDescription(rule.description || '')
      setType(rule.type)
      setSeverity(rule.severity)
      setThreshold(rule.threshold || 0)
      setConditions(rule.conditions || [])
      setNotificationTypes(rule.notification_types || ['system'])
    } else {
      setName('')
      setDescription('')
      setType('attendance')
      setSeverity('medium')
      setThreshold(0)
      setConditions([])
      setNotificationTypes(['system'])
    }
    setError(null)
  }, [mode, rule, isOpen])

  // Update conditions when type changes
  useEffect(() => {
    if (mode === 'add') {
      const typeConditions = ALERT_CONDITION_KEYS[type]
      setConditions(typeConditions.map(c => ({ key: c.key, enabled: false, value: threshold })))
    }
  }, [type, mode, threshold])

  const toggleCondition = (key: string) => {
    setConditions(prev =>
      prev.map(c => (c.key === key ? { ...c, enabled: !c.enabled } : c))
    )
  }

  const updateConditionValue = (key: string, value: number) => {
    setConditions(prev =>
      prev.map(c => (c.key === key ? { ...c, value } : c))
    )
  }

  const toggleNotification = (ntype: string) => {
    setNotificationTypes(prev =>
      prev.includes(ntype) ? prev.filter(n => n !== ntype) : [...prev, ntype]
    )
  }

  const buildExpression = (): string => {
    const enabledConditions = conditions.filter(c => c.enabled)
    if (enabledConditions.length === 0) return ''

    const typeConditions = ALERT_CONDITION_KEYS[type]
    return enabledConditions
      .map(c => {
        const def = typeConditions.find(tc => tc.key === c.key)
        if (!def) return ''
        return def.expression.replace('{threshold}', String(c.value ?? threshold))
      })
      .filter(Boolean)
      .join(' AND ')
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên quy tắc')
      return
    }
    if (!conditions.some(c => c.enabled)) {
      setError('Vui lòng chọn ít nhất 1 điều kiện')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      severity,
      threshold,
      conditions,
      condition_expression: buildExpression(),
      notification_types: notificationTypes,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    try {
      if (mode === 'edit' && rule) {
        const { error: err } = await supabase
          .from('alert_rules')
          .update(payload)
          .eq('id', rule.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('alert_rules').insert(payload)
        if (err) throw err
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const typeConditions = ALERT_CONDITION_KEYS[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1a1a2e] rounded-[20px] w-full max-w-[560px] max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {mode === 'add' ? 'Tạo quy tắc mới' : 'Chỉnh sửa quy tắc'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Tên quy tắc <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cảnh báo điểm danh thấp"
              className="w-full h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Loại cảnh báo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AlertType)}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              {(Object.entries(ALERT_TYPE_LABELS) as [AlertType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Ngưỡng mặc định
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Mức độ
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
              className="w-full h-10 px-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              {(Object.entries(ALERT_SEVERITY_LABELS) as [AlertSeverity, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Điều kiện <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {typeConditions.map(condDef => {
                const cond = conditions.find(c => c.key === condDef.key)
                const isEnabled = cond?.enabled ?? false
                return (
                  <div key={condDef.key} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleCondition(condDef.key)}
                      className="w-4 h-4 rounded accent-brand"
                    />
                    <span className="text-sm text-black dark:text-white flex-1">{condDef.label}</span>
                    {isEnabled && (
                      <input
                        type="number"
                        value={cond?.value ?? threshold}
                        onChange={(e) => updateConditionValue(condDef.key, Number(e.target.value))}
                        className="w-20 h-8 px-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-brand/50"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Expression preview */}
          {conditions.some(c => c.enabled) && (
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                Biểu thức điều kiện
              </label>
              <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                <code className="text-xs text-brand break-all">{buildExpression()}</code>
              </div>
            </div>
          )}

          {/* Notification types */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Loại thông báo
            </label>
            <div className="flex gap-4">
              {[
                { key: 'system', label: 'Hệ thống' },
                { key: 'email', label: 'Email' },
                { key: 'sms', label: 'SMS' },
              ].map(nt => (
                <label key={nt.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationTypes.includes(nt.key)}
                    onChange={() => toggleNotification(nt.key)}
                    className="w-4 h-4 rounded accent-brand"
                  />
                  <span className="text-sm text-black dark:text-white">{nt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả quy tắc cảnh báo..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 px-5 bg-gray-100 dark:bg-white/10 text-black dark:text-white text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 px-5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {mode === 'add' ? 'Tạo quy tắc' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  )
}
