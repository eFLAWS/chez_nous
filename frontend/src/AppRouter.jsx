// AppRouter.jsx
// Vraies routes URL (React Router) — remplace tout routing en state
// (ex. mode = "onboarding"). Supporte la navigation mobile (bouton
// "Retour") et les liens directs.
//
// Ordre des gardes : RequireAuth (session Supabase valide) →
// RequireHousehold (au moins un foyer Supabase) → contenu.
//
// ÉTAPES 3-4 (voir la conversation, docs/user-flows/ROUTING_AND_USER_FLOWS.md
// section 2) : /households/:householdId devient une route PARENT montant
// <AppLayout/> (header + bottom nav — 6 onglets désormais, "Dépenses"
// ajouté après coup, voir la conversation), avec les écrans du foyer
// actif en routes enfants rendues dans son <Outlet/> :
//   (index)  -> HouseholdHomePage    (Accueil)
//   spatial  -> HouseholdSpatialPage
//   tasks    -> HouseholdTasksPage
//   expenses -> HouseholdExpensesPage (ajouté après coup — la spec
//                                      d'origine logeait les dépenses
//                                      dans "Vie du foyer", à répercuter
//                                      dans le .md)
//   calendar -> HouseholdCalendarPage
//   life     -> HouseholdLifePage    (contenu ex-HouseholdViewPage.jsx —
//                                     header propre retiré, AppLayout
//                                     porte déjà le switcher de foyer)
//   rewards  -> HouseholdRewardsPage (ajouté après coup, voir la
//                                     conversation sur les boutons
//                                     streak/score du header : atteinte
//                                     via le badge gemme, PAS un onglet
//                                     de la barre basse — cohérent avec
//                                     le prototype où le score ouvre un
//                                     écran séparé des 6 onglets)
// HouseholdViewPage.jsx est retiré du routing : son contenu correspond
// en fait à l'onglet "Vie du foyer" de la spec (membres, invite_code),
// pas à l'Accueil (qui doit être un résumé — propreté, tâches du jour,
// courses — pas encore implémenté), d'où le renommage en
// HouseholdLifePage plutôt qu'une réutilisation telle quelle.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import RequireAuth from './features/auth/RequireAuth';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import RequireHousehold from './features/household/RequireHousehold';
import CreateHouseholdPage from './features/household/CreateHouseholdPage';
import HouseholdDashboardPage from './features/household/HouseholdDashboardPage';
import AppLayout from './features/household/AppLayout';
import HouseholdHomePage from './features/household/HouseholdHomePage';
import HouseholdSpatialPage from './features/floor-plan/HouseholdSpatialPage';
import HouseholdTasksPage from './features/tasks/HouseholdTasksPage';
import HouseholdExpensesPage from './features/household/HouseholdExpensesPage';
import HouseholdCalendarPage from './features/household/HouseholdCalendarPage';
import HouseholdLifePage from './features/household/HouseholdLifePage';
import HouseholdRewardsPage from './features/household/HouseholdRewardsPage';
import ProfilePage from './features/account/ProfilePage';
import SettingsPage from './features/account/SettingsPage';
import PreferencesPage from './features/account/PreferencesPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <CreateHouseholdPage />
              </RequireAuth>
            }
          />
          {/* Profil/Réglages/Préférences : pages plein écran autonomes
              (bouton retour propre, pas de bottom nav), atteintes depuis
              UserMenu.jsx — RequireAuth seul, pas besoin d'un foyer pour
              y accéder (contrairement à /households/*). */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings/preferences"
            element={
              <RequireAuth>
                <PreferencesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/households"
            element={
              <RequireAuth>
                <RequireHousehold>
                  <HouseholdDashboardPage />
                </RequireHousehold>
              </RequireAuth>
            }
          />
          <Route
            path="/households/:householdId"
            element={
              <RequireAuth>
                <RequireHousehold>
                  <AppLayout />
                </RequireHousehold>
              </RequireAuth>
            }
          >
            <Route index element={<HouseholdHomePage />} />
            <Route path="spatial" element={<HouseholdSpatialPage />} />
            <Route path="tasks" element={<HouseholdTasksPage />} />
            <Route path="expenses" element={<HouseholdExpensesPage />} />
            <Route path="calendar" element={<HouseholdCalendarPage />} />
            <Route path="life" element={<HouseholdLifePage />} />
            <Route path="rewards" element={<HouseholdRewardsPage />} />
          </Route>
          <Route path="/*" element={<Navigate to="/households" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
