import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Node 25+ has its own global localStorage (unusable without --localstorage-file), and it hides jsdom's
    // window.localStorage in the tests ("Cannot read properties of undefined (reading 'clear')"). Off in the test workers.
    execArgv: ['--no-experimental-webstorage'],
  },
})
