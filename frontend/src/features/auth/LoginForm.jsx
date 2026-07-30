// LoginForm.jsx
// Formulaire de connexion pour un compte déjà existant. Contrairement à
// SignupForm, on ne réutilise volontairement PAS validateSignup ici : les
// règles de force du mot de passe (longueur minimale, etc.) valident la
// CRÉATION d'un mot de passe, pas la vérification d'un mot de passe déjà
// existant. La validation qui compte réellement se fait côté serveur,
// dans login() (voir dataService.js) — ce formulaire ne fait qu'une
// vérification de forme minimale pour un retour immédiat.
//
// THÈME DARK MODE NÉON (voir la conversation, v0.3.3) : deuxième
// direction visuelle fournie par l'utilisateur, remplace le premier
// thème clair. Tokens globaux dans theme.css (:root). Même structure/palette
// que SignupForm.jsx (AuthForm.css, partagé) — cohérent avec le
// commutateur d'onglets dans HouseholdRoot.jsx. Afficher/masquer ajouté
// ici aussi (question restée ouverte lors du chantier précédent sur
// SignupForm) : maintenant que les deux formulaires partagent la même
// feuille de style, les garder cohérents l'un avec l'autre a plus de
// sens que de laisser cette différence.
import { useState } from "react";
import Spinner from "../../components/ui/Spinner";
import { EnvelopeIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from "../../components/ui/Icons";
import "./AuthForm.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm({ onSubmit }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(values.email) || !values.password) {
      setError("Email et mot de passe requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (!result.success) setError(result.error);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">
        <span className="auth-form__label">Email</span>
        <div className="auth-form__input-wrap">
          <span className="auth-form__input-icon">
            <EnvelopeIcon />
          </span>
          <input
            className="auth-form__input"
            type="email"
            value={values.email}
            onChange={set("email")}
            autoComplete="email"
            placeholder="alex@foyer.fr"
          />
        </div>
      </label>

      <label className="auth-form__field">
        <span className="auth-form__label">Mot de passe</span>
        <div className="auth-form__input-wrap">
          <span className="auth-form__input-icon">
            <LockIcon />
          </span>
          <input
            className="auth-form__input auth-form__input--with-toggle"
            type={showPassword ? "text" : "password"}
            value={values.password}
            onChange={set("password")}
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="auth-form__toggle-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </label>

      {error && (
        <ul className="auth-form__errors">
          <li>{error}</li>
        </ul>
      )}

      <button type="submit" className="auth-form__submit" disabled={submitting}>
        {submitting ? (
          <>
            <Spinner size={14} /> Connexion…
          </>
        ) : (
          <>
            Se connecter <ArrowRightIcon />
          </>
        )}
      </button>
    </form>
  );
}
