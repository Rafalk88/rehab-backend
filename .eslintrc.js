module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier', 'jsdoc'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Prettier powinien pilnować formatowania, więc wyłącz konflikty ESLint
    'prettier/prettier': 'error',

    // Twoje reguły TS
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',

    // JSDoc reguły
    'jsdoc/check-alignment': 'error', // Sprawdzanie wyrównania
    'jsdoc/check-param-names': 'error', // Parametry muszą się zgadzać z sygnaturą
    'jsdoc/check-tag-names': 'error', // Poprawność tagów
    'jsdoc/check-types': 'error', // Poprawność typów w doc
    'jsdoc/newline-after-description': 'warn', // Nowa linia po opisie
    'jsdoc/require-description': 'error', // Wymagaj opisu
    'jsdoc/require-param': 'error', // Parametry muszą mieć opis
    'jsdoc/require-param-name': 'error', // Nazwy parametrów muszą się zgadzać
    'jsdoc/require-param-type': 'error', // Typ parametrów wymagany
    'jsdoc/require-returns': 'error', // Opis zwracanego typu
    'jsdoc/require-returns-type': 'error', // Typ zwracany wymagany
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
  },
  env: {
    node: true,
    es2024: true,
  },
};