// formValidators.js
// -----------------------------------------------------------------------
// DUPLICATION DÉLIBÉRÉE ET DOCUMENTÉE — pas un oubli.
//
// Jusqu'ici, les formulaires importaient directement backend/validators.js
// pour n'avoir qu'une seule source de vérité entre client et serveur.
// En testant pour de vrai (ce que je ne peux pas faire moi-même dans mon
// environnement de travail), il s'est avéré que Vite ne traite JAMAIS nos
// propres fichiers sources comme du CommonJS — il les sert tels quels au
// navigateur, en écriture ES module native. L'interopérabilité
// CommonJS → ESM que Vite applique automatiquement ne concerne que les
// dépendances tierces installées via npm (node_modules), jamais un fichier
// à nous importé par chemin relatif. Résultat : aucune variante d'import
// nommé, par défaut, ou "namespace" ne peut faire fonctionner un import
// direct de backend/validators.js de façon fiable depuis ce projet.
//
// Ce fichier copie donc, à la main, EXACTEMENT la logique des fonctions de
// backend/validators.js réellement utilisées par l'interface — pas plus.
// Si tu modifies une règle de validation (ex. la longueur minimale d'un
// mot de passe), il faut la répercuter ICI AUSSI. C'est le vrai coût de
// cette solution : documenté, pas cachés.
//
// Fonctions copiées depuis backend/validators.js : validateSignup,
// validateTask, validateProject, validateRoom, validateFloor, PET_SPECIES
// (+ les utilitaires internes isNonEmptyString/isISODate/isFiniteNumber).
// Pas copiées ici (jamais utilisées par un formulaire) : validateUser,
// validateHousehold, validateInvitation, validateOccupant.

function isNonEmptyString(v, maxLength = 500) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLength;
}

function isISODate(v) {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

const TASK_STATUSES = ["todo", "in_progress", "done"];
export const PET_SPECIES = ["chien", "chat", "oiseau", "rongeur", "poisson", "reptile", "autre"];

const MIN_PASSWORD_LENGTH = 8;

function isStrongPassword(password) {
  if (typeof password !== "string") return false;
  const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasMinLength && hasUppercase && hasSymbol;
}

export function validateSignup(input) {
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

export function validateProject(input, { existingUserIds } = {}) {
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

export function validateTask(input, { existingProjectIds, existingUserIds, existingRoomIds, existingPetIds } = {}) {
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

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MIN_ROOM_DIMENSION = 0.5;
const MAX_ROOM_DIMENSION = 30;

export function validateRoom(input, { existingHouseholdIds, existingFloorIds } = {}) {
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

  if (!isFiniteNumber(input.width) || input.width < MIN_ROOM_DIMENSION || input.width > MAX_ROOM_DIMENSION) {
    errors.push(`width : doit être un nombre entre ${MIN_ROOM_DIMENSION} et ${MAX_ROOM_DIMENSION} (mètres).`);
  }
  if (!isFiniteNumber(input.length) || input.length < MIN_ROOM_DIMENSION || input.length > MAX_ROOM_DIMENSION) {
    errors.push(`length : doit être un nombre entre ${MIN_ROOM_DIMENSION} et ${MAX_ROOM_DIMENSION} (mètres).`);
  }

  if (input.color !== undefined && input.color !== null && !HEX_COLOR_RE.test(input.color)) {
    errors.push("color : doit être une couleur hexadécimale valide (#RRGGBB ou #RGB).");
  }

  if (input.x !== undefined && !isFiniteNumber(input.x)) errors.push("x : doit être un nombre si fourni.");
  if (input.y !== undefined && !isFiniteNumber(input.y)) errors.push("y : doit être un nombre si fourni.");

  return { valid: errors.length === 0, errors };
}

const MIN_FLOOR_LEVEL = -5;
const MAX_FLOOR_LEVEL = 200;

export function validateFloor(input, { existingHouseholdIds } = {}) {
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

  return { valid: errors.length === 0, errors };
}
