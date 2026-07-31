// LoginPage.jsx
// Page /login : formulaire de connexion Supabase Auth. Après succès,
// redirige toujours vers "/households" — PAS vers location.state.from
// (la page que RequireAuth avait interceptée avant une déconnexion) :
// voir la conversation, une reconnexion doit ramener sur l'accueil,
// pas rouvrir le dernier onglet consulté. HouseholdDashboardPage
// prend ensuite le relais (redirection directe vers l'unique foyer
// s'il n'y en a qu'un).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './AuthPage.css';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

    navigate('/households', { replace: true });
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
