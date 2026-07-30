// api.js
// Fine couche d'accès réseau vers le backend. Isolée ici pour que les
// composants n'aient jamais à connaître les détails de fetch/HTTP : ils
// appellent des fonctions, et reçoivent toujours la même forme que
// dataService côté serveur : { success, data, error }.

// `VITE_API_URL` (voir .env.example à la racine) — si absent, retombe
// sur "/api" (chemin relatif géré par le proxy de vite.config.js en
// développement), pour ne rien casser tant qu'aucun .env n'a été créé.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: (body && body.error) || `Erreur HTTP ${res.status}` };
    }
    return body ?? { success: false, error: "Réponse vide du serveur." };
  } catch (err) {
    return { success: false, error: `Impossible de contacter le serveur : ${err.message}` };
  }
}

export const api = {
  listTasks: () => request("/tasks"),
  createTask: (input) => request("/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id, patch) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  listProjects: () => request("/projects"),
  createProject: (input) => request("/projects", { method: "POST", body: JSON.stringify(input) }),

  listUsers: () => request("/users"),

  signup: (input) => request("/auth/signup", { method: "POST", body: JSON.stringify(input) }),
  login: (input) => request("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  inviteUser: (input) => request("/invitations", { method: "POST", body: JSON.stringify(input) }),
  acceptInvitation: (input) => request("/invitations/accept", { method: "POST", body: JSON.stringify(input) }),
  getInvitationPreview: (token) => request(`/invitations/preview?token=${encodeURIComponent(token)}`),
  acceptInvitationForExistingUser: (input) =>
    request("/invitations/accept-existing", { method: "POST", body: JSON.stringify(input) }),
  requestPasswordReset: (email) =>
    request("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (input) =>
    request("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify(input) }),

  listRooms: (householdId) => request(`/rooms${householdId ? `?householdId=${householdId}` : ""}`),
  createRoom: (input) => request("/rooms", { method: "POST", body: JSON.stringify(input) }),
  updateRoomPosition: (id, patch) => request(`/rooms/${id}/position`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: "DELETE" }),

  listFloors: (householdId) => request(`/floors${householdId ? `?householdId=${householdId}` : ""}`),
  createFloor: (input) => request("/floors", { method: "POST", body: JSON.stringify(input) }),
  updateFloorLayout: (id, patch) => request(`/floors/${id}/layout`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteFloor: (id) => request(`/floors/${id}`, { method: "DELETE" }),

  listDoors: (floorId) => request(`/doors${floorId ? `?floorId=${floorId}` : ""}`),
  createDoor: (input) => request("/doors", { method: "POST", body: JSON.stringify(input) }),
  deleteDoor: (id) => request(`/doors/${id}`, { method: "DELETE" }),

  // Multi-foyers (voir la conversation) : un compte peut être occupant de
  // plusieurs foyers — ces fonctions remplacent le mock localStorage
  // précédent (housingStorage.js) par de vrais appels au backend.
  listHouseholdsForUser: (userId) => request(`/households?userId=${encodeURIComponent(userId)}`),
  createHouseholdForUser: (input) => request("/households", { method: "POST", body: JSON.stringify(input) }),
  leaveHousehold: (householdId, userId) =>
    request(`/households/${householdId}/leave`, { method: "POST", body: JSON.stringify({ userId }) }),
  deleteHousehold: (householdId, userId) =>
    request(`/households/${householdId}?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }),
  listOccupants: (householdId, onlyUnclaimed) =>
    request(`/occupants?householdId=${encodeURIComponent(householdId)}${onlyUnclaimed ? "&onlyUnclaimed=true" : ""}`),
};
