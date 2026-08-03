// src/features/layout-editor/roomTypes.js
// Types de pièce prédéfinis pour le Mode Édition — détermine la couleur
// pastel de fond, l'icône, et le nom par défaut suggéré quand un type
// est choisi dans l'Inspecteur de Pièce (RoomInspector.jsx, dans
// LayoutEditor.jsx). Teintes volontairement très légères ("pastel très
// léger", comme demandé) pour rester lisibles avec le nom/la surface
// affichés par-dessus.
export const ROOM_TYPES = [
  { value: "salon", label: "Salon / Séjour", icon: "🛋️", color: "#f3e6d0" },
  { value: "cuisine", label: "Cuisine", icon: "🍳", color: "#fdecc8" },
  { value: "chambre", label: "Chambre", icon: "🛏️", color: "#e8def8" },
  { value: "sdb", label: "Salle de Bain", icon: "🚿", color: "#dceefa" },
  { value: "toilettes", label: "Toilettes", icon: "🚽", color: "#d7f0ed" },
  { value: "entree", label: "Entrée / Couloir", icon: "🚪", color: "#e7e5df" },
  { value: "bureau", label: "Bureau", icon: "🖥️", color: "#dde6ea" },
  { value: "balcon", label: "Balcon / Terrasse", icon: "🪴", color: "#dcefd9" },
  { value: "autre", label: "Autre / Cellier", icon: "📦", color: "#e9e7e2" },
];

export const DEFAULT_ROOM_TYPE = "autre";

// Palette de couleurs pour la grille de sélection (02/08/2026, demande
// explicite de Paul) — INDÉPENDANTE des couleurs de type ci-dessus.
// Choisir un type suggère une couleur par défaut (celle du type), mais
// l'utilisateur peut ensuite la remplacer par n'importe laquelle de
// cette palette, aussi bien à la création (RoomCreateModal.jsx) qu'après
// coup (RoomInspector.jsx) — les deux se mettent à jour indépendamment
// du type depuis ce changement (voir la conversation : avant, la
// couleur était TOUJOURS dérivée du type, jamais une valeur
// indépendante ; ce n'est plus le cas). Teintes plus vives que la
// palette pastel des types ci-dessus — Paul voulait "la couleur qu'on
// veut", pas seulement une déclinaison pastel.
export const ROOM_COLORS = [
  "#ef4444", // rouge
  "#f59e0b", // ambre
  "#facc15", // jaune
  "#84cc16", // citron vert
  "#10b981", // émeraude
  "#14b8a6", // teal
  "#0ea5e9", // bleu ciel
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // rose
  "#f43f5e", // rose foncé
  "#78350f", // marron
  "#64748b", // gris ardoise
  "#1e293b", // gris très foncé
];

/** Retrouve un type par sa valeur ; retombe sur DEFAULT_ROOM_TYPE si inconnu/absent. */
export function findRoomType(value) {
  return ROOM_TYPES.find((t) => t.value === value) || ROOM_TYPES.find((t) => t.value === DEFAULT_ROOM_TYPE);
}
