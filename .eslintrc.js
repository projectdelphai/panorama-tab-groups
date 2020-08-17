module.exports = {
  env: {
    browser: true,
    es2020: true,
    webextensions: true,
  },
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
  ],
  plugins: [
    'json',
  ],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  rules: {
    'import/extensions': 0,
  },
};
