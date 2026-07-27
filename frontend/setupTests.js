// setupTests.js
// Enregistre les matchers de @testing-library/jest-dom (toBeInTheDocument,
// toHaveTextContent, etc.) auprès de l'expect() de Vitest. Le sous-chemin
// "/vitest" est l'intégration officielle recommandée pour jest-dom avec
// Vitest (contrairement à l'import nu, pensé pour Jest).
import "@testing-library/jest-dom/vitest";
