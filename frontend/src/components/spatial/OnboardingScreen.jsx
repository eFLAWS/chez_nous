// src/components/spatial/OnboardingScreen.jsx
// Écran affiché quand aucun logement n'existe encore (aucune pièce sur
// aucun étage) — un seul bouton qui ouvre directement le Mode Édition.
import "./OnboardingScreen.css";

export default function OnboardingScreen({ onCreateHousing }) {
  return (
    <div className="onboarding">
      <p className="onboarding__emoji" aria-hidden="true">
        🏠
      </p>
      <h2 className="onboarding__title">Bienvenue dans Chez nous</h2>
      <p className="onboarding__text">Commence par dessiner le plan de ton logement.</p>
      <button type="button" className="onboarding__cta" onClick={onCreateHousing}>
        ➕ Créer un logement
      </button>
    </div>
  );
}
