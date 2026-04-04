module.exports = {
  root: true,
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'public/',
    '*.backup',
    'dashboard.js',
    'fix-real-ai.js',
    'lodgify-data.js',
    'test-*.js',
    'src/App-old.jsx',
    'src/App-new.jsx',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['src/**/*.{js,jsx,ts,tsx}'],
      env: {
        browser: true,
        es2022: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        'no-empty': ['warn', { allowEmptyCatch: true }],
        'no-unused-vars': 'warn',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
      },
    },
    {
      files: ['api/**/*.js', '*.js', 'scripts/**/*.js'],
      excludedFiles: ['src/**/*.{js,jsx,ts,tsx}', 'vite.config.js'],
      env: {
        node: true,
        es2022: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      globals: {
        Buffer: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
      },
      rules: {
        'no-empty': ['warn', { allowEmptyCatch: true }],
        'no-unused-vars': 'warn',
      },
    },
    {
      files: ['vite.config.js'],
      env: {
        node: true,
        es2022: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  ],
}
