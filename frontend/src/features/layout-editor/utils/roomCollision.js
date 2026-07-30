// src/features/layout-editor/utils/roomCollision.js
// Détection de chevauchement + résolution au relâchement — pur JS, sans
// dépendance React.
//
// HISTORIQUE (voir la conversation) : l'aimantage complet (attraction
// ET anti-chevauchement) avait été entièrement retiré à une demande
// explicite précédente. Réintroduit maintenant, mais UNIQUEMENT la
// partie anti-chevauchement au relâchement (`resolveOverlap`) — pas
// l'attraction pendant le glissé (`applyMagneticSnap`, volontairement
// PAS réintroduite : la pièce suit toujours le pointeur exactement,
// cale-cadrillage pur, jusqu'au relâchement).
//
// `resolveOverlap` reprend la version déjà vérifiée et corrigée dans une
// étape précédente : un premier essai (un chevauchement traité à la
// fois) avait un bug d'oscillation (repousser hors d'une pièce pouvait
// en recréer un avec une autre juste à côté, sans jamais converger) —
// corrigé en traitant TOUS les chevauchements actuels simultanément à
// chaque étape. Revérifié ici avant réintégration (voir la conversation).
export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

const MAX_RESOLVE_ITERATIONS = 6;

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

    // Le push nécessaire dans chaque direction pour dégager TOUTES les
    // pièces actuellement chevauchées à la fois (le maximum parmi
    // elles) — pas seulement la première trouvée. Sans ça, pousser hors
    // d'une pièce peut recréer un chevauchement avec une autre, et
    // l'algorithme oscillerait entre les deux sans jamais converger.
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
