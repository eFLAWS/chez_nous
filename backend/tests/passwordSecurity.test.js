// tests/passwordSecurity.test.js
// Tests de la réinitialisation de mot de passe et de la limitation des
// tentatives de connexion. Point de sécurité vérifié explicitement : le
// jeton de réinitialisation n'est JAMAIS renvoyé au navigateur (seulement
// journalisé côté serveur), et la réponse est identique que l'email
// existe ou non.
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

/* --------------------------- requestPasswordReset --------------------------- */

test("requestPasswordReset : message générique identique, email existant ou non", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset1@example.com", password: "Motdepasse123!" });

  const forExisting = await svc.requestPasswordReset("chloe-reset1@example.com");
  const forUnknown = await svc.requestPasswordReset("personne-du-tout@example.com");

  assert.equal(forExisting.success, true);
  assert.equal(forUnknown.success, true);
  assert.equal(forExisting.data.message, forUnknown.data.message);
});

test("requestPasswordReset : ne renvoie JAMAIS le jeton dans la réponse", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset2@example.com", password: "Motdepasse123!" });
  const res = await svc.requestPasswordReset("chloe-reset2@example.com");
  const serialized = JSON.stringify(res);
  assert.equal(serialized.includes("token"), false, "le jeton ne doit jamais apparaître dans la réponse HTTP");
});

test("requestPasswordReset : le jeton est bien écrit dans le stockage (pour usage interne uniquement)", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset3@example.com", password: "Motdepasse123!" });
  await svc.requestPasswordReset("chloe-reset3@example.com");

  const raw = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  assert.equal(raw.passwordResets.length, 1);
  assert.equal(typeof raw.passwordResets[0].token, "string");
  assert.equal(raw.passwordResets[0].used, false);
});

/* -------------------------------- resetPassword ----------------------------- */

function readResetToken() {
  const raw = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  return raw.passwordResets[raw.passwordResets.length - 1].token;
}

test("resetPassword : jeton valide change bien le mot de passe (ancien refusé, nouveau accepté)", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset4@example.com", password: "Motdepasse123!" });
  await svc.requestPasswordReset("chloe-reset4@example.com");
  const token = readResetToken();

  const res = await svc.resetPassword({ token, newPassword: "NouveauMdp123!" });
  assert.equal(res.success, true);

  const oldLogin = await svc.login({ email: "chloe-reset4@example.com", password: "Motdepasse123!" });
  assert.equal(oldLogin.success, false);

  const newLogin = await svc.login({ email: "chloe-reset4@example.com", password: "NouveauMdp123!" });
  assert.equal(newLogin.success, true);
});

test("resetPassword : jeton déjà utilisé rejeté (usage unique)", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset5@example.com", password: "Motdepasse123!" });
  await svc.requestPasswordReset("chloe-reset5@example.com");
  const token = readResetToken();

  await svc.resetPassword({ token, newPassword: "NouveauMdp123!" });
  const second = await svc.resetPassword({ token, newPassword: "EncoreUnAutre1!" });
  assert.equal(second.success, false);
  assert.match(second.error, /déjà été utilisé/);
});

test("resetPassword : jeton expiré rejeté", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset6@example.com", password: "Motdepasse123!" });
  await svc.requestPasswordReset("chloe-reset6@example.com");

  const raw = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  raw.passwordResets[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  fs.writeFileSync(STORE_FILE, JSON.stringify(raw, null, 2));

  const res = await svc.resetPassword({ token: raw.passwordResets[0].token, newPassword: "NouveauMdp123!" });
  assert.equal(res.success, false);
  assert.match(res.error, /expiré/);
});

test("resetPassword : jeton inconnu rejeté", async () => {
  resetData();
  const res = await svc.resetPassword({ token: "jeton-invente", newPassword: "NouveauMdp123!" });
  assert.equal(res.success, false);
  assert.match(res.error, /invalide ou déjà utilisé/);
});

test("resetPassword : nouveau mot de passe faible rejeté (mêmes règles qu'à l'inscription)", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-reset7@example.com", password: "Motdepasse123!" });
  await svc.requestPasswordReset("chloe-reset7@example.com");
  const token = readResetToken();

  const res = await svc.resetPassword({ token, newPassword: "faible" });
  assert.equal(res.success, false);
});

/* ------------------------ Limitation des tentatives de connexion ------------ */

test("login : bloqué après 5 échecs, même avec le bon mot de passe ensuite", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-lock1@example.com", password: "Motdepasse123!" });

  for (let i = 0; i < 5; i++) {
    await svc.login({ email: "chloe-lock1@example.com", password: "mauvais" });
  }

  const res = await svc.login({ email: "chloe-lock1@example.com", password: "Motdepasse123!" });
  assert.equal(res.success, false);
  assert.match(res.error, /Trop de tentatives/);
});

test("login : une connexion réussie avant la limite réinitialise le compteur", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-lock2@example.com", password: "Motdepasse123!" });

  await svc.login({ email: "chloe-lock2@example.com", password: "mauvais" });
  await svc.login({ email: "chloe-lock2@example.com", password: "mauvais" });
  const success = await svc.login({ email: "chloe-lock2@example.com", password: "Motdepasse123!" });
  assert.equal(success.success, true);

  // Après un succès, on doit pouvoir se re-tromper sans être immédiatement bloqué.
  const retry = await svc.login({ email: "chloe-lock2@example.com", password: "mauvais" });
  assert.equal(retry.success, false);
  assert.doesNotMatch(retry.error, /Trop de tentatives/);
});

test("login : la limitation ne bloque pas un AUTRE email", async () => {
  resetData();
  await svc.signup({ name: "Chloë", email: "chloe-lock3@example.com", password: "Motdepasse123!" });
  await svc.signup({ name: "Paul", email: "paul-lock3@example.com", password: "Motdepassepaul1!" });

  for (let i = 0; i < 5; i++) {
    await svc.login({ email: "chloe-lock3@example.com", password: "mauvais" });
  }

  const res = await svc.login({ email: "paul-lock3@example.com", password: "Motdepassepaul1!" });
  assert.equal(res.success, true);
});
