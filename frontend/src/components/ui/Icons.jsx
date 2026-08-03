// src/components/ui/Icons.jsx
// Pictogrammes SOLIDES (remplis, sans contour), teintables via
// `currentColor` — voir la conversation (02/08/2026) : changement de
// direction visuelle explicite et délibéré demandé par Paul, remplace
// le style "traits fins" utilisé jusqu'ici pour les ~50 icônes du
// fichier. Reproduit l'ESPRIT du style "solid" de FontAwesome vu dans
// les prototypes (formes pleines, arrondies, bien lisibles à petite
// taille) — PAS un traçage pixel-perfect des tracés FontAwesome
// eux-mêmes (bibliothèque commerciale, on ne recopie pas leurs
// coordonnées de bézier exactes), plutôt des formes pleines originales
// dans le même esprit visuel.
//
// Les détails internes (anneau d'une loupe, rabat d'enveloppe, trou
// d'un cadenas...) utilisent `fillRule="evenodd"` pour créer des
// "trous" transparents plutôt qu'un contour de couleur différente —
// ces trous laissent voir ce qu'il y a derrière l'icône (typiquement
// le fond teinté du badge qui la contient), technique standard des
// jeux d'icônes "solid" (FontAwesome solid l'utilise lui-même, ex.
// check-circle, envelope, cookie-bite).
//
// `size`/`className` optionnels, INCHANGÉS par rapport à la version
// précédente — mêmes noms de fonctions, mêmes props, aucun fichier
// appelant ne casse.
const base = { fill: 'currentColor' };

export function HouseIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M11.35 2.85a1 1 0 0 1 1.3 0l8.5 7.3a1 1 0 0 1-.65 1.75H19V20a1 1 0 0 1-1 1h-3.5a1 1 0 0 1-1-1v-4.5h-3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.1H3.5a1 1 0 0 1-.65-1.75Z" />
    </svg>
  );
}

export function HouseUserIcon({ size = 24, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M11.35 2.85a1 1 0 0 1 1.3 0l8.5 7.3a1 1 0 0 1-.65 1.75H19V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.1H3.5a1 1 0 0 1-.65-1.75ZM12 12.2a2.15 2.15 0 1 0 0 4.3 2.15 2.15 0 0 0 0-4.3Zm0 5.3c-1.9 0-3.4 1-3.7 2.5a.9.9 0 0 0 .88 1.1h5.64a.9.9 0 0 0 .88-1.1c-.3-1.5-1.8-2.5-3.7-2.5Z" />
    </svg>
  );
}

export function UserIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="7.5" r="4" />
      <path d="M4 20.2c0-4.3 3.6-6.9 8-6.9s8 2.6 8 6.9a.9.9 0 0 1-.9.9H4.9a.9.9 0 0 1-.9-.9Z" />
    </svg>
  );
}

export function EnvelopeIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M3 6.8A1.8 1.8 0 0 1 4.8 5h14.4A1.8 1.8 0 0 1 21 6.8v10.4A1.8 1.8 0 0 1 19.2 19H4.8A1.8 1.8 0 0 1 3 17.2Zm2.4.4 6.1 4.9a.9.9 0 0 0 1 0l6.1-4.9Z" />
    </svg>
  );
}

export function LockIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M7.5 10V7.6a4.5 4.5 0 0 1 9 0V10h.3A1.7 1.7 0 0 1 18.5 11.7v8A1.7 1.7 0 0 1 16.8 21.4H7.2A1.7 1.7 0 0 1 5.5 19.7v-8A1.7 1.7 0 0 1 7.2 10ZM9.3 10h5.4V7.6a2.7 2.7 0 0 0-5.4 0Z" />
      <circle cx="12" cy="15.5" r="1.5" fill="var(--bg-card, #0f172a)" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M12 2.5 4.5 5.4v6.2c0 5 3.2 8.9 7.5 10.9 4.3-2 7.5-5.9 7.5-10.9V5.4Zm-1.1 13.1L7.4 12.1l1.3-1.3 2.2 2.2 4.9-5 1.3 1.3Z" />
    </svg>
  );
}

export function EyeIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M12 5.5c5.2 0 9 4.4 10.4 6.2a1.1 1.1 0 0 1 0 1.3C21 15 17.2 19.4 12 19.4S3 15 1.6 13a1.1 1.1 0 0 1 0-1.3C3 9.9 6.8 5.5 12 5.5Zm0 3.7a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z" />
    </svg>
  );
}

export function EyeOffIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M3.5 4.6 19.9 21l1.2-1.2-3.4-3.4c1.8-1.4 3.2-3.1 4.1-4.2a1.1 1.1 0 0 0 0-1.3C20.4 8.9 16.6 4.5 11.4 4.5c-1.5 0-2.9.4-4.1 1L4.7 3.4ZM12 8.4c.5 0 1 .1 1.4.2l-4.2 4.2A3.1 3.1 0 0 1 12 8.4Zm-8.4.9C2.2 10.7 1 12 1 12s3.8 5.9 9 5.9c1 0 1.9-.2 2.8-.5l-1.7-1.7a3.1 3.1 0 0 1-3.7-3.7L4.9 8.5Z" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 11h13.6l-4.3-4.3a1 1 0 0 1 1.4-1.4l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4-1.4l4.3-4.3H3Z" />
    </svg>
  );
}

export function PlusIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M11 3.5a1 1 0 0 1 2 0V11h7.5a1 1 0 0 1 0 2H13v7.5a1 1 0 0 1-2 0V13H3.5a1 1 0 0 1 0-2H11Z" />
    </svg>
  );
}

export function LinkIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M9.5 3.5a4.5 4.5 0 0 0 0 9h2a1.3 1.3 0 0 0 0-2.6h-2a1.9 1.9 0 0 1 0-3.8h2a1.3 1.3 0 0 0 0-2.6ZM14.5 20.5a4.5 4.5 0 0 0 0-9h-2a1.3 1.3 0 0 0 0 2.6h2a1.9 1.9 0 0 1 0 3.8h-2a1.3 1.3 0 0 0 0 2.6Z" />
      <path d="M8.5 12h7v2.4h-7Z" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M8 4.5a1.1 1.1 0 0 1 1.8-.9l7.5 6.9a2 2 0 0 1 0 3l-7.5 6.9A1.1 1.1 0 0 1 8 19.6Z" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4.5 8a1.1 1.1 0 0 1 1.8-.9l5.7 5.1 5.7-5.1A1.1 1.1 0 1 1 19.2 9l-6.4 5.8a2 2 0 0 1-2.6 0L3.8 9A1.1 1.1 0 0 1 4.5 8Z" />
    </svg>
  );
}

export function CloudUploadIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 19.5a5 5 0 0 1-.7-9.95A6 6 0 0 1 18 8.2 4.5 4.5 0 0 1 17.5 19.5H13v-5.4l1.4 1.4a1 1 0 0 0 1.4-1.4l-3.1-3.1a1 1 0 0 0-1.4 0l-3.1 3.1a1 1 0 0 0 1.4 1.4l1.4-1.4v5.4Z" />
    </svg>
  );
}

export function LogoutIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M5.5 3.5A1.5 1.5 0 0 0 4 5v14a1.5 1.5 0 0 0 1.5 1.5H11a1 1 0 0 0 0-2H6V5.5h5a1 1 0 0 0 0-2Z" />
      <path d="M15.3 7.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4-1.4l2.3-2.3H9a1 1 0 0 1 0-2h8.6l-2.3-2.3a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

export function ScanIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M3 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H5v3a1 1 0 0 1-2 0Zm14-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0V5h-3a1 1 0 1 1 0-2ZM4 17a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Zm16 0a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 1 1 0-2h3v-3a1 1 0 0 1 1-1Z" />
      <rect x="7.3" y="7.3" width="9.4" height="9.4" rx="1.4" />
    </svg>
  );
}

export function FloorPlanIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M3.5 3.5h17v17h-17Zm7.6 1.8v6.9H5.3V5.3ZM5.3 13.9h6.5v4.8H5.3Zm8.3-8.6v4.4h5V5.3Zm0 6.2v6.9h5V11.5Z" />
    </svg>
  );
}

export function ChecklistIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3.6 5.6a1 1 0 0 1 1.4 0l.9.9 2-2a1 1 0 1 1 1.4 1.4l-2.7 2.7a1 1 0 0 1-1.4 0L3.6 7A1 1 0 0 1 3.6 5.6Z" />
      <rect x="10.8" y="5.6" width="9.6" height="2" rx="1" />
      <path d="M3.6 11.9a1 1 0 0 1 1.4 0l.9.9 2-2a1 1 0 1 1 1.4 1.4l-2.7 2.7a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4Z" />
      <rect x="10.8" y="11.9" width="9.6" height="2" rx="1" />
      <path d="M3.6 18.2a1 1 0 0 1 1.4 0l.9.9 2-2a1 1 0 0 1 1.4 1.4l-2.7 2.7a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4Z" />
      <rect x="10.8" y="18.2" width="9.6" height="2" rx="1" />
    </svg>
  );
}

export function CalendarIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M6.5 2.5a1 1 0 0 1 1 1V5h9V3.5a1 1 0 0 1 2 0V5H20a1.8 1.8 0 0 1 1.8 1.8V19.7A1.8 1.8 0 0 1 20 21.5H4a1.8 1.8 0 0 1-1.8-1.8V6.8A1.8 1.8 0 0 1 4 5h1.5V3.5a1 1 0 0 1 1-1ZM4.2 10.2v9.3h15.6v-9.3Z" />
    </svg>
  );
}

export function UsersIcon({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.4 2.7-5.9 6-5.9s6 2.5 6 5.9a.9.9 0 0 1-.9.9H3.9a.9.9 0 0 1-.9-.9Z" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.6 13.6c2.8.4 4.9 2.6 5 5.7a.8.8 0 0 1-.8.9h-3.4a7 7 0 0 0-2.3-5.8c.5-.5 1-.7 1.5-.8Z" />
    </svg>
  );
}

export function BellIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.5a1 1 0 0 1 1 1v.7a6.5 6.5 0 0 1 5.5 6.4v3.2l1.6 2.7a1 1 0 0 1-.9 1.5H4.8a1 1 0 0 1-.9-1.5l1.6-2.7V10.6a6.5 6.5 0 0 1 5.5-6.4v-.7a1 1 0 0 1 1-1Z" />
      <path d="M9.5 19.8h5a2.5 2.5 0 0 1-5 0Z" />
    </svg>
  );
}

export function FlameIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.2c1.3 3-1.1 4.6-1.1 7.2 0 1.7 1.2 2.8 2.4 2.8 1.6 0 2.2-1.3 2.2-1.3 1.7 1.7 2.6 3.9 2.6 6A5.9 5.9 0 0 1 6.5 18C6.5 11.6 12 9.2 12 2.2Z" />
    </svg>
  );
}

export function GemIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M6.3 3.5h11.4l3.6 5.8L12 21.5 2.7 9.3ZM8.8 5.3 6 9h5.1Zm2.4 0-.9 3.7h3.4l-.9-3.7Zm2.6 0 1 3.7H20l-2.8-4.5Zm-9 5.5 4.6 6.9-3.6-6.9Zm2.3 0 4.1 7.8 4.1-7.8Zm7.8 0-3.6 6.9 4.6-6.9Z" />
    </svg>
  );
}

export function SettingsIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="m20.3 13-.2-1 1.6-1.9-1.4-2.4-2.4.3-.8-.6-.9-2.3H13l-.9 2.3-.8.6-2.4-.3-1.4 2.4L9.1 12l-.2 1-2.2 1.4.6 2.6 2.4.3.7.7-.3 2.4 2.6.6 1.4-2.2h1l1.4 2.2 2.6-.6-.3-2.4.7-.7 2.4-.3.6-2.6ZM12 15.3A3.3 3.3 0 1 1 12 8.7a3.3 3.3 0 0 1 0 6.6Z" />
    </svg>
  );
}

export function CartIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2.5 3.5a1 1 0 0 0 0 2h1.4l2 9.9A2.3 2.3 0 0 0 8.1 17.2h8.6a1 1 0 0 0 0-2H8.1l-.3-1.5h9.4a2.3 2.3 0 0 0 2.2-1.7l1.2-4.6a1 1 0 0 0-1-1.3H5.9l-.3-1.6a1 1 0 0 0-1-.8Z" />
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="16.5" cy="20" r="1.6" />
    </svg>
  );
}

export function PointerIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9.3 3.3a1.7 1.7 0 0 1 3.3.5v5.7l.7-.1a1.6 1.6 0 0 1 3 .8l.6-.1a1.6 1.6 0 0 1 3.2.6l.2 1.6a5.6 5.6 0 0 1-4.9 6.2l-1.9.2c-2 .2-4-.5-5.3-2.1l-2.4-2.8a1.6 1.6 0 0 1 2.3-2.1l1.5 1.3V4.9c0-.8.5-1.4 1.2-1.6Z" />
    </svg>
  );
}

export function CameraIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M9.1 4h5.8l1 1.9h2.6A1.8 1.8 0 0 1 20.3 7.7v9.6a1.8 1.8 0 0 1-1.8 1.8H5.5a1.8 1.8 0 0 1-1.8-1.8V7.7a1.8 1.8 0 0 1 1.8-1.8h2.6Zm2.9 4.6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}

export function WalletIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h9A2.5 2.5 0 0 1 18 6.5V7h.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9A2.5 2.5 0 0 1 4 6.5Zm12.5 6.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" />
    </svg>
  );
}

export function GridIcon({ size = 15, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.8" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.8" />
    </svg>
  );
}

export function XIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6.4 4.9a1.2 1.2 0 0 0-1.7 1.7L10.3 12l-5.6 5.4a1.2 1.2 0 1 0 1.7 1.7L12 13.7l5.6 5.4a1.2 1.2 0 0 0 1.7-1.7L13.7 12l5.6-5.4a1.2 1.2 0 0 0-1.7-1.7L12 10.3Z" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M16 4.5a1.1 1.1 0 0 1 1.8.9v13.2a1.1 1.1 0 0 1-1.8.9l-7.5-6.9a2 2 0 0 1 0-3Z" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M21 11H7.4l4.3-4.3a1 1 0 1 0-1.4-1.4l-6 6a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4-1.4L7.4 13H21Z" />
    </svg>
  );
}

export function SearchIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M11 3.5a7.5 7.5 0 0 1 5.9 12.1l4.3 4.2a1.1 1.1 0 0 1-1.5 1.5l-4.2-4.2A7.5 7.5 0 1 1 11 3.5Zm0 2.6a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Z" />
    </svg>
  );
}

export function ShareIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M8.7 10.4 15.9 6a.9.9 0 0 1 1.3 1l-.3 1.3 1.4-.3a.9.9 0 0 1 .7 1.6l-4.6 3.7.4 1.5a.9.9 0 0 1-1.4 1l-4-2.9-3.8 2.2a.9.9 0 0 1-1.2-1.3Z" />
      <circle cx="18" cy="5.5" r="2.3" />
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="18.5" r="2.3" />
    </svg>
  );
}

export function SpeakerIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M11.3 4.4a1 1 0 0 1 1.6.8v13.6a1 1 0 0 1-1.6.8L6.6 15.8H4a1.3 1.3 0 0 1-1.3-1.3V9.5A1.3 1.3 0 0 1 4 8.2h2.6Z" />
      <path d="M15.8 8.6a1 1 0 0 1 1.4-.2A6 6 0 0 1 19.7 13a6 6 0 0 1-2.5 4.6 1 1 0 0 1-1.2-1.6A4 4 0 0 0 17.7 13a4 4 0 0 0-1.7-3 1 1 0 0 1-.2-1.4Z" />
    </svg>
  );
}

export function PhoneIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M8 2.5h8A2.5 2.5 0 0 1 18.5 5v14A2.5 2.5 0 0 1 16 21.5H8A2.5 2.5 0 0 1 5.5 19V5A2.5 2.5 0 0 1 8 2.5Zm-.5 4v11h9v-11Z" />
      <circle cx="12" cy="18.5" r="1.1" fill="var(--bg-card, #0f172a)" />
    </svg>
  );
}

export function ShapesIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="8" cy="8" r="4.5" />
      <rect x="12.5" y="12.5" width="8" height="8" rx="1.8" />
    </svg>
  );
}

export function MoonIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M20 14.8A8.5 8.5 0 1 1 9.2 4a6.8 6.8 0 0 0 10.8 10.8Z" />
    </svg>
  );
}

export function StarIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="m12 2.8 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 16.9l-5.6 3.2 1.2-6.3L3 9.4l6.3-.8Z" />
    </svg>
  );
}

export function LightbulbIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M12 2.5a6.8 6.8 0 0 1 3.9 12.4c-.6.4-.9 1-.9 1.6v.3H9v-.3c0-.6-.3-1.2-.9-1.6A6.8 6.8 0 0 1 12 2.5Z" />
      <rect x="9.3" y="18.3" width="5.4" height="1.8" rx="0.9" />
      <rect x="10" y="21" width="4" height="1.5" rx="0.75" />
    </svg>
  );
}

export function WandIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4.5" y="14.5" width="14" height="3.2" rx="1.5" transform="rotate(-45 4.5 14.5)" />
      <path d="m14 3.5 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <path d="m19 9 .6 1.4L21 11l-1.4.6L19 13l-.6-1.4L17 11l1.4-.6Z" />
    </svg>
  );
}

export function BatteryIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M2.5 8.5A1.8 1.8 0 0 1 4.3 6.7h11.4a1.8 1.8 0 0 1 1.8 1.8v7A1.8 1.8 0 0 1 15.7 17.3H4.3A1.8 1.8 0 0 1 2.5 15.5Z" />
      <rect x="18.3" y="10" width="2.2" height="4" rx="1" />
      <rect x="4.5" y="8.7" width="6" height="6.6" rx="0.8" fill="var(--bg-card, #0f172a)" />
    </svg>
  );
}

export function CookieIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3c-.2 1.8 1.2 3.4 3 3.4.3 1.6 1.7 2.8 3.3 2.7A8.5 8.5 0 0 1 21 12.8Z" />
      <circle cx="9" cy="13" r="1.1" fill="var(--bg-card, #0f172a)" />
      <circle cx="13.2" cy="16.4" r="1.1" fill="var(--bg-card, #0f172a)" />
      <circle cx="14.6" cy="11.6" r="1.1" fill="var(--bg-card, #0f172a)" />
    </svg>
  );
}

export function CreditCardIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M2.5 6.5A2 2 0 0 1 4.5 4.5h15a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2Zm0 3v2h19v-2Z" />
      <rect x="5" y="14" width="5" height="1.8" rx="0.9" fill="var(--bg-card, #0f172a)" />
    </svg>
  );
}

export function HelpCircleIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm.1 4.4a2.9 2.9 0 0 0-2.9 2.5 1 1 0 0 0 2 .3.9.9 0 0 1 .9-.8.9.9 0 0 1 .3 1.8c-.9.4-1.4 1.2-1.4 2.2v.3a1 1 0 0 0 2 0v-.1c0-.3.1-.4.4-.6a2.9 2.9 0 0 0-1.3-5.6Z" fillRule="nonzero" />
      <circle cx="12.1" cy="17" r="1.2" />
    </svg>
  );
}

export function AwardIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="m8 13-1.6 7.7a.6.6 0 0 0 .9.6L12 19l4.7 2.3a.6.6 0 0 0 .9-.6L16 13a6.9 6.9 0 0 1-8 0Z" />
    </svg>
  );
}

export function ChartPieIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M12.9 3v8.1H21A8.1 8.1 0 0 1 12.9 3Z" />
      <path d="M20.8 14.5A8.6 8.6 0 1 1 9.5 3.2v9.3a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function BroomIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="12.3" y="2.5" width="2.2" height="12" rx="1.1" transform="rotate(20 12.3 2.5)" />
      <path d="M9.8 13.2 20 16.9a1 1 0 0 1 .1 1.9l-8.6 3.4a2.6 2.6 0 0 1-3.4-1.5l-1.5-3.9a2.6 2.6 0 0 1 1.2-3.2Z" />
    </svg>
  );
}

export function WrenchIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M14.7 3.5a5.5 5.5 0 0 0-7 6.9L3.4 14.7a2.6 2.6 0 0 0 0 3.7l2.2 2.2a2.6 2.6 0 0 0 3.7 0l4.3-4.3a5.5 5.5 0 0 0 6.9-7 1 1 0 0 0-1.6-.4l-2.5 2.5-2-2 2.5-2.5a1 1 0 0 0-.2-1.7Z" />
    </svg>
  );
}

export function PartyIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4.3 20.5 8 9.2a1 1 0 0 1 1.6-.4l6.6 5.6a1 1 0 0 1-.3 1.7Z" />
      <circle cx="14" cy="4.5" r="1.1" />
      <circle cx="19.5" cy="7" r="1" />
      <circle cx="20.3" cy="11.5" r="0.9" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm4.6 6.6-5.4 6a1 1 0 0 1-1.5.1l-2.9-2.7a1 1 0 0 1 1.4-1.5l2.1 2 4.7-5.2a1 1 0 0 1 1.6 1.3Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// 13 icônes ajoutées le 03/08/2026 pour PlanEditorView.jsx (refonte de
// l'éditeur de plan, prototype ui_plan_editor_v0.3.0.html) — même
// convention que le reste du fichier (formes pleines originales, esprit
// "solid" sans recopier les tracés FontAwesome). Non vérifiées
// visuellement dans un navigateur réel (pas d'accès réseau dans cet
// environnement) — à confirmer chez Paul, même limite que le reste du
// fichier lors de sa réécriture le 02/08/2026.
// ---------------------------------------------------------------------

/** Coche pleine, sans cercle — bouton "Sauver" du header d'éditeur. */
export function CheckIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M20.6 6.6a1 1 0 0 1 0 1.4l-9.2 9.2a1 1 0 0 1-1.4 0L4.9 12a1 1 0 1 1 1.4-1.4l4.3 4.3 8.5-8.5a1 1 0 0 1 1.5.2Z" />
    </svg>
  );
}

/** Deux cartes empilées — sélecteur d'étage. */
export function LayerGroupIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3" y="3" width="14" height="14" rx="3" opacity="0.45" />
      <rect x="7" y="7" width="14" height="14" rx="3" />
    </svg>
  );
}

/** Flèche circulaire — Annuler (Undo). Retournée en CSS (scaleX(-1),
 * même technique que ArrowRightIcon pour RoomDetailView) pour Rétablir
 * (Redo) — pas besoin d'une seconde icône dédiée. */
export function RotateLeftIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M17.66 17.66A8 8 0 1 0 17.66 6.34L15.54 8.46A5 5 0 1 1 15.54 15.54Z" />
      <path d="M14 3.5 20.5 6.8 15.3 10.2Z" />
    </svg>
  );
}

/** Trois points verticaux — menu options (export/import/réinitialiser). */
export function EllipsisVerticalIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

/** Flèche sortante au-dessus d'un plateau — Exporter (.json). */
export function FileExportIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M11 5a1 1 0 0 1 2 0v8.6a1 1 0 1 1-2 0V5Z" />
      <path d="M7.3 8.7a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1-1.4 1.4L12 5.4 8.7 8.7a1 1 0 0 1-1.4 0Z" />
      <path d="M4 16a1 1 0 0 1 1 1v2h14v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

/** Flèche entrante vers un plateau — Importer un plan. */
export function FileImportIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M11 4.4a1 1 0 1 1 2 0V13a1 1 0 1 1-2 0V4.4Z" />
      <path d="M7.3 11.3a1 1 0 0 1 1.4 0L12 14.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      <path d="M4 16a1 1 0 0 1 1 1v2h14v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

/** Stylo diagonal — "Modifier" (pilule contextuelle de la pièce sélectionnée). */
export function PenIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15.7 3.3a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L9.5 19.5l-5.3 1.3a.8.8 0 0 1-1-1l1.3-5.3Z" />
    </svg>
  );
}

/** Poubelle — "Supprimer" (pièce ou étage). */
export function TrashIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M9 2.5h6a1 1 0 0 1 1 1V4h4a1 1 0 1 1 0 2h-1.1l-1 14a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9l-1-14H4a1 1 0 1 1 0-2h4v-.5a1 1 0 0 1 1-1Zm-.2 6.5a1 1 0 0 1 1 .9l.5 8a1 1 0 1 1-2 .1l-.5-8a1 1 0 0 1 1-1Zm6.4 0a1 1 0 0 1 1 1l-.5 8a1 1 0 1 1-2-.1l.5-8a1 1 0 0 1 1-.9Z" />
    </svg>
  );
}

/** Porte entrouverte — option "Ajouter une porte" du sous-menu Séparation. */
export function DoorOpenIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M3 20a1 1 0 1 1 0-2h1V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14h1a1 1 0 1 1 0 2Zm5-9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
      <path d="M14 20V6.4a1 1 0 0 1 1.4-.9l5 2.3a1 1 0 0 1 .6.9V18a1 1 0 0 1-1 1h-1v1a1 1 0 1 1-2 0v-1Z" />
    </svg>
  );
}

/** Fenêtre à croisillons — option "Ajouter une fenêtre" du sous-menu Séparation. */
export function WindowIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 2v6.5h6V5Zm8 0v6.5h6V5ZM5 13.5V19h6v-5.5Zm8 0V19h6v-5.5Z" />
    </svg>
  );
}

/** Gomme inclinée — option "Retirer un mur / Passage libre". */
export function EraserIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M14.8 3.3a2 2 0 0 1 2.8 0l3.1 3.1a2 2 0 0 1 0 2.8L12 18.5H7l-3.3-3.3a2 2 0 0 1 0-2.8Z" />
      <path d="M4 20h9a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2Z" />
    </svg>
  );
}

/** 4 flèches en croix — outil "Ajuster" (mode édition global, remplace
 * le cadenas par pièce). */
export function AdjustIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.3a1 1 0 0 1 .7.3l3 3a1 1 0 1 1-1.4 1.4L13 5.7V10h4.3l-1.3-1.3a1 1 0 1 1 1.4-1.4l3 3a1 1 0 0 1 0 1.4l-3 3a1 1 0 1 1-1.4-1.4l1.3-1.3H13v4.3l1.3-1.3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4l1.3 1.3V13H6.7l1.3 1.3a1 1 0 1 1-1.4 1.4l-3-3a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4L6.7 10H11V5.7L9.7 7a1 1 0 0 1-1.4-1.4l3-3a1 1 0 0 1 .7-.3Z" />
    </svg>
  );
}

/** Mur en briques — bouton "Séparation" du dock. */
export function WallIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base} fillRule="evenodd">
      <path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 2v4h7V5Zm9 0v4h7V5ZM4 11v4h4.5v-4Zm6.5 0v4h7v-4ZM4 17v3h7v-3Zm9 0v3h7v-3Z" />
    </svg>
  );
}
