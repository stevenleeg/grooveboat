const OFF = 0, WARN = 1, ERROR = 2;


module.exports = {
  extends: 'airbnb',
  parser: 'babel-eslint',
  env: {
    browser: true,
  },
  "globals": {
    "heap": true,
  },
  rules: {
    'prefer-promise-reject-errors': OFF,
    'spaced-comment': OFF,
    'no-continue': OFF,
    'arrow-body-style': OFF,
    'import/extensions': OFF,
    'import/prefer-default-export': OFF,
    'object-curly-spacing': [ERROR, 'never'],
    'react/jsx-wrap-multilines': OFF,
    'react/require-default-props': OFF,
    'react/no-unescaped-entities': OFF,
    'react/prop-types': OFF,
    'react/no-unused-prop-types': OFF,
    'react/no-find-dom-node': OFF,
    'react/forbid-prop-types': OFF,
    'react/no-array-index-key': OFF,
    'react/prefer-stateless-function': OFF,
    'react/no-multi-comp': OFF,
    'no-param-reassign': OFF,
    'no-underscore-dangle': OFF,
    'jsx-a11y/anchor-has-content': OFF,
    'jsx-a11y/label-has-for': OFF,
    'jsx-a11y/no-static-element-interactions': OFF,
    'jsx-a11y/href-no-hash': OFF,
    'jsx-a11y/no-noninteractive-element-interactions': OFF,
    'jsx-a11y/label-has-associated-control': OFF,
    'no-alert': OFF,
    'no-constant-condition': OFF,
    'no-ex-assign': OFF,
    'no-return-assign': OFF,
    'no-restricted-syntax': OFF,
    'no-mixed-operators': OFF,
    'react/jsx-closing-tag-location': OFF,
    'react/jsx-filename-extension': OFF,
    'react/jsx-one-expression-per-line': OFF,
    'object-curly-newline': OFF,
    'jsx-a11y/click-events-have-key-events': OFF,
    'function-paren-newline': OFF,
    'jsx-a11y/anchor-is-valid': OFF,
    'jsx-a11y/accessible-emoji': OFF,
  },
  settings: {
    'import/resolver': {
      parcel: {rootDir: 'src/js'},
    },
  },
};
