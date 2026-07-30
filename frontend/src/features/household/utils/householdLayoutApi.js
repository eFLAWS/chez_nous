// src/features/household/utils/householdLayoutApi.js
// Pont entre l'état en mémoire de ApartmentSpatialMvp.jsx
// (floors/rooms/doors) et le vrai backend, qui attend des opérations
// CRUD PAR ENTITÉ (une pièce à la fois), pas un simple blob à
// sauvegarder comme le faisait layoutStorage.js (localStorage). Isolé
// ici, en fonctions pures et testables, plutôt qu'enterré directement
// dans le composant — vérifiable avec de vraies requêtes avant d'être
// branché à l'interface.
//
// STRATÉGIE DE RÉCONCILIATION CHOISIE : "supprimer puis recréer", pas un
// diff fin champ par champ. Pour UN étage donné, à chaque enregistrement
// depuis LayoutEditor : toutes les pièces/portes EXISTANTES de cet étage
// sont supprimées, puis les pièces/portes ÉDITÉES sont recréées avec
// leurs ids d'origine (le backend accepte un id fourni par le client).
// Plus simple et plus sûr à raisonner que du patch incrémental (qui
// aurait demandé une route "modifier tous les champs d'une pièce", pas
// seulement sa position) — au prix de plusieurs appels séquentiels par
// enregistrement. Acceptable ici : stockage JSON local, un seul
// utilisateur, sauvegardes peu fréquentes (au clic sur "Enregistrer",
// pas à chaque micro-interaction).
//
// LIMITE ASSUMÉE, pas cachée : ces opérations ne sont PAS
// transactionnelles — une erreur réseau au milieu d'un enregistrement
// peut laisser un état partiel (certaines pièces supprimées, pas encore
// remplacées). Acceptable pour ce MVP local à un seul utilisateur ; pas
// pour un vrai produit multi-utilisateur sans reprise de ce point.
import { api } from "../../../api";

/**
 * Charge tout ce qu'un logement contient : étages, pièces, et les portes
 * de chaque étage (un appel par étage — le nombre d'étages reste petit
 * dans ce MVP, pas besoin d'une route groupée par foyer pour l'instant).
 * Retourne toujours une forme utilisable même en cas d'échec partiel
 * (tableaux vides), jamais une exception.
 */
export async function fetchHouseholdLayout(householdId) {
  const floorsRes = await api.listFloors(householdId);
  const floors = floorsRes.success ? floorsRes.data : [];

  const roomsRes = await api.listRooms(householdId);
  const rooms = roomsRes.success ? roomsRes.data : [];

  // { [floorId]: [{id, x, y}, ...] } — l'id de la porte est gardé (pas
  // juste x/y) : nécessaire pour pouvoir la supprimer individuellement
  // au prochain enregistrement (voir saveFloorLayout).
  const doorsByFloor = {};
  for (const floor of floors) {
    const doorsRes = await api.listDoors(floor.id);
    doorsByFloor[floor.id] = doorsRes.success ? doorsRes.data.map((d) => ({ id: d.id, x: d.x, y: d.y })) : [];
  }

  return { floors, rooms, doors: doorsByFloor };
}

/**
 * Enregistre le plan édité d'UN étage : crée l'étage s'il n'existait pas
 * encore (premier logement), supprime les pièces/portes existantes de
 * CET étage précis, recrée celles éditées, puis met à jour les champs de
 * layout de l'étage (avatarStart/gridWidth/gridHeight — toujours
 * recalculés, jamais figés, voir ApartmentSpatialMvp.jsx).
 *
 * Retourne `{ success: true, floor, rooms, doors }` (doors au format
 * `[{id, x, y}]`, avec les NOUVEAUX ids assignés par le backend) ou
 * `{ success: false, error }` au premier échec rencontré — sans
 * continuer les étapes suivantes (voir la limite assumée ci-dessus).
 */
export async function saveFloorLayout({
  householdId,
  floorId,
  floorMeta,
  existingDoorsWithIds,
  editedRoomRects,
  editedDoors,
}) {
  let floor = null;

  if (!floorId) {
    // `floorMeta` (nouveau) : permet à l'import multi-étages de recréer
    // chaque étage avec son VRAI nom/étiquette/niveau — sans ça, chaque
    // étage recréé recevait le même nom générique "Rez-de-chaussée" par
    // défaut, quel que soit l'étage réellement importé (bug trouvé par
    // une vérification en direct avant intégration, corrigé ici).
    const meta = floorMeta || { name: "Rez-de-chaussée", shortLabel: "RDC", level: 0 };
    const floorRes = await api.createFloor({ ...meta, householdId });
    if (!floorRes.success) return { success: false, error: floorRes.error };
    floor = floorRes.data;
    floorId = floor.id;
  }

  // Supprime les pièces EXISTANTES de cet étage (interrogées depuis le
  // backend, pas depuis l'état local, pour ne jamais rater une pièce
  // créée ailleurs entre-temps).
  const existingRoomsRes = await api.listRooms(householdId);
  const existingRoomsOnFloor = existingRoomsRes.success ? existingRoomsRes.data.filter((r) => r.floorId === floorId) : [];
  for (const room of existingRoomsOnFloor) {
    const delRes = await api.deleteRoom(room.id);
    if (!delRes.success) return { success: false, error: delRes.error };
  }

  // Recrée les pièces éditées, avec leurs ids d'origine (préservés côté
  // frontend depuis LayoutEditor) — le backend les accepte tels quels.
  const createdRooms = [];
  for (const rect of editedRoomRects) {
    const res = await api.createRoom({ ...rect, householdId, floorId });
    if (!res.success) return { success: false, error: res.error };
    createdRooms.push(res.data);
  }

  // Supprime les portes existantes de cet étage, recrée celles éditées.
  for (const door of existingDoorsWithIds || []) {
    const delRes = await api.deleteDoor(door.id);
    if (!delRes.success) return { success: false, error: delRes.error };
  }
  const createdDoors = [];
  for (const door of editedDoors) {
    const res = await api.createDoor({ householdId, floorId, x: door.x, y: door.y });
    if (!res.success) return { success: false, error: res.error };
    createdDoors.push({ id: res.data.id, x: res.data.x, y: res.data.y });
  }

  // Position de départ de l'avatar + taille de la grille : TOUJOURS
  // recalculées à partir des pièces tracées (jamais figées) — même
  // logique que celle qui a corrigé le bug d'affichage écrasé signalé
  // précédemment (voir plus haut dans ce README).
  const firstRoom = editedRoomRects[0];
  const avatarStart = firstRoom
    ? { x: firstRoom.x + Math.floor(firstRoom.width / 2), y: firstRoom.y + Math.floor(firstRoom.height / 2) }
    : { x: 0, y: 0 };
  const gridWidth = editedRoomRects.length > 0 ? Math.max(...editedRoomRects.map((r) => r.x + r.width)) + 2 : 10;
  const gridHeight = editedRoomRects.length > 0 ? Math.max(...editedRoomRects.map((r) => r.y + r.height)) + 2 : 10;

  const layoutRes = await api.updateFloorLayout(floorId, { avatarStart, gridWidth, gridHeight });
  if (!layoutRes.success) return { success: false, error: layoutRes.error };

  return { success: true, floor: layoutRes.data, rooms: createdRooms, doors: createdDoors };
}

/**
 * Supprime TOUS les étages d'un logement (le backend cascade déjà vers
 * pièces/portes/tâches pour chaque étage, voir deleteFloor côté
 * backend) — utilisé par le bouton "Réinitialiser" de LayoutEditor.
 */
export async function resetHouseholdLayout(householdId) {
  const floorsRes = await api.listFloors(householdId);
  if (!floorsRes.success) return { success: false, error: floorsRes.error };

  for (const floor of floorsRes.data) {
    const res = await api.deleteFloor(floor.id);
    if (!res.success) return { success: false, error: res.error };
  }
  return { success: true };
}
