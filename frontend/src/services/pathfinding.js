// src/services/pathfinding.js
// Utilitaire de recherche de chemin, séparé du composant de vue pour ne
// pas l'alourdir (voir FloorView2D.jsx pour l'intégration). Aucune
// dépendance sur React ici — pur JS, testable indépendamment.
//
// BFS (parcours en largeur), pas A* : tous les déplacements ont le même
// coût (pas de terrain pondéré), donc BFS trouve déjà le plus court
// chemin en nombre de cases, avec un code plus simple à vérifier qu'un
// A* (pas de fonction heuristique à valider). Déplacement à 4 directions
// (haut/bas/gauche/droite), pas de diagonale.

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function key(x, y) {
  return `${x},${y}`;
}

function isWalkableType(type) {
  return type === "floor" || type === "door";
}

/**
 * Calcule le plus court chemin entre deux cases, en évitant les
 * obstacles (murs, meubles). Retourne un tableau ORDONNÉ de coordonnées
 * `[{x,y}, ...]`, la case de départ INCLUSE en première position, ou
 * `null` si aucun chemin n'existe (destination non praticable, ou
 * complètement isolée de la position de départ).
 *
 * Si départ === arrivée, retourne `[start]` (chemin d'une seule case :
 * rien à parcourir).
 */
export function findPath(tiles, start, end) {
  const walkable = new Set(tiles.filter((t) => isWalkableType(t.type)).map((t) => key(t.x, t.y)));

  const startKey = key(start.x, start.y);
  const endKey = key(end.x, end.y);

  if (!walkable.has(endKey)) return null;
  if (startKey === endKey) return [{ x: start.x, y: start.y }];

  const queue = [start];
  const visited = new Set([startKey]);
  const cameFrom = new Map();

  let found = false;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const currentKey = key(current.x, current.y);
    if (currentKey === endKey) {
      found = true;
      break;
    }
    for (const { dx, dy } of DIRECTIONS) {
      const next = { x: current.x + dx, y: current.y + dy };
      const nextKey = key(next.x, next.y);
      if (walkable.has(nextKey) && !visited.has(nextKey)) {
        visited.add(nextKey);
        cameFrom.set(nextKey, current);
        queue.push(next);
      }
    }
  }

  if (!visited.has(endKey)) return null;

  // Reconstruit le chemin en remontant cameFrom depuis l'arrivée.
  const path = [];
  let currentKey = endKey;
  let current = end;
  while (currentKey !== startKey) {
    path.unshift(current);
    current = cameFrom.get(currentKey);
    currentKey = key(current.x, current.y);
  }
  path.unshift({ x: start.x, y: start.y });
  return path;
}

/**
 * Trouve, parmi toutes les cases marchables adjacentes à un meuble
 * (potentiellement plusieurs cases, ex. un canapé de 2 cases), celle
 * dont le chemin depuis `from` est le plus court. Retourne
 * `{ target: {x,y}, path: [...] }`, ou `null` si aucune case adjacente
 * n'est praticable ou accessible.
 */
export function findNearestWalkableAdjacent(tiles, furnitureTiles, from) {
  const walkable = new Set(tiles.filter((t) => isWalkableType(t.type)).map((t) => key(t.x, t.y)));

  const candidateKeys = new Set();
  const candidates = [];
  for (const ft of furnitureTiles) {
    for (const { dx, dy } of DIRECTIONS) {
      const adj = { x: ft.x + dx, y: ft.y + dy };
      const adjKey = key(adj.x, adj.y);
      if (walkable.has(adjKey) && !candidateKeys.has(adjKey)) {
        candidateKeys.add(adjKey);
        candidates.push(adj);
      }
    }
  }

  let best = null;
  for (const candidate of candidates) {
    const path = findPath(tiles, from, candidate);
    if (path && (!best || path.length < best.path.length)) {
      best = { target: candidate, path };
    }
  }
  return best;
}
