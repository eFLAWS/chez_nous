// AppRouter.jsx
// Vraies routes URL (React Router) — remplace tout routing en state
// (ex. mode = "onboarding"). Supporte la navigation mobile (bouton
// "Retour") et les liens directs.
//
// Ordre des gardes : RequireAuth (session Supabase valide) →
// RequireHousehold (au moins un foyer Supabase) → contenu.
//
// /households et /households/:householdId sont les VRAIES pages
// Supabase (étapes 1 et 2 du plan de routing). Le fallback "/*" vers
// HouseholdRoot reste en place pour l'instant — le retrait de
// HouseholdRoot du flux principal est l'étape 4, une fois 1 et 2
// vérifiées. Les deux coexistent : navigue manuellement vers
// /households pour tester le nouveau système.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import RequireAuth from './features/auth/RequireAuth';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import RequireHousehold from './features/household/RequireHousehold';
import CreateHouseholdPage from './features/household/CreateHouseholdPage';
import HouseholdDashboardPage from './features/household/HouseholdDashboardPage';
import HouseholdViewPage from './features/household/HouseholdViewPage';
import HouseholdRoot from './features/household/HouseholdRoot';

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
          <Route
            path="/*"
            element={
              <RequireAuth>
                <RequireHousehold>
                  <HouseholdRoot />
                </RequireHousehold>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
