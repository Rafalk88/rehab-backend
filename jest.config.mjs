import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',

  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
    ...tsJestTransformCfg,
  },

  extensionsToTreatAsEsm: ['.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
      useESM: true,
    },
  },

  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
};
