// validators.js
// Validation stricte des données entrantes avant toute écriture.
// Volontairement sans dépendance externe (portable, aucun `npm install` requis) :
// vérifications de types et de forme explicites. Peut être remplacé par un
// schéma Zod/Joi plus tard sans changer la forme des retours ({ valid, errors }).

function isNonEmptyString(v, maxLength = 500) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLength;
}

function isISODate(v) {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

const TASK_STATUSES = ["todo", "in_progress", "done"];

function validateUser(input, { existingHouseholdIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (input.name !== undefined && typeof input.name === "string" && input.name.length > 500) {
    errors.push("name : ne doit pas dépasser 500 caractères.");
  } else if (!isNonEmptyString(input.name)) {
    errors.push("name : chaîne non vide requise.");
  }
  if (
    input.email !== undefined &&
    input.email !== null &&
    (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
  ) {
    errors.push("email : doit être une adresse valide si fournie.");
  }
  if (input.householdId !== undefined && input.householdId !== null) {
    if (!isNonEmptyString(input.householdId)) {
      errors.push("householdId : doit être une chaîne si fourni.");
    } else if (existingHouseholdIds && !existingHouseholdIds.has(input.householdId)) {
      errors.push(`householdId "${input.householdId}" ne correspond à aucun foyer existant.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateProject(input, { existingUserIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (input.name !== undefined && typeof input.name === "string" && input.name.length > 500) {
    errors.push("name : ne doit pas dépasser 500 caractères.");
  } else if (!isNonEmptyString(input.name)) {
    errors.push("name : chaîne non vide requise.");
  }
  if (!isNonEmptyString(input.ownerId)) {
    errors.push("ownerId : identifiant utilisateur requis.");
  } else if (existingUserIds && !existingUserIds.has(input.ownerId)) {
    errors.push(`ownerId "${input.ownerId}" ne correspond à aucun utilisateur existant.`);
  }
  return { valid: errors.length === 0, errors };
}

const MIN_RECURRENCE_DAYS = 1;
const MAX_RECURRENCE_DAYS = 365;
const MAX_DESCRIPTION_LENGTH = 2000;

function validateTask(input, { existingProjectIds, existingUserIds, existingRoomIds, existingPetIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (input.title !== undefined && typeof input.title === "string" && input.title.length > 500) {
    errors.push("title : ne doit pas dépasser 500 caractères.");
  } else if (!isNonEmptyString(input.title)) {
    errors.push("title : chaîne non vide requise.");
  }

  // projectId est désormais optionnel : une tâche peut tirer son contexte
  // d'une pièce (roomId) et/ou d'un animal (petId) plutôt que d'un projet.
  if (input.projectId !== undefined && input.projectId !== null) {
    if (!isNonEmptyString(input.projectId)) {
      errors.push("projectId : doit être une chaîne si fourni.");
    } else if (existingProjectIds && !existingProjectIds.has(input.projectId)) {
      errors.push(`projectId "${input.projectId}" ne correspond à aucun projet existant.`);
    }
  }

  if (input.roomId !== undefined && input.roomId !== null) {
    if (!isNonEmptyString(input.roomId)) {
      errors.push("roomId : doit être une chaîne si fourni.");
    } else if (existingRoomIds && !existingRoomIds.has(input.roomId)) {
      errors.push(`roomId "${input.roomId}" ne correspond à aucune pièce existante.`);
    }
  }

  if (input.petId !== undefined && input.petId !== null) {
    if (!isNonEmptyString(input.petId)) {
      errors.push("petId : doit être une chaîne si fourni.");
    } else if (existingPetIds && !existingPetIds.has(input.petId)) {
      errors.push(`petId "${input.petId}" ne correspond à aucun animal existant.`);
    }
  }

  if (input.assigneeId !== undefined && input.assigneeId !== null) {
    if (!isNonEmptyString(input.assigneeId)) {
      errors.push("assigneeId : doit être une chaîne si fourni.");
    } else if (existingUserIds && !existingUserIds.has(input.assigneeId)) {
      errors.push(`assigneeId "${input.assigneeId}" ne correspond à aucun utilisateur existant.`);
    }
  }

  if (input.recurrenceDays !== undefined && input.recurrenceDays !== null) {
    if (
      !isFiniteNumber(input.recurrenceDays) ||
      !Number.isInteger(input.recurrenceDays) ||
      input.recurrenceDays < MIN_RECURRENCE_DAYS ||
      input.recurrenceDays > MAX_RECURRENCE_DAYS
    ) {
      errors.push(`recurrenceDays : doit être un entier entre ${MIN_RECURRENCE_DAYS} et ${MAX_RECURRENCE_DAYS} si fourni.`);
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string" || input.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description : doit être une chaîne de ${MAX_DESCRIPTION_LENGTH} caractères maximum.`);
    }
  }

  if (input.status !== undefined && !TASK_STATUSES.includes(input.status)) {
    errors.push(`status : doit être l'une des valeurs suivantes : ${TASK_STATUSES.join(", ")}.`);
  }

  if (input.dueDate !== undefined && input.dueDate !== null && !isISODate(input.dueDate)) {
    errors.push("dueDate : doit être une date ISO valide si fournie.");
  }

  return { valid: errors.length === 0, errors };
}


/* ------------------------------ Foyer --------------------------------- */

function validateHousehold(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (!isNonEmptyString(input.name)) errors.push("name : chaîne non vide requise.");
  if (input.createdBy !== undefined && input.createdBy !== null && !isNonEmptyString(input.createdBy)) {
    errors.push("createdBy : doit être une chaîne si fourni.");
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------- Inscription / mot de passe ------------------ */
// Distinct de validateUser : celui-ci valide le formulaire d'INSCRIPTION
// (mot de passe en clair, encore jamais haché) ; validateUser valide la
// FICHE utilisateur telle que stockée (avec passwordHash, jamais le mot
// de passe en clair).

const MIN_PASSWORD_LENGTH = 8;

function isStrongPassword(password) {
  if (typeof password !== "string") return false;
  const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasMinLength && hasUppercase && hasSymbol;
}

function validateSignup(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.name)) errors.push("name : chaîne non vide requise.");
  if (!isNonEmptyString(input.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push("email : adresse valide requise.");
  }
  if (!isStrongPassword(input.password)) {
    errors.push(
      `password : au moins ${MIN_PASSWORD_LENGTH} caractères, avec au moins une majuscule et un symbole.`
    );
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Valide un nouveau mot de passe seul (réinitialisation) — mêmes règles
 * de force que validateSignup, sans nom/email à vérifier.
 */
function validateNewPassword(password) {
  const errors = [];
  if (!isStrongPassword(password)) {
    errors.push(
      `password : au moins ${MIN_PASSWORD_LENGTH} caractères, avec au moins une majuscule et un symbole.`
    );
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------ Invitation ------------------------------ */

function validateInvitation(input, { existingHouseholdIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push("email : adresse valide requise.");
  }
  if (!isNonEmptyString(input.householdId)) {
    errors.push("householdId : identifiant de foyer requis.");
  } else if (existingHouseholdIds && !existingHouseholdIds.has(input.householdId)) {
    errors.push(`householdId "${input.householdId}" ne correspond à aucun foyer existant.`);
  }
  if (!isNonEmptyString(input.invitedBy)) {
    errors.push("invitedBy : identifiant de l'utilisateur invitant requis.");
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------- Occupants -------------------------------- */
// Un "occupant" est un être vivant du foyer — humain ou animal — distinct
// d'un compte utilisateur. On peut créer un occupant humain sans qu'il ait
// encore de compte (ex. avant qu'il rejoigne), puis un compte peut le
// "réclamer" (claimedByUserId) pour dire "cet occupant, c'est moi". Un
// animal ne peut jamais être réclamé : il n'a pas de compte, par définition.

const OCCUPANT_TYPES = ["human", "pet"];
const PET_SPECIES = ["chien", "chat", "oiseau", "rongeur", "poisson", "reptile", "autre"];
// PROPRIETAIRE : seul habilité à modifier le plan, transférer la
// propriété, expulser un membre, supprimer le foyer. LOCATAIRE : accès
// complet aux autres modules (tâches...), plan en lecture seule. Voir
// la conversation (USER_FLOW_ONBOARDING.md / DATA_MODEL.md fournis par
// l'utilisateur) pour la matrice de droits complète.
const OCCUPANT_ROLES = ["PROPRIETAIRE", "LOCATAIRE"];

function validateOccupant(input, { existingHouseholdIds, existingUserIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (!isNonEmptyString(input.name)) errors.push("name : chaîne non vide requise.");

  if (!isNonEmptyString(input.householdId)) {
    errors.push("householdId : identifiant de foyer requis.");
  } else if (existingHouseholdIds && !existingHouseholdIds.has(input.householdId)) {
    errors.push(`householdId "${input.householdId}" ne correspond à aucun foyer existant.`);
  }

  if (!OCCUPANT_TYPES.includes(input.type)) {
    errors.push(`type : doit être l'une des valeurs suivantes : ${OCCUPANT_TYPES.join(", ")}.`);
  }

  if (input.type === "pet") {
    if (input.species !== undefined && input.species !== null && !PET_SPECIES.includes(input.species)) {
      errors.push(`species : doit être l'une des valeurs suivantes : ${PET_SPECIES.join(", ")}.`);
    }
    if (input.claimedByUserId) {
      errors.push("claimedByUserId : un animal ne peut pas être réclamé par un compte.");
    }
  }

  if (input.type === "human" && input.species !== undefined && input.species !== null) {
    errors.push("species : ne s'applique qu'aux occupants de type \"pet\".");
  }

  // Rôle (nouveau, voir la conversation) : ne concerne que les occupants
  // humains — un animal ne peut jamais avoir d'autorité sur le foyer.
  if (input.type === "human") {
    if (!OCCUPANT_ROLES.includes(input.role)) {
      errors.push(`role : doit être l'une des valeurs suivantes : ${OCCUPANT_ROLES.join(", ")}.`);
    }
  } else if (input.role !== undefined && input.role !== null) {
    errors.push("role : ne s'applique qu'aux occupants de type \"human\".");
  }

  if (input.claimedByUserId !== undefined && input.claimedByUserId !== null) {
    if (!isNonEmptyString(input.claimedByUserId)) {
      errors.push("claimedByUserId : doit être une chaîne si fourni.");
    } else if (existingUserIds && !existingUserIds.has(input.claimedByUserId)) {
      errors.push(`claimedByUserId "${input.claimedByUserId}" ne correspond à aucun utilisateur existant.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/* --------------------------------- Étages --------------------------------- */
// Facultatifs : un logement de plain-pied n'a pas besoin d'en déclarer.
// Une pièce sans floorId est simplement considérée comme "sans étage" —
// et ce statut compte comme un groupe à part entière pour les collisions
// (voir dataService.js : deux pièces à des étages différents peuvent
// partager les mêmes coordonnées sans se chevaucher réellement).

const MIN_FLOOR_LEVEL = -5;
const MAX_FLOOR_LEVEL = 200;
const MAX_GRID_DIMENSION = 200; // cases de grille — largement au-dessus de tout plan réaliste

function validateFloor(input, { existingHouseholdIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (!isNonEmptyString(input.name)) errors.push("name : chaîne non vide requise.");

  if (!isNonEmptyString(input.householdId)) {
    errors.push("householdId : identifiant de foyer requis.");
  } else if (existingHouseholdIds && !existingHouseholdIds.has(input.householdId)) {
    errors.push(`householdId "${input.householdId}" ne correspond à aucun foyer existant.`);
  }

  if (
    input.level === undefined ||
    input.level === null ||
    typeof input.level !== "number" ||
    !Number.isInteger(input.level) ||
    input.level < MIN_FLOOR_LEVEL ||
    input.level > MAX_FLOOR_LEVEL
  ) {
    errors.push(`level : doit être un entier entre ${MIN_FLOOR_LEVEL} et ${MAX_FLOOR_LEVEL} (0 = rez-de-chaussée).`);
  }

  // Champs ajoutés pour correspondre au modèle du frontend (Plan 2D /
  // Vue 2.5D — voir la conversation) : tous optionnels à la création
  // (un étage peut exister sans qu'aucune pièce n'y ait encore été
  // tracée, donc sans dimensions de grille connues), mais valides s'ils
  // sont fournis.
  if (input.shortLabel !== undefined && input.shortLabel !== null && !isNonEmptyString(input.shortLabel, 50)) {
    errors.push("shortLabel : chaîne non vide (50 caractères max) si fournie.");
  }

  if (input.avatarStart !== undefined && input.avatarStart !== null) {
    const a = input.avatarStart;
    if (
      !a ||
      typeof a !== "object" ||
      Array.isArray(a) ||
      typeof a.x !== "number" ||
      !Number.isInteger(a.x) ||
      typeof a.y !== "number" ||
      !Number.isInteger(a.y)
    ) {
      errors.push("avatarStart : doit être un objet { x, y } avec des entiers si fourni.");
    }
  }

  if (input.gridWidth !== undefined && input.gridWidth !== null) {
    if (!Number.isInteger(input.gridWidth) || input.gridWidth < 1 || input.gridWidth > MAX_GRID_DIMENSION) {
      errors.push(`gridWidth : doit être un entier entre 1 et ${MAX_GRID_DIMENSION} si fourni.`);
    }
  }
  if (input.gridHeight !== undefined && input.gridHeight !== null) {
    if (!Number.isInteger(input.gridHeight) || input.gridHeight < 1 || input.gridHeight > MAX_GRID_DIMENSION) {
      errors.push(`gridHeight : doit être un entier entre 1 et ${MAX_GRID_DIMENSION} si fourni.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/* --------------------------------- Pièces --------------------------------- */
// Le plan de l'appartement : chaque pièce a un nom, un type/icône
// (Salon, Cuisine...), des dimensions en CASES DE GRILLE (width/height,
// entiers — 1 case = 1 mètre par convention, voir layoutGeneration.js
// côté frontend, TILE_SIZE_METERS), une couleur, une position (X, Y) —
// calculée automatiquement à la création, modifiable par
// glisser-déposer — et optionnellement un étage (floorId).
//
// RENOMMÉ `length` -> `height` (voir la conversation) : pour
// correspondre au modèle du frontend (LayoutEditor.jsx). Les anciens
// composants du floorplan historique (`components/floorplan/`) ont été
// mis à jour en conséquence, pas laissés cassés silencieusement.

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MIN_ROOM_DIMENSION = 1; // cases de grille (= mètres)
const MAX_ROOM_DIMENSION = 30; // cases de grille (= mètres)

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidRoomDimension(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= MIN_ROOM_DIMENSION && v <= MAX_ROOM_DIMENSION;
}

function validateRoom(input, { existingHouseholdIds, existingFloorIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");
  if (!isNonEmptyString(input.name)) errors.push("name : chaîne non vide requise.");

  if (!isNonEmptyString(input.householdId)) {
    errors.push("householdId : identifiant de foyer requis.");
  } else if (existingHouseholdIds && !existingHouseholdIds.has(input.householdId)) {
    errors.push(`householdId "${input.householdId}" ne correspond à aucun foyer existant.`);
  }

  if (input.floorId !== undefined && input.floorId !== null) {
    if (!isNonEmptyString(input.floorId)) {
      errors.push("floorId : doit être une chaîne si fourni.");
    } else if (existingFloorIds && !existingFloorIds.has(input.floorId)) {
      errors.push(`floorId "${input.floorId}" ne correspond à aucun étage existant.`);
    }
  }

  if (!isValidRoomDimension(input.width)) {
    errors.push(`width : doit être un entier entre ${MIN_ROOM_DIMENSION} et ${MAX_ROOM_DIMENSION} (cases de grille).`);
  }
  if (!isValidRoomDimension(input.height)) {
    errors.push(`height : doit être un entier entre ${MIN_ROOM_DIMENSION} et ${MAX_ROOM_DIMENSION} (cases de grille).`);
  }

  // `type`/`icon` (nouveau) : la liste précise des types valides
  // (Salon, Cuisine...) vit côté frontend (roomTypes.js) — le backend ne
  // la duplique volontairement pas, pour ne jamais risquer une dérive
  // entre deux listes qui devraient rester identiques. Juste une chaîne
  // non vide, pas une liste fermée vérifiée ici.
  if (!isNonEmptyString(input.type, 50)) {
    errors.push("type : chaîne non vide (50 caractères max) requise.");
  }
  if (input.icon !== undefined && input.icon !== null && !isNonEmptyString(input.icon, 10)) {
    errors.push("icon : chaîne non vide (10 caractères max) si fournie.");
  }

  if (input.color !== undefined && input.color !== null && !HEX_COLOR_RE.test(input.color)) {
    errors.push("color : doit être une couleur hexadécimale valide (#RRGGBB ou #RGB).");
  }

  if (input.x !== undefined && (!isFiniteNumber(input.x) || !Number.isInteger(input.x))) {
    errors.push("x : doit être un entier si fourni.");
  }
  if (input.y !== undefined && (!isFiniteNumber(input.y) || !Number.isInteger(input.y))) {
    errors.push("y : doit être un entier si fourni.");
  }

  return { valid: errors.length === 0, errors };
}

/* --------------------------------- Portes ---------------------------------- */
// Nouveau concept (voir la conversation) : une porte est une case de
// mur (x, y) transformée en passage libre entre deux pièces, sur un
// étage donné — voir generateFloorTiles côté frontend, qui dérive les
// murs/portes à partir des pièces + de cette liste de portes.
// Volontairement minimal : juste la position, pas de validation des
// deux pièces qu'elle relie (le frontend calcule ça lui-même,
// géométriquement, à partir des rectangles de pièces).

function validateDoor(input, { existingHouseholdIds, existingFloorIds } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Le corps de la requête doit être un objet."] };
  }
  if (!isNonEmptyString(input.id)) errors.push("id : chaîne non vide requise.");

  if (!isNonEmptyString(input.householdId)) {
    errors.push("householdId : identifiant de foyer requis.");
  } else if (existingHouseholdIds && !existingHouseholdIds.has(input.householdId)) {
    errors.push(`householdId "${input.householdId}" ne correspond à aucun foyer existant.`);
  }

  if (!isNonEmptyString(input.floorId)) {
    errors.push("floorId : identifiant d'étage requis.");
  } else if (existingFloorIds && !existingFloorIds.has(input.floorId)) {
    errors.push(`floorId "${input.floorId}" ne correspond à aucun étage existant.`);
  }

  if (typeof input.x !== "number" || !Number.isInteger(input.x)) errors.push("x : doit être un entier.");
  if (typeof input.y !== "number" || !Number.isInteger(input.y)) errors.push("y : doit être un entier.");

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateUser,
  validateProject,
  validateTask,
  validateHousehold,
  validateSignup,
  validateNewPassword,
  validateInvitation,
  validateOccupant,
  validateFloor,
  validateRoom,
  validateDoor,
  TASK_STATUSES,
  PET_SPECIES,
  OCCUPANT_TYPES,
  OCCUPANT_ROLES,
  MIN_ROOM_DIMENSION,
  MAX_ROOM_DIMENSION,
  MAX_GRID_DIMENSION,
  MIN_FLOOR_LEVEL,
  MAX_FLOOR_LEVEL,
  MIN_RECURRENCE_DAYS,
  MAX_RECURRENCE_DAYS,
  MAX_DESCRIPTION_LENGTH,
  isStrongPassword,
};
