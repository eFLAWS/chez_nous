// ForgotPasswordForm.jsx
// Réinitialisation de mot de passe en deux étapes :
//   1. Demander un code (email) — la réponse est TOUJOURS le même message
//      générique, que le compte existe ou non (voir userService.js).
//   2. Entrer le code + un nouveau mot de passe (+ confirmation).
//
// Comme aucun vrai email n'est envoyé, le code n'apparaît nulle part dans
// cette interface — il est journalisé côté serveur (terminal qui fait
// tourner `node server.js`), à consulter manuellement en attendant un
// vrai envoi d'email. Ce n'est pas un oubli : le renvoyer ici serait un
// vrai trou de sécurité (voir README).
import { useState } from "react";
import Spinner from "../common/Spinner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm({ onRequestReset, onConfirmReset, onBackToLogin }) {
  const [step, setStep] = useState("request"); // "request" | "confirm"
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setErrors(["Adresse email invalide."]);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    const res = await onRequestReset(email);
    setSubmitting(false);
    if (!res.success) {
      setErrors([res.error]);
      return;
    }
    setMessage(res.data.message);
    setStep("confirm");
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setErrors(["Les deux mots de passe ne correspondent pas."]);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    const res = await onConfirmReset({ token: token.trim(), newPassword });
    setSubmitting(false);
    if (!res.success) {
      setErrors([res.error]);
      return;
    }
    setMessage("Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.");
  };

  if (step === "request") {
    return (
      <form className="item-form" onSubmit={handleRequest}>
        <p className="item-grid__empty">Entrez votre email pour recevoir un code de réinitialisation.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>

        {errors.length > 0 && (
          <ul className="item-form__errors">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        <div className="item-form__actions">
          <button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size={14} /> Envoi…
              </>
            ) : (
              "Envoyer le code"
            )}
          </button>
          <button type="button" onClick={onBackToLogin} disabled={submitting}>
            Retour à la connexion
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="item-form" onSubmit={handleConfirm}>
      {message && <p className="item-grid__empty">{message}</p>}
      <label>
        Code de réinitialisation
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="reçu par email" />
      </label>
      <label>
        Nouveau mot de passe
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
      </label>
      <label>
        Confirmer le nouveau mot de passe
        <input
          type="password"
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <p className="item-grid__empty">Au moins 8 caractères, une majuscule et un symbole.</p>

      {errors.length > 0 && (
        <ul className="item-form__errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <div className="item-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={14} /> Réinitialisation…
            </>
          ) : (
            "Réinitialiser le mot de passe"
          )}
        </button>
        <button type="button" onClick={onBackToLogin} disabled={submitting}>
          Retour à la connexion
        </button>
      </div>
    </form>
  );
}
