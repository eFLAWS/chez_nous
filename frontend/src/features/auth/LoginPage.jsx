// LoginPage.jsx
// Page /login : formulaire de connexion Supabase Auth. Après succès,
// redirige vers la page que RequireAuth avait interceptée (location.state.from),
// ou vers "/" si l'utilisateur est arrivé directement sur /login.
//
// Volontairement limité à la connexion pour cette étape — le flow
// d'inscription (Créer un foyer / Rejoindre un foyer) est une étape
// séparée de la feuille de route (point 4).
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn({ email, password });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <div className="login-page">
      <form className="login-page__form" onSubmit={handleSubmit}>
        <h1>Connexion</h1>

        {error && (
          <p className="login-page__error" role="alert">
            {error}
          </p>
        )}

        <label className="login-page__field">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="login-page__field">
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className="login-page__switch">
          Pas encore de compte ? <Link to="/signup">S'inscrire</Link>
        </p>
      </form>
    </div>
  );
}
