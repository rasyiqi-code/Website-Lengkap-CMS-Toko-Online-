import { defineConfig, defaultExclude } from 'vitest/config';
import path from 'path';

const aliases = {
  '@/lib/modules/catalog/client': path.resolve(__dirname, './src/modules/catalog'),
  '@/lib/modules/order/client': path.resolve(__dirname, './src/modules/order'),
  '@/lib/modules/tenant/client': path.resolve(__dirname, './src/modules/tenant'),
  '@/lib/modules/identity/client': path.resolve(__dirname, './src/modules/auth'),
  '@/lib/modules/identity/types': path.resolve(__dirname, './src/modules/auth'),
  '@/lib/modules/identity': path.resolve(__dirname, './src/modules/auth'),
  '@/lib/modules': path.resolve(__dirname, './src/modules'),
  '@/modules': path.resolve(__dirname, './src/modules'),
  '@/components': path.resolve(__dirname, './src/modules/shared/ui'),
  '@/lib/core': path.resolve(__dirname, './src/modules/shared/core'),
  '@/lib': path.resolve(__dirname, './src/modules/shared/utils'),
  '@/hooks': path.resolve(__dirname, './src/modules/shared/hooks'),
  '@/themes': path.resolve(__dirname, './src/modules/shared/themes'),
  '@/types': path.resolve(__dirname, './src/modules/shared/types'),
  '@': path.resolve(__dirname, './src'),
};

export default defineConfig({
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  test: {
    exclude: [...defaultExclude, 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['lib/**', 'app/api/**', 'src/modules/catalog/ui/shop/ArchiveProductButton.tsx'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: { alias: aliases },
});
