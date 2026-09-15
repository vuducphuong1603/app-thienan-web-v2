import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Alias '@/…' giống tsconfig paths để test import được component/lib như code app
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // tsconfig của Next đặt jsx: preserve → cần tự biên dịch JSX khi test import component .tsx
  oxc: { jsx: { runtime: 'automatic' } },
})
