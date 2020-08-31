module.exports = {
  env: {
    es6: true,
    node: true,
  },
  plugins: [
   'security',
  ],
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
  },
};
