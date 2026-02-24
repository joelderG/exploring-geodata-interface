// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "indent": ["error", 2],
      "no-multi-spaces": ["error"],
      "object-curly-spacing": ["error", "always"],
      "no-extra-semi": ["error"],
      "no-sparse-arrays": ["error"],
      "no-template-curly-in-string": ["warn"],
      "semi": ["error", "always"],
      "no-unexpected-multiline": ["error"],
      "dot-location": ["error", "property"],
      "no-multi-str": ["error"],
      "no-redeclare": ["error"],
      "func-call-spacing": ["error", "never"],
      "computed-property-spacing": ["error", "never"],
      "comma-style": ["error", "last"],
      "comma-spacing": ["error", {"before": false, "after": true}],
      "array-bracket-spacing": ["error", "never"],
      "comma-dangle": ["error", "never"],
      "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "block-spacing": ["error"],
      "switch-colon-spacing": ["error"],
      "spaced-comment": ["error", "always"],
      "space-unary-ops": ["error"],
      "space-infix-ops": ["error", {"int32Hint": false}],
      "space-in-parens": ["error", "never"],
      "space-before-function-paren": ["error", "never"],
      "space-before-blocks": ["error"],
      "semi-style": ["error", "last"],
      "semi-spacing": ["error", {"before": false, "after": true}],
      "no-whitespace-before-property": ["error"],
      "key-spacing": ["error", { "beforeColon": false, "afterColon": true }],
      "keyword-spacing": ["error", { "before": true }],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
