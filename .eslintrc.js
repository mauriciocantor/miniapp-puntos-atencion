const jestScope = {
  test: true,
  beforeEach: true,
  afterEach: true,
  beforeAll: true,
  afterAll: true,
  expect: true,
  jest: true,
  describe: true
}

const miniProgramsScope = {
  App: true,
  my: true,
  Page: true,
  Component: true,
  getApp: true
}

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  extends: 'standard',
  overrides: [
    {
      env: {
        node: true
      },
      files: [
        '.eslintrc.{js,cjs}'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'import/no-commonjs': 'off', // Deshabilitar la verificación de importaciones CommonJS
    'import/no-absolute-path': 'off'
  },
  globals: {
    ...miniProgramsScope,
    ...jestScope
  }
}
