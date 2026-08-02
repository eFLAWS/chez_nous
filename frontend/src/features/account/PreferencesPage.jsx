// PreferencesPage.jsx
// Route /settings/preferences — traduit le prototype
// ui_preferences_v0.1.2.html (voir la conversation) en React + CSS
// classique. Sous-page de Réglages, même habillage plein écran.
//
// ⚠️ Les interrupteurs sont de VRAIS interrupteurs (état React local,
// cliquables, visuellement réactifs) mais RIEN n'est persisté nulle
// part (pas de table de préférences utilisateur côté Supabase) — un
// rechargement de page les remet à leurs valeurs par défaut. Même
// esprit que l'aperçu d'icône de foyer non persistant (HouseholdSwitcher.jsx).
// "Mode sombre" reste affiché (fidèle au prototype) mais n'a aucun
// effet : l'app est actuellement dark-mode uniquement par conception
// (voir docs/VISION_PRODUIT.md), il n'existe pas de thème clair à
// basculer.
//
// La section "Notifications & Rappels" (Notifications, Rappels de
// tâches, Social, Alertes de dépenses, Foyer, Annonces) n'a aucune
// page de destination construite pour l'instant — inerte, badge
// "Bientôt".
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AmbientGlow from '../../components/ui/AmbientGlow';
import {
  ArrowLeftIcon,
  SearchIcon,
  SpeakerIcon,
  PhoneIcon,
  ShapesIcon,
  MoonIcon,
  StarIcon,
  LightbulbIcon,
  BellIcon,
  ChecklistIcon,
  UsersIcon,
  WalletIcon,
  HouseIcon,
  WandIcon,
  BatteryIcon,
  EyeIcon,
  ChevronRightIcon,
} from '../../components/ui/Icons';
import './account-pages.css';

const EXPERIENCE_TOGGLES = [
  { key: 'soundEffects', label: 'Effets Sonores', icon: SpeakerIcon, tone: 'purple' },
  { key: 'vibrations', label: 'Vibrations', icon: PhoneIcon, tone: 'pink' },
  { key: 'animations', label: 'Animations', icon: ShapesIcon, tone: 'sky' },
  { key: 'darkMode', label: 'Mode sombre', icon: MoonIcon, tone: 'slate' },
  { key: 'motivation', label: 'Messages de motivation', icon: StarIcon, tone: 'pink' },
  { key: 'tips', label: 'Conseils ménage', icon: LightbulbIcon, tone: 'amber' },
];

const NOTIFICATION_ITEMS = [
  { key: 'notifications', label: 'Notifications', desc: null, icon: BellIcon, tone: 'sky' },
  { key: 'taskReminders', label: 'Rappels de tâches', desc: null, icon: ChecklistIcon, tone: 'emerald' },
  { key: 'social', label: 'Social', desc: null, icon: UsersIcon, tone: 'amber' },
  { key: 'expenseAlerts', label: 'Alertes de dépenses', desc: null, icon: WalletIcon, tone: 'sky' },
  { key: 'household', label: 'Foyer', desc: null, icon: HouseIcon, tone: 'amber' },
  { key: 'announcements', label: 'Annonces', desc: null, icon: StarIcon, tone: 'purple' },
];

function matchesQuery(label, query) {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

export default function PreferencesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const [toggles, setToggles] = useState({
    soundEffects: true,
    vibrations: true,
    animations: true,
    darkMode: true,
    motivation: true,
    tips: true,
    daltonism: false,
  });
  const [view3D, setView3D] = useState(true);
  const [energySaving, setEnergySaving] = useState(false);

  function toggle(key) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Vue 3D forcée à l'arrêt tant que l'économie d'énergie est active —
  // même comportement que le script du prototype.
  const view3DEffective = energySaving ? false : view3D;

  return (
    <div className="account-page">
      <AmbientGlow />
      <header className="account-page__header">
        <div className="account-page__header-left">
          <button type="button" className="account-page__back-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeftIcon size={16} />
          </button>
          <div>
            <h1 className="account-page__title">Préférences</h1>
            <p className="account-page__subtitle">Notifications & Expérience</p>
          </div>
        </div>

        <div className="account-page__search">
          <SearchIcon size={15} className="account-page__search-icon" />
          <input
            type="search"
            className="account-page__search-input"
            placeholder="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher dans les préférences"
          />
        </div>
      </header>

      <main className="account-page__content">
        {(query === '' || EXPERIENCE_TOGGLES.some((t) => matchesQuery(t.label, query))) && (
          <section className="account-section">
            <p className="account-section__eyebrow">Expérience Utilisateur</p>
            <div className="account-list">
              {EXPERIENCE_TOGGLES.filter((t) => matchesQuery(t.label, query)).map((t) => {
                const Icon = t.icon;
                const isOn = toggles[t.key];
                return (
                  <div key={t.key} className="account-toggle-row">
                    <span className="account-list-item__main">
                      <span className={`account-list-item__icon account-list-item__icon--${t.tone}`}>
                        <Icon size={16} />
                      </span>
                      <p className="account-list-item__label">{t.label}</p>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      aria-label={t.label}
                      className={isOn ? 'account-toggle account-toggle--on' : 'account-toggle'}
                      onClick={() => toggle(t.key)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(query === '' || NOTIFICATION_ITEMS.some((item) => matchesQuery(item.label, query))) && (
          <section className="account-section">
            <p className="account-section__eyebrow">Notifications & Rappels</p>
            <div className="account-list">
              {NOTIFICATION_ITEMS.filter((item) => matchesQuery(item.label, query)).map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.key} type="button" className="account-list-item account-list-item--disabled" disabled>
                    <span className="account-list-item__main">
                      <span className={`account-list-item__icon account-list-item__icon--${item.tone}`}>
                        <Icon size={16} />
                      </span>
                      <p className="account-list-item__label">{item.label}</p>
                    </span>
                    <span className="account-badge-soon">Bientôt</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {(query === '' || 'vue 3d économie énergie mode daltonien'.includes(query.trim().toLowerCase())) && (
          <section className="account-section">
            <p className="account-section__eyebrow">Interface & Performance</p>
            <div className="account-list">
              <div className={view3DEffective || !energySaving ? 'account-toggle-row' : 'account-toggle-row account-toggle-row--disabled'}>
                <span className="account-list-item__main">
                  <span className="account-list-item__icon account-list-item__icon--teal">
                    <WandIcon size={16} />
                  </span>
                  <span>
                    <p className="account-list-item__label">Vue 3D</p>
                    <p className="account-list-item__desc">Activer la vue 3D pour une expérience immersive</p>
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={view3DEffective}
                  aria-label="Vue 3D"
                  disabled={energySaving}
                  className={view3DEffective ? 'account-toggle account-toggle--on' : 'account-toggle'}
                  onClick={() => setView3D((prev) => !prev)}
                />
              </div>

              <div className="account-toggle-row">
                <span className="account-list-item__main">
                  <span className="account-list-item__icon account-list-item__icon--slate">
                    <BatteryIcon size={16} />
                  </span>
                  <span>
                    <p className="account-list-item__label">Économie d'énergie</p>
                    <p className="account-list-item__desc">Réduire les animations 3D pour préserver la batterie</p>
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={energySaving}
                  aria-label="Économie d'énergie"
                  className={energySaving ? 'account-toggle account-toggle--on' : 'account-toggle'}
                  onClick={() => setEnergySaving((prev) => !prev)}
                />
              </div>

              <div className="account-toggle-row">
                <span className="account-list-item__main">
                  <span className="account-list-item__icon account-list-item__icon--slate">
                    <EyeIcon size={16} />
                  </span>
                  <span>
                    <p className="account-list-item__label">Mode daltonien</p>
                    <p className="account-list-item__desc">Adapter l'interface pour les utilisateurs daltoniens</p>
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggles.daltonism}
                  aria-label="Mode daltonien"
                  className={toggles.daltonism ? 'account-toggle account-toggle--on' : 'account-toggle'}
                  onClick={() => toggle('daltonism')}
                />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
