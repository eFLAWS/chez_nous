// floorPlanService.js
// Service Supabase pour le plan 2D/2.5D (table floor_plans, un seul
// blob JSONB layout_data par foyer — household_id est UNIQUE). Remplace
// householdLayoutApi.js (ancien backend, CRUD par entité, "supprimer
// puis recréer" par étage à coups d'appels séquentiels) — voir la
// conversation pour le détail de la découverte : le plan était
// construit/testé mais toujours branché sur l'ancien backend, et pas
// monté dans le routing actuel.
//
// CONTRAT PRÉSERVÉ À L'IDENTIQUE (voir la conversation) : mêmes noms de
// fonctions, mêmes paramètres, même forme de retour que l'ancien
// householdLayoutApi.js — pour qu'ApartmentSpatialMvp.jsx (déjà
// construit et testé) n'ait qu'à changer son import, rien d'autre.
// Toute la logique d'adaptation (rooms/doors plats <-> structure du
// blob) vit ici, pas dans le composant.
//
// FORME DU BLOB layout_data (convention applicative — une colonne jsonb
// ne contraint rien, Postgres ne valide que sa présence) :
//   { floors: [...], rooms: [...], doors: [...], furniture: [], spatialNotes: [] }
// - floors : {id, name, shortLabel, level, avatarStart, gridWidth, gridHeight}
// - rooms  : plat, chaque pièce porte son floorId (comme dans l'état
//   local de ApartmentSpatialMvp.jsx — pas besoin de les regrouper ici).
// - doors  : plats aussi dans le blob (avec floorId) ; reconvertis en
//   dict {[floorId]: [...]} uniquement en sortie de fetchHouseholdLayout,
//   pour correspondre exactement à ce qu'attendait l'ancienne API.
// - furniture/spatialNotes : présents dès maintenant dans le blob (voir
//   docs/DATA_MODEL.md — encapsulés dès la conception), vides pour
//   l'instant, aucun code ne les lit/écrit encore.
//
// VERROU OPTIMISTE (floor_plans.version, colonne déjà en base mais
// jamais utilisée jusqu'ici) : chaque écriture ne réussit que si la
// version lue juste avant n'a pas changé entre-temps
// (`.eq('version', versionLue)`) — sinon quelqu'un d'autre a modifié le
// plan en parallèle ; on renvoie une erreur de conflit explicite plutôt
// que d'écraser silencieusement son travail. Absent de l'ancien système
// (un seul utilisateur local, jamais de vraie concurrence).
import { supabase } from '../../lib/supabaseClient';

const EMPTY_LAYOUT = { floors: [], rooms: [], doors: [], furniture: [], spatialNotes: [] };

// Lit la ligne floor_plans du foyer, ou la crée vide si c'est le tout
// premier accès (aucun trigger de création automatique à la création du
// foyer pour l'instant — décision à revisiter si ça devient gênant).
async function getOrCreateRow(householdId) {
  const { data, error } = await supabase
    .from('floor_plans')
    .select('id, layout_data, version')
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (data) return { success: true, data };

  const { data: created, error: insertError } = await supabase
    .from('floor_plans')
    .insert({ household_id: householdId, layout_data: EMPTY_LAYOUT })
    .select('id, layout_data, version')
    .single();

  if (insertError) return { success: false, error: insertError.message };
  return { success: true, data: created };
}

/**
 * Charge tout le plan d'un foyer. Ne lève jamais d'exception : renvoie
 * une forme vide utilisable en cas d'échec (même contrat que l'ancienne
 * fonction, qui n'utilisait pas {success, data, error}).
 */
export async function fetchHouseholdLayout(householdId) {
  const rowRes = await getOrCreateRow(householdId);
  if (!rowRes.success) return { floors: [], rooms: [], doors: {} };

  const layout = { ...EMPTY_LAYOUT, ...rowRes.data.layout_data };

  const doorsByFloor = {};
  for (const door of layout.doors) {
    if (!doorsByFloor[door.floorId]) doorsByFloor[door.floorId] = [];
    doorsByFloor[door.floorId].push({ id: door.id, x: door.x, y: door.y });
  }

  return { floors: layout.floors, rooms: layout.rooms, doors: doorsByFloor };
}

/**
 * Enregistre le plan édité d'UN étage : remplace ses pièces/portes dans
 * le blob (même stratégie "supprimer puis recréer" que l'ancien
 * système, mais en mémoire + une seule écriture atomique — plus besoin
 * d'appels séquentiels ni de la limite "pas transactionnel" assumée par
 * householdLayoutApi.js). Recalcule avatarStart/gridWidth/gridHeight à
 * partir des pièces tracées, jamais figés (même règle qu'avant).
 */
export async function saveFloorLayout({
  householdId,
  floorId,
  floorMeta,
  editedRoomRects,
  editedDoors,
}) {
  const rowRes = await getOrCreateRow(householdId);
  if (!rowRes.success) return { success: false, error: rowRes.error };

  const layout = { ...EMPTY_LAYOUT, ...rowRes.data.layout_data };
  let floors = [...layout.floors];

  let floor;
  if (!floorId) {
    const meta = floorMeta || { name: 'Rez-de-chaussée', shortLabel: 'RDC', level: 0 };
    floorId = crypto.randomUUID();
    floor = { id: floorId, ...meta };
    floors.push(floor);
  } else {
    floor = floors.find((f) => f.id === floorId);
    if (!floor) return { success: false, error: 'Étage introuvable dans le plan.' };
  }

  const rooms = [...layout.rooms.filter((r) => r.floorId !== floorId), ...editedRoomRects.map((rect) => ({ ...rect, floorId }))];
  const newDoors = editedDoors.map((d) => ({ id: crypto.randomUUID(), floorId, x: d.x, y: d.y }));
  const doors = [...layout.doors.filter((d) => d.floorId !== floorId), ...newDoors];

  const editedRooms = rooms.filter((r) => r.floorId === floorId);
  const firstRoom = editedRooms[0];
  const avatarStart = firstRoom
    ? { x: firstRoom.x + Math.floor(firstRoom.width / 2), y: firstRoom.y + Math.floor(firstRoom.height / 2) }
    : { x: 0, y: 0 };
  const gridWidth = editedRooms.length > 0 ? Math.max(...editedRooms.map((r) => r.x + r.width)) + 2 : 10;
  const gridHeight = editedRooms.length > 0 ? Math.max(...editedRooms.map((r) => r.y + r.height)) + 2 : 10;

  floor = { ...floor, avatarStart, gridWidth, gridHeight };
  floors = floors.map((f) => (f.id === floorId ? floor : f));

  const newLayout = { ...layout, floors, rooms, doors };

  const { data: updated, error } = await supabase
    .from('floor_plans')
    .update({ layout_data: newLayout, version: rowRes.data.version + 1 })
    .eq('household_id', householdId)
    .eq('version', rowRes.data.version)
    .select('version')
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!updated) {
    return {
      success: false,
      error: "Le plan a été modifié ailleurs entre-temps — recharge la page avant de réessayer.",
    };
  }

  return {
    success: true,
    floor,
    rooms: editedRooms,
    doors: newDoors.map((d) => ({ id: d.id, x: d.x, y: d.y })),
  };
}

/**
 * Réinitialise tout le plan d'un foyer (bouton "Réinitialiser" de
 * LayoutEditor) — remet le blob à vide plutôt que de supprimer étage
 * par étage comme le faisait l'ancien système.
 */
export async function resetHouseholdLayout(householdId) {
  const rowRes = await getOrCreateRow(householdId);
  if (!rowRes.success) return { success: false, error: rowRes.error };

  const { error } = await supabase
    .from('floor_plans')
    .update({ layout_data: EMPTY_LAYOUT, version: rowRes.data.version + 1 })
    .eq('household_id', householdId)
    .eq('version', rowRes.data.version);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
