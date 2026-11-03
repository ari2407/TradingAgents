import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts'], environment: 'node', setupFiles: ['src/lib/test-setup.ts'], restoreMocks: true } });
