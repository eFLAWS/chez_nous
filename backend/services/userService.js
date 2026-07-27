// services/userService.js
// Regroupe tout ce qui touche à l'identité et à l'appartenance à un
// foyer : comptes, authentification, invitations, occupants. Fichier
// volontairement plus gros que les autres (~330 lignes) — c'est le
// compromis du regroupement par domaine fonctionnel plutôt que par
// entité de données étroite. Quatre sections clairement délimitées
// ci-dessous pour compenser.
const { readStore, writeStore, genId, ok, fail } = require("../core/storageUtils");
const {
  validateUser,
  validateSignup,
  validateHousehold,
  validateInvitation,
  validateOccupant,
} = require("../validators");
const { hashPassword, verifyPassword, generateToken } = require("../auth");

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/* ne renvoie jamais passwordHash au-delà de la couche service */
function sanitizeUser(user) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

/* ================================ Comptes ================================ */
// CRUD utilisateur direct (sans mot de passe) — non exposé en route
// publique côté serveur, volontairement : la création réelle d'un
// compte passe par signup() ou acceptInvitation() ci-dessous, qui gèrent
// le mot de passe correctement.

async function createUser(input) {
  const read = await readStore();
  if (!read.success) return fail("user.create", read.error);

  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const candidate = {
    id: (input && input.id) || genId(),
    name: input && input.name,
    email: input && input.email,
    householdId: (input && input.householdId) ?? null,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateUser(candidate, { existingHouseholdIds });
  if (!valid) return fail("user.create.validation", errors.join(" "));

  if (read.data.users.some((u) => u.id === candidate.id)) {
    return fail("user.create.duplicate", `Un utilisateur avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, users: [...read.data.users, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("user.create.write", write.error);

  return ok("user.create", sanitizeUser(candidate));
}

async function listUsers() {
  const read = await readStore();
  if (!read.success) return fail("user.list", read.error);
  return ok("user.list", read.data.users.map(sanitizeUser), `${read.data.users.length} utilisateur(s).`);
}

/* ========================= Authentification (auth) ======================= */

/**
 * Crée un foyer et son premier utilisateur en une seule opération.
 * Le mot de passe en clair n'est JAMAIS écrit sur disque : seul son
 * empreinte salée (passwordHash) l'est, et jamais renvoyée à l'appelant.
 */
async function signup(input) {
  const { valid, errors } = validateSignup(input || {});
  if (!valid) return fail("auth.signup.validation", errors.join(" "));

  const read = await readStore();
  if (!read.success) return fail("auth.signup", read.error);

  const emailTaken = read.data.users.some(
    (u) => typeof u.email === "string" && u.email.toLowerCase() === input.email.toLowerCase()
  );
  if (emailTaken) return fail("auth.signup.duplicate", `L'adresse "${input.email}" est déjà utilisée.`);

  const userId = genId();
  const household = {
    id: genId(),
    name: (input.householdName && input.householdName.trim()) || `Foyer de ${input.name}`,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  const { valid: hValid, errors: hErrors } = validateHousehold(household);
  if (!hValid) return fail("auth.signup.household_validation", hErrors.join(" "));

  const user = {
    id: userId,
    name: input.name,
    email: input.email,
    householdId: household.id,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  const existingHouseholdIds = new Set([...read.data.households.map((h) => h.id), household.id]);
  const { valid: uValid, errors: uErrors } = validateUser(user, { existingHouseholdIds });
  if (!uValid) return fail("auth.signup.user_validation", uErrors.join(" "));

  const next = {
    ...read.data,
    households: [...read.data.households, household],
    users: [...read.data.users, user],
  };
  const write = await writeStore(next);
  if (!write.success) return fail("auth.signup.write", write.error);

  return ok("auth.signup", { user: sanitizeUser(user), household }, `Compte créé pour ${user.email}.`);
}

/**
 * Vérifie un mot de passe contre la fiche utilisateur stockée. Ne renvoie
 * jamais passwordHash, et donne volontairement le même message d'erreur
 * générique que l'email soit inconnu ou le mot de passe faux (pour ne pas
 * révéler quels emails sont enregistrés).
 */
async function login({ email, password } = {}) {
  if (typeof email !== "string" || !email.trim() || typeof password !== "string") {
    return fail("auth.login.validation", "email et password sont requis.");
  }

  const read = await readStore();
  if (!read.success) return fail("auth.login", read.error);

  const user = read.data.users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === email.toLowerCase());
  const GENERIC_ERROR = "Email ou mot de passe incorrect.";
  if (!user || !user.passwordHash) return fail("auth.login.invalid", GENERIC_ERROR);

  const okPassword = verifyPassword(password, user.passwordHash);
  if (!okPassword) return fail("auth.login.invalid", GENERIC_ERROR);

  return ok("auth.login", sanitizeUser(user), `Connexion réussie pour ${user.email}.`);
}

/* ============================== Invitations =============================== */

/**
 * Crée une invitation à rejoindre un foyer. Le jeton retourné devra être
 * transmis à l'utilisateur invité (par email, hors périmètre de ce
 * module — voir "Ce qui manque" dans le README).
 */
async function inviteUser({ householdId, email, invitedBy } = {}) {
  const read = await readStore();
  if (!read.success) return fail("invitation.create", read.error);

  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const candidate = { householdId, email, invitedBy };
  const { valid, errors } = validateInvitation(candidate, { existingHouseholdIds });
  if (!valid) return fail("invitation.create.validation", errors.join(" "));

  if (!read.data.users.some((u) => u.id === invitedBy)) {
    return fail("invitation.create.validation", `invitedBy "${invitedBy}" ne correspond à aucun utilisateur existant.`);
  }

  const alreadyMember = read.data.users.some(
    (u) => u.householdId === householdId && typeof u.email === "string" && u.email.toLowerCase() === email.toLowerCase()
  );
  if (alreadyMember) return fail("invitation.create.duplicate", "Cette personne fait déjà partie du foyer.");

  const pendingExists = read.data.invitations.some(
    (i) => i.householdId === householdId && i.email.toLowerCase() === email.toLowerCase() && i.status === "pending"
  );
  if (pendingExists) return fail("invitation.create.duplicate", "Une invitation est déjà en attente pour cette adresse.");

  const invitation = {
    id: genId(),
    householdId,
    email,
    invitedBy,
    token: generateToken(),
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
  };

  const next = { ...read.data, invitations: [...read.data.invitations, invitation] };
  const write = await writeStore(next);
  if (!write.success) return fail("invitation.create.write", write.error);

  return ok("invitation.create", invitation, `Invitation envoyée à ${email}.`);
}

/**
 * Accepte une invitation : crée le nouveau compte, l'attache au foyer de
 * l'invitation, puis marque celle-ci comme acceptée.
 */
async function acceptInvitation({ token, name, password } = {}) {
  if (typeof token !== "string" || !token.trim()) {
    return fail("invitation.accept.validation", "token manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("invitation.accept", read.error);

  const invitation = read.data.invitations.find((i) => i.token === token);
  if (!invitation) return fail("invitation.accept.not_found", "Invitation introuvable ou déjà utilisée.");
  if (invitation.status !== "pending") {
    return fail("invitation.accept.invalid_status", `Cette invitation n'est plus valide (statut : ${invitation.status}).`);
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    return fail("invitation.accept.expired", "Cette invitation a expiré.");
  }

  const accountExists = read.data.users.some(
    (u) => typeof u.email === "string" && u.email.toLowerCase() === invitation.email.toLowerCase()
  );
  if (accountExists) {
    return fail(
      "invitation.accept.account_exists",
      "Un compte existe déjà pour cette adresse — connectez-vous plutôt (acceptInvitationForExistingUser)."
    );
  }

  const { valid, errors } = validateSignup({ name, email: invitation.email, password });
  if (!valid) return fail("invitation.accept.validation", errors.join(" "));

  const user = {
    id: genId(),
    name,
    email: invitation.email,
    householdId: invitation.householdId,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const { valid: uValid, errors: uErrors } = validateUser(user, { existingHouseholdIds });
  if (!uValid) return fail("invitation.accept.user_validation", uErrors.join(" "));

  const invitations = read.data.invitations.map((i) =>
    i.id === invitation.id ? { ...i, status: "accepted", acceptedAt: new Date().toISOString() } : i
  );

  const next = { ...read.data, users: [...read.data.users, user], invitations };
  const write = await writeStore(next);
  if (!write.success) return fail("invitation.accept.write", write.error);

  return ok("invitation.accept", sanitizeUser(user), `${user.email} a rejoint le foyer.`);
}

/**
 * Regarde une invitation SANS rien modifier — permet au frontend de savoir
 * si l'email associé a déjà un compte, pour afficher soit un formulaire de
 * création de compte (acceptInvitation), soit un simple mot de passe
 * (acceptInvitationForExistingUser).
 */
async function getInvitationPreview(token) {
  if (typeof token !== "string" || !token.trim()) {
    return fail("invitation.preview.validation", "token manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("invitation.preview", read.error);

  const invitation = read.data.invitations.find((i) => i.token === token);
  if (!invitation) return fail("invitation.preview.not_found", "Invitation introuvable ou déjà utilisée.");
  if (invitation.status !== "pending") {
    return fail("invitation.preview.invalid_status", `Cette invitation n'est plus valide (statut : ${invitation.status}).`);
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    return fail("invitation.preview.expired", "Cette invitation a expiré.");
  }

  const accountExists = read.data.users.some(
    (u) => typeof u.email === "string" && u.email.toLowerCase() === invitation.email.toLowerCase()
  );

  return ok("invitation.preview", { email: invitation.email, householdId: invitation.householdId, accountExists });
}

/**
 * Pour un email qui a DÉJÀ un compte : vérifie le mot de passe (comme un
 * login normal) puis rattache ce compte au foyer de l'invitation. Choix
 * assumé (voir README) : un compte n'appartient qu'à un seul foyer à la
 * fois — accepter une nouvelle invitation change son foyer, ça ne l'ajoute
 * pas à une liste de foyers multiples.
 */
async function acceptInvitationForExistingUser({ token, password } = {}) {
  if (typeof token !== "string" || !token.trim()) {
    return fail("invitation.acceptExisting.validation", "token manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("invitation.acceptExisting", read.error);

  const invitation = read.data.invitations.find((i) => i.token === token);
  if (!invitation) return fail("invitation.acceptExisting.not_found", "Invitation introuvable ou déjà utilisée.");
  if (invitation.status !== "pending") {
    return fail(
      "invitation.acceptExisting.invalid_status",
      `Cette invitation n'est plus valide (statut : ${invitation.status}).`
    );
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    return fail("invitation.acceptExisting.expired", "Cette invitation a expiré.");
  }

  const userIndex = read.data.users.findIndex(
    (u) => typeof u.email === "string" && u.email.toLowerCase() === invitation.email.toLowerCase()
  );
  const GENERIC_ERROR = "Email ou mot de passe incorrect.";
  if (userIndex === -1) {
    return fail(
      "invitation.acceptExisting.no_account",
      "Aucun compte n'existe pour cette adresse — utilisez le formulaire de création de compte."
    );
  }
  const user = read.data.users[userIndex];
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return fail("invitation.acceptExisting.invalid_credentials", GENERIC_ERROR);
  }

  const updatedUser = { ...user, householdId: invitation.householdId };
  const users = [...read.data.users];
  users[userIndex] = updatedUser;

  const invitations = read.data.invitations.map((i) =>
    i.id === invitation.id ? { ...i, status: "accepted", acceptedAt: new Date().toISOString() } : i
  );

  const write = await writeStore({ ...read.data, users, invitations });
  if (!write.success) return fail("invitation.acceptExisting.write", write.error);

  return ok(
    "invitation.acceptExisting",
    sanitizeUser(updatedUser),
    `${updatedUser.email} a rejoint le nouveau foyer.`
  );
}

async function listInvitations(householdId) {
  const read = await readStore();
  if (!read.success) return fail("invitation.list", read.error);
  const all = read.data.invitations;
  const filtered = householdId ? all.filter((i) => i.householdId === householdId) : all;
  return ok("invitation.list", filtered, `${filtered.length} invitation(s).`);
}

/* ================================ Occupants ================================ */
// Un occupant est créé SANS compte (claimedByUserId = null) : c'est un
// "logement" pour un être vivant du foyer, humain ou animal. Un compte
// existant peut ensuite le réclamer via claimOccupant.

async function createOccupant(input) {
  const read = await readStore();
  if (!read.success) return fail("occupant.create", read.error);

  const existingHouseholdIds = new Set(read.data.households.map((h) => h.id));
  const existingUserIds = new Set(read.data.users.map((u) => u.id));

  const candidate = {
    id: (input && input.id) || genId(),
    name: input && input.name,
    householdId: input && input.householdId,
    type: input && input.type,
    species: (input && input.species) ?? null,
    claimedByUserId: null,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateOccupant(candidate, { existingHouseholdIds, existingUserIds });
  if (!valid) return fail("occupant.create.validation", errors.join(" "));

  if (read.data.occupants.some((o) => o.id === candidate.id)) {
    return fail("occupant.create.duplicate", `Un occupant avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, occupants: [...read.data.occupants, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("occupant.create.write", write.error);

  return ok("occupant.create", candidate);
}

/**
 * Relie un compte existant à un occupant humain non réclamé du même foyer.
 * Règles : un animal ne peut jamais être réclamé ; un occupant déjà
 * réclamé ne peut pas l'être une seconde fois ; un même compte ne peut
 * réclamer qu'un seul occupant (on est une seule personne à la fois).
 */
async function claimOccupant(occupantId, userId) {
  if (typeof occupantId !== "string" || !occupantId.trim()) {
    return fail("occupant.claim.validation", "occupantId manquant ou invalide.");
  }
  if (typeof userId !== "string" || !userId.trim()) {
    return fail("occupant.claim.validation", "userId manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("occupant.claim", read.error);

  const index = read.data.occupants.findIndex((o) => o.id === occupantId);
  if (index === -1) return fail("occupant.claim.not_found", `Aucun occupant trouvé avec l'id "${occupantId}".`);
  const occupant = read.data.occupants[index];

  if (occupant.type === "pet") {
    return fail("occupant.claim.invalid", "Un animal ne peut pas être réclamé par un compte.");
  }
  if (occupant.claimedByUserId) {
    return fail("occupant.claim.already_claimed", "Cet occupant est déjà attribué à quelqu'un.");
  }

  const user = read.data.users.find((u) => u.id === userId);
  if (!user) return fail("occupant.claim.not_found", `Aucun utilisateur trouvé avec l'id "${userId}".`);
  if (user.householdId !== occupant.householdId) {
    return fail("occupant.claim.wrong_household", "Cet utilisateur n'appartient pas au foyer de cet occupant.");
  }
  if (read.data.occupants.some((o) => o.claimedByUserId === userId)) {
    return fail("occupant.claim.already_has_one", "Ce compte a déjà réclamé un autre occupant.");
  }

  const occupants = [...read.data.occupants];
  occupants[index] = { ...occupant, claimedByUserId: userId };

  const write = await writeStore({ ...read.data, occupants });
  if (!write.success) return fail("occupant.claim.write", write.error);

  return ok("occupant.claim", occupants[index], `${occupant.name} est maintenant réclamé par ${user.name}.`);
}

async function listOccupants(householdId, { onlyUnclaimed } = {}) {
  const read = await readStore();
  if (!read.success) return fail("occupant.list", read.error);
  let list = read.data.occupants;
  if (householdId) list = list.filter((o) => o.householdId === householdId);
  if (onlyUnclaimed) list = list.filter((o) => o.type === "human" && !o.claimedByUserId);
  return ok("occupant.list", list, `${list.length} occupant(s).`);
}

module.exports = {
  createUser,
  listUsers,
  signup,
  login,
  inviteUser,
  acceptInvitation,
  getInvitationPreview,
  acceptInvitationForExistingUser,
  listInvitations,
  createOccupant,
  claimOccupant,
  listOccupants,
};
