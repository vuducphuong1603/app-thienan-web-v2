import { describe, expect, it } from 'vitest'
import {
  activeConditions,
  evaluateCondition,
  RULE_CONDITION_DEFS,
  RULE_CONDITION_KEYS,
  validateRuleConditions,
  type RuleClassData,
  type RuleCondition,
  type RuleStudentData,
} from '../rule-conditions'

const student: RuleStudentData = {
  id: 'student-1',
  full_name: 'Nguyễn An',
  attendance_thu5: 20,
  attendance_cn: 10,
  avg_catechism: 7,
  total_avg: 6,
  score_thu5: 3,
  score_cn: 2,
}

const cls: RuleClassData = {
  id: 'class-1',
  name: 'Chiên con',
  student_count: 12,
  teacher_count: 2,
}

describe('rule condition definitions', () => {
  it('keeps the web RuleModal condition keys and labels', () => {
    expect(RULE_CONDITION_DEFS.map(({ key }) => key)).toEqual([
      'attendance_rate_below',
      'consecutive_absent',
      'sunday_lower_thursday',
      'study_score_below',
      'total_score_below',
      'score_decline',
      'individual_study_low',
      'individual_total_low',
      'class_size_below',
      'teacher_ratio_above',
      'missing_data_days',
    ])

    expect(RULE_CONDITION_KEYS.attendance.map(({ label }) => label)).toEqual([
      'Tỷ lệ điểm danh thấp hơn',
      'Vắng mặt liên tục từ',
      'CN thấp hơn T5 từ',
    ])
  })
})

describe('evaluateCondition', () => {
  it.each([
    ['attendance_rate_below', 80, true],
    ['consecutive_absent', 11, true],
    ['sunday_lower_thursday', 10, true],
    ['study_score_below', 8, true],
    ['total_score_below', 7, true],
    ['score_decline', 1, false],
    ['individual_study_low', 8, true],
    ['individual_total_low', 7, true],
    ['class_size_below', 20, true],
    ['teacher_ratio_above', 0.1, true],
    ['missing_data_days', 1, false],
  ])('evaluates %s using the current rule semantics', (key, value, expected) => {
    const condition: RuleCondition = { key, enabled: true, value }
    expect(evaluateCondition(condition, student, cls, 40, 40)).toBe(expected)
  })

  it('skips disabled conditions', () => {
    expect(
      evaluateCondition(
        { key: 'study_score_below', enabled: false, value: 8 },
        student,
      ),
    ).toBe(false)
  })

  it('skips an enabled condition without a threshold value', () => {
    expect(evaluateCondition({ key: 'study_score_below', enabled: true }, student)).toBe(false)
  })

  it('does not trigger score rules when the average is null', () => {
    expect(
      evaluateCondition(
        { key: 'study_score_below', enabled: true, value: 8 },
        { ...student, avg_catechism: null },
      ),
    ).toBe(false)
    expect(
      evaluateCondition(
        { key: 'total_score_below', enabled: true, value: 8 },
        { ...student, total_avg: null },
      ),
    ).toBe(false)
  })
})

describe('activeConditions', () => {
  it('returns only enabled conditions', () => {
    const conditions: RuleCondition[] = [
      { key: 'study_score_below', enabled: true, value: 8 },
      { key: 'total_score_below', enabled: false, value: 5 },
    ]
    expect(activeConditions({ conditions, threshold: 5 })).toEqual([conditions[0]])
  })

  it('skips a rule with an explicit empty conditions array', () => {
    expect(activeConditions({ conditions: [], threshold: 5 })).toEqual([])
  })

  it('skips a threshold-only legacy rule', () => {
    expect(activeConditions({ threshold: 5 })).toEqual([])
    expect(activeConditions({ conditions: null, threshold: 5 })).toEqual([])
  })
})

describe('validateRuleConditions', () => {
  it('returns the RuleModal validation message when all conditions are disabled', () => {
    expect(validateRuleConditions([{ key: 'study_score_below', enabled: false }])).toBe(
      'Vui lòng chọn ít nhất 1 điều kiện',
    )
  })

  it('accepts at least one enabled condition', () => {
    expect(validateRuleConditions([{ key: 'study_score_below', enabled: true, value: 1 }])).toBeNull()
  })
})
