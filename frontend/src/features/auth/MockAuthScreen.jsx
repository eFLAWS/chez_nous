// src/features/auth/MockAuthScreen.jsx
// Écran d'accueil simulé (mock) : deux boutons, "Se connecter" et
// "S'inscrire", qui font tous les deux la MÊME chose — simuler la
// connexion d'un utilisateur de test, en état local uniquement. Pas
// d'appel au vrai backend ici (celui-ci existe déjà, avec un vrai
// système d'authentification — voir App.jsx/AppShell.jsx — mais ce MVP
// spatial reste volontairement déconnecté, comme documenté depuis le
// début).
import "./MockAuthScreen.css";

export default function MockAuthScreen({ onLogin }) {
  return (
    <div className="mock-auth">
      <p className="mock-auth__title">Chez nous</p>
      <p className="mock-auth__subtitle">Gérez le plan de votre logement.</p>
      <div className="mock-auth__actions">
        <button type="button" className="mock-auth__btn mock-auth__btn--primary" onClick={onLogin}>
          Se connecter
        </button>
        <button type="button" className="mock-auth__btn" onClick={onLogin}>
          S'inscrire
        </button>
      </div>
    </div>
  );
}
