// src/features/household/mockData.js
// Données de test pour le MVP de vue spatiale — pas connecté au vrai
// backend (pas d'appel API ici).
//
// REFONTE : grille UNIFIÉE par étage, plus des grilles séparées par
// pièce recollées ensemble. Chaque étage a UN tableau complet de dalles
// (MOCK_FLOOR_TILES), où chaque dalle porte des coordonnées globales
// (x, y) et un `roomId` (ou null si mur/hors appartement). Les pièces
// (MOCK_ROOMS) ne portent plus de géométrie — juste leur identité
// (nom, couleur, à quel étage elles appartiennent, comment les
// représenter dans la vue d'ensemble).
//
// Chaque plan a été dessiné puis vérifié par simulation (aucun trou dans
// le contour, chaque porte relie bien les deux bonnes pièces des deux
// côtés) avant l'écriture de ce fichier — voir la conversation pour le
// détail des vérifications.
import { generateFloorTiles } from "../layout-editor/utils/layoutGeneration.js";

export const MOCK_USER = {
  id: "user-01",
  name: "Paul",
};

/* -------------------------------- Étages ----------------------------------- */

export const MOCK_FLOORS = [
  {
    id: "floor-rdc",
    name: "Rez-de-chaussée",
    shortLabel: "RDC",
    level: 0,
    gridWidth: 13,
    gridHeight: 8,
    avatarStart: { x: 2, y: 3 }, // case "floor" du Salon, vérifiée praticable
  },
  {
    id: "floor-1",
    name: "1er étage",
    shortLabel: "Étage 1",
    level: 1,
    gridWidth: 9,
    gridHeight: 8,
    avatarStart: { x: 2, y: 3 }, // case "floor" de la Chambre, vérifiée praticable
  },
];

// Source de vérité ÉDITABLE de la géométrie : de simples rectangles par
// pièce. C'est CE tableau que le mode édition (LayoutEditor.jsx) lira et
// modifiera — les dalles (murs/portes/sol) sont toujours DÉRIVÉES à
// partir de lui via generateFloorTiles (features/layout-editor/utils/layoutGeneration.js),
// jamais éditées directement. Rectangles choisis pour reproduire
// fidèlement l'ancien plan dessiné à la main (vérifié : mêmes positions
// de porte obtenues).
export const MOCK_ROOM_LAYOUTS = {
  "floor-rdc": [
    { id: "room-salon", x: 1, y: 1, width: 4, height: 6 },
    { id: "room-couloir", x: 6, y: 1, width: 2, height: 6 },
    { id: "room-cuisine", x: 9, y: 1, width: 3, height: 6 },
  ],
  "floor-1": [
    { id: "room-chambre", x: 1, y: 1, width: 4, height: 6 },
    { id: "room-sdb", x: 6, y: 1, width: 2, height: 6 },
  ],
};

// Un seul tableau de dalles par étage, DÉRIVÉ de MOCK_ROOM_LAYOUTS —
// jamais dessiné à la main. Régénérer après une modification du plan via
// `generateFloorTiles(MOCK_ROOM_LAYOUTS[floorId]).tiles`
// (features/layout-editor/utils/layoutGeneration.js).
export const MOCK_FLOOR_TILES = {
  "floor-rdc": generateFloorTiles(MOCK_ROOM_LAYOUTS["floor-rdc"]).tiles,
  "floor-1": generateFloorTiles(MOCK_ROOM_LAYOUTS["floor-1"]).tiles,
};

/* --------------------------------- Pièces ----------------------------------- */
// Ne portent plus de géométrie (voir MOCK_FLOOR_TILES) — juste l'identité
// de chaque pièce. `color` teinte ses dalles au sol dans FloorView2D,
// pour distinguer visuellement une pièce de sa voisine.

export const MOCK_ROOMS = [
  {
    id: "room-salon",
    name: "Salon",
    floorId: "floor-rdc",
    type: "salon",
    icon: "🛋️",
    color: "#f3e6d0",
  },
  {
    id: "room-couloir",
    name: "Couloir",
    floorId: "floor-rdc",
    type: "entree",
    icon: "🚪",
    color: "#e7e5df",
  },
  {
    id: "room-cuisine",
    name: "Cuisine",
    floorId: "floor-rdc",
    type: "cuisine",
    icon: "🍳",
    color: "#fdecc8",
  },
  {
    id: "room-chambre",
    name: "Chambre",
    floorId: "floor-1",
    type: "chambre",
    icon: "🛏️",
    color: "#e8def8",
  },
  {
    id: "room-sdb",
    name: "Salle de bain",
    floorId: "floor-1",
    type: "sdb",
    icon: "🚿",
    color: "#dceefa",
  },
];

/* --------------------------------- Tâches ----------------------------------- */
// Retiré pour l'instant (voir la conversation) : le foyer se concentre
// sur l'éditeur de plan (déplacement de pièces, aimantage, portes) avant
// de remettre tâches et mobilier par-dessus une base spatiale solide.
// Rien n'est perdu — la structure exacte (roomIds tableau, recurrenceDays,
// tâches multi-pièces) reste documentée plus haut dans le README pour
// quand ce chantier reprendra.
