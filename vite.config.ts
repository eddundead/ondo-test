import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Path alias `@/` → `src/` matches the layer structure documented in ARCHITECTURE.md.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // Pure domain/ logic is node-testable; component tests switch to jsdom when added.
    environment: 'node',
  },
})
