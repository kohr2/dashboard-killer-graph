module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Architecture rules
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Domain layer restrictions
          {
            target: './src/domain/**/*',
            from: './src/application/**/*',
            message: 'Domain layer cannot import from application layer'
          },
          {
            target: './src/domain/**/*',
            from: './src/infrastructure/**/*',
            message: 'Domain layer cannot import from infrastructure layer'
          },
          {
            target: './src/domain/**/*',
            from: './src/interface/**/*',
            message: 'Domain layer cannot import from interface layer'
          },
          // Application layer restrictions
          {
            target: './src/application/**/*',
            from: './src/infrastructure/**/*',
            message: 'Application layer cannot import from infrastructure layer'
          },
          {
            target: './src/application/**/*',
            from: './src/interface/**/*',
            message: 'Application layer cannot import from interface layer'
          }
        ]
      }
    ]
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off'
      }
    },
    {
      files: ['src/domain/**/*'],
      rules: {
        'import/no-nodejs-modules': 'error'
      }
    }
  ]
}; 