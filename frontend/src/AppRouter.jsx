// AppRouter.jsx
// Vraies routes URL (React Router) — remplace tout routing en state
// (ex. mode = "onboarding"). Supporte la navigation mobile (bouton
// "Retour") et les liens directs.
//
// Ordre des gardes sur la route principale : RequireAuth (session
// Supabase valide) → RequireHousehold (au moins un foyer Supabase) →
// HouseholdRoot.
//
// ⚠️ ÉTAT TRANSITOIRE CONNU : HouseholdRoot conserve pour l'instant son
// propre écran de connexion interne (ancien backend Node.js), totalement
// indépendant de Supabase. Après /onboarding, tu passeras donc les deux
// gardes Supabase (auth + foyer), mais tomberas ensuite sur l'écran de
// connexion INTERNE de HouseholdRoot — vérifie la réussite de la
// création de foyer directement dans le Table Editor de Supabase
// (households / household_members) plutôt que dans l'UI à ce stade.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import RequireAuth from './features/auth/RequireAuth';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import RequireHousehold from './features/household/RequireHousehold';
import CreateHouseholdPage from './features/household/CreateHouseholdPage';
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
