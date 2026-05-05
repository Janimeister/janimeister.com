/**
 * Mock Vite-specific globals that aren't available in Jest.
 */
Object.defineProperty(globalThis, 'import_meta_env', {
  value: {
    BASE_URL: '/',
    VITE_VIDEO_API: undefined,
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false,
  },
});

// Mock import.meta.env for modules under test
// ts-jest doesn't support import.meta natively, so we use a manual mock in test utils.
