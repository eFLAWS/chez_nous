// dataService.js
// Façade fine : réexporte les 4 services de services/, aucune logique
// propre. Rien d'autre dans le projet n'a besoin de changer — server.js
// et tous les fichiers de tests continuent de faire
// require("./dataService") exactement comme avant.
//
// La logique métier réelle vit dans services/, un fichier par domaine
// fonctionnel :
//   userService.js     — comptes, authentification, invitations, occupants
//   roomService.js      — étages, pièces, coordonnées
//   taskService.js        — tâches, récurrences, affectations
//   projectService.js       — projets, foyers
// Utilitaires partagés (genId, ok/fail, lecture/écriture du stockage) :
// core/storageUtils.js.
module.exports = {
  ...require("./services/userService"),
  ...require("./services/roomService"),
  ...require("./services/taskService"),
  ...require("./services/projectService"),
};
