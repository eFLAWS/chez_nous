// SettingsPage.jsx
// Route /settings — traduit le prototype ui_settings_v0.1.2.html (voir
// la conversation) en React + CSS classique. Page plein écran
// autonome (bouton retour, pas de bottom nav) — atteinte depuis
// UserMenu.jsx (header d'AppLayout), pas un onglet du foyer.
//
// ⚠️ Seuls "Profil utilisateur" (-> /profile) et "Notifications et
// Préférences" (-> /settings/preferences) mènent vers de vraies pages.
// Tout le reste (Foyers, Confidentialité, Réseaux sociaux, Cookies,
// Abonnement, Aide & FAQ, Contacter le support, mentions légales) n'a
// aucune page de destination construite — badge "Bientôt", inerte,
// même convention que le reste du projet pour les fonctionnalités pas
// encore prêtes. "Supprimer mon compte" désactivé délibérément : une
// suppression de compte réelle touche à des données irréversibles
// (RGPD, cascade sur les foyers dont on est PROPRIETAIRE...), ce n'est
// pas une simple page à construire, un vrai flux à concevoir à part.
//
// Le badge de version du prototype ("v0.5.3") n'a pas été repris : ce
// n'est qu'un numéro de fichier de maquette, pas une version de l'app
// réelle — l'afficher aux utilisateurs n'aurait aucun sens.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AmbientGlow from '../../components/ui/AmbientGlow';
import {
  ArrowLeftIcon,
  SearchIcon,
  UserIcon,
  HouseIcon,
  LockIcon,
  BellIcon,
  ShareIcon,
  CookieIcon,
  CreditCardIcon,
  HelpCircleIcon,
  EnvelopeIcon,
  ChevronRightIcon,
  LogoutIcon,
} from '../../components/ui/Icons';
import './account-pages.css';

const ACCOUNT_ITEMS = [
  { key: 'profile', label: 'Profil utilisateur', desc: null, icon: UserIcon, tone: 'emerald', to: '/profile' },
  { key: 'households', label: 'Foyers', desc: 'Gérer vos foyers et leurs paramètres', icon: HouseIcon, tone: 'amber', to: null },
  { key: 'privacy', label: 'Confidentialité', desc: 'Gérer vos préférences de confidentialité', icon: LockIcon, tone: 'slate', to: null },
  { key: 'preferences', label: 'Notifications et Préférences', desc: 'Personnaliser votre expérience', icon: BellIcon, tone: 'amber', to: '/settings/preferences' },
  { key: 'social', label: 'Réseaux sociaux', desc: 'Gérer vos comptes sociaux', icon: ShareIcon, tone: 'sky', to: null },
  { key: 'cookies', label: 'Cookies', desc: 'Gérer vos préférences de cookies', icon: CookieIcon, tone: 'slate', to: null },
];

const SUBSCRIPTION_ITEMS = [
  { key: 'subscription', label: "Gestion de l'abonnement", desc: 'Modifier ou résilier votre abonnement', icon: CreditCardIcon, tone: 'teal', to: null },
];

const SUPPORT_ITEMS = [
  { key: 'faq', label: 'Aide & FAQ', desc: 'Consulter les questions fréquentes', icon: HelpCircleIcon, tone: 'sky', to: null },
  { key: 'contact', label: 'Contacter le support', desc: "Envoyer un message à l'équipe d'assistance", icon: EnvelopeIcon, tone: 'sky', to: null },
];

const LEGAL_LINKS = ['Termes et Conditions', 'Politique de Confidentialité', 'Attributions', 'Propriété Intellectuelle'];

function matchesQuery(label, query) {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

function SettingsList({ items, query }) {
  const navigate = useNavigate();
  const visible = items.filter((item) => matchesQuery(item.label, query));
  if (visible.length === 0) return null;

  return (
    <div className="account-list">
      {visible.map((item) => {
        const Icon = item.icon;
        const disabled = !item.to;
        return (
          <button
            key={item.key}
            type="button"
            className={disabled ? 'account-list-item account-list-item--disabled' : 'account-list-item'}
            disabled={disabled}
            onClick={() => item.to && navigate(item.to)}
          >
            <span className="account-list-item__main">
              <span className={`account-list-item__icon account-list-item__icon--${item.tone}`}>
                <Icon size={16} />
              </span>
              <span>
                <p className="account-list-item__label">{item.label}</p>
                {item.desc && <p className="account-list-item__desc">{item.desc}</p>}
              </span>
            </span>
            {disabled ? (
              <span className="account-badge-soon">Bientôt</span>
            ) : (
              <ChevronRightIcon size={13} className="account-list-item__chevron" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');

  const accountItems = ACCOUNT_ITEMS.map((item) =>
    item.key === 'profile' ? { ...item, desc: user?.email ?? 'Compte connecté' } : item
  );

  const anyResults =
    [...accountItems, ...SUBSCRIPTION_ITEMS, ...SUPPORT_ITEMS].some((item) => matchesQuery(item.label, query)) ||
    LEGAL_LINKS.some((label) => matchesQuery(label, query));

  return (
    <div className="account-page">
      <AmbientGlow />
      <header className="account-page__header">
        <div className="account-page__header-left">
          <button type="button" className="account-page__back-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeftIcon size={16} />
          </button>
          <div>
            <h1 className="account-page__title">Réglages</h1>
            <p className="account-page__subtitle">Préférences & Compte</p>
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
            aria-label="Rechercher dans les réglages"
          />
        </div>
      </header>

      <main className="account-page__content">
        {!anyResults && <p className="account-empty-note">Aucun résultat pour "{query}".</p>}

        {(query === '' || accountItems.some((item) => matchesQuery(item.label, query))) && (
          <section className="account-section">
            <p className="account-section__eyebrow">Mon Compte</p>
            <SettingsList items={accountItems} query={query} />
          </section>
        )}

        {(query === '' || SUBSCRIPTION_ITEMS.some((item) => matchesQuery(item.label, query))) && (
          <section className="account-section">
            <p className="account-section__eyebrow">Abonnement</p>
            <SettingsList items={SUBSCRIPTION_ITEMS} query={query} />
          </section>
        )}

        {(query === '' || SUPPORT_ITEMS.some((item) => matchesQuery(item.label, query))) && (
          <section className="account-section">
            <p className="account-section__eyebrow">Support</p>
            <SettingsList items={SUPPORT_ITEMS} query={query} />
          </section>
        )}

        {query === '' && (
          <>
            <section className="account-section">
              <button type="button" className="account-danger-btn" onClick={signOut}>
                <LogoutIcon size={14} />
                <span>Se déconnecter</span>
              </button>
              <div style={{ textAlign: 'center' }}>
                <button type="button" className="account-inline-link account-inline-link--disabled" disabled title="Bientôt disponible">
                  Supprimer mon compte
                </button>
              </div>
            </section>

            <section className="account-legal-list">
              {LEGAL_LINKS.map((label) => (
                <button key={label} type="button" className="account-inline-link account-inline-link--disabled" disabled>
                  {label}
                </button>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
