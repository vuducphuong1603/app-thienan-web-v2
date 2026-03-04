'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase } from './supabase'

function isAuthError(error: unknown): boolean {
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

// Debounced auth error handler — prevents multiple concurrent refresh attempts
let isHandlingAuth = false
async function handleAuthError(queryClient: QueryClient) {
  if (isHandlingAuth) return
  isHandlingAuth = true

  try {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } else {
      // Token refreshed — force refetch ALL active queries (including errored ones)
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
            staleTime: 10 * 60 * 1000, // Data stays fresh for 10 minutes
            gcTime: 30 * 60 * 1000, // Cache kept for 30 minutes
            refetchOnWindowFocus: false, // Disabled — session recovery handles refetch on tab focus
            refetchOnReconnect: false, // Don't refetch all on reconnect — let visibility handler manage it
            refetchOnMount: 'always', // Refetch on mount only if stale
            retry: (failureCount, error) => {
              // Don't retry auth errors — need session refresh, not retry
              if (isAuthError(error)) return false
              return failureCount < 1
            },
            retryDelay: 1000,
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
