// LoginForm.jsx
// Formulaire de connexion pour un compte déjà existant. Contrairement à
// SignupForm, on ne réutilise volontairement PAS validateSignup ici : les
// règles de force du mot de passe (longueur minimale, etc.) valident la
// CRÉATION d'un mot de passe, pas la vérification d'un mot de passe déjà
// existant. La validation qui compte réellement se fait côté serveur,
// dans login() (voir dataService.js) — ce formulaire ne fait qu'une
// vérification de forme minimale pour un retour immédiat.
import { useState } from "react";
import Spinner from "../common/Spinner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm({ onSubmit }) {
  const [values, setValues] = useState({ email: "", password: "" });
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
    <form className="item-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" value={values.email} onChange={set("email")} autoComplete="email" />
      </label>
      <label>
        Mot de passe
        <input type="password" value={values.password} onChange={set("password")} autoComplete="current-password" />
      </label>

      {error && (
        <ul className="item-form__errors">
          <li>{error}</li>
        </ul>
      )}

      <div className="item-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={14} /> Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </button>
      </div>
    </form>
  );
}
