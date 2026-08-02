// ProfilePage.jsx
// Route /profile — traduit le BON prototype ui_profile_v0.1.1.html (le
// v0.1.2 utilisé précédemment était erroné, voir la conversation — Paul
// a fourni le fichier v0.1.1 comme la référence correcte). Page plein
// écran autonome (bouton retour, pas de bottom nav).
//
// Différences avec la version précédente (v0.1.2, à oublier) :
// - Bouton "Retour" : présent dans CE prototype (j'en avais ajouté un
//   par déduction sur le v0.1.2 qui n'en avait pas — confirmé une
//   bonne intuition, mais autant repartir du vrai fichier).
// - Header : uniquement "Partager" à droite — plus de bouton Réglages
//   ici (celui-ci n'existe que dans le v0.1.2 erroné).
// - Avatar : ce prototype n'a PAS le concept "Sims" (plumbob, humeur,
//   "Studio Avatar & Dressing 3D") — remplacé par un cadre à bordure
//   dégradée avec initiales en repli (pas de photo), et un simple
//   bouton caméra pour en changer.
//
// ⚠️ Écarts assumés par rapport à CE prototype (mêmes principes que la
// version précédente, toujours valables) :
// - Stats (streak/points/tâches), badges et répartition par spécialité
//   affichés à zéro/vide plutôt que les chiffres de démo du prototype
//   ("5 jours", "320", "42", "3/8 débloqués") — aucune donnée réelle
//   n'existe encore (streak_count/points_balance absents des
//   migrations, aucun système de badges). Même principe que les
//   badges du header d'AppLayout, jamais simulés.
// - Coche "Membre vérifié" à côté du nom : RETIRÉE — aucun système de
//   vérification d'identité n'existe, afficher ce badge laisserait
//   croire à une garantie qui n'existe pas.
// - Badge "Membre ChezNous Plus" : simplifié en "Membre" — aucun
//   système d'abonnement/palier payant n'existe (voir docs/PROJET.md
//   Phase 4, encore un brouillon), afficher "Plus" laisserait croire à
//   un abonnement payant actif qui n'existe pas.
// - "Membre de [foyer] depuis [date]" : adapté en "Membre depuis
//   [date de création du compte]" (Supabase Auth, réel) — cette page
//   n'est pas imbriquée dans un foyer précis (route de niveau compte,
//   pas /households/:id/*), donc "membre de quel foyer" n'est pas
//   bien défini ici sans ambiguïté (un compte peut appartenir à 0, 1
//   ou plusieurs foyers).
// - Photo de profil : bouton caméra fonctionnel en APERÇU LOCAL
//   uniquement (URL.createObjectURL, comme l'icône de foyer dans
//   HouseholdSwitcher.jsx) — rien n'est envoyé à Supabase. Contrairement
//   à l'icône de foyer, `users.avatar_url` existe déjà en base (migration
//   02) — mais aucun bucket Storage/policy/service d'upload n'existe
//   encore pour l'écrire réellement, à faire dans un chantier dédié.
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AmbientGlow from '../../components/ui/AmbientGlow';
import {
  ArrowLeftIcon,
  ShareIcon,
  CameraIcon,
  FlameIcon,
  GemIcon,
  CheckCircleIcon,
  AwardIcon,
  ChartPieIcon,
} from '../../components/ui/Icons';
import './account-pages.css';
import './ProfilePage.css';

const BADGE_SLOTS = [
  { key: 'clean', label: 'Fée du logis' },
  { key: 'regular', label: 'Régulier' },
  { key: 'shopper', label: 'Chef éco' },
  { key: 'view3d', label: 'Maître 3D' },
];

function getInitials(email) {
  if (!email) return '?';
  const local = email.split('@')[0];
  const parts = local.split(/[.\-_]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function formatMemberSince(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date);
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const initials = getInitials(user?.email);
  const memberSince = formatMemberSince(user?.created_at);

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  }

  return (
    <div className="account-page profile-page">
      <AmbientGlow />
      <header className="account-page__header">
        <div className="account-page__header-left">
          <button type="button" className="account-page__back-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeftIcon size={16} />
          </button>
          <div>
            <p className="profile-page__eyebrow">Mon Profil</p>
            <h1 className="account-page__title">{user?.email ?? 'Mon compte'}</h1>
          </div>
        </div>

        <div className="profile-page__header-actions">
          <button type="button" className="profile-page__icon-btn" title="Bientôt disponible" disabled>
            <ShareIcon size={15} />
          </button>
        </div>
      </header>

      <main className="account-page__content">
        <section className="profile-page__avatar-section">
          <div className="profile-page__avatar-frame">
            <div className="profile-page__avatar-inner">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="profile-page__avatar-img" />
              ) : (
                <span className="profile-page__avatar-initials">{initials}</span>
              )}
            </div>
            <button
              type="button"
              className="profile-page__avatar-camera-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Changer la photo de profil (aperçu local, pas encore enregistré)"
              title="Changer la photo (aperçu local uniquement)"
            >
              <CameraIcon size={12} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profile-page__avatar-input"
            onChange={handleAvatarChange}
          />

          <div className="profile-page__member-info">
            <span className="profile-page__membership-badge">Membre</span>
            {memberSince && <p className="profile-page__member-since">Membre depuis {memberSince}</p>}
          </div>
        </section>

        <section className="profile-page__stats">
          <div className="profile-page__stat">
            <FlameIcon size={15} className="profile-page__stat-icon profile-page__stat-icon--amber" />
            <p className="profile-page__stat-value">0</p>
            <p className="profile-page__stat-label">Série (jours)</p>
          </div>
          <div className="profile-page__stat">
            <GemIcon size={15} className="profile-page__stat-icon profile-page__stat-icon--sky" />
            <p className="profile-page__stat-value">0</p>
            <p className="profile-page__stat-label">Points</p>
          </div>
          <div className="profile-page__stat">
            <CheckCircleIcon size={15} className="profile-page__stat-icon profile-page__stat-icon--emerald" />
            <p className="profile-page__stat-value">0</p>
            <p className="profile-page__stat-label">Tâches faites</p>
          </div>
        </section>
        <p className="profile-page__stats-note">
          Pas encore de données réelles — la gamification (série, points) arrivera avec le suivi des tâches.
        </p>

        <section className="profile-page__panel">
          <div className="profile-page__panel-header">
            <h2 className="profile-page__panel-title">
              <AwardIcon size={14} />
              Badges & Trophées
            </h2>
            <span className="profile-page__panel-count">0 / {BADGE_SLOTS.length} débloqués</span>
          </div>
          <div className="profile-page__badges-grid">
            {BADGE_SLOTS.map((badge) => (
              <div key={badge.key} className="profile-page__badge profile-page__badge--locked">
                <div className="profile-page__badge-icon">
                  <LockIconInline />
                </div>
                <p className="profile-page__badge-label">{badge.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-page__panel">
          <h2 className="profile-page__panel-title">
            <ChartPieIcon size={14} />
            Spécialités au foyer
          </h2>
          <p className="profile-page__empty-note">
            Accomplis des tâches pour voir apparaître ta répartition par catégorie ici.
          </p>
        </section>
      </main>
    </div>
  );
}

// Petit cadenas inline pour les emplacements de badges verrouillés —
// pas besoin d'exporter une icône dédiée pour un seul usage local.
function LockIconInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
