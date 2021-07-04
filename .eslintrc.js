module.exports = {
  parser: '@babel/eslint-parser',
  extends: ['plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
  },
};
