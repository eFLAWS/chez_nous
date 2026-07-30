// InviteForm.jsx
// Formulaire d'invitation d'un membre du foyer par email. La validation
// complète (foyer existant, doublon, invitation déjà en attente) est faite
// côté serveur par inviteUser — ce formulaire ne fait qu'une vérification
// minimale de forme avant l'envoi, pour un retour immédiat.
//
// Affiche le jeton renvoyé par le serveur : comme aucun email n'est
// réellement envoyé (voir README, "Ce qui manque"), c'est à la personne
// qui invite de transmettre ce jeton elle-même (message, etc.) — la
// personne invitée le colle ensuite dans AcceptInvitationForm.
import { useState } from "react";
import Spinner from "../../components/ui/Spinner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteForm({ householdId, invitedBy, onSubmit }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null); // { email, token } | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Adresse email invalide.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await onSubmit({ householdId, email, invitedBy });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      setSent(null);
    } else {
      setSent({ email, token: result.data?.token });
      setEmail("");
    }
  };

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <label>
        Inviter par email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@exemple.com" />
      </label>

      {error && (
        <ul className="item-form__errors">
          <li>{error}</li>
        </ul>
      )}

      {sent && !error && (
        <p className="item-grid__empty">
          Invitation créée pour {sent.email}. Transmets-lui ce jeton (aucun email n'est envoyé automatiquement) :
          <br />
          <code>{sent.token}</code>
        </p>
      )}

      <div className="item-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={14} /> Envoi…
            </>
          ) : (
            "Inviter"
          )}
        </button>
      </div>
    </form>
  );
}
