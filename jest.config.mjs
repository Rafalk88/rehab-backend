import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
    ...tsJestTransformCfg,
  },

  extensionsToTreatAsEsm: ['.ts'],

  moduleNameMapper: {
    '^#/(.*)\\.js$': '<rootDir>/src/$1',
    '^#modules/(.*)\\.js$': '<rootDir>/src/modules/$1',
    '^#common/(.*)\\.js$': '<rootDir>/src/common/$1',
    '^#lib/(.*)\\.js$': '<rootDir>/src/lib/$1',
    '^#prisma/(.*)\\.js$': '<rootDir>/src/prisma/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
};
