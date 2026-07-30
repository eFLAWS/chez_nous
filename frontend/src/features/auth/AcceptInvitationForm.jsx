// AcceptInvitationForm.jsx
// Formulaire affiché quand quelqu'un a une invitation à rejoindre un foyer.
// Le jeton peut venir d'un lien (prop `token`, ex. extrait de l'URL) mais
// reste modifiable ici : comme l'invitation n'envoie pas encore de vrai
// email (voir README), la personne invitée doit souvent coller un jeton
// reçu par un autre moyen (message, etc.).
//
// Comportement en deux temps, comme demandé :
//   1. On vérifie d'abord le jeton (api.getInvitationPreview) pour savoir
//      si un compte existe déjà pour l'email de l'invitation.
//   2. Selon la réponse : formulaire de création de compte (prénom, nom,
//      mot de passe + confirmation) SI aucun compte n'existe, ou un
//      simple mot de passe (connexion + rejoint le foyer) SI un compte
//      existe déjà.
// Réutilise validateSignup pour la création — l'email vient de
// l'invitation elle-même, jamais d'une saisie libre.
import { useState, useEffect, useCallback } from "react";
import { validateSignup } from "../../utils/formValidators";
import { api } from "../../api";
import Spinner from "../../components/ui/Spinner";

export default function AcceptInvitationForm({ token: initialToken, onSubmitCreate, onSubmitExisting }) {
  const [token, setToken] = useState(initialToken || "");
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState(null); // { email, accountExists } | null
  const [previewError, setPreviewError] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const checkToken = useCallback(async () => {
    if (!token.trim()) {
      setPreviewError("Jeton d'invitation requis.");
      return;
    }
    setChecking(true);
    setPreviewError(null);
    setPreview(null);
    const res = await api.getInvitationPreview(token.trim());
    setChecking(false);
    if (res.success) setPreview(res.data);
    else setPreviewError(res.error);
  }, [token]);

  // Vérifie automatiquement si un jeton est déjà fourni via l'URL (lien
  // d'invitation) — sinon la personne colle un jeton et clique elle-même.
  useEffect(() => {
    if (initialToken) checkToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setErrors(["Les deux mots de passe ne correspondent pas."]);
      return;
    }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { valid, errors: validationErrors } = validateSignup({ name, email: preview.email, password });
    if (!valid) {
      const relevant = validationErrors.filter((err) => !err.startsWith("email"));
      if (relevant.length > 0) {
        setErrors(relevant);
        return;
      }
    }

    setSubmitting(true);
    setErrors([]);
    const result = await onSubmitCreate({ token: token.trim(), name, password });
    setSubmitting(false);
    if (!result.success) setErrors([result.error]);
  };

  const handleExistingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    const result = await onSubmitExisting({ token: token.trim(), password });
    setSubmitting(false);
    if (!result.success) setErrors([result.error]);
  };

  return (
    <div>
      <form
        className="item-form"
        onSubmit={(e) => {
          e.preventDefault();
          checkToken();
        }}
      >
        <label>
          Jeton d'invitation
          <input
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setPreview(null);
              setPreviewError(null);
            }}
            placeholder="reçu par message"
          />
        </label>
        {!preview && (
          <div className="item-form__actions">
            <button type="submit" disabled={checking}>
              {checking ? (
                <>
                  <Spinner size={14} /> Vérification…
                </>
              ) : (
                "Vérifier l'invitation"
              )}
            </button>
          </div>
        )}
      </form>

      {previewError && (
        <ul className="item-form__errors">
          <li>{previewError}</li>
        </ul>
      )}

      {preview && !preview.accountExists && (
        <form className="item-form" onSubmit={handleCreateSubmit}>
          <p className="item-grid__empty">Invitation pour {preview.email} — créez votre compte pour rejoindre le foyer.</p>
          <label>
            Prénom
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
          </label>
          <label>
            Nom
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
          </label>
          <label>
            Choisir un mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <label>
            Confirmer le mot de passe
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
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
                  <Spinner size={14} /> Validation…
                </>
              ) : (
                "Créer mon compte et rejoindre"
              )}
            </button>
          </div>
        </form>
      )}

      {preview && preview.accountExists && (
        <form className="item-form" onSubmit={handleExistingSubmit}>
          <p className="item-grid__empty">
            Un compte existe déjà pour {preview.email} — connectez-vous pour rejoindre ce foyer.
          </p>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
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
                  <Spinner size={14} /> Connexion…
                </>
              ) : (
                "Se connecter et rejoindre"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
