export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const hasLeadingPlus = trimmed.startsWith('+')
  let normalized = trimmed.replace(/\D/g, '')

  if (hasLeadingPlus) {
    normalized = `+${normalized}`
  }

  if (normalized.startsWith('+84')) {
    normalized = `0${normalized.slice(3)}`
  } else if (normalized.startsWith('84') && normalized.length === 11) {
    normalized = `0${normalized.slice(2)}`
  }

  return normalized
}

export function loginIdentifierToEmail(input: string): string {
  const identifier = input.trim()
  if (identifier.includes('@')) return identifier.toLowerCase()

  return `${normalizePhone(identifier)}@thienan.app`
}
