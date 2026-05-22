const selectorsMiniProgram = [
    'page',
    'radio',
    'image'
  ]
 
  const unitsMiniProgram = [
    'rpx'
  ]
 
  module.exports = {
    extends: [
      'stylelint-config-standard'
    ],
    "overrides": [{
      "files": ["/src/**/*.acss"],
    }],
    rules: {
      'no-descending-specificity': true,
      'declaration-no-important': true,
      'no-irregular-whitespace': true,
      'import-notation': 'string',
      'custom-property-no-missing-var-function': true,
      'keyframe-declaration-no-important': true,
      'function-calc-no-unspaced-operator': true,
      'no-invalid-position-at-import-rule': true,
      'value-keyword-case': 'lower',
      'color-function-notation': 'legacy',
      'media-feature-range-notation': 'prefix',
      'unit-no-unknown': [
        true,
        {
          ignoreUnits: [
            ...unitsMiniProgram
          ]
        }
      ],
      'selector-type-no-unknown': [
        true,
        {
          ignoreTypes: [
            ...selectorsMiniProgram
          ]
        }
      ]
    }
  }
  