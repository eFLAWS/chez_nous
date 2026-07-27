import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Le backend (server.js) doit tourner séparément sur le port 3001
// (`node server.js` depuis le dossier backend/). Ce proxy permet au
// frontend d'appeler simplement "/api/..." sans se soucier du port ni
// des en-têtes CORS pendant le développement.
//
// IMPORTANT : la clé est "/api/" AVEC le slash final, pas "/api". C'est un
// garde-fou hérité d'avant la réorganisation en src/ : notre fichier
// frontend/api.js (aujourd'hui src/api.js, servi sous "/src/api.js") ne
// collisionne plus du tout avec "/api", mais garder "/api/" (plutôt que
// "/api") reste la bonne pratique : toutes nos vraies routes sont de la
// forme "/api/tasks", "/api/rooms/:id" — toujours un slash après "api".
//
// `test` : Vitest lit ce même fichier de configuration (pas besoin d'un
// vitest.config.js séparé). environment "jsdom" simule un DOM en Node,
// nécessaire pour rendre des composants React dans les tests.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./setupTests.js",
    globals: false,
  },
});
