// tests/auth.test.js
// Tests du parcours d'inscription, connexion, invitation et animaux.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const BACKUP_FILE = path.join(DATA_DIR, "store.json.bak");

function resetData() {
  for (const f of [STORE_FILE, BACKUP_FILE]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}
resetData();

const svc = require("../dataService");

/* ------------------------------- Signup ---------------------------------*/

test("signup : cas nominal crée un foyer + un utilisateur, sans jamais renvoyer le mot de passe", async () => {
  resetData();
  const res = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  assert.equal(res.success, true);
  assert.equal(res.data.user.email, "chloe@example.com");
  assert.equal(res.data.user.householdId, res.data.household.id);
  assert.equal("passwordHash" in res.data.user, false, "passwordHash ne doit jamais être renvoyé");
  assert.equal("password" in res.data.user, false);
});

test("signup : le mot de passe stocké n'est jamais en clair", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  assert.equal(raw.includes("Motdepasse123!"), false, "le mot de passe en clair ne doit jamais apparaître dans le fichier");
});

test("signup : email déjà utilisé est rejeté", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const res = await svc.signup({ name: "Autre", email: "chloe@example.com", password: "Autremotdepasse1!" });
  assert.equal(res.success, false);
  assert.match(res.error, /déjà utilisée/);
});

test("signup : mot de passe trop court est rejeté", async () => {
  resetData();
  const res = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "court" });
  assert.equal(res.success, false);
  assert.match(res.error, /8 caractères/);
});

test("signup : mot de passe sans majuscule est rejeté", async () => {
  resetData();
  const res = await svc.signup({ name: "Chloë", email: "chloe-pw1@example.com", password: "motdepasse123!" });
  assert.equal(res.success, false);
  assert.match(res.error, /majuscule/);
});

test("signup : mot de passe sans symbole est rejeté", async () => {
  resetData();
  const res = await svc.signup({ name: "Chloë", email: "chloe-pw2@example.com", password: "Motdepasse123" });
  assert.equal(res.success, false);
  assert.match(res.error, /symbole/);
});

test("signup : mot de passe avec majuscule ET symbole est accepté", async () => {
  resetData();
  const res = await svc.signup({ name: "Chloë", email: "chloe-pw3@example.com", password: "Motdepasse123!" });
  assert.equal(res.success, true);
});

/* --------------------------- getInvitationPreview -------------------------- */

test("getInvitationPreview : accountExists=false quand personne n'a encore de compte pour cet email", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-prev1@example.com", password: "Motdepasse123!" });
  const invite = await svc.inviteUser({
    householdId: signup.data.household.id,
    email: "nouveau@example.com",
    invitedBy: signup.data.user.id,
  });

  const preview = await svc.getInvitationPreview(invite.data.token);
  assert.equal(preview.success, true);
  assert.equal(preview.data.accountExists, false);
  assert.equal(preview.data.email, "nouveau@example.com");
});

test("getInvitationPreview : accountExists=true quand un compte existe déjà pour cet email", async () => {
  resetData();
  const chloe = await svc.signup({ name: "Chloë", email: "chloe-prev2@example.com", password: "Motdepasse123!" });
  const paul = await svc.signup({ name: "Paul", email: "paul-prev2@example.com", password: "Motdepassepaul1!" });
  const invite = await svc.inviteUser({
    householdId: chloe.data.household.id,
    email: "paul-prev2@example.com",
    invitedBy: chloe.data.user.id,
  });

  const preview = await svc.getInvitationPreview(invite.data.token);
  assert.equal(preview.success, true);
  assert.equal(preview.data.accountExists, true);
});

test("getInvitationPreview : jeton inconnu ou invitation expirée rejetés proprement", async () => {
  resetData();
  const unknown = await svc.getInvitationPreview("jeton-invente");
  assert.equal(unknown.success, false);
  assert.match(unknown.error, /introuvable/);
});

/* ----------------------- acceptInvitationForExistingUser -------------------- */

test("acceptInvitationForExistingUser : bon mot de passe -> rejoint le nouveau foyer", async () => {
  resetData();
  const chloe = await svc.signup({ name: "Chloë", email: "chloe-exist1@example.com", password: "Motdepasse123!" });
  const paul = await svc.signup({ name: "Paul", email: "paul-exist1@example.com", password: "Motdepassepaul1!" });
  const invite = await svc.inviteUser({
    householdId: chloe.data.household.id,
    email: "paul-exist1@example.com",
    invitedBy: chloe.data.user.id,
  });

  const res = await svc.acceptInvitationForExistingUser({ token: invite.data.token, password: "Motdepassepaul1!" });
  assert.equal(res.success, true);
  assert.equal(res.data.householdId, chloe.data.household.id);
  assert.equal("passwordHash" in res.data, false);
});

test("acceptInvitationForExistingUser : mauvais mot de passe rejeté avec message générique", async () => {
  resetData();
  const chloe = await svc.signup({ name: "Chloë", email: "chloe-exist2@example.com", password: "Motdepasse123!" });
  const paul = await svc.signup({ name: "Paul", email: "paul-exist2@example.com", password: "Motdepassepaul1!" });
  const invite = await svc.inviteUser({
    householdId: chloe.data.household.id,
    email: "paul-exist2@example.com",
    invitedBy: chloe.data.user.id,
  });

  const res = await svc.acceptInvitationForExistingUser({ token: invite.data.token, password: "mauvais" });
  assert.equal(res.success, false);
  assert.equal(res.error, "Email ou mot de passe incorrect.");
});

test("acceptInvitationForExistingUser : aucun compte pour cet email -> message clair vers l'inscription", async () => {
  resetData();
  const chloe = await svc.signup({ name: "Chloë", email: "chloe-exist3@example.com", password: "Motdepasse123!" });
  const invite = await svc.inviteUser({
    householdId: chloe.data.household.id,
    email: "personne-encore@example.com",
    invitedBy: chloe.data.user.id,
  });

  const res = await svc.acceptInvitationForExistingUser({ token: invite.data.token, password: "peuimporte1!A" });
  assert.equal(res.success, false);
  assert.match(res.error, /formulaire de création de compte/);
});

test("acceptInvitation : refusé si un compte existe déjà pour cet email (redirige vers l'autre flux)", async () => {
  resetData();
  const chloe = await svc.signup({ name: "Chloë", email: "chloe-exist4@example.com", password: "Motdepasse123!" });
  const paul = await svc.signup({ name: "Paul", email: "paul-exist4@example.com", password: "Motdepassepaul1!" });
  const invite = await svc.inviteUser({
    householdId: chloe.data.household.id,
    email: "paul-exist4@example.com",
    invitedBy: chloe.data.user.id,
  });

  const res = await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Autremotdepasse1!" });
  assert.equal(res.success, false);
  assert.match(res.error, /existe déjà/);
});

/* -------------------------------- Login ---------------------------------*/

test("login : cas nominal réussit et ne renvoie jamais passwordHash", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const res = await svc.login({ email: "chloe@example.com", password: "Motdepasse123!" });
  assert.equal(res.success, true);
  assert.equal("passwordHash" in res.data, false);
});

test("login : mauvais mot de passe rejeté avec un message générique", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const res = await svc.login({ email: "chloe@example.com", password: "mauvais" });
  assert.equal(res.success, false);
  assert.equal(res.error, "Email ou mot de passe incorrect.");
});

test("login : email inconnu rejeté avec le MÊME message générique (ne révèle pas si l'email existe)", async () => {
  resetData();
  const res = await svc.login({ email: "personne@example.com", password: "quelconque123" });
  assert.equal(res.success, false);
  assert.equal(res.error, "Email ou mot de passe incorrect.");
});

/* ----------------------------- Invitations -------------------------------*/

test("inviteUser : cas nominal génère un jeton unique", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const res = await svc.inviteUser({
    householdId: signup.data.household.id,
    email: "paul@example.com",
    invitedBy: signup.data.user.id,
  });
  assert.equal(res.success, true);
  assert.equal(typeof res.data.token, "string");
  assert.ok(res.data.token.length >= 32);
  assert.equal(res.data.status, "pending");
});

test("inviteUser : invitation en double (même email, même foyer, en attente) rejetée", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  await svc.inviteUser({ householdId: signup.data.household.id, email: "paul@example.com", invitedBy: signup.data.user.id });
  const res = await svc.inviteUser({ householdId: signup.data.household.id, email: "paul@example.com", invitedBy: signup.data.user.id });
  assert.equal(res.success, false);
  assert.match(res.error, /déjà en attente/);
});

test("inviteUser : householdId inexistant rejeté", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const res = await svc.inviteUser({ householdId: "fantome", email: "paul@example.com", invitedBy: signup.data.user.id });
  assert.equal(res.success, false);
  assert.match(res.error, /fantome/);
});

test("acceptInvitation : cas nominal attache le nouvel utilisateur au bon foyer", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const invite = await svc.inviteUser({ householdId: signup.data.household.id, email: "paul@example.com", invitedBy: signup.data.user.id });
  const res = await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Motdepassepaul1!" });
  assert.equal(res.success, true);
  assert.equal(res.data.householdId, signup.data.household.id);
  assert.equal(res.data.email, "paul@example.com");
});

test("acceptInvitation : jeton inconnu rejeté", async () => {
  resetData();
  const res = await svc.acceptInvitation({ token: "jeton-invente", name: "Paul", password: "Motdepassepaul1!" });
  assert.equal(res.success, false);
  assert.match(res.error, /introuvable/);
});

test("acceptInvitation : jeton déjà utilisé (double acceptation) rejeté", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const invite = await svc.inviteUser({ householdId: signup.data.household.id, email: "paul@example.com", invitedBy: signup.data.user.id });
  await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Motdepassepaul1!" });
  const second = await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Autremotdepasse1!" });
  assert.equal(second.success, false);
  assert.match(second.error, /n'est plus valide/);
});

test("acceptInvitation : invitation expirée rejetée", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  const invite = await svc.inviteUser({ householdId: signup.data.household.id, email: "paul@example.com", invitedBy: signup.data.user.id });

  // On simule le passage du temps en modifiant directement le fichier de stockage.
  const raw = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  raw.invitations[0].expiresAt = new Date(Date.now() - 1000).toISOString(); // déjà expirée
  fs.writeFileSync(STORE_FILE, JSON.stringify(raw, null, 2));

  const res = await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Motdepassepaul1!" });
  assert.equal(res.success, false);
  assert.match(res.error, /expiré/);
});
