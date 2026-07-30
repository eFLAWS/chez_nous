// SignupForm.jsx
// Formulaire de création de compte. Réutilise validateSignup tel quel —
// aucune règle de validation d'email n'est dupliquée ici (le mot de
// passe, lui, est aussi vérifié en direct ci-dessous — voir plus bas
// pourquoi ce n'est PAS une duplication de règle au sens interdit).
// `onSubmit` est fourni par le parent (appelle api.signup).
//
// Prénom et nom sont deux champs séparés à la saisie, mais restent
// combinés en un seul `name` avant validation/envoi : le modèle de
// données (backend + reste du frontend) n'a qu'un seul champ `name`, pas
// de scission firstName/lastName — choix délibéré pour ne pas propager
// ce changement à tous les endroits qui affichent déjà `user.name`.
//
// "Nom du foyer" RETIRÉ de l'inscription (voir la conversation) : viendra
// dans un futur écran dédié, pas à la création de compte. Le backend a
// déjà un repli si absent (`Foyer de {nom}`, vérifié dans
// userService.js) — rien à ajuster côté serveur pour ce retrait.
//
// VALIDATION DU MOT DE PASSE EN DIRECT (voir la conversation) : la
// checklist ci-dessous (longueur/majuscule/symbole) recalcule ces 3
// critères à CHAQUE frappe, directement à partir de `password` — ce
// n'est PAS une nouvelle copie des règles quelque part, juste un calcul
// dérivé de l'état déjà présent dans ce composant, affiché en direct.
// La validation FAISANT AUTORITÉ reste `validateSignup` (formValidators.js),
// appelée à la soumission comme avant — la checklist est un confort
// visuel, pas un remplacement du vrai contrôle avant envoi.
//
// THÈME DARK MODE NÉON (voir la conversation, v0.3.3) : deuxième
// direction visuelle fournie par l'utilisateur, remplace le premier
// thème clair émeraude/ambre. Tokens globaux dans theme.css (:root),
// exactement ceux fournis (code_couleur.md) — pas réinventés. Mise en
// page inspirée
// d'un prototype HTML/Tailwind fourni par l'utilisateur, traduite en CSS
// pur (AuthForm.css) pour rester cohérente avec la convention du reste
// du projet — pas de dépendance Tailwind/FontAwesome ajoutée. Icônes en
// emoji, comme partout ailleurs dans ce projet.
import { useState } from "react";
import { validateSignup } from "../../utils/formValidators";
import Spinner from "../../components/ui/Spinner";
import { UserIcon, EnvelopeIcon, LockIcon, ShieldIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from "../../components/ui/Icons";
import "./AuthForm.css";

const MIN_PASSWORD_LENGTH = 8; // dupliqué UNIQUEMENT pour l'affichage en direct — voir la note ci-dessus ; la validation qui fait autorité reste validateSignup
// Même expression que formValidators.js (validateSignup) — dupliquée
// UNIQUEMENT pour l'affichage en direct, exactement pour la même
// raison que MIN_PASSWORD_LENGTH ci-dessus.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordChecklist(password) {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export default function SignupForm({ onSubmit }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Dérivés à chaque rendu, jamais stockés à part (ne peuvent donc
  // jamais diverger de `password`/`passwordConfirm`/`email`).
  const checklist = getPasswordChecklist(password);
  const passwordTouched = password.length > 0;
  const confirmTouched = passwordConfirm.length > 0;
  const passwordsMatch = password === passwordConfirm;
  const emailTouched = email.length > 0;
  const isEmailValid = EMAIL_RE.test(email);

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
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__grid">
        <label className="auth-form__field">
          <span className="auth-form__label">Prénom</span>
          <div className="auth-form__input-wrap">
            <span className="auth-form__input-icon">
              <UserIcon />
            </span>
            <input
              className="auth-form__input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              placeholder="Alex"
            />
          </div>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Nom</span>
          <div className="auth-form__input-wrap">
            <span className="auth-form__input-icon">
              <UserIcon />
            </span>
            <input
              className="auth-form__input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              placeholder="Martin"
            />
          </div>
        </label>
      </div>

      <label className="auth-form__field">
        <span className="auth-form__label">Email</span>
        <div className="auth-form__input-wrap">
          <span className="auth-form__input-icon">
            <EnvelopeIcon />
          </span>
          <input
            className="auth-form__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="alex@foyer.fr"
          />
        </div>
      </label>

      {/* Idem que pour le mot de passe : rien avant la première frappe
          dans ce champ précis, pour ne pas afficher une croix sur un
          champ encore vide. */}
      {emailTouched && !isEmailValid && (
        <p className="auth-form__match--mismatch">✗ Adresse email invalide (ex : alex@foyer.fr)</p>
      )}

      <label className="auth-form__field">
        <span className="auth-form__label">Mot de passe</span>
        <div className="auth-form__input-wrap">
          <span className="auth-form__input-icon">
            <LockIcon />
          </span>
          <input
            className="auth-form__input auth-form__input--with-toggle"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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

      {/* Checklist en direct — chaque critère se coche au fur et à
          mesure de la frappe, pas seulement au clic sur "Créer mon
          compte". Rien avant la première frappe (passwordTouched) :
          évite d'afficher 3 croix sur un champ encore vide. */}
      {passwordTouched && (
        <ul className="auth-form__checklist">
          <li className={checklist.length ? "auth-form__checklist-item--met" : "auth-form__checklist-item--unmet"}>
            {checklist.length ? "✓" : "✗"} Au moins {MIN_PASSWORD_LENGTH} caractères
          </li>
          <li className={checklist.uppercase ? "auth-form__checklist-item--met" : "auth-form__checklist-item--unmet"}>
            {checklist.uppercase ? "✓" : "✗"} Une majuscule
          </li>
          <li className={checklist.symbol ? "auth-form__checklist-item--met" : "auth-form__checklist-item--unmet"}>
            {checklist.symbol ? "✓" : "✗"} Un symbole
          </li>
        </ul>
      )}

      <label className="auth-form__field">
        <span className="auth-form__label">Confirmer le mot de passe</span>
        <div className="auth-form__input-wrap">
          <span className="auth-form__input-icon">
            <ShieldIcon />
          </span>
          <input
            className="auth-form__input auth-form__input--with-toggle"
            type={showPasswordConfirm ? "text" : "password"}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="auth-form__toggle-btn"
            onClick={() => setShowPasswordConfirm((v) => !v)}
            aria-label={showPasswordConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </label>

      {/* Idem : rien avant la première frappe dans CE champ précis. */}
      {confirmTouched && (
        <p className={passwordsMatch ? "auth-form__match--ok" : "auth-form__match--mismatch"}>
          {passwordsMatch ? "✓ Les mots de passe correspondent" : "✗ Les mots de passe ne correspondent pas"}
        </p>
      )}

      {errors.length > 0 && (
        <ul className="auth-form__errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="auth-form__submit" disabled={submitting}>
        {submitting ? (
          <>
            <Spinner size={14} /> Création…
          </>
        ) : (
          <>
            Créer mon compte <ArrowRightIcon />
          </>
        )}
      </button>
    </form>
  );
}
