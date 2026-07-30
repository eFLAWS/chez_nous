// src/features/layout-editor/utils/layoutGeneration.js
// Utilitaire de génération de plan, séparé du composant d'édition pour
// ne pas l'alourdir — pur JS, testable indépendamment.
//
// Modèle : une pièce est un simple RECTANGLE {id, name, color, x, y,
// width, height}. generateFloorTiles() dérive automatiquement la grille
// complète de dalles (sol + murs + portes) à partir de ces rectangles —
// les murs et les portes ne sont JAMAIS dessinés à la main, ils émergent
// du calcul :
//   - une case dans le rectangle d'une pièce -> "floor"
//   - une case hors de toute pièce mais adjacente à une case "floor"
//     -> "wall", SAUF...
//   - ...si elle se trouve exactement entre deux pièces DIFFÉRENTES
//     séparées par 1 case d'écart (avec au moins 2 cases de
//     chevauchement sur l'axe perpendiculaire) -> "door", au milieu du
//     chevauchement
//   - une case ni dans une pièce ni adjacente à une case "floor" -> pas
//     générée du tout (case absente du tableau, pas de type "void" —
//     un tableau clairsemé suffit, FloorView2D n'affiche que ce qui existe)
//
// Choix confirmé explicitement avant l'écriture de cet algorithme : deux
// pièces tracées directement collées (aucune case d'écart) restent deux
// pièces DISTINCTES mais sans mur ni porte entre elles — aucune case
// n'est disponible pour en placer un.
//
// Vérifié par simulation AVANT d'être écrit ici, avec notre géométrie
// réelle comme cas de test : appliqué à l'ancien plan RDC dessiné à la
// main (Salon-Couloir-Cuisine), l'algorithme retrouve EXACTEMENT les
// mêmes positions de porte que l'original — (5,3) et (8,3) — sans
// qu'elles aient été codées en dur quelque part.

import { DEFAULT_ROOM_TYPE, findRoomType } from "../roomTypes.js";

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

// Échelle de la grille : longueur d'un côté de dalle, en mètres. Modifier
// CETTE seule constante pour ajuster l'échelle partout (la surface d'une
// pièce est TOUJOURS recalculée à partir d'elle, jamais stockée comme une
// valeur figée indépendante). 1 par défaut, comme demandé (1 dalle = 1 m²).
export const TILE_SIZE_METERS = 1;
const TILE_AREA_M2 = TILE_SIZE_METERS * TILE_SIZE_METERS;

/**
 * Calcule le nombre de dalles et la surface (m²) d'une pièce rectangulaire
 * `{width, height}`. Une pièce est toujours un rectangle plein dans notre
 * modèle (voir generateFloorTiles), donc `tilesCount = width * height`
 * suffit — pas besoin de compter les dalles générées une par une.
 */
export function computeRoomSurface(room) {
  const tilesCount = room.width * room.height;
  const surfaceM2 = Math.round(tilesCount * TILE_AREA_M2 * 10) / 10; // arrondi à 1 décimale
  return { tilesCount, surfaceM2 };
}

function key(x, y) {
  return `${x},${y}`;
}

// Cherche, pour chaque paire de pièces différentes, un écart d'exactement
// 1 case le long d'un axe avec un chevauchement suffisant sur l'autre axe
// — retourne une Map "x,y" -> true pour chaque position de porte trouvée.
function findAutoDoors(rooms) {
  const doors = new Map();

  const tryPair = (a, b, axis) => {
    if (axis === "x") {
      const gap = b.x - (a.x + a.width);
      if (gap !== 1) return;
      const start = Math.max(a.y, b.y);
      const end = Math.min(a.y + a.height, b.y + b.height) - 1;
      if (end - start + 1 >= 2) {
        const midY = Math.floor((start + end) / 2);
        doors.set(key(a.x + a.width, midY), true);
      }
    } else {
      const gap = b.y - (a.y + a.height);
      if (gap !== 1) return;
      const start = Math.max(a.x, b.x);
      const end = Math.min(a.x + a.width, b.x + b.width) - 1;
      if (end - start + 1 >= 2) {
        const midX = Math.floor((start + end) / 2);
        doors.set(key(midX, a.y + a.height), true);
      }
    }
  };

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      tryPair(a, b, "x");
      tryPair(b, a, "x");
      tryPair(a, b, "y");
      tryPair(b, a, "y");
    }
  }
  return doors;
}

/**
 * Énumère TOUTES les positions de porte possibles (pas juste celle du
 * milieu choisie par l'auto-détection) le long de chaque frontière
 * partagée par deux pièces différentes séparées par 1 case d'écart —
 * pour l'outil de placement manuel de porte (LayoutEditor.jsx). Retourne
 * `[{x, y, roomIdA, roomIdB}, ...]`.
 */
export function findDoorCandidates(rooms) {
  const candidates = [];

  const tryPair = (a, b, axis) => {
    if (axis === "x") {
      const gap = b.x - (a.x + a.width);
      if (gap !== 1) return;
      const start = Math.max(a.y, b.y);
      const end = Math.min(a.y + a.height, b.y + b.height) - 1;
      for (let y = start; y <= end; y++) {
        candidates.push({ x: a.x + a.width, y, roomIdA: a.id, roomIdB: b.id });
      }
    } else {
      const gap = b.y - (a.y + a.height);
      if (gap !== 1) return;
      const start = Math.max(a.x, b.x);
      const end = Math.min(a.x + a.width, b.x + b.width) - 1;
      for (let x = start; x <= end; x++) {
        candidates.push({ x, y: a.y + a.height, roomIdA: a.id, roomIdB: b.id });
      }
    }
  };

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      tryPair(rooms[i], rooms[j], "x");
      tryPair(rooms[j], rooms[i], "x");
      tryPair(rooms[i], rooms[j], "y");
      tryPair(rooms[j], rooms[i], "y");
    }
  }
  return candidates;
}

/**
 * Construit la grille complète de dalles (murs + portes) à partir d'une
 * liste de rectangles de pièces `{id, x, y, width, height}`.
 *
 * `explicitDoors` (optionnel, `[{x, y}, ...]`) : si fourni, remplace
 * ENTIÈREMENT l'auto-détection — seules ces positions deviennent des
 * portes (permet à l'outil de placement manuel de LayoutEditor.jsx de
 * garder le contrôle total, y compris pour retirer une porte
 * auto-détectée). Si omis (undefined), retombe sur l'auto-détection par
 * écart de 1 case — comportement inchangé pour du code qui n'a pas
 * encore connaissance des portes explicites.
 *
 * `furnitureList` (optionnel) est réappliqué APRÈS génération, uniquement
 * pour les cases qui tombent sur une case "floor" de la BONNE pièce
 * (`expectedRoomId`) — sinon abandonné plutôt que de corrompre le
 * tableau (ex. si une pièce a rétréci et qu'un meuble se retrouve hors
 * de ses murs).
 *
 * Retourne `{ tiles, gridWidth, gridHeight }` ; grille vide si `rooms`
 * est vide (aucun logement — voir l'écran d'accueil).
 */
export function generateFloorTiles(rooms, { furnitureList = [], explicitDoors } = {}) {
  if (!rooms || rooms.length === 0) {
    return { tiles: [], gridWidth: 0, gridHeight: 0 };
  }

  const floorCells = new Map();
  for (const r of rooms) {
    for (let dx = 0; dx < r.width; dx++) {
      for (let dy = 0; dy < r.height; dy++) {
        const x = r.x + dx;
        const y = r.y + dy;
        floorCells.set(key(x, y), { x, y, roomId: r.id });
      }
    }
  }

  const wallCells = new Map();
  for (const cell of floorCells.values()) {
    for (const { dx, dy } of DIRECTIONS) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const nKey = key(nx, ny);
      if (!floorCells.has(nKey) && !wallCells.has(nKey)) {
        wallCells.set(nKey, { x: nx, y: ny });
      }
    }
  }

  const doorKeys = explicitDoors !== undefined ? new Map(explicitDoors.map((d) => [key(d.x, d.y), true])) : findAutoDoors(rooms);

  const tiles = [];
  for (const cell of floorCells.values()) {
    tiles.push({ x: cell.x, y: cell.y, type: "floor", roomId: cell.roomId });
  }
  for (const cell of wallCells.values()) {
    const cellKey = key(cell.x, cell.y);
    if (doorKeys.has(cellKey)) {
      tiles.push({ x: cell.x, y: cell.y, type: "door", roomId: null, label: "Porte" });
    } else {
      tiles.push({ x: cell.x, y: cell.y, type: "wall", roomId: null });
    }
  }

  for (const f of furnitureList) {
    const floorCell = floorCells.get(key(f.x, f.y));
    // N'applique le meuble que si sa case est toujours une case "floor"
    // de la MÊME pièce qu'avant — sinon abandonné (voir le commentaire
    // de la fonction).
    if (floorCell && floorCell.roomId === f.expectedRoomId) {
      const tile = tiles.find((t) => t.x === f.x && t.y === f.y);
      if (tile) {
        tile.type = "furniture";
        tile.label = f.label;
        tile.furnitureId = f.furnitureId;
      }
    }
  }

  const gridWidth = Math.max(...tiles.map((t) => t.x)) + 1;
  const gridHeight = Math.max(...tiles.map((t) => t.y)) + 1;

  return { tiles, gridWidth, gridHeight };
}

/**
 * Opération inverse : à partir d'une grille de dalles existante (issue
 * d'un plan déjà généré), retrouve pour chaque pièce le rectangle
 * englobant ses cases "floor". Permet de recharger un étage existant
 * dans l'éditeur pour le modifier.
 *
 * Limite assumée : si une pièce n'est PAS un simple rectangle (ex. une
 * forme en L), seul son rectangle englobant est retrouvé, pas sa forme
 * exacte — sans conséquence pour nos pièces actuelles (toutes déjà de
 * simples rectangles), mais à savoir pour des formes plus complexes à
 * l'avenir.
 */
export function extractRoomRectsFromTiles(tiles, rooms) {
  return rooms
    .map((room) => {
      const cells = tiles.filter((t) => t.type === "floor" && t.roomId === room.id);
      if (cells.length === 0) return null;
      const minX = Math.min(...cells.map((c) => c.x));
      const minY = Math.min(...cells.map((c) => c.y));
      const maxX = Math.max(...cells.map((c) => c.x)) + 1;
      const maxY = Math.max(...cells.map((c) => c.y)) + 1;
      return {
        id: room.id,
        name: room.name,
        color: room.color,
        type: room.type ?? DEFAULT_ROOM_TYPE,
        icon: room.icon ?? findRoomType(room.type).icon,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    })
    .filter(Boolean);
}
