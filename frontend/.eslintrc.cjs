// .eslintrc.cjs
// Format classique (pas la "flat config" d'ESLint 9+, qui ignorerait ce
// fichier) — voir package.json, "eslint" est volontairement fixé sur la
// branche 8.x pour que cette configuration soit bien prise en compte.
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier", // désactive les règles ESLint qui entreraient en conflit avec Prettier — TOUJOURS en dernier
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  plugins: ["react", "react-hooks", "react-refresh"],
  ignorePatterns: ["dist", "node_modules", ".eslintrc.cjs"],
  rules: {
    // React 17+ / la nouvelle transformation JSX n'exige plus d'avoir
    // React importé dans chaque fichier qui utilise du JSX.
    "react/react-in-jsx-scope": "off",
    // Les composants de ce projet n'utilisent jamais PropTypes
    // (React simple, pas TypeScript) — éviter un bruit constant.
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    // Signale les exports incompatibles avec le Fast Refresh de Vite,
    // sans bloquer (avertissement, pas erreur).
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
};
