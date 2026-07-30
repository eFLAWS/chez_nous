// CreateHouseholdPage.jsx
// Page /onboarding : premier écran vu par un compte sans foyer.
// Reprend la maquette fournie (ui_new_v0.1.4.html) — palette et
// disposition traduites en CSS classique (CreateHouseholdPage.css),
// Tailwind/FontAwesome non repris comme dépendances réelles.
//
// Seule l'option "Créer un logement" est fonctionnelle. "Scanner un
// plan" et "Rejoindre un logement" restent visibles mais désactivées
// ("Bientôt"), comme dans la maquette.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useHouseholds } from './useHouseholds';
import { createHousehold } from './householdService';
import './CreateHouseholdPage.css';

const OPTIONS = {
  create: {
    title: 'Créer un logement',
    subtitle: "Partir d'une feuille blanche",
    icon: '➕',
    enabled: true,
  },
  scan: {
    title: 'Scanner un plan',
    subtitle: 'Générer depuis une photo / croquis',
    icon: '⛶',
    enabled: false,
  },
  join: {
    title: 'Rejoindre un logement',
    subtitle: "Via un code ou lien d'invitation",
    icon: '🔗',
    enabled: false,
  },
};

export default function CreateHouseholdPage() {
  const { user, signOut } = useAuth();
  const { reload } = useHouseholds();
  const navigate = useNavigate();

  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function toggle(optionId) {
    if (!OPTIONS[optionId].enabled) return;
    setSelected((current) => (current === optionId ? null : optionId));
    setError(null);
  }

  async function handleContinue() {
    if (selected !== 'create') return; // seule option active pour l'instant
    if (!name.trim()) {
      setError('Donne un nom à ton logement.');
      return;
    }

    setSubmitting(true);
    const result = await createHousehold({ name: name.trim(), userId: user.id });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    await reload();
    navigate('/', { replace: true });
  }

  return (
    <div className="create-household-page">
      <header className="create-household-page__header">
        <div className="create-household-page__user">
          <span className="create-household-page__avatar">
            {(user?.email ?? '?').charAt(0).toUpperCase()}
          </span>
          <span>{user?.email}</span>
        </div>
        <button type="button" onClick={signOut} className="create-household-page__logout">
          Déconnexion
        </button>
      </header>

      <main className="create-household-page__main">
        <div className="create-household-page__intro">
          <div className="create-household-page__icon">🏠</div>
          <h1>Créer un logement</h1>
          <p>Vous n'avez aucun foyer actif pour le moment. Créez-en un ou rejoignez-en un !</p>
        </div>

        {error && <p className="create-household-page__error">{error}</p>}

        <div className="create-household-page__options">
          {Object.entries(OPTIONS).map(([id, option]) => (
            <div
              key={id}
              className={`create-household-page__card ${
                selected === id ? 'create-household-page__card--active' : ''
              } ${!option.enabled ? 'create-household-page__card--disabled' : ''}`}
            >
              <button
                type="button"
                onClick={() => toggle(id)}
                className="create-household-page__card-header"
              >
                <span className="create-household-page__card-icon">{option.icon}</span>
                <span className="create-household-page__card-text">
                  <strong>
                    {option.title}
                    {!option.enabled && (
                      <span className="create-household-page__badge">Bientôt</span>
                    )}
                  </strong>
                  <small>{option.subtitle}</small>
                </span>
              </button>

              {selected === id && id === 'create' && (
                <div className="create-household-page__card-details">
                  <p>Commencez par nommer votre logement pour ouvrir l'éditeur de plan.</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex: Appartement Paris 11"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="create-household-page__footer">
        <button
          type="button"
          disabled={!selected || submitting}
          onClick={handleContinue}
          className="create-household-page__continue"
        >
          {submitting ? 'Création…' : 'Continuer →'}
        </button>
      </footer>
    </div>
  );
}
