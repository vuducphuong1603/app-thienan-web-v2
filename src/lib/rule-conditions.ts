export type RuleType = 'attendance' | 'score' | 'system'

export interface RuleCondition {
  key: string
  enabled: boolean
  value?: number
}

export interface RuleStudentData {
  id: string
  full_name: string
  student_code?: string
  class_id?: string
  class_name?: string
  attendance_thu5: number
  attendance_cn: number
  avg_catechism: number | null
  total_avg: number | null
  score_thu5: number
  score_cn: number
}

export interface RuleClassData {
  id: string
  name: string
  branch?: string
  student_count: number
  teacher_count: number
}

export interface RuleConditionDefinition {
  type: RuleType
  key: string
  label: string
  expression: string
}

// Keep these keys, labels, and expressions in sync with ALERT_CONDITION_KEYS in RuleModal.
export const RULE_CONDITION_DEFS: RuleConditionDefinition[] = [
  { type: 'attendance', key: 'attendance_rate_below', label: 'Tỷ lệ điểm danh thấp hơn', expression: 'attendance_rate < {threshold}' },
  { type: 'attendance', key: 'consecutive_absent', label: 'Vắng mặt liên tục từ', expression: 'consecutive_absent >= {threshold}' },
  { type: 'attendance', key: 'sunday_lower_thursday', label: 'CN thấp hơn T5 từ', expression: 'cn_lower_thu5 >= {threshold}' },
  { type: 'score', key: 'study_score_below', label: 'Điểm học tập thấp hơn', expression: 'study_score < {threshold}' },
  { type: 'score', key: 'total_score_below', label: 'Điểm tổng thấp hơn', expression: 'student_final_score < {threshold}' },
  { type: 'score', key: 'score_decline', label: 'Điểm giảm từ', expression: 'score_decline >= {threshold}' },
  { type: 'score', key: 'individual_study_low', label: 'Điểm học từng học sinh thấp', expression: 'individual_study < {threshold}' },
  { type: 'score', key: 'individual_total_low', label: 'Điểm tổng từng học sinh thấp', expression: 'individual_total < {threshold}' },
  { type: 'system', key: 'class_size_below', label: 'Sĩ số lớp ít hơn', expression: 'class_size < {threshold}' },
  { type: 'system', key: 'teacher_ratio_above', label: 'Tỷ lệ GV/TN cao hơn', expression: 'teacher_ratio > {threshold}' },
  { type: 'system', key: 'missing_data_days', label: 'Thiếu dữ liệu từ ngày', expression: 'missing_data_days >= {threshold}' },
]

export const RULE_CONDITION_KEYS: Record<RuleType, RuleConditionDefinition[]> = {
  attendance: RULE_CONDITION_DEFS.filter(def => def.type === 'attendance'),
  score: RULE_CONDITION_DEFS.filter(def => def.type === 'score'),
  system: RULE_CONDITION_DEFS.filter(def => def.type === 'system'),
}

export function evaluateCondition(
  condition: RuleCondition,
  studentData: RuleStudentData,
  classData?: RuleClassData,
  effectiveThu5Days?: number,
  effectiveCnDays?: number,
): boolean {
  if (!condition.enabled || condition.value === undefined) return false

  const threshold = condition.value
  const effThu5 = effectiveThu5Days || 40
  const effCn = effectiveCnDays || 40

  switch (condition.key) {
    case 'attendance_rate_below': {
      const totalAttendance = studentData.attendance_thu5 + studentData.attendance_cn
      const maxAttendance = effThu5 + effCn
      const rate = maxAttendance > 0 ? (totalAttendance / maxAttendance) * 100 : 0
      return rate < threshold
    }
    case 'consecutive_absent':
      // Simplified: check if CN attendance is significantly lower.
      return studentData.attendance_cn < threshold
    case 'sunday_lower_thursday': {
      const diff = studentData.attendance_thu5 - studentData.attendance_cn
      return diff >= threshold
    }
    case 'study_score_below':
      return studentData.avg_catechism !== null && studentData.avg_catechism < threshold
    case 'total_score_below':
      return studentData.total_avg !== null && studentData.total_avg < threshold
    case 'score_decline':
      // Simplified: would need historical data for real decline.
      return false
    case 'individual_study_low':
      return studentData.avg_catechism !== null && studentData.avg_catechism < threshold
    case 'individual_total_low':
      return studentData.total_avg !== null && studentData.total_avg < threshold
    case 'class_size_below':
      return classData ? classData.student_count < threshold : false
    case 'teacher_ratio_above':
      if (!classData || classData.student_count === 0) return false
      return classData.teacher_count / classData.student_count > threshold
    case 'missing_data_days':
      return false
    default:
      return false
  }
}

/**
 * Return the enabled conditions exactly as the web rule engine does.
 * Empty/missing conditions are intentionally skipped; threshold is legacy-only.
 */
export function activeConditions(rule: {
  conditions?: unknown
  threshold?: number | null
}): RuleCondition[] {
  if (!Array.isArray(rule.conditions)) return []

  return rule.conditions.filter((condition): condition is RuleCondition => {
    if (!condition || typeof condition !== 'object') return false
    const candidate = condition as Partial<RuleCondition>
    return typeof candidate.key === 'string' && candidate.enabled === true
  })
}

export function validateRuleConditions(conditions: RuleCondition[]): string | null {
  const enabledConditions = conditions.filter(condition => condition.enabled)
  if (enabledConditions.length === 0) return 'Vui lòng chọn ít nhất 1 điều kiện'
  if (enabledConditions.some(condition => !Number.isFinite(condition.value))) {
    return 'Vui lòng nhập giá trị cho điều kiện đã chọn'
  }
  return null
}
