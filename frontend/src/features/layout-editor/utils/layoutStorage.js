// src/features/layout-editor/utils/layoutStorage.js
// Export/import de fichier JSON pour le plan — pur JS, aucune
// dépendance React.
//
// ÉTAPE 4/4 (voir la conversation) : les fonctions de persistance
// localStorage (`buildLayoutPayload`, `saveLayoutToStorage`,
// `loadLayoutFromStorage`, `clearLayoutStorage`) ont été RETIRÉES —
// la persistance réelle du plan passe maintenant par le backend (voir
// features/household/utils/householdLayoutApi.js). Ce fichier ne gère
// plus QUE l'export/import de fichier JSON (téléchargement, lecture +
// validation d'un fichier importé) — un usage ponctuel, distinct de la
// persistance courante.
//
// Validation : `validateLayout` (Zod, validateLayout.js) — un fichier
// importé doit toujours être validé avant d'être utilisé pour
// reconstruire le plan côté backend (voir handleImportLayout,
// ApartmentSpatialMvp.jsx).
import { validateLayout } from "./validateLayout";

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
 * d'exception qui remonterait jusqu'au composant appelant, ni d'altération
 * de l'état local si le fichier est invalide (l'appelant reçoit
 * simplement `success: false`, sans que rien n'ait été touché).
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
    return { success: false, error: "Fichier JSON invalide (JSON mal formé)." };
  }

  const result = validateLayout(parsed);
  if (!result.success) {
    // Message détaillé (quel champ, quel problème) plutôt qu'un
    // "invalide" générique — voir validateLayout.js.
    return { success: false, error: `Fichier JSON invalide : ${result.errors.join(" ; ")}` };
  }

  return { success: true, data: result.data };
}
