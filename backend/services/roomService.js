// services/roomService.js
// Regroupe tout ce qui touche à l'espace physique du foyer : étages,
// pièces, portes. Les pièces référencent un étage (floorId, optionnel),
// donc les trois sont naturellement liés — le placement automatique et
// le blocage de collision des pièces sont d'ailleurs scopés PAR étage
// (deux pièces à des étages différents peuvent partager les mêmes
// coordonnées).
//
// SCHÉMA ÉTENDU (voir la conversation) pour correspondre à ce que le
// frontend (LayoutEditor.jsx/FloorView3D.jsx) attend déjà :
//   - Étages : + shortLabel, avatarStart {x,y}, gridWidth, gridHeight.
//   - Pièces : `length` renommé `height` (cases de grille = mètres, 1:1
//     par convention — voir layoutGeneration.js côté frontend), + type,
//     + icon. Les anciens composants du floorplan historique
//     (components/floorplan/) ont été mis à jour pour utiliser `height`
//     eux aussi, pas laissés cassés silencieusement.
//   - Portes : nouveau concept entièrement (voir plus bas).
//
// RÔLES PROPRIETAIRE/LOCATAIRE (nouveau, voir la conversation —
// USER_FLOW_ONBOARDING.md / DATA_MODEL.md fournis par l'utilisateur) :
// "Modifier le plan (murs, pièces, meubles)" est réservé au
// PROPRIETAIRE du foyer — un LOCATAIRE peut consulter (lister) mais pas
// créer/déplacer/supprimer. Chaque fonction de modification exige donc
// maintenant un `userId` (qui fait la demande), vérifié via
// `isHouseholdOwner` avant toute écriture. Les fonctions de LECTURE
// (listFloors/listRooms/listDoors) restent ouvertes à tous les
// occupants, sans vérification de rôle.
const { readStore, writeStore, genId, ok, fail } = require("../core/storageUtils");
const { validateFloor, validateRoom, validateDoor } = require("../validators");

/**
 * Ce compte (userId) est-il PROPRIETAIRE de CE foyer précis ? Utilisé
 * avant toute modification du plan (pièces/étages/portes) — jamais fait
 * confiance au frontend pour cette vérification, comme pour le compte
 * d'occupants avant une suppression de foyer (voir userService.js).
 */
function isHouseholdOwner(occupants, householdId, userId) {
  return occupants.some((o) => o.householdId === householdId && o.claimedByUserId === userId && o.role === "PROPRIETAIRE");
}

/* ================================= Étages ================================= */

async function createFloor(input) {
  const read = await readStore();
  if (!read.success) return fail("floor.create", read.error);

  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const candidate = {
    id: (input && input.id) || genId(),
    name: input && input.name,
    householdId: input && input.householdId,
    level: input && input.level,
    shortLabel: (input && input.shortLabel) ?? null,
    avatarStart: (input && input.avatarStart) ?? null,
    gridWidth: (input && input.gridWidth) ?? null,
    gridHeight: (input && input.gridHeight) ?? null,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateFloor(candidate, { existingHouseholdIds });
  if (!valid) return fail("floor.create.validation", errors.join(" "));

  if (!isHouseholdOwner(read.data.occupants, candidate.householdId, input && input.userId)) {
    return fail("floor.create.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  if (read.data.floors.some((f) => f.id === candidate.id)) {
    return fail("floor.create.duplicate", `Un étage avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, floors: [...read.data.floors, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("floor.create.write", write.error);

  return ok("floor.create", candidate);
}

/**
 * Met à jour les champs propres au plan spatial d'un étage (shortLabel,
 * avatarStart, gridWidth, gridHeight) — nouveau, nécessaire parce que ces
 * valeurs se recalculent à CHAQUE enregistrement du plan côté frontend
 * (jamais figées, voir HouseholdSpatialView.jsx), pas seulement à la
 * création de l'étage.
 */
async function updateFloorLayout(id, patch = {}, userId) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("floor.updateLayout.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("floor.updateLayout", read.error);

  const index = read.data.floors.findIndex((f) => f.id === id);
  if (index === -1) return fail("floor.updateLayout.not_found", `Aucun étage trouvé avec l'id "${id}".`);

  const floor = read.data.floors[index];
  if (!isHouseholdOwner(read.data.occupants, floor.householdId, userId)) {
    return fail("floor.updateLayout.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  const candidate = {
    ...floor,
    shortLabel: patch.shortLabel !== undefined ? patch.shortLabel : floor.shortLabel,
    avatarStart: patch.avatarStart !== undefined ? patch.avatarStart : floor.avatarStart,
    gridWidth: patch.gridWidth !== undefined ? patch.gridWidth : floor.gridWidth,
    gridHeight: patch.gridHeight !== undefined ? patch.gridHeight : floor.gridHeight,
  };

  const existingHouseholdIds = new Set([floor.householdId]);
  const { valid, errors } = validateFloor(candidate, { existingHouseholdIds });
  if (!valid) return fail("floor.updateLayout.validation", errors.join(" "));

  const floors = [...read.data.floors];
  floors[index] = candidate;
  const write = await writeStore({ ...read.data, floors });
  if (!write.success) return fail("floor.updateLayout.write", write.error);

  return ok("floor.updateLayout", candidate);
}

async function listFloors(householdId) {
  const read = await readStore();
  if (!read.success) return fail("floor.list", read.error);
  const all = read.data.floors;
  const filtered = householdId ? all.filter((f) => f.householdId === householdId) : all;
  return ok("floor.list", filtered, `${filtered.length} étage(s).`);
}

/**
 * Supprime un étage EN CASCADE : ses pièces, ses portes, puis les tâches
 * rattachées à ces pièces. Le frontend affiche une confirmation avec le
 * nombre exact de pièces/tâches concernées AVANT d'appeler cette fonction.
 */
async function deleteFloor(id, userId) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("floor.delete.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("floor.delete", read.error);

  const floor = read.data.floors.find((f) => f.id === id);
  if (!floor) return fail("floor.delete.not_found", `Aucun étage trouvé avec l'id "${id}".`);

  if (!isHouseholdOwner(read.data.occupants, floor.householdId, userId)) {
    return fail("floor.delete.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  const roomIdsOnFloor = new Set(read.data.rooms.filter((r) => r.floorId === id).map((r) => r.id));
  const floors = read.data.floors.filter((f) => f.id !== id);
  const rooms = read.data.rooms.filter((r) => !roomIdsOnFloor.has(r.id));
  const tasks = read.data.tasks.filter((t) => !roomIdsOnFloor.has(t.roomId));
  const doors = (read.data.doors || []).filter((d) => d.floorId !== id);

  const write = await writeStore({ ...read.data, floors, rooms, tasks, doors });
  if (!write.success) return fail("floor.delete.write", write.error);

  return ok("floor.delete", {
    id,
    deletedRoomCount: roomIdsOnFloor.size,
    deletedTaskCount: read.data.tasks.length - tasks.length,
    deletedDoorCount: (read.data.doors || []).length - doors.length,
  });
}

/* ================================= Pièces ================================== */
// Le placement automatique et le blocage de collision sont limités aux
// pièces qui partagent le MÊME étage (floorId). Une pièce sans floorId
// (logement de plain-pied) forme son propre groupe.

const DEFAULT_ROOM_COLOR = "#D6E1CC";
const GRID_WIDTH_UNITS = 12; // largeur virtuelle de la grille, en cases, avant retour à la ligne

function sameFloorGroup(a, b) {
  return a.householdId === b.householdId && (a.floorId ?? null) === (b.floorId ?? null);
}

function computeNextPosition(sameFloorRooms, width) {
  if (!sameFloorRooms.length) return { x: 0, y: 0 };

  const maxY = Math.max(...sameFloorRooms.map((r) => r.y));
  const roomsInLastRow = sameFloorRooms.filter((r) => r.y === maxY);
  const rowRightEdge = Math.max(...roomsInLastRow.map((r) => r.x + r.width));
  const rowHeight = Math.max(...roomsInLastRow.map((r) => r.height));

  if (rowRightEdge + width <= GRID_WIDTH_UNITS) {
    return { x: rowRightEdge, y: maxY };
  }
  return { x: 0, y: maxY + rowHeight };
}

async function createRoom(input) {
  const read = await readStore();
  if (!read.success) return fail("room.create", read.error);

  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const existingFloorIds = new Set(read.data.floors.map((f) => f.id));
  const width = Number(input && input.width);
  const height = Number(input && input.height);
  const floorId = (input && input.floorId) ?? null;

  const sameFloorRooms = read.data.rooms.filter(
    (r) => r.householdId === (input && input.householdId) && (r.floorId ?? null) === floorId
  );

  const hasExplicitPosition = input && typeof input.x === "number" && typeof input.y === "number";
  const position = hasExplicitPosition ? { x: input.x, y: input.y } : computeNextPosition(sameFloorRooms, width);

  const candidate = {
    id: (input && input.id) || genId(),
    name: input && input.name,
    householdId: input && input.householdId,
    floorId,
    type: input && input.type,
    icon: (input && input.icon) ?? null,
    width,
    height,
    color: (input && input.color) || DEFAULT_ROOM_COLOR,
    x: position.x,
    y: position.y,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateRoom(candidate, { existingHouseholdIds, existingFloorIds });
  if (!valid) return fail("room.create.validation", errors.join(" "));

  if (!isHouseholdOwner(read.data.occupants, candidate.householdId, input && input.userId)) {
    return fail("room.create.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  if (read.data.rooms.some((r) => r.id === candidate.id)) {
    return fail("room.create.duplicate", `Une pièce avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, rooms: [...read.data.rooms, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("room.create.write", write.error);

  return ok("room.create", candidate);
}

async function listRooms(householdId) {
  const read = await readStore();
  if (!read.success) return fail("room.list", read.error);
  const all = read.data.rooms;
  const filtered = householdId ? all.filter((r) => r.householdId === householdId) : all;
  return ok("room.list", filtered, `${filtered.length} pièce(s).`);
}

/**
 * Deux rectangles se chevauchent-ils ? Un simple contact bord-à-bord
 * n'est PAS un chevauchement (comparaisons strictes).
 */
function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Déplace une pièce à une nouvelle position. Rejette tout déplacement qui
 * chevaucherait une autre pièce du MÊME ÉTAGE. Défense en profondeur :
 * le glisser-déposer côté client empêche déjà ça visuellement.
 */
async function updateRoomPosition(id, { x, y } = {}, userId) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("room.updatePosition.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("room.updatePosition", read.error);

  const index = read.data.rooms.findIndex((r) => r.id === id);
  if (index === -1) return fail("room.updatePosition.not_found", `Aucune pièce trouvée avec l'id "${id}".`);

  const room = read.data.rooms[index];
  if (!isHouseholdOwner(read.data.occupants, room.householdId, userId)) {
    return fail("room.updatePosition.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  const candidate = { ...room, x, y };

  const existingHouseholdIds = new Set([room.householdId]);
  const existingFloorIds = new Set(read.data.floors.map((f) => f.id));
  const { valid, errors } = validateRoom(candidate, { existingHouseholdIds, existingFloorIds });
  if (!valid) return fail("room.updatePosition.validation", errors.join(" "));

  const others = read.data.rooms.filter((r) => r.id !== id && sameFloorGroup(r, room));
  const collision = others.find((o) => rectanglesOverlap(candidate, o));
  if (collision) {
    return fail("room.updatePosition.collision", `Chevauchement détecté avec la pièce "${collision.name}".`);
  }

  const rooms = [...read.data.rooms];
  rooms[index] = candidate;
  const write = await writeStore({ ...read.data, rooms });
  if (!write.success) return fail("room.updatePosition.write", write.error);

  return ok("room.updatePosition", candidate);
}

/**
 * Supprime une pièce EN CASCADE : les tâches qui lui sont rattachées
 * (roomId) sont supprimées avec elle.
 */
async function deleteRoom(id, userId) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("room.delete.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("room.delete", read.error);

  const room = read.data.rooms.find((r) => r.id === id);
  if (!room) return fail("room.delete.not_found", `Aucune pièce trouvée avec l'id "${id}".`);

  if (!isHouseholdOwner(read.data.occupants, room.householdId, userId)) {
    return fail("room.delete.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  const rooms = read.data.rooms.filter((r) => r.id !== id);
  const tasks = read.data.tasks.filter((t) => t.roomId !== id);

  const write = await writeStore({ ...read.data, rooms, tasks });
  if (!write.success) return fail("room.delete.write", write.error);

  return ok("room.delete", { id, deletedTaskCount: read.data.tasks.length - tasks.length });
}

/* ================================= Portes =================================== */
// Nouveau concept (voir la conversation) : une porte est une case de mur
// (x, y) transformée en passage libre entre deux pièces, sur un étage
// donné. Volontairement minimal — juste la position ; le frontend
// (generateFloorTiles) calcule lui-même géométriquement quelles pièces
// une porte relie, à partir des rectangles de pièces.

async function createDoor(input) {
  const read = await readStore();
  if (!read.success) return fail("door.create", read.error);

  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const existingFloorIds = new Set(read.data.floors.map((f) => f.id));

  const candidate = {
    id: (input && input.id) || genId(),
    householdId: input && input.householdId,
    floorId: input && input.floorId,
    x: input && input.x,
    y: input && input.y,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateDoor(candidate, { existingHouseholdIds, existingFloorIds });
  if (!valid) return fail("door.create.validation", errors.join(" "));

  if (!isHouseholdOwner(read.data.occupants, candidate.householdId, input && input.userId)) {
    return fail("door.create.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  const doors = read.data.doors || [];
  if (doors.some((d) => d.id === candidate.id)) {
    return fail("door.create.duplicate", `Une porte avec l'id "${candidate.id}" existe déjà.`);
  }
  // Une seule porte par case — en poser une seconde au même endroit
  // n'aurait aucun sens géométrique.
  if (doors.some((d) => d.floorId === candidate.floorId && d.x === candidate.x && d.y === candidate.y)) {
    return fail("door.create.duplicate_position", "Une porte existe déjà à cette position sur cet étage.");
  }

  const next = { ...read.data, doors: [...doors, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("door.create.write", write.error);

  return ok("door.create", candidate);
}

async function listDoors(floorId) {
  const read = await readStore();
  if (!read.success) return fail("door.list", read.error);
  const all = read.data.doors || [];
  const filtered = floorId ? all.filter((d) => d.floorId === floorId) : all;
  return ok("door.list", filtered, `${filtered.length} porte(s).`);
}

async function deleteDoor(id, userId) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("door.delete.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("door.delete", read.error);

  const doors = read.data.doors || [];
  const door = doors.find((d) => d.id === id);
  if (!door) {
    return fail("door.delete.not_found", `Aucune porte trouvée avec l'id "${id}".`);
  }

  if (!isHouseholdOwner(read.data.occupants, door.householdId, userId)) {
    return fail("door.delete.forbidden", "Seul le propriétaire du foyer peut modifier le plan.");
  }

  const write = await writeStore({ ...read.data, doors: doors.filter((d) => d.id !== id) });
  if (!write.success) return fail("door.delete.write", write.error);

  return ok("door.delete", { id });
}

module.exports = {
  createFloor,
  updateFloorLayout,
  listFloors,
  deleteFloor,
  createRoom,
  listRooms,
  updateRoomPosition,
  deleteRoom,
  rectanglesOverlap,
  createDoor,
  listDoors,
  deleteDoor,
  isHouseholdOwner,
};
