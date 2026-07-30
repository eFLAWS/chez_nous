// src/features/household/JoinHousingModal.jsx
// Placeholder (pas encore fonctionnel, comme demandé explicitement) :
// un champ de saisie pour un futur code d'invitation. Le bouton de
// validation reste désactivé — rien à envoyer nulle part pour l'instant,
// aucun vrai système d'invitation entre logements n'existe encore.
//
// Utilise PlaceholderModal (extrait en composant partagé, voir la
// conversation) — même habillage visuel que ScanPlanModal.jsx, seul le
// contenu (ce champ de saisie) est propre à celui-ci.
import { useState } from "react";
import PlaceholderModal from "./PlaceholderModal";
import "./JoinHousingModal.css";

export default function JoinHousingModal({ onClose }) {
  const [code, setCode] = useState("");

  return (
    <PlaceholderModal
      title="Rejoindre un logement"
      hint="Fonctionnalité à venir — entre un code d'invitation pour rejoindre le logement de quelqu'un d'autre (pas encore opérationnel)."
      onClose={onClose}
    >
      <input
        className="join-housing-modal__input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code d'invitation"
      />
      <button type="button" className="join-housing-modal__submit-btn" disabled title="Pas encore disponible">
        Rejoindre
      </button>
    </PlaceholderModal>
  );
}
