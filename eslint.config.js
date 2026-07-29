export default [
  {
    ignores: ["_site/**", "public/**", "src/vendor/**"],
  },
  {
    files: ["src/**/*.js", "scripts/**/*.mjs", "eleventy.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        HTMLElement: "readonly",
        HTMLVideoElement: "readonly",
        CustomEvent: "readonly",
        CSS: "readonly",
        URL: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        performance: "readonly",
        THREE: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "caughtErrors": "none"
        }
      ],
      "no-undef": "error",
    },
  },
];
