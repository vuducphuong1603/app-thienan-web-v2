type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null
}

export async function getEdgeFunctionErrorMessage(error: unknown): Promise<string> {
  const errorRecord = isRecord(error) ? error : {}
  const fallback = typeof errorRecord.message === 'string' && errorRecord.message
    ? errorRecord.message
    : 'Yêu cầu thất bại'
  const context = errorRecord.context

  if (!isRecord(context) || typeof context.json !== 'function') return fallback

  try {
    const payload = await (context as { json: () => Promise<unknown> }).json()
    if (isRecord(payload) && typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error
    }
  } catch {
    // The response body may already be consumed or may not be JSON.
  }

  return fallback
}
