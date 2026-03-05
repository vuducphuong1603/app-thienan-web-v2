'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase } from './supabase'

export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as Record<string, unknown>

  // HTTP status codes
  const status = err.status || err.statusCode
  if (status === 401 || status === 403) return true

  // PostgREST error codes
  const code = err.code as string | undefined
  if (code === 'PGRST301' || code === '42501') return true

  // Error message patterns
  const message = (err.message as string || '').toLowerCase()
  if (
    message.includes('jwt expired') ||
    message.includes('invalid token') ||
    message.includes('not authenticated') ||
    message.includes('refresh_token_not_found') ||
    message.includes('invalid claim') ||
    message.includes('session_not_found')
  ) return true

  return false
}

// Debounced auth error handler — prevents multiple concurrent refresh attempts.
// Uses a timestamp cooldown to prevent infinite refetch loops:
// query fails → refresh → refetch → fails again → would loop forever without cooldown.
let isHandlingAuth = false
let _lastRefetchAt = 0

async function handleAuthError(queryClient: QueryClient) {
  if (isHandlingAuth) return

  // Prevent infinite loop: only allow one refetch cycle per 10 seconds
  const now = Date.now()
  if (now - _lastRefetchAt < 10_000) return

  isHandlingAuth = true

  try {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } else {
      // Token refreshed — force refetch ALL active queries (including errored ones)
      _lastRefetchAt = Date.now()
      queryClient.refetchQueries({ type: 'active' })
    }
  } catch {
    await supabase.auth.signOut()
    window.location.href = '/login'
  } finally {
    isHandlingAuth = false
  }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isAuthError(error)) {
              handleAuthError(client)
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isAuthError(error)) {
              handleAuthError(client)
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // Data stays fresh for 2 minutes — balances freshness & perf
            gcTime: 10 * 60 * 1000, // Cache kept for 10 minutes
            refetchOnWindowFocus: true, // Refetch stale queries when tab gains focus
            refetchOnReconnect: true, // Refetch when onlineManager goes online
            refetchOnMount: true, // Refetch on mount only if stale
            retry: (failureCount, error) => {
              // Auth errors: allow 2 retries (gives time for token refresh)
              if (isAuthError(error)) return failureCount < 2
              // Non-auth errors: retry up to 2 times for transient failures
              return failureCount < 2
            },
            retryDelay: (attemptIndex, error) => {
              // Auth errors: wait 3s between retries (token refresh takes ~200-500ms)
              if (isAuthError(error)) return 3000
              // Exponential backoff: 1s, 2s
              return Math.min(1000 * (attemptIndex + 1), 3000)
            },
          },
        },
      })
      return client
    }
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
