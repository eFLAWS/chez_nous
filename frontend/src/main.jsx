import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter";
import "./assets/theme.css";
import "./assets/ui-feedback.css";
import "./assets/visual-hierarchy.css";
import "./assets/floor-plan.css";
import "./assets/task-overview.css";
import "./assets/room-3d.css";

// -----------------------------------------------------------------------
// AppRouter gère maintenant le point d'entrée : /login (Supabase Auth,
// AuthProvider + LoginPage) puis, une fois connecté, HouseholdRoot
// (inchangé) derrière RequireAuth. Voir AppRouter.jsx pour le détail
// des routes, et sa note sur l'état transitoire (double écran de
// connexion tant que HouseholdRoot garde son auth interne).
//
// Ancien montage direct de <HouseholdRoot /> retiré d'ici — l'historique
// Git garde une trace de l'ancienne version si besoin d'y revenir.
// -----------------------------------------------------------------------
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
