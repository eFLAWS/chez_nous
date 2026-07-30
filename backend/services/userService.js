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
  isStrongPassword,
} = require("../validators");
const { hashPassword, verifyPassword, generateToken } = require("../auth");
const { logInfo } = require("../logger");

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 heure — plus court qu'une invitation, par sécurité

/* --------------------- Limitation des tentatives de connexion -------------- */
// En mémoire, PAS persisté sur disque : un redémarrage du serveur remet les
// compteurs à zéro, ce qui est acceptable à notre échelle. Partagé entre
// login() et acceptInvitationForExistingUser() (toutes deux vérifient un
// mot de passe existant) via la même clé (email en minuscules).
const loginAttempts = new Map(); // email -> { count, lockedUntil }
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginLock(email) {
  const attempt = loginAttempts.get(email);
  if (attempt && attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    return `Trop de tentatives échouées. Réessayez dans ${minutesLeft} minute(s).`;
  }
  return null;
}

function recordLoginFailure(email) {
  const current = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  current.count += 1;
  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  loginAttempts.set(email, current);
}

function clearLoginAttempts(email) {
  loginAttempts.delete(email);
}

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

  // Occupant auto-créé ET auto-réclamé pour le nouveau compte, dans son
  // propre nouveau foyer — "un compte = un occupant" (voir la
  // conversation) : sans ça, `listHouseholdsForUser` ne retrouverait
  // jamais CE foyer précis pour ce compte, même s'il vient de le créer.
  // Cohérent avec `createHouseholdForUser`, qui fait la même chose pour
  // un foyer supplémentaire créé plus tard.
  const occupant = {
    id: genId(),
    name: user.name,
    householdId: household.id,
    type: "human",
    species: null,
    // Fondateur du foyer -> PROPRIETAIRE (voir la conversation) : seul
    // habilité à modifier le plan, transférer la propriété, etc.
    role: "PROPRIETAIRE",
    claimedByUserId: userId,
    createdAt: new Date().toISOString(),
  };
  const existingUserIds = new Set([...read.data.users.map((u) => u.id), userId]);
  const { valid: oValid, errors: oErrors } = validateOccupant(occupant, { existingHouseholdIds, existingUserIds });
  if (!oValid) return fail("auth.signup.occupant_validation", oErrors.join(" "));

  const next = {
    ...read.data,
    households: [...read.data.households, household],
    users: [...read.data.users, user],
    occupants: [...read.data.occupants, occupant],
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

  const key = email.toLowerCase();
  const lockMessage = checkLoginLock(key);
  if (lockMessage) return fail("auth.login.locked", lockMessage);

  const read = await readStore();
  if (!read.success) return fail("auth.login", read.error);

  const user = read.data.users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === email.toLowerCase());
  const GENERIC_ERROR = "Email ou mot de passe incorrect.";
  if (!user || !user.passwordHash) {
    recordLoginFailure(key);
    return fail("auth.login.invalid", GENERIC_ERROR);
  }

  const okPassword = verifyPassword(password, user.passwordHash);
  if (!okPassword) {
    recordLoginFailure(key);
    return fail("auth.login.invalid", GENERIC_ERROR);
  }

  clearLoginAttempts(key);
  return ok("auth.login", sanitizeUser(user), `Connexion réussie pour ${user.email}.`);
}

/* ------------------------ Réinitialisation du mot de passe ------------------ */
// Comme aucun vrai email n'est envoyé (voir README), le jeton de
// réinitialisation n'est JAMAIS renvoyé dans la réponse HTTP — seulement
// journalisé côté serveur (logInfo, visible dans le terminal qui fait
// tourner `node server.js`). Le renvoyer au navigateur permettrait à
// n'importe qui connaissant un email de réinitialiser son mot de passe
// sans son accord. La réponse est aussi volontairement identique que le
// compte existe ou non, pour ne pas révéler quels emails sont enregistrés.

async function requestPasswordReset(email) {
  const GENERIC_MESSAGE = "Si un compte existe pour cette adresse, un code de réinitialisation a été généré.";
  if (typeof email !== "string" || !email.trim()) {
    return fail("auth.passwordReset.request.validation", "email requis.");
  }

  const read = await readStore();
  if (!read.success) return fail("auth.passwordReset.request", read.error);

  const user = read.data.users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return ok("auth.passwordReset.request", { message: GENERIC_MESSAGE });
  }

  const reset = {
    id: genId(),
    userId: user.id,
    token: generateToken(),
    used: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
  };

  const next = { ...read.data, passwordResets: [...read.data.passwordResets, reset] };
  const write = await writeStore(next);
  if (!write.success) return fail("auth.passwordReset.request.write", write.error);

  logInfo(
    "auth.passwordReset.token_generated",
    `Jeton de réinitialisation pour ${user.email} : ${reset.token} (expire dans 1h)`
  );

  return ok("auth.passwordReset.request", { message: GENERIC_MESSAGE });
}

async function resetPassword({ token, newPassword } = {}) {
  if (typeof token !== "string" || !token.trim()) {
    return fail("auth.passwordReset.confirm.validation", "token manquant ou invalide.");
  }
  if (!isStrongPassword(newPassword)) {
    return fail(
      "auth.passwordReset.confirm.validation",
      "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule et un symbole."
    );
  }

  const read = await readStore();
  if (!read.success) return fail("auth.passwordReset.confirm", read.error);

  const resetIndex = read.data.passwordResets.findIndex((r) => r.token === token);
  if (resetIndex === -1) {
    return fail("auth.passwordReset.confirm.not_found", "Code de réinitialisation invalide ou déjà utilisé.");
  }
  const reset = read.data.passwordResets[resetIndex];
  if (reset.used) return fail("auth.passwordReset.confirm.used", "Ce code a déjà été utilisé.");
  if (new Date(reset.expiresAt).getTime() < Date.now()) {
    return fail("auth.passwordReset.confirm.expired", "Ce code a expiré.");
  }

  const userIndex = read.data.users.findIndex((u) => u.id === reset.userId);
  if (userIndex === -1) return fail("auth.passwordReset.confirm.not_found", "Compte introuvable.");

  const users = [...read.data.users];
  users[userIndex] = { ...users[userIndex], passwordHash: hashPassword(newPassword) };

  const passwordResets = [...read.data.passwordResets];
  passwordResets[resetIndex] = { ...reset, used: true };

  const write = await writeStore({ ...read.data, users, passwordResets });
  if (!write.success) return fail("auth.passwordReset.confirm.write", write.error);

  clearLoginAttempts(users[userIndex].email.toLowerCase());

  return ok("auth.passwordReset.confirm", { email: users[userIndex].email }, "Mot de passe réinitialisé.");
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

  const key = invitation.email.toLowerCase();
  const lockMessage = checkLoginLock(key);
  if (lockMessage) return fail("invitation.acceptExisting.locked", lockMessage);

  const user = read.data.users[userIndex];
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    recordLoginFailure(key);
    return fail("invitation.acceptExisting.invalid_credentials", GENERIC_ERROR);
  }
  clearLoginAttempts(key);

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
    // Rôle (nouveau, voir la conversation) : un occupant humain ajouté
    // ainsi (pas le fondateur, créé séparément via signup/
    // createHouseholdForUser avec PROPRIETAIRE) est un membre ordinaire
    // par défaut — LOCATAIRE, sauf si explicitement précisé autrement.
    // Un animal n'a jamais de rôle (validateOccupant l'exige).
    role: (input && input.type) === "human" ? (input && input.role) || "LOCATAIRE" : null,
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
 * Relie un compte existant à un occupant humain non réclamé.
 *
 * MULTI-FOYERS (voir la conversation) : un même compte peut désormais
 * réclamer un occupant dans PLUSIEURS foyers différents — la garde
 * précédente ("already_has_one", un compte ne pouvait réclamer qu'UN
 * SEUL occupant, tous foyers confondus) et la vérification
 * `user.householdId !== occupant.householdId` (qui supposait qu'un
 * compte n'appartient qu'à un seul foyer, le sien) ont toutes les deux
 * été retirées. `user.householdId` reste le foyer "par défaut" (celui
 * créé à l'inscription), mais n'est plus la SEULE source de vérité sur
 * les foyers d'un compte — la vraie liste se calcule maintenant via
 * `listHouseholdsForUser` (voir plus bas), qui interroge `occupants`.
 *
 * Règles qui restent : un animal ne peut jamais être réclamé ; un
 * occupant déjà réclamé ne peut pas l'être une seconde fois ; UN COMPTE
 * NE PEUT RÉCLAMER QU'UN SEUL OCCUPANT PAR FOYER (pas question de
 * réclamer deux occupants différents du MÊME foyer — toujours "une
 * seule personne à la fois", mais foyer par foyer).
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

  // Un seul occupant réclamé PAR FOYER (pas "un seul, tous foyers
  // confondus" comme avant) — toujours "une seule personne à la fois",
  // mais foyer par foyer.
  const alreadyHasOneInThisHousehold = read.data.occupants.some(
    (o) => o.claimedByUserId === userId && o.householdId === occupant.householdId
  );
  if (alreadyHasOneInThisHousehold) {
    return fail("occupant.claim.already_has_one", "Ce compte a déjà réclamé un autre occupant dans ce foyer.");
  }

  const occupants = [...read.data.occupants];
  occupants[index] = { ...occupant, claimedByUserId: userId };

  const write = await writeStore({ ...read.data, occupants });
  if (!write.success) return fail("occupant.claim.write", write.error);

  return ok("occupant.claim", occupants[index], `${occupant.name} est maintenant réclamé par ${user.name}.`);
}

/**
 * Crée un NOUVEAU foyer pour un compte déjà existant (nouveau, voir la
 * conversation) — jusqu'ici, un foyer n'était créé qu'à l'inscription
 * (un seul, pour le tout premier compte). Crée le foyer ET un occupant
 * humain pour le créateur, réclamé immédiatement en son nom (il est
 * automatiquement occupant de son propre nouveau foyer). N'échoue PAS
 * si le compte est déjà occupant d'autres foyers — c'est exactement le
 * scénario multi-foyers que ce chantier vient de rendre possible.
 */
async function createHouseholdForUser({ userId, householdName } = {}) {
  if (typeof userId !== "string" || !userId.trim()) {
    return fail("household.createForUser.validation", "userId manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("household.createForUser", read.error);

  const user = read.data.users.find((u) => u.id === userId);
  if (!user) return fail("household.createForUser.not_found", `Aucun utilisateur trouvé avec l'id "${userId}".`);

  const household = {
    id: genId(),
    name: (householdName && householdName.trim()) || `Foyer de ${user.name}`,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  const { valid: hValid, errors: hErrors } = validateHousehold(household);
  if (!hValid) return fail("household.createForUser.household_validation", hErrors.join(" "));

  const occupant = {
    id: genId(),
    name: user.name,
    householdId: household.id,
    type: "human",
    species: null,
    // Fondateur de CE foyer -> PROPRIETAIRE (voir la conversation).
    role: "PROPRIETAIRE",
    claimedByUserId: userId, // réclamé immédiatement par son créateur
    createdAt: new Date().toISOString(),
  };
  const existingHouseholdIds = new Set([...read.data.households.map((h) => h.id), household.id]);
  const existingUserIds = new Set(read.data.users.map((u) => u.id));
  const { valid: oValid, errors: oErrors } = validateOccupant(occupant, { existingHouseholdIds, existingUserIds });
  if (!oValid) return fail("household.createForUser.occupant_validation", oErrors.join(" "));

  const next = {
    ...read.data,
    households: [...read.data.households, household],
    occupants: [...read.data.occupants, occupant],
  };
  const write = await writeStore(next);
  if (!write.success) return fail("household.createForUser.write", write.error);

  return ok("household.createForUser", { household, occupant }, `Foyer "${household.name}" créé.`);
}

/**
 * Liste tous les foyers dont un compte est occupant (nouveau, voir la
 * conversation) — la vraie source de vérité pour "quels foyers cette
 * personne peut-elle voir", maintenant qu'un compte peut en avoir
 * plusieurs. Retourne les objets `household` complets (pas juste des
 * ids), dédupliqués (un compte ne devrait avoir qu'un occupant par
 * foyer, mais on déduplique quand même par sécurité).
 */
async function listHouseholdsForUser(userId) {
  if (typeof userId !== "string" || !userId.trim()) {
    return fail("household.listForUser.validation", "userId manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("household.listForUser", read.error);

  const householdIds = new Set(
    read.data.occupants.filter((o) => o.claimedByUserId === userId).map((o) => o.householdId)
  );
  const households = read.data.households.filter((h) => householdIds.has(h.id));

  return ok("household.listForUser", households, `${households.length} foyer(s).`);
}

async function listOccupants(householdId, { onlyUnclaimed } = {}) {
  const read = await readStore();
  if (!read.success) return fail("occupant.list", read.error);
  let list = read.data.occupants;
  if (householdId) list = list.filter((o) => o.householdId === householdId);
  if (onlyUnclaimed) list = list.filter((o) => o.type === "human" && !o.claimedByUserId);
  return ok("occupant.list", list, `${list.length} occupant(s).`);
}

/**
 * "Quitter" un foyer (voir la conversation) : déréclame l'occupant de ce
 * compte dans CE foyer précis (remet `claimedByUserId` à `null`), sans
 * rien supprimer d'autre — le foyer et son plan restent intacts pour les
 * autres occupants. Distinct de `deleteHousehold` (suppression réelle,
 * réservée au dernier occupant).
 */
async function leaveHousehold(householdId, userId) {
  if (typeof householdId !== "string" || !householdId.trim()) {
    return fail("household.leave.validation", "householdId manquant ou invalide.");
  }
  if (typeof userId !== "string" || !userId.trim()) {
    return fail("household.leave.validation", "userId manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("household.leave", read.error);

  const index = read.data.occupants.findIndex((o) => o.householdId === householdId && o.claimedByUserId === userId);
  if (index === -1) {
    return fail("household.leave.not_found", "Ce compte n'est occupant d'aucun occupant réclamé dans ce foyer.");
  }

  // Un PROPRIETAIRE ne peut pas quitter le foyer tant que d'autres
  // occupants y sont encore réclamés — voir la conversation
  // (DATA_MODEL.md fourni par l'utilisateur, section "Logique de départ
  // d'un foyer") : le foyer se retrouverait sans personne habilitée à
  // modifier le plan. Doit d'abord transférer la propriété
  // (transferOwnership) à l'un des autres occupants.
  if (read.data.occupants[index].role === "PROPRIETAIRE") {
    const otherClaimedOccupants = read.data.occupants.filter(
      (o) => o.householdId === householdId && o.type === "human" && o.claimedByUserId && o.claimedByUserId !== userId
    );
    if (otherClaimedOccupants.length > 0) {
      return fail(
        "household.leave.must_transfer_first",
        "Vous êtes propriétaire de ce foyer — transférez d'abord la propriété à un autre occupant avant de le quitter."
      );
    }
  }

  const occupants = [...read.data.occupants];
  occupants[index] = { ...occupants[index], claimedByUserId: null };

  const write = await writeStore({ ...read.data, occupants });
  if (!write.success) return fail("household.leave.write", write.error);

  return ok("household.leave", { householdId, userId }, "Foyer quitté.");
}

/**
 * Transfère le rôle PROPRIETAIRE d'un compte à un autre occupant du MÊME
 * foyer (voir la conversation) — l'ancien propriétaire redevient
 * LOCATAIRE, ne perd pas son occupant pour autant (transférer n'est pas
 * quitter ; les deux actions restent séparées et composables — un
 * propriétaire peut transférer sans partir, ou transférer PUIS quitter
 * via un second appel à leaveHousehold).
 */
async function transferOwnership(householdId, fromUserId, toUserId) {
  if (typeof householdId !== "string" || !householdId.trim()) {
    return fail("household.transferOwnership.validation", "householdId manquant ou invalide.");
  }
  if (typeof fromUserId !== "string" || !fromUserId.trim() || typeof toUserId !== "string" || !toUserId.trim()) {
    return fail("household.transferOwnership.validation", "fromUserId/toUserId manquant ou invalide.");
  }
  if (fromUserId === toUserId) {
    return fail("household.transferOwnership.validation", "Impossible de transférer la propriété à soi-même.");
  }

  const read = await readStore();
  if (!read.success) return fail("household.transferOwnership", read.error);

  const fromIndex = read.data.occupants.findIndex((o) => o.householdId === householdId && o.claimedByUserId === fromUserId);
  if (fromIndex === -1 || read.data.occupants[fromIndex].role !== "PROPRIETAIRE") {
    return fail("household.transferOwnership.forbidden", "Ce compte n'est pas propriétaire de ce foyer.");
  }

  const toIndex = read.data.occupants.findIndex((o) => o.householdId === householdId && o.claimedByUserId === toUserId);
  if (toIndex === -1) {
    return fail("household.transferOwnership.target_not_found", "Le compte cible n'est pas occupant réclamé de ce foyer.");
  }

  const occupants = [...read.data.occupants];
  occupants[fromIndex] = { ...occupants[fromIndex], role: "LOCATAIRE" };
  occupants[toIndex] = { ...occupants[toIndex], role: "PROPRIETAIRE" };

  const write = await writeStore({ ...read.data, occupants });
  if (!write.success) return fail("household.transferOwnership.write", write.error);

  return ok("household.transferOwnership", { newOwner: occupants[toIndex], previousOwner: occupants[fromIndex] });
}

/**
 * Supprime un foyer RÉELLEMENT, en cascade (occupants, étages, pièces,
 * portes, tâches rattachées à ces pièces) — réservé au DERNIER occupant
 * humain réclamé. Le compte du nombre d'occupants restants est TOUJOURS
 * recalculé ici, jamais fait confiance au frontend (voir la
 * conversation) : un frontend buggé ou malveillant ne doit jamais
 * pouvoir effacer les données d'un foyer encore occupé par quelqu'un
 * d'autre en mentant sur le nombre d'occupants.
 */
async function deleteHousehold(householdId, userId) {
  if (typeof householdId !== "string" || !householdId.trim()) {
    return fail("household.delete.validation", "householdId manquant ou invalide.");
  }
  if (typeof userId !== "string" || !userId.trim()) {
    return fail("household.delete.validation", "userId manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("household.delete", read.error);

  const household = read.data.households.find((h) => h.id === householdId);
  if (!household) return fail("household.delete.not_found", `Aucun foyer trouvé avec l'id "${householdId}".`);

  const requestingOccupant = read.data.occupants.find((o) => o.householdId === householdId && o.claimedByUserId === userId);
  if (!requestingOccupant) {
    return fail("household.delete.forbidden", "Ce compte n'est pas occupant de ce foyer.");
  }
  // Voir la conversation (DATA_MODEL.md fourni par l'utilisateur,
  // matrice de droits) : "Supprimer le foyer" est réservé au
  // PROPRIETAIRE, pas à n'importe quel occupant — même si, en pratique,
  // le dernier occupant restant EST généralement le propriétaire (la
  // règle de blocage dans leaveHousehold empêche normalement un
  // propriétaire de partir avant d'avoir transféré) — jamais fait
  // confiance à cette seule supposition, vérifié explicitement ici.
  if (requestingOccupant.role !== "PROPRIETAIRE") {
    return fail("household.delete.forbidden", "Seul le propriétaire du foyer peut le supprimer.");
  }

  const claimedHumanOccupants = read.data.occupants.filter(
    (o) => o.householdId === householdId && o.type === "human" && o.claimedByUserId
  );
  if (claimedHumanOccupants.length > 1) {
    return fail(
      "household.delete.not_last_occupant",
      "D'autres occupants sont encore réclamés dans ce foyer — utilise \"quitter le foyer\" plutôt que supprimer."
    );
  }

  const roomIdsInHousehold = new Set(read.data.rooms.filter((r) => r.householdId === householdId).map((r) => r.id));

  const households = read.data.households.filter((h) => h.id !== householdId);
  const occupants = read.data.occupants.filter((o) => o.householdId !== householdId);
  const floors = read.data.floors.filter((f) => f.householdId !== householdId);
  const rooms = read.data.rooms.filter((r) => r.householdId !== householdId);
  const doors = (read.data.doors || []).filter((d) => d.householdId !== householdId);
  const tasks = read.data.tasks.filter((t) => !roomIdsInHousehold.has(t.roomId));

  const write = await writeStore({ ...read.data, households, occupants, floors, rooms, doors, tasks });
  if (!write.success) return fail("household.delete.write", write.error);

  return ok(
    "household.delete",
    {
      id: householdId,
      deletedRoomCount: roomIdsInHousehold.size,
      deletedFloorCount: read.data.floors.length - floors.length,
      deletedDoorCount: (read.data.doors || []).length - doors.length,
      deletedTaskCount: read.data.tasks.length - tasks.length,
    },
    `Foyer "${household.name}" supprimé.`
  );
}

module.exports = {
  createUser,
  listUsers,
  signup,
  login,
  requestPasswordReset,
  resetPassword,
  inviteUser,
  acceptInvitation,
  getInvitationPreview,
  acceptInvitationForExistingUser,
  createHouseholdForUser,
  listHouseholdsForUser,
  leaveHousehold,
  transferOwnership,
  deleteHousehold,
  listInvitations,
  createOccupant,
  claimOccupant,
  listOccupants,
};
