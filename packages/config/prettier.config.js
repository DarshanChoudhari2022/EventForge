/** @type {import("prettier").Config} */
module.exports = {
  // Consistent formatting across the entire monorepo.
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  arrowParens: "always",
  endOfLine: "lf",

  // Override per-language.
  overrides: [
    {
      files: ["*.json", "*.jsonc"],
      options: { singleQuote: false },
    },
    {
      files: ["*.md", "*.mdx"],
      options: { proseWrap: "always", printWidth: 80 },
    },
    {
      files: ["*.yml", "*.yaml"],
      options: { singleQuote: false },
    },
  ],
};
