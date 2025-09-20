import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactPlugin from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      // Avoid extending non-flat configs; we add plugin + explicit rules instead
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-refresh': reactRefresh,
      react: reactPlugin,
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Mark variables used in JSX as used (e.g., `motion.div`)
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      // Ensure every label has a control and avoid unlabeled controls
      'jsx-a11y/label-has-associated-control': ['error', {
        assert: 'either',
        depth: 3,
      }],
      'jsx-a11y/control-has-associated-label': 'warn',
      // React Refresh plugin rule when available (no-op in prod)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
