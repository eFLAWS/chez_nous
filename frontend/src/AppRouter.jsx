// AppRouter.jsx
// Vraies routes URL (React Router) — remplace tout routing en state
// (ex. mode = "onboarding"). Supporte la navigation mobile (bouton
// "Retour") et les liens directs.
//
// Ordre des gardes : RequireAuth (session Supabase valide) →
// RequireHousehold (au moins un foyer Supabase) → contenu.
//
// ÉTAPE 4 (voir la conversation) : HouseholdRoot est retiré du flux
// principal. Le catch-all "/*" redirige maintenant vers /households
// (le vrai dashboard Supabase) au lieu de monter l'ancien système —
// plus de double écran de connexion. HouseholdRoot.jsx reste dans le
// dépôt (le plan 2D/2.5D, ApartmentSpatialMvp, en dépend encore tant
// que floor_plans n'est pas migré), simplement plus routé depuis ici.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import RequireAuth from './features/auth/RequireAuth';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import RequireHousehold from './features/household/RequireHousehold';
import CreateHouseholdPage from './features/household/CreateHouseholdPage';
import HouseholdDashboardPage from './features/household/HouseholdDashboardPage';
import HouseholdViewPage from './features/household/HouseholdViewPage';

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
                  <HouseholdViewPage />
                </RequireHousehold>
              </RequireAuth>
            }
          />
          <Route path="/*" element={<Navigate to="/households" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
