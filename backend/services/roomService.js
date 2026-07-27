// services/roomService.js
// Regroupe tout ce qui touche à l'espace physique du foyer : étages et
// pièces. Les pièces référencent un étage (floorId, optionnel), donc les
// deux sont naturellement liés — le placement automatique et le blocage
// de collision des pièces sont d'ailleurs scopés PAR étage (deux pièces
// à des étages différents peuvent partager les mêmes coordonnées).
const { readStore, writeStore, genId, ok, fail } = require("../core/storageUtils");
const { validateFloor, validateRoom } = require("../validators");

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
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateFloor(candidate, { existingHouseholdIds });
  if (!valid) return fail("floor.create.validation", errors.join(" "));

  if (read.data.floors.some((f) => f.id === candidate.id)) {
    return fail("floor.create.duplicate", `Un étage avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, floors: [...read.data.floors, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("floor.create.write", write.error);

  return ok("floor.create", candidate);
}

async function listFloors(householdId) {
  const read = await readStore();
  if (!read.success) return fail("floor.list", read.error);
  const all = read.data.floors;
  const filtered = householdId ? all.filter((f) => f.householdId === householdId) : all;
  return ok("floor.list", filtered, `${filtered.length} étage(s).`);
}

/**
 * Supprime un étage EN CASCADE : ses pièces, puis les tâches rattachées à
 * ces pièces. Le frontend affiche une confirmation avec le nombre exact
 * de pièces/tâches concernées AVANT d'appeler cette fonction.
 */
async function deleteFloor(id) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("floor.delete.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("floor.delete", read.error);

  const floor = read.data.floors.find((f) => f.id === id);
  if (!floor) return fail("floor.delete.not_found", `Aucun étage trouvé avec l'id "${id}".`);

  const roomIdsOnFloor = new Set(read.data.rooms.filter((r) => r.floorId === id).map((r) => r.id));
  const floors = read.data.floors.filter((f) => f.id !== id);
  const rooms = read.data.rooms.filter((r) => !roomIdsOnFloor.has(r.id));
  const tasks = read.data.tasks.filter((t) => !roomIdsOnFloor.has(t.roomId));

  const write = await writeStore({ ...read.data, floors, rooms, tasks });
  if (!write.success) return fail("floor.delete.write", write.error);

  return ok("floor.delete", {
    id,
    deletedRoomCount: roomIdsOnFloor.size,
    deletedTaskCount: read.data.tasks.length - tasks.length,
  });
}

/* ================================= Pièces ================================== */
// Le placement automatique et le blocage de collision sont limités aux
// pièces qui partagent le MÊME étage (floorId). Une pièce sans floorId
// (logement de plain-pied) forme son propre groupe.

const DEFAULT_ROOM_COLOR = "#D6E1CC";
const GRID_WIDTH_UNITS = 12; // largeur virtuelle de la grille, en mètres, avant retour à la ligne

function sameFloorGroup(a, b) {
  return a.householdId === b.householdId && (a.floorId ?? null) === (b.floorId ?? null);
}

function computeNextPosition(sameFloorRooms, width) {
  if (!sameFloorRooms.length) return { x: 0, y: 0 };

  const maxY = Math.max(...sameFloorRooms.map((r) => r.y));
  const roomsInLastRow = sameFloorRooms.filter((r) => r.y === maxY);
  const rowRightEdge = Math.max(...roomsInLastRow.map((r) => r.x + r.width));
  const rowHeight = Math.max(...roomsInLastRow.map((r) => r.length));

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
  const length = Number(input && input.length);
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
    width,
    length,
    color: (input && input.color) || DEFAULT_ROOM_COLOR,
    x: position.x,
    y: position.y,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateRoom(candidate, { existingHouseholdIds, existingFloorIds });
  if (!valid) return fail("room.create.validation", errors.join(" "));

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
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.length && a.y + a.length > b.y;
}

/**
 * Déplace une pièce à une nouvelle position. Rejette tout déplacement qui
 * chevaucherait une autre pièce du MÊME ÉTAGE. Défense en profondeur :
 * le glisser-déposer côté client empêche déjà ça visuellement.
 */
async function updateRoomPosition(id, { x, y } = {}) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("room.updatePosition.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("room.updatePosition", read.error);

  const index = read.data.rooms.findIndex((r) => r.id === id);
  if (index === -1) return fail("room.updatePosition.not_found", `Aucune pièce trouvée avec l'id "${id}".`);

  const room = read.data.rooms[index];
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
async function deleteRoom(id) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("room.delete.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("room.delete", read.error);

  const room = read.data.rooms.find((r) => r.id === id);
  if (!room) return fail("room.delete.not_found", `Aucune pièce trouvée avec l'id "${id}".`);

  const rooms = read.data.rooms.filter((r) => r.id !== id);
  const tasks = read.data.tasks.filter((t) => t.roomId !== id);

  const write = await writeStore({ ...read.data, rooms, tasks });
  if (!write.success) return fail("room.delete.write", write.error);

  return ok("room.delete", { id, deletedTaskCount: read.data.tasks.length - tasks.length });
}

module.exports = {
  createFloor,
  listFloors,
  deleteFloor,
  createRoom,
  listRooms,
  updateRoomPosition,
  deleteRoom,
  rectanglesOverlap,
};
