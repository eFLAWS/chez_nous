// SignupPage.jsx
// Page /signup : inscription Supabase Auth. Après succès, redirige
// vers "/" — RequireHousehold prend ensuite le relais et amène un
// compte tout neuf vers /onboarding (aucun foyer encore).
//
// ⚠️ À vérifier en testant pour de vrai : selon que la confirmation
// email est activée ou non côté Supabase (Dashboard → Authentication →
// Providers → Email), la session peut ne pas être immédiatement active
// juste après signUp() — dans ce cas la redirection vers "/" tombera
// sur RequireAuth qui renverra vers /login tant que l'email n'est pas
// confirmé. Dis-moi ce que tu observes, on ajustera si besoin.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    const name = `${firstName} ${lastName}`.trim();
    const result = await signUp({ email, password, name });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    navigate('/', { replace: true });
  }

  return (
    <div className="login-page">
      <form className="login-page__form" onSubmit={handleSubmit}>
        <h1>Créer un compte</h1>

        {error && (
          <p className="login-page__error" role="alert">
            {error}
          </p>
        )}

        <label className="login-page__field">
          Prénom
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </label>

        <label className="login-page__field">
          Nom
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </label>

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
            autoComplete="new-password"
            required
          />
        </label>

        <label className="login-page__field">
          Confirmer le mot de passe
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="login-page__switch">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
