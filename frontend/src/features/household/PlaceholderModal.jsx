// src/features/household/PlaceholderModal.jsx
// Fenêtre modale générique en feuille du bas, thème sombre néon (mêmes
// tokens que HouseholdRoot.css/AuthForm.css) — pour les fonctionnalités
// "à venir" (rejoindre un logement, scanner un plan...). Extraite en
// composant partagé plutôt que dupliquée : les deux placeholders ont
// exactement le même habillage visuel (fond, feuille, poignée, titre,
// texte d'explication, bouton fermer), seul le CONTENU change (un champ
// de saisie pour l'un, rien pour l'autre) — passé via `children`.
import "./PlaceholderModal.css";

export default function PlaceholderModal({ title, hint, children, onClose }) {
  return (
    <>
      <div className="placeholder-modal-backdrop" onClick={onClose} />
      <div className="placeholder-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="placeholder-modal__handle" />
        <h3 className="placeholder-modal__title">{title}</h3>
        <p className="placeholder-modal__hint">{hint}</p>
        {children}
        <button type="button" className="placeholder-modal__close-btn" onClick={onClose}>
          Fermer
        </button>
      </div>
    </>
  );
}
