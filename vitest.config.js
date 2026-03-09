import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/models/**', 'src/api/**', 'src/strategies/**'],
    },
    include: ['tests/**/*.test.js'],
  },
});
