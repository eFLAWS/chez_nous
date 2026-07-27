// server.js
// Serveur HTTP minimal, en Node natif (aucune dépendance à installer) :
// expose dataService.js via les routes REST que frontend/api.js appelle
// déjà. C'était la pièce manquante répétée dans "Ce qui manque" du README.
//
// Démarrage : node server.js   (écoute sur http://localhost:3001/api)
const http = require("http");
const dataService = require("./dataService");
const { logInfo, logError } = require("./logger");

const PORT = process.env.PORT || 3001;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJSON(res, status, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
  res.end(body);
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error("Corps JSON invalide."));
      }
    });
    req.on("error", reject);
  });
}

/* Table de routage : { méthode, motif, gestionnaire(req, body, match, query) }.
   Chaque gestionnaire appelle directement une fonction de dataService.js —
   aucune logique métier ici, seulement le mappage HTTP <-> fonctions. */
const routes = [
  { method: "GET", pattern: /^\/api\/tasks$/, handler: () => dataService.listTasks() },
  { method: "POST", pattern: /^\/api\/tasks$/, handler: (req, body) => dataService.createTask(body) },
  { method: "PATCH", pattern: /^\/api\/tasks\/([^/]+)$/, handler: (req, body, m) => dataService.updateTask(m[1], body) },
  { method: "DELETE", pattern: /^\/api\/tasks\/([^/]+)$/, handler: (req, body, m) => dataService.deleteTask(m[1]) },

  { method: "GET", pattern: /^\/api\/projects$/, handler: () => dataService.listProjects() },
  { method: "POST", pattern: /^\/api\/projects$/, handler: (req, body) => dataService.createProject(body) },

  { method: "GET", pattern: /^\/api\/users$/, handler: () => dataService.listUsers() },

  { method: "POST", pattern: /^\/api\/auth\/signup$/, handler: (req, body) => dataService.signup(body) },
  { method: "POST", pattern: /^\/api\/auth\/login$/, handler: (req, body) => dataService.login(body) },

  { method: "POST", pattern: /^\/api\/invitations$/, handler: (req, body) => dataService.inviteUser(body) },
  {
    method: "GET",
    pattern: /^\/api\/invitations\/preview$/,
    handler: (req, body, m, query) => dataService.getInvitationPreview(query.get("token")),
  },
  { method: "POST", pattern: /^\/api\/invitations\/accept$/, handler: (req, body) => dataService.acceptInvitation(body) },
  {
    method: "POST",
    pattern: /^\/api\/invitations\/accept-existing$/,
    handler: (req, body) => dataService.acceptInvitationForExistingUser(body),
  },

  {
    method: "GET",
    pattern: /^\/api\/occupants$/,
    handler: (req, body, m, query) =>
      dataService.listOccupants(query.get("householdId"), { onlyUnclaimed: query.get("onlyUnclaimed") === "true" }),
  },
  { method: "POST", pattern: /^\/api\/occupants$/, handler: (req, body) => dataService.createOccupant(body) },
  {
    method: "POST",
    pattern: /^\/api\/occupants\/([^/]+)\/claim$/,
    handler: (req, body, m) => dataService.claimOccupant(m[1], body.userId),
  },

  { method: "GET", pattern: /^\/api\/floors$/, handler: (req, body, m, query) => dataService.listFloors(query.get("householdId")) },
  { method: "POST", pattern: /^\/api\/floors$/, handler: (req, body) => dataService.createFloor(body) },
  { method: "DELETE", pattern: /^\/api\/floors\/([^/]+)$/, handler: (req, body, m) => dataService.deleteFloor(m[1]) },

  { method: "GET", pattern: /^\/api\/rooms$/, handler: (req, body, m, query) => dataService.listRooms(query.get("householdId")) },
  { method: "POST", pattern: /^\/api\/rooms$/, handler: (req, body) => dataService.createRoom(body) },
  {
    method: "PATCH",
    pattern: /^\/api\/rooms\/([^/]+)\/position$/,
    handler: (req, body, m) => dataService.updateRoomPosition(m[1], body),
  },
  { method: "DELETE", pattern: /^\/api\/rooms\/([^/]+)$/, handler: (req, body, m) => dataService.deleteRoom(m[1]) },
];

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));

  if (!route) {
    logError("http.not_found", `${req.method} ${url.pathname}`);
    return sendJSON(res, 404, { success: false, error: `Route inconnue : ${req.method} ${url.pathname}` });
  }

  try {
    const body = ["POST", "PATCH"].includes(req.method) ? await readJSONBody(req) : {};
    const match = route.pattern.exec(url.pathname);
    const result = await route.handler(req, body, match, url.searchParams);
    const status = req.method === "POST" && result.success ? 201 : 200;
    logInfo("http.request", `${req.method} ${url.pathname} -> ${result.success ? "success" : "failure"}`);
    sendJSON(res, status, result);
  } catch (err) {
    logError("http.exception", `${req.method} ${url.pathname} : ${err.message}`);
    sendJSON(res, 500, { success: false, error: `Erreur serveur inattendue : ${err.message}` });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`API disponible sur http://localhost:${PORT}/api`);
  });
}

module.exports = server;
