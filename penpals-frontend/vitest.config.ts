import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
      coverage: {
        provider: 'v8',
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.{ts,tsx}',
          '**/__tests__/**',
          '**/test/**',
          '**/types.ts',
          '**/main.tsx',
          '**/index.tsx',
          '**/vite.config.ts',
          '**/vitest.setup.ts',
        ],
      },
    },
  })
);
