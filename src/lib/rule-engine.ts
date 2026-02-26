import { supabase, AlertRule, RuleCondition } from './supabase'

interface StudentData {
  id: string
  full_name: string
  student_code?: string
  class_id?: string
  class_name?: string
  attendance_thu5: number
  attendance_cn: number
  avg_catechism: number
  total_avg: number
  score_thu5: number
  score_cn: number
}

interface ClassData {
  id: string
  name: string
  branch?: string
  student_count: number
  teacher_count: number
}

interface NewAlert {
  rule_id: string
  title: string
  description: string
  type: string
  severity: string
  student_id?: string
  student_name?: string
  student_code?: string
  class_id?: string
  class_name?: string
  source: string
  metadata: Record<string, unknown>
}

function evaluateCondition(
  condition: RuleCondition,
  studentData: StudentData,
  classData?: ClassData,
  totalWeeks?: number,
): boolean {
  if (!condition.enabled || condition.value === undefined) return false

  const threshold = condition.value
  const currentTotalWeeks = totalWeeks || 40

  switch (condition.key) {
    case 'attendance_rate_below': {
      const totalAttendance = studentData.attendance_thu5 + studentData.attendance_cn
      const maxAttendance = currentTotalWeeks * 2
      const rate = maxAttendance > 0 ? (totalAttendance / maxAttendance) * 100 : 0
      return rate < threshold
    }
    case 'consecutive_absent':
      // Simplified: check if CN attendance is significantly lower
      return studentData.attendance_cn < threshold
    case 'sunday_lower_thursday': {
      const diff = studentData.attendance_thu5 - studentData.attendance_cn
      return diff >= threshold
    }
    case 'study_score_below':
      return studentData.avg_catechism < threshold
    case 'total_score_below':
      return studentData.total_avg < threshold
    case 'score_decline':
      // Simplified: would need historical data for real decline
      return false
    case 'individual_study_low':
      return studentData.avg_catechism < threshold
    case 'individual_total_low':
      return studentData.total_avg < threshold
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

export async function runRuleEngine(): Promise<number> {
  // 1. Fetch active rules
  const { data: rules, error: rulesError } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('is_active', true)

  if (rulesError) throw rulesError
  if (!rules || rules.length === 0) return 0

  // 2. Fetch student data
  const [schoolYearRes, classesRes, studentsRes, teachersRes] = await Promise.all([
    supabase.from('school_years').select('total_weeks').eq('is_current', true).single(),
    supabase.from('classes').select('*').eq('status', 'ACTIVE'),
    supabase.from('thieu_nhi').select('*').eq('status', 'ACTIVE'),
    supabase.from('users').select('id, class_id').eq('role', 'giao_ly_vien').eq('status', 'ACTIVE'),
  ])

  const totalWeeks = schoolYearRes.data?.total_weeks || 40
  const classes = classesRes.data || []
  const students = studentsRes.data || []
  const teachers = teachersRes.data || []

  const classMap = new Map(classes.map(c => [c.id, c]))

  // Build class stats
  const classStudentCounts: Record<string, number> = {}
  const classTeacherCounts: Record<string, number> = {}
  students.forEach(s => {
    if (s.class_id) classStudentCounts[s.class_id] = (classStudentCounts[s.class_id] || 0) + 1
  })
  teachers.forEach(t => {
    if (t.class_id) classTeacherCounts[t.class_id] = (classTeacherCounts[t.class_id] || 0) + 1
  })

  const classDataMap = new Map<string, ClassData>()
  classes.forEach(c => {
    classDataMap.set(c.id, {
      id: c.id,
      name: c.name,
      branch: c.branch,
      student_count: classStudentCounts[c.id] || 0,
      teacher_count: classTeacherCounts[c.id] || 0,
    })
  })

  // Compute student metrics
  const studentDataList: StudentData[] = students.map(s => {
    const cls = s.class_id ? classMap.get(s.class_id) : undefined
    const score_45_hk1 = s.score_45_hk1 || 0
    const score_exam_hk1 = s.score_exam_hk1 || 0
    const score_45_hk2 = s.score_45_hk2 || 0
    const score_exam_hk2 = s.score_exam_hk2 || 0
    const attendance_thu5 = s.attendance_thu5 || 0
    const attendance_cn = s.attendance_cn || 0

    const avg_catechism = (score_45_hk1 + score_45_hk2 + score_exam_hk1 * 2 + score_exam_hk2 * 2) / 6
    const score_thu5 = (attendance_thu5 * 0.4) * (10 / totalWeeks)
    const score_cn = (attendance_cn * 0.6) * (10 / totalWeeks)
    const avg_attendance = score_thu5 + score_cn
    const total_avg = avg_catechism * 0.6 + avg_attendance * 0.4

    return {
      id: s.id,
      full_name: s.full_name,
      student_code: s.student_code,
      class_id: s.class_id,
      class_name: cls?.name,
      attendance_thu5,
      attendance_cn,
      avg_catechism,
      total_avg,
      score_thu5,
      score_cn,
    }
  })

  // 3. Fetch existing unresolved alerts to avoid duplicates
  const { data: existingAlerts } = await supabase
    .from('alerts')
    .select('rule_id, student_id, class_id')
    .in('status', ['unread', 'read'])

  const existingSet = new Set(
    (existingAlerts || []).map(a => `${a.rule_id}|${a.student_id || ''}|${a.class_id || ''}`)
  )

  // 4. Evaluate rules
  const newAlerts: NewAlert[] = []

  for (const rule of rules as AlertRule[]) {
    const conditions: RuleCondition[] = Array.isArray(rule.conditions) ? rule.conditions : []
    const enabledConditions = conditions.filter(c => c.enabled)
    if (enabledConditions.length === 0) continue

    if (rule.type === 'attendance' || rule.type === 'score') {
      // Evaluate per student
      for (const student of studentDataList) {
        const triggered = enabledConditions.some(cond =>
          evaluateCondition(cond, student, undefined, totalWeeks)
        )
        if (!triggered) continue

        const key = `${rule.id}|${student.id}|`
        if (existingSet.has(key)) continue

        const triggeredCondLabels = enabledConditions
          .filter(cond => evaluateCondition(cond, student, undefined, totalWeeks))
          .map(cond => cond.key)

        newAlerts.push({
          rule_id: rule.id,
          title: `${rule.name}: ${student.full_name}`,
          description: `Quy tắc "${rule.name}" đã kích hoạt cho học sinh ${student.full_name}${student.student_code ? ` (${student.student_code})` : ''}`,
          type: rule.type,
          severity: rule.severity,
          student_id: student.id,
          student_name: student.full_name,
          student_code: student.student_code,
          class_id: student.class_id,
          class_name: student.class_name,
          source: 'rule_engine',
          metadata: { triggered_conditions: triggeredCondLabels },
        })
      }
    } else if (rule.type === 'system') {
      // Evaluate per class
      for (const [classId, classData] of Array.from(classDataMap.entries())) {
        const triggered = enabledConditions.some(cond =>
          evaluateCondition(cond, studentDataList[0] || {} as StudentData, classData, totalWeeks)
        )
        if (!triggered) continue

        const key = `${rule.id}||${classId}`
        if (existingSet.has(key)) continue

        newAlerts.push({
          rule_id: rule.id,
          title: `${rule.name}: ${classData.name}`,
          description: `Quy tắc "${rule.name}" đã kích hoạt cho lớp ${classData.name}`,
          type: rule.type,
          severity: rule.severity,
          class_id: classId,
          class_name: classData.name,
          source: 'rule_engine',
          metadata: { class_size: classData.student_count, teacher_count: classData.teacher_count },
        })
      }
    }
  }

  // 5. Batch insert new alerts
  if (newAlerts.length > 0) {
    const { error: insertError } = await supabase.from('alerts').insert(newAlerts)
    if (insertError) throw insertError
  }

  return newAlerts.length
}
