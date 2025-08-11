import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import eslintParserTs from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import jsdoc from 'eslint-plugin-jsdoc';

const config = [
  // Konfiguracja JSDoc (zalecana dla TypeScript)
  jsdoc.configs['flat/recommended-typescript-error'],
  {
    files: ['*.ts', '*.js'],
    languageOptions: {
      parser: eslintParserTs,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      env: {
        node: true,
        es2024: true,
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      prettier: prettierPlugin,
      jsdoc,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-lines': ['warn', { max: 120 }],
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
  },
];

module.export = config;
