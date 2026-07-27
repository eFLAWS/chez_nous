// SignupForm.jsx
// Formulaire de création de compte. Réutilise validateSignup tel quel —
// aucune règle de validation de mot de passe/email n'est dupliquée ici.
// `onSubmit` est fourni par le parent (appelle api.signup).
//
// Prénom et nom sont deux champs séparés à la saisie, mais restent
// combinés en un seul `name` avant validation/envoi : le modèle de
// données (backend + reste du frontend) n'a qu'un seul champ `name`, pas
// de scission firstName/lastName — choix délibéré pour ne pas propager
// ce changement à tous les endroits qui affichent déjà `user.name`.
import { useState } from "react";
import { validateSignup } from "../../validators/formValidators";
import Spinner from "../common/Spinner";

export default function SignupForm({ onSubmit }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setErrors(["Les deux mots de passe ne correspondent pas."]);
      return;
    }

    const values = {
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email,
      password,
      householdName,
    };

    const { valid, errors: validationErrors } = validateSignup(values);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (!result.success) setErrors([result.error]);
  };

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <label>
        Prénom
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
      </label>
      <label>
        Nom
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Mot de passe
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
      <label>
        Nom du foyer (optionnel)
        <input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="ex. Chez nous" />
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
              <Spinner size={14} /> Création…
            </>
          ) : (
            "Créer mon compte"
          )}
        </button>
      </div>
    </form>
  );
}
