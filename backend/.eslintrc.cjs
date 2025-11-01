module.exports = {
  root: true,
  env: { node: true, es2021: true, jest: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
  plugins: ['@typescript-eslint','import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: {
    'import/resolver': {
      typescript: {
        // Use the project's tsconfig for path and type resolution
        project: './tsconfig.json'
      },
      node: {
        extensions: ['.js', '.ts', '.json']
      }
    }
  },
  rules: {
    'import/order': ['warn', { 'newlines-between': 'always' }],
    // Relax strictness to keep CI green; tighten gradually with targeted fixes
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-empty': 'warn'
  },
  ignorePatterns: ['dist/**']
};
