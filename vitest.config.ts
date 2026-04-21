import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/modules/**/*.service.ts', 'src/app/api/**/route.ts'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
