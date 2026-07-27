// auth.js
// Hachage de mots de passe et génération de jetons d'invitation.
// Volontairement sans dépendance externe (pas de bcrypt) : le module
// `crypto` intégré à Node fournit scrypt, une fonction de dérivation de
// clé adaptée aux mots de passe (lente à calculer, résistante au
// brute-force), avec un sel aléatoire par utilisateur.
//
// RÈGLE ABSOLUE : aucun mot de passe en clair ne doit jamais être écrit
// dans le fichier de stockage, ni renvoyé dans une réponse. Seul
// `passwordHash` (sel + hash) est persisté — voir dataService.js,
// fonction `sanitizeUser`, qui retire systématiquement ce champ des
// réponses.
const crypto = require("crypto");

const KEY_LENGTH = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  // timingSafeEqual exige deux buffers de même longueur ; sinon comparaison invalide -> false
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = { hashPassword, verifyPassword, generateToken };
