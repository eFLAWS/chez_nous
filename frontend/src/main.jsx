import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ApartmentSpatialMvp from "./components/spatial/ApartmentSpatialMvp";
import "./styles/ui-feedback.css";
import "./styles/visual-hierarchy.css";
import "./styles/floor-plan.css";
import "./styles/task-overview.css";
import "./styles/room-3d.css";

// -----------------------------------------------------------------------
// MVP TEMPORAIRE : affiche directement ApartmentSpatialMvp (données mock,
// pas de connexion/backend) pour tester le commutateur Vue Ensemble / Vue
// Pièce immédiatement au lancement, comme demandé. App.jsx (le vrai flux
// inscription/connexion) n'est PAS touché — juste momentanément pas
// monté depuis ce fichier.
//
// Pour revenir à l'application réelle : remplacer <ApartmentSpatialMvp />
// par <App /> ci-dessous, et retirer l'import devenu inutile.
// -----------------------------------------------------------------------
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApartmentSpatialMvp />
  </React.StrictMode>
);
