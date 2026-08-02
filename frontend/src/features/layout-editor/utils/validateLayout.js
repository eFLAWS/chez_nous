// src/features/layout-editor/utils/validateLayout.js
// Validation stricte (Zod) d'un fichier JSON de plan importé dans
// LayoutEditor.jsx. Remplace `isValidLayoutData` (l'ancienne validation
// à la main dans layoutStorage.js) — messages d'erreur bien plus
// précis (quel champ, quelle pièce, quel problème exact), et une seule
// définition du schéma au lieu d'une vérification ad hoc.
//
// DIVERGENCE ASSUMÉE par rapport à la demande : le schéma décrit
// (`apartment.name`, `bounds`) ne correspond pas à notre modèle de
// données réel, déjà en place et utilisé partout (`floors`, `rooms` en
// `{x, y, width, height}` — pas `bounds`). Comme pour l'échange précédent
// sur ce même sujet (schéma JSON de LayoutEditor), j'ai gardé notre
// structure existante plutôt que d'en introduire une seconde,
// incompatible avec `generateFloorTiles`/`extractRoomRectsFromTiles`/etc.
// qui l'utilisent déjà partout. Les VÉRIFICATIONS demandées sont
// respectées à l'identique, juste sur nos noms de champs réels :
//   - présence de `rooms`, `doors`, `floors` (l'équivalent de
//     `apartment.name`/`bounds` au niveau racine)
//   - chaque pièce a un `id`, des coordonnées valides (`x`, `y`, `width`,
//     `height` — l'équivalent de `bounds`) et un `type`
//
// HONNÊTETÉ SUR CE QUE JE N'AI PAS PU VÉRIFIER : je n'ai pas d'accès
// réseau dans cet environnement pour installer `zod` et exécuter ce
// fichier directement, contrairement à ma pratique habituelle sur ce
// projet. L'API utilisée ici (z.object, z.array, .safeParse,
// result.error.issues) est stable et documentée depuis longtemps — je
// suis raisonnablement confiant, mais l'exécution réelle chez toi reste
// la première vraie preuve pour CE fichier précisément.
//
// MISE À JOUR — REFONTE MUR-ARÊTE (voir la conversation) : `doorSchema`
// exige maintenant `orientation` ('h'|'v') en plus de `x`/`y` — une
// entrée de `doors` identifie une ARÊTE précise (bordure entre deux
// pièces), plus une case de grille comme avant (voir
// layoutGeneration.js). Un fichier exporté AVANT ce changement
// (`version: 1`, entrées sans orientation) sera désormais rejeté par
// l'import avec un message clair plutôt que silencieusement mal
// interprété — comportement voulu, pas un oubli : aucune conversion
// automatique v1->v2 écrite, le volume de données concerné (plans de
// test) ne le justifie pas pour l'instant.
//
// TERMINOLOGIE (01/08/2026, demande explicite de Paul) : le champ/schéma
// garde le nom `doors` (aucune migration nécessaire, valeur purement
// structurelle), mais côté interaction/rendu il ne s'agit plus de
// "portes" — chaque entrée représente une OUVERTURE (pan de mur retiré),
// pas un objet de porte ajouté. Un mur plein reste le défaut entre deux
// pièces qui se touchent.
import { z } from 'zod';

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const doorSchema = z.object({
  orientation: z.enum(['h', 'v'], { errorMap: () => ({ message: "orientation doit être 'h' ou 'v'" }) }),
  x: z.number(),
  y: z.number(),
});

const roomSchema = z.object({
  id: z.string().min(1, 'id manquant ou vide'),
  name: z.string().min(1, 'nom manquant ou vide'),
  type: z.string().min(1, 'type de pièce manquant'),
  icon: z.string().optional(),
  color: z.string().optional(),
  floorId: z.string().min(1, 'floorId manquant'),
  x: z.number().int('x doit être un entier'),
  y: z.number().int('y doit être un entier'),
  width: z.number().int().min(1, 'width doit être un entier positif'),
  height: z.number().int().min(1, 'height doit être un entier positif'),
});

const floorSchema = z.object({
  id: z.string().min(1, 'id d’étage manquant'),
  name: z.string().min(1, 'nom d’étage manquant'),
  shortLabel: z.string().optional(),
  level: z.number().optional(),
  avatarStart: pointSchema.optional(),
});

export const layoutSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  floors: z.array(floorSchema),
  rooms: z.array(roomSchema),
  doors: z.record(z.string(), z.array(doorSchema)),
});

/**
 * Valide un objet de plan déjà parsé (issu de JSON.parse). Ne lance
 * jamais d'exception (safeParse, pas parse) — retourne toujours
 * `{ success: true, data }` ou `{ success: false, errors }`, `errors`
 * étant un tableau de messages lisibles (chemin du champ + problème),
 * jamais un objet d'erreur brut de Zod à afficher tel quel.
 */
export function validateLayout(data) {
  const result = layoutSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.') || '(racine)';
    return `${path} : ${issue.message}`;
  });
  return { success: false, errors };
}
