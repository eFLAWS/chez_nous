// src/features/layout-editor/utils/layoutGeneration.js
// Utilitaire de génération de plan, séparé du composant d'édition pour
// ne pas l'alourdir — pur JS, testable indépendamment.
//
// REFONTE MUR-ARÊTE (voir la conversation) : remplace l'ancien modèle où
// les murs étaient des DALLES entières (1 case pleine) générées autour
// de l'empreinte des pièces. Deux problèmes que ça posait : (a) chaque
// mur consommait 1 case entière de grille, (b) deux pièces tracées
// directement collées (gap=0) n'avaient NI mur NI porte entre elles —
// aucune case n'était disponible pour ça, donc elles fusionnaient
// visuellement dans FloorView3D/Plan2DView.
//
// Nouveau modèle : une pièce est un simple RECTANGLE {id, x, y, width,
// height} — TOUTES ses cases sont du sol, sans exception. Les murs ne
// sont plus des cases mais des ARÊTES (segments sur la bordure des
// cases), calculées par `computeRoomEdges()` :
//   - bordure entre une pièce et le vide -> "wall-ext"
//   - bordure entre deux pièces DIFFÉRENTES qui se touchent (gap=0)
//     -> "wall-int" (cloison), sauf si cette arête précise est marquée
//     comme ouverture -> "opening"
//   - bordure entre deux cases de la MÊME pièce -> aucune arête (invisible)
//
// OUVERTURE, PAS PORTE (01/08/2026, demande explicite de Paul) : "opening"
// représente un pan de MUR RETIRÉ, pas un objet de porte physique ajouté
// — le résultat visuel (WallEdges.jsx) est une absence totale de trait
// à cet endroit, pas un trait de porte stylé différemment. Le mur plein
// reste le comportement PAR DÉFAUT entre deux pièces qui se touchent :
// rien n'empêche deux pièces d'être séparées par un mur plein SANS
// aucune ouverture, ce n'est pas parce que l'outil existe que toutes les
// frontières doivent en avoir une.
//
// CONSÉQUENCE SUR LE WORKFLOW (inverse de l'ancien modèle mur-dalle) :
// une ouverture ne peut exister qu'entre deux pièces qui se touchent
// RÉELLEMENT (gap=0) — avec l'ancien modèle mur-dalle, il fallait au
// contraire un écart d'exactement 1 case. Deux pièces avec un espace
// vide entre elles (gap>=1) affichent désormais chacune leur propre mur
// extérieur face à ce vide, sans fusion ni erreur, juste deux murs
// indépendants (plus de cas spécial).
//
// AUCUNE AUTO-DÉTECTION (`findAutoDoors`, ancien modèle mur-dalle,
// retiré) : avec des cloisons pleine longueur plutôt qu'une case unique
// dans un écart de 1, une ouverture "au milieu" n'a plus de sens par
// défaut — toutes les frontières entre pièces sont des murs pleins tant
// que l'utilisateur n'en retire pas explicitement un pan via l'outil
// (`findOpenableWallSegments`, qui énumère tous les segments d'arête
// "wall-int" disponibles, pas juste un point par paire de pièces).
//
// VÉRIFIÉ (voir la conversation) : `computeRoomEdges` testé isolément
// (Node, hors du projet) sur 4 cas — deux pièces collées, deux pièces
// espacées d'1 case, une pièce isolée (comptage du périmètre), et la
// géométrie Salon/Couloir/Cuisine en L (pas de duplication d'arête,
// clé canonique cohérente des deux côtés). Les 11 assertions passent.
// Test des composants React (LayoutEditor/Plan2DView) PAS fait ici (pas
// d'accès réseau pour npm/Vite dans cet environnement) — à vérifier
// réellement chez toi avant de considérer ce chantier terminé.
//
// EXTENSION PORTE/FENÊTRE/PASSAGE (03/08/2026, demande explicite de
// Paul, prototype ui_plan_editor_v0.3.0.html — refonte de l'éditeur) :
// le binaire mur/ouverture ci-dessus devient un choix à 3 (`type` sur
// chaque entrée de `openingEdges`) qui change RÉELLEMENT le rendu, pas
// juste l'étiquette :
//   - `door`    : mur retiré (comme l'ancien "opening"), + marqueur visuel.
//   - `window`  : mur CONSERVÉ (une fenêtre ne supprime pas le mur qui la
//     porte) + marqueur visuel distinct — nouveau, n'existait pas avant.
//   - `passage` (ou `type` absent, plans enregistrés avant ce champ) :
//     mur retiré, aucun marqueur — comportement identique à l'ancien
//     "opening" binaire, préservé tel quel pour la compatibilité.
// Voir `computeRoomEdges`/`findOpenableWallSegments` plus bas pour le
// détail, et `WallEdges.jsx` pour le rendu correspondant.

import { DEFAULT_ROOM_TYPE, findRoomType } from "../roomTypes.js";

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

/** Clé canonique d'une arête — voir l'en-tête du fichier pour la convention. */
export function edgeKey(orientation, x, y) {
  return `${orientation}:${x},${y}`;
}

/**
 * Calcule TOUTES les arêtes (murs + ouvertures) d'un ensemble de pièces.
 * Pour chaque case occupée par une pièce, on regarde ses 4 voisins :
 *   - voisin absent (vide) -> arête "wall-ext"
 *   - voisin = pièce DIFFÉRENTE -> arête "wall-int", sauf si sa clé
 *     canonique figure dans `openingEdges` -> son `type` ("door"|
 *     "window"|"passage", voir plus bas)
 *   - voisin = MÊME pièce -> aucune arête (intérieur, invisible)
 *
 * Clé canonique garantissant qu'une frontière physique n'est calculée
 * qu'UNE SEULE FOIS, qu'on la découvre depuis la pièce A ou la pièce B
 * (`edges.has(k)` court-circuite le second passage) — vérifié par test
 * (voir en-tête du fichier) sur une géométrie en L à 3 pièces.
 *
 * `openingEdges` : `[{orientation: 'h'|'v', x, y, type?}, ...]` — les
 * arêtes marquées comme séparation plutôt que mur plein. `type` :
 * (03/08/2026, demande explicite de Paul, prototype
 * ui_plan_editor_v0.3.0.html — le porte/fenêtre/passage doit VRAIMENT
 * changer le rendu, pas juste l'étiquette) :
 *   - `'door'`    : mur RETIRÉ (passage possible), marqueur visuel
 *     (voir WallEdges.jsx).
 *   - `'window'`  : mur CONSERVÉ (pas de passage, fenêtre dans un mur
 *     qui reste un mur) + marqueur visuel distinct.
 *   - `'passage'` (ou absent, compatibilité avec les plans enregistrés
 *     avant ce champ) : mur retiré, AUCUN marqueur — comportement
 *     identique à l'ancien "opening" binaire (01/08/2026), inchangé.
 *
 * Retourne `[{key, orientation, x, y, kind, roomIdA, roomIdB}, ...]`,
 * `kind` ∈ `'wall-ext'|'wall-int'|'door'|'window'|'passage'`.
 * `roomIdB` est `null` pour un mur extérieur. `roomIdA`/`roomIdB` ne
 * sont PAS ordonnés de façon significative (juste "les deux pièces
 * adjacentes à cette arête, ou null côté vide") — ne pas s'appuyer sur
 * lequel est A vs B.
 */
export function computeRoomEdges(rooms, openingEdges = []) {
  const floorCellMap = new Map();
  for (const r of rooms) {
    for (let dx = 0; dx < r.width; dx++) {
      for (let dy = 0; dy < r.height; dy++) {
        floorCellMap.set(key(r.x + dx, r.y + dy), r.id);
      }
    }
  }

  const openingTypeByKey = new Map(
    openingEdges.map((d) => [edgeKey(d.orientation, d.x, d.y), d.type || "passage"])
  );
  const edges = new Map();

  const addEdge = (orientation, ex, ey, roomIdSelf, roomIdNeighbor) => {
    const k = edgeKey(orientation, ex, ey);
    if (edges.has(k)) return; // déjà calculée depuis l'autre côté (clé canonique)
    const openingType = openingTypeByKey.get(k);
    const kind = openingType || (roomIdNeighbor ? "wall-int" : "wall-ext");
    edges.set(k, { key: k, orientation, x: ex, y: ey, kind, roomIdA: roomIdSelf, roomIdB: roomIdNeighbor ?? null });
  };

  for (const [cellKey, roomId] of floorCellMap) {
    const [cx, cy] = cellKey.split(",").map(Number);
    const north = floorCellMap.get(key(cx, cy - 1));
    if (north !== roomId) addEdge("h", cx, cy, roomId, north);
    const south = floorCellMap.get(key(cx, cy + 1));
    if (south !== roomId) addEdge("h", cx, cy + 1, roomId, south);
    const west = floorCellMap.get(key(cx - 1, cy));
    if (west !== roomId) addEdge("v", cx, cy, roomId, west);
    const east = floorCellMap.get(key(cx + 1, cy));
    if (east !== roomId) addEdge("v", cx + 1, cy, roomId, east);
  }

  return Array.from(edges.values());
}

/**
 * Énumère les arêtes entre deux pièces qui se touchent réellement
 * (gap=0) — plain "wall-int" OU déjà porte/fenêtre/passage — ce sont
 * les seuls emplacements qu'une séparation peut occuper. Utilisé par
 * l'outil "Séparation" (PlanEditorView.jsx) pour afficher tous les
 * segments disponibles le long d'une cloison, qu'ils portent déjà une
 * séparation ou non (pour pouvoir la changer/retirer), pas juste les
 * murs pleins pas encore percés (comportement avant le 03/08/2026,
 * voir la conversation).
 *
 * Contrairement à l'ancien modèle mur-dalle (écart de 1 case requis),
 * une pièce qui n'est PAS directement adjacente à une autre (gap >= 1)
 * n'offre aucun candidat — il n'existe alors aucune cloison entre
 * elles, donc rien à percer.
 */
export function findOpenableWallSegments(rooms, openingEdges = []) {
  return computeRoomEdges(rooms, openingEdges).filter((e) => e.roomIdB !== null);
}

/**
 * Construit la grille de dalles de SOL (uniquement — plus de dalles de
 * mur/ouverture, voir en-tête du fichier) à partir d'une liste de
 * rectangles de pièces `{id, x, y, width, height}`, plus la liste des
 * arêtes (murs/ouvertures) calculée séparément par `computeRoomEdges`.
 *
 * `openingEdges` (optionnel, `[{orientation, x, y}, ...]`) : arêtes à
 * traiter comme des ouvertures (pan de mur retiré). Omis ou vide =
 * toutes les frontières entre pièces sont des murs pleins (pas
 * d'auto-détection, voir en-tête) — un mur plein SANS ouverture reste
 * le comportement par défaut, pas une exception à justifier.
 *
 * `furnitureList` (optionnel) est réappliqué APRÈS génération, uniquement
 * pour les cases qui tombent sur une case "floor" de la BONNE pièce
 * (`expectedRoomId`) — sinon abandonné plutôt que de corrompre le
 * tableau (ex. si une pièce a rétréci et qu'un meuble se retrouve hors
 * de ses murs). Comportement inchangé par rapport à l'ancien modèle.
 *
 * Retourne `{ tiles, edges, gridWidth, gridHeight }` ; grille vide si
 * `rooms` est vide (aucun logement — voir l'écran d'accueil).
 */
export function generateFloorTiles(rooms, { furnitureList = [], openingEdges = [] } = {}) {
  if (!rooms || rooms.length === 0) {
    return { tiles: [], edges: [], gridWidth: 0, gridHeight: 0 };
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

  const tiles = [];
  for (const cell of floorCells.values()) {
    tiles.push({ x: cell.x, y: cell.y, type: "floor", roomId: cell.roomId });
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

  const edges = computeRoomEdges(rooms, openingEdges);

  const gridWidth = Math.max(...tiles.map((t) => t.x)) + 1;
  const gridHeight = Math.max(...tiles.map((t) => t.y)) + 1;

  return { tiles, edges, gridWidth, gridHeight };
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
