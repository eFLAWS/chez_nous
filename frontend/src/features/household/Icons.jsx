// src/components/ui/Icons.jsx
// Pictogrammes minimalistes (traits fins, sans remplissage), teintables
// via `currentColor` — voir la conversation : les émoji gardent leurs
// couleurs natives et ne peuvent pas être teintés pour respecter le
// thème couleur de l'app, remplacés ici par du SVG en ligne.
//
// DÉPLACÉ depuis features/auth/AuthIcons.jsx (voir la conversation) :
// utilisé maintenant aussi par HousingDashboard.jsx, pas seulement les
// écrans de connexion/inscription — sa place est dans components/ui/
// (UI générique, réutilisable par n'importe quelle feature), pas dans
// un dossier spécifique à une seule feature.
//
// Style volontairement minimal : contours simples, `stroke-width="2"`,
// pas de détails superflus — pas une reproduction fidèle des icônes
// FontAwesome des prototypes (qui ont un style "solide"), mais leur
// équivalent le plus proche en traits fins.
//
// `size`/`className` optionnels pour s'adapter à chaque emplacement.
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export function HouseIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/* Maison + occupant (badge "Mes logements") — distincte de HouseIcon
   (badge de connexion/inscription) pour respecter le prototype fourni,
   qui utilise deux icônes différentes à ces deux emplacements. */
export function HouseUserIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <circle cx="12" cy="14.2" r="1.8" />
      <path d="M9.3 19.5c0-1.8 1.2-3 2.7-3s2.7 1.2 2.7 3" />
    </svg>
  );
}

export function UserIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function EnvelopeIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 6.5 12 12l8-5.5" />
    </svg>
  );
}

export function LockIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4.5" y="11" width="15" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3.5 5 6v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
    </svg>
  );
}

export function EyeIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2 12s3.5-6.5 10-6.5c1.9 0 3.5.5 4.8 1.2M22 12s-1.2 2.2-3.4 4M9.3 9.3a2.6 2.6 0 0 0 3.6 3.6" />
      <path d="M6.5 6.5 3 3m18 18-3.5-3.5" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </svg>
  );
}

export function PlusIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export function LinkIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 13 4.5a3.5 3.5 0 0 1 5 5l-2 2" />
      <path d="M13 17.5 11 19.5a3.5 3.5 0 0 1-5-5l2-2" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* Chevron unique, pointant vers le bas — pivote via `transform: rotate`
   en CSS selon l'état déplié/replié plutôt que d'avoir deux icônes
   distinctes (haut/bas). */
export function ChevronDownIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CloudUploadIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7.1 9.1 4 4 0 0 0 7 18Z" />
      <path d="M12 11v6M9.5 13.5 12 11l2.5 2.5" />
    </svg>
  );
}

export function LogoutIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h11" />
    </svg>
  );
}

/* Cadre de visée (coins ouverts), pour "Scanner un plan" — motif
   minimaliste courant pour une action de scan/photo. */
export function ScanIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" />
    </svg>
  );
}

/* --- Ajoutés pour AppLayout (BottomNav + header) — voir la conversation
   ROUTING_AND_USER_FLOWS. Même style traits fins que le reste du fichier :
   les émoji du brouillon initial (🧩📋📅👥🔔🔥💎) ne peuvent pas être
   teintés avec les couleurs du thème, remplacés ici en SVG comme pour
   tout le reste de l'app. */

/* Onglet "Plan" — rectangle divisé en pièces, évoque un plan 2D. */
export function FloorPlanIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M12 3.5v8M3.5 13.5H12M12 8h8.5" />
    </svg>
  );
}

/* Onglet "Tâches" — trois lignes cochées, façon liste de corvées. */
export function ChecklistIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4.5 6.5 6 8l2.5-2.5" />
      <path d="M11 6.5h8.5" />
      <path d="M4.5 12.5 6 14l2.5-2.5" />
      <path d="M11 12.5h8.5" />
      <path d="M4.5 18.5 6 20l2.5-2.5" />
      <path d="M11 18.5h8.5" />
    </svg>
  );
}

/* Onglet "Calendrier" — grille + anneaux de reliure. */
export function CalendarIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

/* Onglet "Vie du foyer" — groupe de deux occupants, distinct de UserIcon
   (un seul occupant) déjà défini plus haut dans ce fichier. */
export function UsersIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M15.5 14.3c2.6.3 4.5 2.3 4.5 4.9" />
    </svg>
  );
}

/* Cloche de notifications (header AppLayout). */
export function BellIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.2 5.5 1.8 6.3H4.2C4.8 16 6 14.5 6 10.5Z" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

/* Flamme (streak de gamification, header AppLayout). */
export function FlameIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3c1 2.5-1 3.8-1 6 0 1.4 1 2.3 2 2.3 1.3 0 1.8-1.1 1.8-1.1 1.4 1.4 2.2 3.2 2.2 5A5 5 0 0 1 7 15.2C7 10 12 8 12 3Z" />
    </svg>
  );
}

/* Gemme (points de gamification, header AppLayout). */
export function GemIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 4h12l3 5-9 11L3 9Z" />
      <path d="M3 9h18M9 4l-1 5 4 11 4-11-1-5" />
    </svg>
  );
}

/* Engrenage (item "Réglages" du menu profil, header AppLayout). */
export function SettingsIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3" />
    </svg>
  );
}

/* Panier (carte "Liste de courses", Accueil). */
export function CartIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3.5 4.5h2l1.4 10.4a1.8 1.8 0 0 0 1.8 1.6h8a1.8 1.8 0 0 0 1.8-1.5l1.2-6.5H6.6" />
      <circle cx="9.5" cy="19.5" r="1.2" />
      <circle cx="16.5" cy="19.5" r="1.2" />
    </svg>
  );
}

/* Main qui pointe (indice "Toucher une pièce pour interagir", Accueil). */
export function PointerIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 12.5V5a1.5 1.5 0 0 1 3 0v6" />
      <path d="M12 10.5V4a1.5 1.5 0 0 1 3 0v7.5" />
      <path d="M15 10.8V6.3a1.5 1.5 0 0 1 3 0v8.2" />
      <path d="M18 12v-1a1.5 1.5 0 0 1 3 0v5.5c0 3-2.2 5-5.5 5-2.3 0-3.6-.6-4.8-2L7 15.6c-.6-.8-.5-1.7.3-2.2.8-.5 1.7-.3 2.3.4l1.4 1.7" />
    </svg>
  );
}

/* Appareil photo (superposition "changer l'icône du foyer", switcher). */
export function CameraIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.8l1-1.6h7.4l1 1.6h1.8A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

/* Portefeuille (onglet "Dépenses"). */
export function WalletIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2" />
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M15 13.5h4v3h-4a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

/* Grille 2x2 (item "Gérer mes logements", switcher). */
export function GridIcon({ size = 15, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.3" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.3" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.3" />
    </svg>
  );
}
