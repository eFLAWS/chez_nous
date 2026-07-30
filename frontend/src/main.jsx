import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import HouseholdRoot from "./features/household/HouseholdRoot";
import "./assets/theme.css";
import "./assets/ui-feedback.css";
import "./assets/visual-hierarchy.css";
import "./assets/floor-plan.css";
import "./assets/task-overview.css";
import "./assets/room-3d.css";

// -----------------------------------------------------------------------
// MVP TEMPORAIRE : affiche HouseholdRoot (vrai login/inscription ->
// Dashboard -> ApartmentSpatialMvp, tous les deux branchés sur le vrai
// backend désormais). App.jsx (le vrai flux applicatif d'origine,
// tâches/projets/etc.) n'est PAS touché — juste momentanément pas monté
// depuis ce fichier.
//
// Pour revenir à l'application réelle : remplacer <HouseholdRoot />
// par <App /> ci-dessous, et retirer l'import devenu inutile.
// -----------------------------------------------------------------------
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HouseholdRoot />
  </React.StrictMode>
);
