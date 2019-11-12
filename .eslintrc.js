module.exports = {
  extends: [
    "ash-nazg/sauron-node"
  ],
  parserOptions: {
    sourceType: "module"
  },
  plugins: [],
  env: {
    node: true,
  },
  settings: {
    polyfills: [
      'Map'
    ],
    jsdoc: {
      additionalTagNames: {
        // In case we need to extend
        customTags: []
      },
      allowOverrideWithoutParam: true,
      allowImplementsWithoutParam: true,
      allowAugmentsExtendsWithoutParam: true
    }
  },
  overrides: [
    // Our Markdown rules (and used for JSDoc examples as well, by way of
    //   our use of `matchingFileName` in conjunction with
    //   `jsdoc/check-examples` within `ash-nazg`)
    {
      files: ["**/*.md"],
      rules: {
        "eol-last": ["off"],
        "no-console": ["off"],
        "no-undef": ["off"],
        "no-unused-vars": ["warn"],
        "padded-blocks": ["off"],
        "import/unambiguous": ["off"],
        "import/no-unresolved": ["off"],
        "node/no-missing-import": ["off"]
      }
    }
  ],
  rules: {
    "capitalized-comments": 0,
    "no-magic-numbers": 0
  }
};
