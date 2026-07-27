// src/data/roomTypes.js
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

/** Retrouve un type par sa valeur ; retombe sur DEFAULT_ROOM_TYPE si inconnu/absent. */
export function findRoomType(value) {
  return ROOM_TYPES.find((t) => t.value === value) || ROOM_TYPES.find((t) => t.value === DEFAULT_ROOM_TYPE);
}
