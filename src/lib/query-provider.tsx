'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase, markAuthDead, isAuthDead } from './supabase'

// Check if the error is specifically an unrecoverable refresh token failure.
// These errors mean the session cannot be recovered — retrying is pointless.
function isRefreshTokenDead(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const msg = ((error as Record<string, unknown>).message as string || '').toLowerCase()
  return msg.includes('refresh_token_not_found') ||
    msg.includes('invalid refresh token') ||
    msg.includes('session_not_found')
}

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
let _handleStartedAt = 0 // Track when handling started for stuck detection

function forceLogout(queryClient: QueryClient) {
  // Reset handling state so it doesn't stay stuck
  isHandlingAuth = false
  _handleStartedAt = 0
  // Mark auth as dead to prevent any further refresh attempts
  markAuthDead()
  // Cancel ALL pending queries immediately — prevents retry storm
  queryClient.cancelQueries()
  queryClient.clear()
  // Sign out locally only (no API call — token is already dead).
  // This fires SIGNED_OUT via onAuthStateChange, but the hard redirect below
  // will reload the page and reset all module-level state (isHandlingAuth, etc.)
  supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  // Hard redirect — intentional full reload to clear all in-memory state.
  // Do NOT use router.push (can lock up Next.js router action queue).
  window.location.href = '/login'
}

async function handleAuthError(queryClient: QueryClient) {
  // Safety valve: if handling has been stuck for >10s (e.g. navigator.locks deadlock),
  // force reset and logout. This prevents the app from being permanently stuck.
  if (isHandlingAuth && _handleStartedAt > 0 && Date.now() - _handleStartedAt > 10_000) {
    console.warn('[handleAuthError] Stuck for >10s, forcing logout')
    forceLogout(queryClient)
    return
  }

  if (isHandlingAuth) return

  // If auth is already dead (e.g. initAuth already detected it), just redirect
  if (isAuthDead()) {
    forceLogout(queryClient)
    return
  }

  // Prevent infinite loop: only allow one refetch cycle per 10 seconds
  const now = Date.now()
  if (now - _lastRefetchAt < 10_000) return

  isHandlingAuth = true
  _handleStartedAt = Date.now()

  try {
    // Race refreshSession against a 5s timeout.
    // refreshSession() can hang indefinitely due to navigator.locks contention
    // when Supabase's internal auto-refresh is also competing for the lock.
    const result = await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Refresh timeout after 5s') }), 5000)
      ),
    ])

    if (result.error) {
      console.warn('[handleAuthError] Refresh failed:', result.error.message)
      forceLogout(queryClient)
    } else {
      // Token refreshed — force refetch ALL active queries (including errored ones)
      _lastRefetchAt = Date.now()
      queryClient.refetchQueries({ type: 'active' })
    }
  } catch {
    forceLogout(queryClient)
  } finally {
    isHandlingAuth = false
    _handleStartedAt = 0
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
              // Dead refresh token: session is unrecoverable, don't retry at all
              if (isRefreshTokenDead(error)) return false
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

  // NOTE: Do NOT add a visibilitychange handler here. Supabase v2.98+ has
  // built-in lock timeout + steal recovery (see locks.js). Adding our own
  // session check on visibility causes aggressive reloads because getSession()
  // competes for navigator.locks and often times out, triggering false logouts.
  // React Query's refetchOnWindowFocus + handleAuthError is sufficient.

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
