// RequireAuth.jsx
// Garde de route : redirige vers /login si aucune session active.
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    // Évite de rediriger vers /login pendant que la session est encore
    // en cours de vérification (getSession() pas encore résolu).
    return <div className="auth-loading">Chargement…</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
