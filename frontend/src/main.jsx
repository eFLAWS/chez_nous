import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter";
import "./assets/theme.css";

// -----------------------------------------------------------------------
// AppRouter gère le point d'entrée : /login, /signup (Supabase Auth),
// /onboarding (création de foyer), /households + /households/:id (le
// vrai dashboard Supabase). Depuis l'étape 4 du routing, HouseholdRoot
// n'est plus monté du tout — voir AppRouter.jsx pour le détail des
// routes.
// -----------------------------------------------------------------------
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
