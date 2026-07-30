// RequireHousehold.jsx
// Garde de route : redirige vers /onboarding si le compte connecté
// n'appartient encore à aucun foyer Supabase. À utiliser À L'INTÉRIEUR
// de RequireAuth (suppose une session déjà valide).
import { Navigate } from 'react-router-dom';
import { useHouseholds } from './useHouseholds';

export default function RequireHousehold({ children }) {
  const { households, loading } = useHouseholds();

  if (loading) {
    return <div className="auth-loading">Chargement…</div>;
  }

  if (households.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
