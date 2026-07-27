// src/services/layoutStorage.js
// Persistance du plan (localStorage) + validation pour l'export/import
// JSON — pur JS, aucune dépendance React ni DOM directe (sauf
// `localStorage` lui-même, une API navigateur standard, PAS une
// restriction d'artifact : ceci est un vrai projet Vite qui tourne dans
// le navigateur de l'utilisateur, pas un artifact généré dans la
// conversation).
//
// Ce qui est stocké/exporté : `floors`, `rooms` (avec leur géométrie
// complète x/y/width/height + type/icon/color/name), et `doors` (par
// étage). PAS `floorTiles` — ce tableau est entièrement DÉRIVÉ des
// autres via generateFloorTiles ; le régénérer au chargement évite tout
// risque d'incohérence entre des dalles sauvegardées et des pièces qui
// auraient changé, et réduit la taille du JSON stocké/exporté.
const STORAGE_KEY = "chez_nous_layout";
const SCHEMA_VERSION = 1;

/**
 * Construit l'objet de plan complet à partir de l'état applicatif —
 * même forme utilisée pour le localStorage ET l'export JSON, pour
 * n'avoir qu'un seul format à maintenir.
 */
export function buildLayoutPayload({ floors, rooms, doors }) {
  return {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    floors,
    rooms,
    doors,
  };
}

/**
 * Validation minimale mais réelle avant d'accepter un fichier importé
 * (ou une donnée lue depuis localStorage) : présence des clés
 * essentielles (`rooms`, `doors`, `floors`) avec le bon type de base.
 * Ne vérifie pas la cohérence géométrique fine (chevauchements, etc.) —
 * juste de quoi éviter un plantage sur un fichier manifestement invalide.
 */
export function isValidLayoutData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (!Array.isArray(data.rooms)) return false;
  if (!data.doors || typeof data.doors !== "object" || Array.isArray(data.doors)) return false;
  if (!Array.isArray(data.floors)) return false;
  return true;
}

/** Sauvegarde silencieuse — n'importe quelle erreur (quota dépassé,
 * navigateur en mode privé qui bloque localStorage...) est absorbée
 * plutôt que de faire planter l'appli pour une fonctionnalité annexe. */
export function saveLayoutToStorage(payload) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Retourne les données stockées si présentes ET valides, sinon `null`
 * (absence de donnée, JSON corrompu, ou structure invalide — les trois
 * cas traités de la même façon : retomber sur les données de départ). */
export function loadLayoutFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidLayoutData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLayoutStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Déclenche le téléchargement du plan sous forme de fichier JSON.
 * Technique standard navigateur : Blob + URL objet temporaire + clic
 * programmatique sur un lien invisible, puis nettoyage.
 */
export function downloadLayoutAsJson(payload, filename = "chez-nous-plan.json") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Lit et valide un fichier JSON importé. Retourne
 * `{ success: true, data }` ou `{ success: false, error }` — jamais
 * d'exception qui remonterait jusqu'au composant appelant.
 */
export async function readLayoutFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    return { success: false, error: "Impossible de lire le fichier." };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { success: false, error: "Fichier JSON invalide." };
  }

  if (!isValidLayoutData(parsed)) {
    return { success: false, error: "Fichier JSON invalide." };
  }

  return { success: true, data: parsed };
}
