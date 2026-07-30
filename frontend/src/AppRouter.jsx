// AppRouter.jsx
// Vraies routes URL (React Router) — remplace tout routing en state
// (ex. mode = "onboarding"). Supporte la navigation mobile (bouton
// "Retour") et les liens directs.
//
// ⚠️ ÉTAT TRANSITOIRE CONNU : HouseholdRoot conserve pour l'instant son
// propre écran de connexion interne (ancien backend Node.js) — passer
// RequireAuth (Supabase) affichera donc temporairement DEUX écrans de
// connexion à la suite. Le remplacement de l'auth interne de
// HouseholdRoot par Supabase fait partie de la suite de l'étape 4
// (flow d'onboarding + hook de rôle), pas encore fait à ce stade.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import RequireAuth from './features/auth/RequireAuth';
import LoginPage from './features/auth/LoginPage';
import HouseholdRoot from './features/household/HouseholdRoot';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <HouseholdRoot />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
