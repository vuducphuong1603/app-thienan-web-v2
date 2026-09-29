import { describe, expect, it, vi } from 'vitest'
import { getEdgeFunctionErrorMessage } from '../edge-function-error'

describe('getEdgeFunctionErrorMessage', () => {
  it('prefers the structured error returned by the edge function', async () => {
    const json = vi.fn().mockResolvedValue({ error: 'Tài khoản đã tồn tại' })

    await expect(getEdgeFunctionErrorMessage({ message: 'FunctionsHttpError', context: { json } }))
      .resolves.toBe('Tài khoản đã tồn tại')
    expect(json).toHaveBeenCalledOnce()
  })

  it('falls back to the FunctionsHttpError message when the body cannot be read', async () => {
    const json = vi.fn().mockRejectedValue(new Error('invalid JSON'))

    await expect(getEdgeFunctionErrorMessage({ message: 'Edge Function returned a non-2xx status code', context: { json } }))
      .resolves.toBe('Edge Function returned a non-2xx status code')
  })

  it('falls back to the error message when no response context is available', async () => {
    await expect(getEdgeFunctionErrorMessage(new Error('Network unavailable')))
      .resolves.toBe('Network unavailable')
  })
})
