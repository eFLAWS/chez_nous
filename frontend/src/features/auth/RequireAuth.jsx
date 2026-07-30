// RequireAuth.jsx
// Garde de route : redirige vers /login si aucune session active.
// Mémorise la page d'origine (location.state.from) pour y revenir
// automatiquement après une connexion réussie (voir LoginPage.jsx).
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Évite de rediriger vers /login pendant que la session est encore
    // en cours de vérification (getSession() pas encore résolu).
    return <div className="auth-loading">Chargement…</div>;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
