// src/services/roomCollision.js
// Utilitaire d'aimantage et de résolution de collision pour le
// déplacement de pièces dans LayoutEditor.jsx — pur JS, sans dépendance
// React, testable indépendamment (voir la conversation : vérifié par
// simulation avec plusieurs scénarios avant l'intégration).
//
// Deux fonctions séparées, appelées à des moments différents du geste de
// déplacement :
//   - applyMagneticSnap : pendant le glissé, à chaque déplacement du
//     pointeur — ajuste la position pour "coller" contre une pièce
//     voisine proche (< SNAP_DISTANCE cases), sans jamais forcer un
//     chevauchement.
//   - resolveOverlap : au relâchement, si la position choisie chevauche
//     une ou plusieurs pièces — pousse la pièce déplacée le long du bord
//     de la pièce chevauchée, en choisissant à chaque fois le
//     déplacement le plus court (haut/bas/gauche/droite), jusqu'à ce
//     qu'il n'y ait plus aucun chevauchement (quelques itérations,
//     suffisant pour nos scénarios à quelques pièces — pas un solveur de
//     contraintes général).

const SNAP_DISTANCE = 2; // cases : distance en dessous de laquelle l'aimantage s'active
const MAX_RESOLVE_ITERATIONS = 6;

export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Ajuste `draggedRect` pour qu'il "colle" contre la pièce la plus proche
 * parmi `otherRects`, si l'une d'elles est à moins de `snapDistance`
 * cases sur un axe, avec un chevauchement suffisant sur l'axe
 * perpendiculaire (pour ne pas s'aimanter à un coin lointain). Retourne
 * un nouveau rectangle (jamais modifié en place) — inchangé si aucune
 * pièce n'est assez proche.
 */
export function applyMagneticSnap(draggedRect, otherRects, snapDistance = SNAP_DISTANCE) {
  let best = { ...draggedRect };
  let bestDistance = snapDistance + 1;

  for (const other of otherRects) {
    const overlapY = Math.min(draggedRect.y + draggedRect.height, other.y + other.height) - Math.max(draggedRect.y, other.y);
    if (overlapY > 0) {
      const gapRight = draggedRect.x - (other.x + other.width); // dragged à droite de other
      if (gapRight >= 0 && gapRight <= snapDistance && gapRight < bestDistance) {
        best = { ...draggedRect, x: other.x + other.width };
        bestDistance = gapRight;
      }
      const gapLeft = other.x - (draggedRect.x + draggedRect.width); // dragged à gauche de other
      if (gapLeft >= 0 && gapLeft <= snapDistance && gapLeft < bestDistance) {
        best = { ...draggedRect, x: other.x - draggedRect.width };
        bestDistance = gapLeft;
      }
    }

    const overlapX = Math.min(draggedRect.x + draggedRect.width, other.x + other.width) - Math.max(draggedRect.x, other.x);
    if (overlapX > 0) {
      const gapBelow = draggedRect.y - (other.y + other.height); // dragged en dessous de other
      if (gapBelow >= 0 && gapBelow <= snapDistance && gapBelow < bestDistance) {
        best = { ...draggedRect, y: other.y + other.height };
        bestDistance = gapBelow;
      }
      const gapAbove = other.y - (draggedRect.y + draggedRect.height); // dragged au dessus de other
      if (gapAbove >= 0 && gapAbove <= snapDistance && gapAbove < bestDistance) {
        best = { ...draggedRect, y: other.y - draggedRect.height };
        bestDistance = gapAbove;
      }
    }
  }

  return best;
}

/**
 * Pousse `draggedRect` pour éliminer tout chevauchement avec les pièces
 * de `otherRects`, en choisissant à chaque étape le déplacement le plus
 * court. Retourne un nouveau rectangle, jamais chevauchant après
 * résolution (dans la limite de MAX_RESOLVE_ITERATIONS — suffisant pour
 * quelques pièces, pas garanti pour un agencement très dense).
 */
export function resolveOverlap(draggedRect, otherRects) {
  let resolved = { ...draggedRect };

  for (let iteration = 0; iteration < MAX_RESOLVE_ITERATIONS; iteration++) {
    const overlapping = otherRects.filter((other) => rectsOverlap(resolved, other));
    if (overlapping.length === 0) break;

    // Le push necessaire dans chaque direction pour degager TOUTES les
    // pieces actuellement chevauchees a la fois (le maximum parmi
    // elles) — pas seulement la premiere trouvee. Sans ça, pousser hors
    // d'une pièce peut recréer un chevauchement avec une autre, et
    // l'algorithme oscillerait entre les deux sans jamais converger
    // (repéré en testant avant l'intégration — voir la conversation).
    let maxPushRight = 0;
    let maxPushLeft = 0;
    let maxPushDown = 0;
    let maxPushUp = 0;
    for (const other of overlapping) {
      maxPushRight = Math.max(maxPushRight, other.x + other.width - resolved.x);
      maxPushLeft = Math.max(maxPushLeft, resolved.x + resolved.width - other.x);
      maxPushDown = Math.max(maxPushDown, other.y + other.height - resolved.y);
      maxPushUp = Math.max(maxPushUp, resolved.y + resolved.height - other.y);
    }

    const options = [
      { dx: maxPushRight, dy: 0 },
      { dx: -maxPushLeft, dy: 0 },
      { dx: 0, dy: maxPushDown },
      { dx: 0, dy: -maxPushUp },
    ];
    const best = options.reduce((a, b) => (Math.abs(a.dx) + Math.abs(a.dy) <= Math.abs(b.dx) + Math.abs(b.dy) ? a : b));

    resolved = { ...resolved, x: resolved.x + best.dx, y: resolved.y + best.dy };
  }

  return resolved;
}
