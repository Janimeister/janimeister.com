import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\?raw$': '<rootDir>/src/test/raw-file-mock.ts',
  },
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};

export default config;

