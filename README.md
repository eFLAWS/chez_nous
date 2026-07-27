# Chez nous — Backend + Frontend

Application de gestion de foyer : comptes, invitations, occupants (humains
et animaux), plan de l'appartement (pièces, étages), et tâches attribuées
à une pièce, une personne, ou un animal.

> **Important** : ce projet est distinct de l'artefact React autonome
> "chez-nous.jsx" produit au tout début de cette conversation. Celui-là
> était un prototype à vocabulaire figé (deux personnes nommées en dur) ;
> celui-ci est une architecture générique (n'importe qui peut s'inscrire,
> créer son foyer, y ajouter qui il veut) — construite dans l'idée d'une
> vraie commercialisation. Les deux ne partagent ni code ni données.

## Règles de développement permanentes

Établies pour tout le développement à venir sur ce projet, pas seulement
pour la réorganisation ci-dessous :

1. **Mobile-first & responsive.** Toute nouvelle vue/composant se conçoit
   d'abord pour un écran de smartphone vertical, tout en restant lisible
   et utilisable sur PC. Zones cliquables ≥ 44×44px. Mises en page
   fluides (Flexbox/Grid, unités relatives) plutôt que des dimensions
   fixes en pixels.
2. **Rigueur sur l'impact des changements.** Toute création, modification
   ou suppression de fichier implique de vérifier ses répercussions sur
   le reste du projet — imports/exports mis à jour partout où c'est
   nécessaire, jamais un lien cassé laissé de côté. Composants modulaires
   et découplés ; éviter les fichiers de plusieurs centaines de lignes
   (voir la section `dataService.js`/`services/` plus bas pour un exemple
   concret de ce principe déjà appliqué côté backend).

**Sur la portée immédiate de la règle 1** : elle s'applique à tout
nouveau travail à partir de maintenant. Elle n'a pas encore été appliquée
rétroactivement à chaque composant existant (ex. vérifier que chaque
bouton actuel atteint bien 44×44px) — ce serait un audit séparé, pas fait
dans cette passe de réorganisation. Dis-le si tu veux qu'on s'y attaque
aussi.

## Vue d'ensemble

```
                     ┌────────────────────┐
                     │   data/store.json   │  ← source de vérité, un seul fichier JSON
                     └─────────▲──────────┘
                               │ lit/écrit (atomique, sérialisé, écritures concurrentes sans corruption)
                     ┌─────────┴──────────┐
                     │      store.js       │
                     └─────────▲──────────┘
                               │ valide avant d'écrire
              ┌────────────────┼─────────────────┐
              │          validators.js            │  ← réutilisé TEL QUEL côté frontend (mêmes règles client/serveur)
              └────────────────▲─────────────────┘
                               │
                     ┌─────────┴──────────┐
                     │   dataService.js     │  logique métier + { success, data, error } uniforme
                     └─────────▲──────────┘
                               │
                     ┌─────────┴──────────┐
                     │      server.js       │  serveur HTTP natif Node (aucune dépendance) : expose dataService.js en routes REST
                     └─────────▲──────────┘
                               │ /api/...
                     ┌─────────┴──────────┐
                     │       api.js         │  seule couche frontend qui appelle fetch()
                     └─────────▲──────────┘
                               │
                     ┌─────────┴──────────┐
                     │     useItems.js      │  hook générique : liste + loading + error + create/update/remove
                     └─────────▲──────────┘
                               │
                     ┌─────────┴──────────┐
                     │      App.jsx         │  session (connecté / pas connecté)
                     └─────────▲──────────┘
                               │
                     ┌─────────┴──────────┐
                     │    AppShell.jsx      │  tableau de bord une fois connecté
                     └─────────────────────┘
```

Le fil conducteur : **la même forme de retour `{ success, data?, error? }`
traverse toute la pile**, de `validators.js` jusqu'aux composants React.
Aucune couche ne réinvente sa propre convention d'erreur.

## Arborescence

```
backend/
  validators.js        # validation stricte (pure, sans dépendance Node) — plus réutilisée directement par le frontend (voir formValidators.js)
  auth.js               # hachage de mots de passe (scrypt) + jetons d'invitation
  logger.js             # logs simples (console + fichier JSONL)
  store.js              # lecture/écriture JSON robuste (atomique, sérialisée, rétrocompatible) — implémentation, testée séparément (tests/store.test.js)
  dataService.js        # façade fine : réexporte services/, aucune logique propre
  core/
    storageUtils.js        # point d'accès unique : genId, ok/fail, + readStore/writeStore réexportées depuis store.js
  services/
    userService.js          # comptes, authentification (signup/login), invitations, occupants
    roomService.js           # étages, pièces, coordonnées, collisions
    taskService.js            # tâches, récurrences, affectations
    projectService.js          # projets, foyers
  server.js              # serveur HTTP natif Node, expose dataService.js en routes REST
  live-test.js            # script de vérification rapide : démarre le serveur et l'interroge réellement
  tests/
    validators.test.js
    store.test.js
    dataService.test.js
    security-edge-cases.test.js
    auth.test.js
    occupants.test.js
    floors.test.js
    rooms.test.js
    taskContext.test.js
  data/                 # créé automatiquement au premier lancement (store.json, .bak)
  logs/                 # créé automatiquement (app.log)

frontend/
  package.json / vite.config.js / index.html / setupTests.js   # config Vite/Vitest — reste à la racine, convention standard (pas dans src/)
  tests/
    ItemForm.test.jsx
    RoomFloorPlan.test.jsx
    TaskCreation.integration.test.jsx
  src/
    main.jsx               # point d'entrée réel (référencé par index.html)
    App.jsx                # session : pas connecté -> formulaires ; connecté -> AppShell
    api.js                  # fetch vers le serveur (une fonction par route)
    hooks/
      useItems.js            # hook générique de cycle de vie d'une liste
      useToast.js             # hook de notifications éphémères
    validators/
      formValidators.js       # copie ESM native de quelques règles de backend/validators.js — voir section dédiée plus bas
    services/
      pathfinding.js           # recherche de chemin (BFS) pour la marche pas à pas — voir section dédiée
      layoutGeneration.js       # dérive murs+portes à partir de rectangles de pièces (Mode Édition) — voir section dédiée
      roomCollision.js           # aimantage + résolution de collision pour le déplacement de pièces — voir section dédiée
      layoutStorage.js            # persistance localStorage + export/import JSON — voir section dédiée
    data/
      mockData.js              # données de test pour le MVP isométrique — pas connecté au backend
      roomTypes.js              # types de pièce prédéfinis (icône, couleur pastel) — voir section dédiée
    components/
      common/                  # Toast, Spinner, Skeleton, StatusBadge, ProgressBar — génériques, réutilisables partout
      items/                    # ItemCard, ItemForm, ItemGrid — génériques, réutilisés pour task/project/room
      forms/                     # ProjectFormFields, TaskFormFields, RoomFormFields (branchés), PetFormFields (prêt, pas branché), RoomNameModal (MVP spatial)
      auth/                       # SignupForm, LoginForm, ForgotPasswordForm, InviteForm, AcceptInvitationForm
      layout/                      # AppShell, Dashboard
      tasks/                        # TaskOverview
      floorplan/                    # RoomFloorPlan, FloorPlanSection, FloorThumbnail
      spatial/                       # ApartmentSpatialMvp (orchestrateur), ApartmentOverview2D, FloorView2D, LayoutEditor, RoomInspector, OnboardingScreen — MVP mock (voir section dédiée)
    styles/
      ui-feedback.css / visual-hierarchy.css / floor-plan.css / task-overview.css / room-3d.css
```

> **Organisation par domaine, pas par type de fichier** : `components/`
> est éclaté par ce que chaque composant FAIT (identité, mise en page,
> plan de l'appartement...) plutôt que d'être un unique dossier plat.
> `common/` reste la seule exception "par type" — ce sont des briques
> visuelles génériques qui n'appartiennent à aucun domaine métier
> particulier.

## Modèle de données

Huit collections dans un seul fichier JSON (`data/store.json`) :

```json
{
  "users": [{
    "id": "u1", "name": "Chloë", "email": "chloe@example.com",
    "householdId": "h1", "passwordHash": "sel:empreinte", "createdAt": "…"
  }],
  "households": [{ "id": "h1", "name": "Chez nous", "createdBy": "u1", "createdAt": "…" }],
  "invitations": [{
    "id": "i1", "householdId": "h1", "email": "paul@example.com", "invitedBy": "u1",
    "token": "…", "status": "pending", "createdAt": "…", "expiresAt": "…"
  }],
  "occupants": [
    { "id": "o1", "name": "Chloë", "householdId": "h1", "type": "human", "species": null, "claimedByUserId": "u1", "createdAt": "…" },
    { "id": "o2", "name": "Miel", "householdId": "h1", "type": "pet", "species": "chat", "claimedByUserId": null, "createdAt": "…" }
  ],
  "floors": [{ "id": "f1", "householdId": "h1", "name": "Rez-de-chaussée", "level": 0, "createdAt": "…" }],
  "rooms": [{
    "id": "r1", "name": "Salon", "householdId": "h1", "floorId": "f1",
    "width": 5, "length": 4, "color": "#F0DEC5", "x": 0, "y": 0, "createdAt": "…"
  }],
  "projects": [{ "id": "p1", "name": "Rénovation", "ownerId": "u1", "createdAt": "…" }],
  "tasks": [{
    "id": "t1", "title": "Passer l'aspirateur", "description": null,
    "projectId": null, "roomId": "r1", "petId": null, "assigneeId": "u1",
    "recurrenceDays": 7, "status": "todo", "dueDate": null, "createdAt": "…"
  }]
}
```

Points clés :

- **`occupants` unifie humains et animaux.** Un occupant humain peut être créé
  sans compte (`claimedByUserId: null`), puis "réclamé" par un compte
  existant via `claimOccupant`. Un animal ne peut **jamais** être réclamé.
  La première personne à s'inscrire devient `createdBy` du foyer (le
  "responsable"), mais ne devient pas automatiquement un occupant — elle
  doit créer et réclamer son propre occupant comme n'importe qui d'autre.
- **`floors` est facultatif.** Un logement de plain-pied n'en déclare
  aucun ; toutes ses pièces ont alors `floorId: null`, et forment leur
  propre groupe pour le placement automatique et les collisions.
- **Le contexte d'une tâche est multiple et tout optionnel** : `projectId`,
  `roomId`, `petId` (référence un occupant de type `pet`), `assigneeId`
  peuvent chacun être `null`, y compris tous en même temps (rappel libre).
- **`passwordHash` ne quitte jamais le backend** — `dataService.js` le
  retire systématiquement des réponses via `sanitizeUser()`.
- **`store.js` reste rétrocompatible** : les collections ajoutées après
  coup (`households`, `invitations`, `occupants`, `rooms`, `floors`) sont
  complétées automatiquement à la lecture si un vieux fichier ne les a pas.

## Backend — le rôle de chaque fichier

### `validators.js`
Fonctions **pures**, aucune dépendance Node — c'est pour ça qu'elles sont
importables telles quelles côté frontend, garantissant que le client et
le serveur appliquent exactement les mêmes règles.

| Fonction | Vérifie |
|---|---|
| `validateUser(input, { existingHouseholdIds })` | `id`/`name` non vides (≤ 500 car.), `email` optionnel bien formé, `householdId` optionnel référence un foyer existant |
| `validateProject(input, { existingUserIds })` | + `ownerId` référence un utilisateur existant |
| `validateTask(input, { existingProjectIds, existingUserIds, existingRoomIds, existingPetIds })` | `title` (≤ 500 car.) ; `projectId`/`roomId`/`petId`/`assigneeId` tous optionnels mais référencent une entité existante s'ils sont fournis ; `recurrenceDays` entier 1-365 ; `description` ≤ 2000 car. ; `status` dans l'énumération ; `dueDate` ISO valide |
| `validateHousehold(input)` | `id`/`name` non vides, `createdBy` optionnel |
| `validateSignup(input)` | `name`/`email` valides, `password` ≥ 8 caractères **+ au moins une majuscule + un symbole** (valide le formulaire d'inscription, mot de passe **en clair**, avant hachage) |
| `validateInvitation(input, { existingHouseholdIds })` | `email` valide, `householdId` existant, `invitedBy` requis |
| `validateOccupant(input, { existingHouseholdIds, existingUserIds })` | `name` non vide, `type` ∈ `human`/`pet`, `species` uniquement si `type: "pet"`, `claimedByUserId` optionnel référence un utilisateur existant, jamais fourni pour un animal |
| `validateFloor(input, { existingHouseholdIds })` | `name` non vide, `level` entier entre -5 et 200 |
| `validateRoom(input, { existingHouseholdIds, existingFloorIds })` | `name` non vide, `width`/`length` entre 0.5 et 30 (mètres), `color` hex valide, `floorId` optionnel référence un étage existant |

Retour systématique : `{ valid: boolean, errors: string[] }`.

### `auth.js`
Aucune dépendance externe (pas de bcrypt) : `crypto.scrypt` de Node, une
fonction de dérivation de clé conçue pour les mots de passe (lente,
résistante au brute-force), sel aléatoire par utilisateur.
`hashPassword(plain)`, `verifyPassword(plain, storedHash)` (comparaison en
temps constant), `generateToken()` (jetons d'invitation).

### `store.js`
Lit/écrit `data/store.json`. Ne lève **jamais** d'exception.
- `readStore()` → fichier absent = succès (structure vide) ; fichier
  corrompu = repli automatique sur `store.json.bak` ; les deux corrompus =
  échec propre.
- `writeStore(data)` → écriture atomique (fichier temporaire + renommage),
  sauvegarde avant écrasement, **file d'attente en mémoire** qui sérialise
  les écritures concurrentes (aucune corruption même avec 50 écritures
  simultanées — testé).

### `dataService.js` et `services/`
`dataService.js` ne fait plus que réexporter `services/` — toute la
logique vit dans **4 services**, regroupés par domaine fonctionnel plutôt
que par entité de données étroite (`userService.js` couvre à la fois les
comptes, l'authentification, les invitations et les occupants — un choix
délibéré : ces quatre concepts tournent tous autour de "qui appartient au
foyer et comment"). Les utilitaires partagés (`genId`, `ok`/`fail`,
`readStore`/`writeStore`) vivent dans `core/storageUtils.js`, qui
réexporte `readStore`/`writeStore` depuis `store.js` sans dupliquer son
implémentation ni ses tests.

Les services ne s'importent **jamais** entre eux — quand l'un a besoin de
vérifier une référence vers une entité d'un autre domaine (ex.
`taskService` doit vérifier qu'un `roomId` existe), il lit simplement la
collection correspondante via le même `readStore()`, sans dépendre du
fichier qui "possède" cette collection. Aucune dépendance circulaire
possible avec ce découpage.

Chaque fonction retourne `{ success: true, data }` ou
`{ success: false, error }` — jamais d'exception qui remonte à l'appelant.

| Fonction | Fichier | Rôle |
|---|---|---|
| `signup({ name, email, password, householdName? })` | `userService.js` | crée un foyer + son premier utilisateur (mot de passe haché, jamais renvoyé) ; le foyer garde `createdBy` |
| `login({ email, password })` | `userService.js` | vérifie les identifiants ; message d'erreur **identique** que l'email soit inconnu ou le mot de passe faux ; **bloqué après 5 échecs** pendant 15 minutes (voir section dédiée plus bas) |
| `requestPasswordReset(email)` | `userService.js` | génère un code de réinitialisation si le compte existe ; réponse **identique** que le compte existe ou non (anti-énumération) ; le code n'est **jamais renvoyé** dans la réponse — seulement journalisé côté serveur |
| `resetPassword({ token, newPassword })` | `userService.js` | vérifie le code (existant, non expiré, pas déjà utilisé) et remplace le mot de passe ; mêmes règles de force que l'inscription |
| `createUser`, `listUsers` | `userService.js` | CRUD utilisateur direct (sans mot de passe) — non exposé en route publique, volontairement (voir plus bas) |
| `inviteUser({ householdId, email, invitedBy })` | `userService.js` | crée une invitation (jeton, expire dans 7 jours) ; rejette doublons et emails déjà membres |
| `getInvitationPreview(token)` | `userService.js` | ne modifie rien ; indique si un compte existe déjà pour l'email de l'invitation, pour que le frontend affiche le bon formulaire |
| `acceptInvitation({ token, name, password })` | `userService.js` | crée le compte invité, l'attache au foyer de l'invitation ; rejette jeton expiré/inconnu/déjà utilisé, **et rejette aussi si un compte existe déjà pour cet email** (redirige vers `acceptInvitationForExistingUser`) |
| `acceptInvitationForExistingUser({ token, password })` | `userService.js` | pour un email qui a déjà un compte : vérifie le mot de passe puis rattache ce compte au foyer de l'invitation (remplace son foyer précédent — pas de multi-foyer, voir "Ce qui manque") |
| `listInvitations(householdId?)` | `userService.js` | — |
| `createOccupant(input)` | `userService.js` | occupant humain ou animal, créé **sans compte** |
| `claimOccupant(occupantId, userId)` | `userService.js` | relie un compte à un occupant humain libre du même foyer ; un animal ne peut jamais être réclamé, un compte ne peut réclamer qu'un seul occupant |
| `listOccupants(householdId?, { onlyUnclaimed? })` | `userService.js` | filtre par foyer, et optionnellement aux humains encore libres |
| `createFloor(input)`, `listFloors(householdId?)` | `roomService.js` | étages (facultatifs) |
| `deleteFloor(id)` | `roomService.js` | **supprime en cascade** l'étage → ses pièces → les tâches de ces pièces |
| `createRoom(input)`, `listRooms(householdId?)` | `roomService.js` | pièces ; `x`/`y` calculés automatiquement à la création (placement en flux, par étage) |
| `updateRoomPosition(id, { x, y })` | `roomService.js` | déplace une pièce ; **rejette** tout chevauchement avec une autre pièce du **même étage** (le contact bord-à-bord exact est autorisé) |
| `deleteRoom(id)` | `roomService.js` | **supprime en cascade** les tâches rattachées à la pièce |
| `rectanglesOverlap(a, b)` | `roomService.js` | fonction géométrique pure, exportée pour les tests |
| `createTask`, `updateTask`, `deleteTask`, `listTasks` | `taskService.js` | — |
| `createProject`, `listProjects` | `projectService.js` | — |
| `createHousehold`, `listHouseholds` | `projectService.js` | gestion directe d'un foyer (généralement créé via `signup`) |

`sanitizeUser()` (interne à `userService.js`) retire systématiquement
`passwordHash` des réponses qui renvoient un utilisateur.

### Limitation des tentatives de connexion et réinitialisation du mot de passe

- **Limitation** : 5 échecs de suite (par email, en mémoire — remis à
  zéro au redémarrage du serveur) déclenchent un blocage de 15 minutes,
  même avec le bon mot de passe entre-temps. Une connexion réussie remet
  le compteur à zéro. S'applique à `login` **et** à
  `acceptInvitationForExistingUser` (les deux vérifient un mot de passe
  existant, donc les deux doivent être protégés).
- **Réinitialisation** : `requestPasswordReset` renvoie toujours le même
  message générique, que le compte existe ou non — pour ne jamais
  révéler quels emails sont enregistrés. **Le code de réinitialisation
  n'est jamais renvoyé au navigateur** : comme l'application n'envoie
  toujours pas de vrais emails, le renvoyer dans la réponse HTTP
  permettrait à n'importe qui connaissant un email de réinitialiser le
  mot de passe de quelqu'un d'autre sans son accord — un vrai trou de
  sécurité, pas juste un détail. Le code est uniquement journalisé côté
  serveur (`logInfo`, visible dans le terminal qui fait tourner
  `node server.js`) : à consulter manuellement en attendant un vrai envoi
  d'email, un peu comme les jetons d'invitation.

### Glisser-déposer, magnétisme et collisions (`RoomFloorPlan.jsx`)
- **Côté client**, à chaque déplacement de pointeur : magnétisme (colle un
  bord à quelques pixels d'un bord voisin) et blocage de collision — en
  mémoire, aucun appel réseau pendant le geste. Choix assumé : **on
  bloque, on ne repousse pas** les autres pièces (plus simple, plus
  prévisible).
- **Côté serveur** (`updateRoomPosition`), une seule fois au relâchement
  du geste : revalide et rechevauche — défense en profondeur si une autre
  pièce a bougé entre-temps dans un autre onglet.
- Les collisions sont scopées **par étage** : deux pièces à des étages
  différents peuvent légitimement partager les mêmes coordonnées (une
  chambre juste au-dessus du salon).

### `logger.js`
`logInfo(action, details)` / `logError(action, details)` → console +
`logs/app.log` (JSONL). Une erreur d'écriture de log est elle-même avalée.

### `server.js`
Serveur HTTP en Node natif — **aucune dépendance à installer** (pas
d'Express). Mappe chaque route `/api/...` directement sur une fonction de
`dataService.js`. CORS ouvert (développement local uniquement). Démarrage :
`node server.js` (écoute sur `http://localhost:3001/api`).

### `live-test.js`
Script de vérification : démarre le serveur, envoie de vraies requêtes
(inscription, connexion, pièces, étages, chevauchement, invitation,
suppression en cascade), puis l'arrête proprement. À relancer après toute
modification du backend : `node live-test.js`.

## `formValidators.js` — rupture assumée du principe "une seule source de vérité"

Depuis le début de ce projet, chaque formulaire réutilisait directement
`backend/validators.js`. En le testant pour de vrai dans un navigateur (ce
que je ne peux pas faire moi-même dans mon environnement de travail), il
s'est avéré que **Vite ne traite jamais nos propres fichiers sources comme
du CommonJS** — il les sert tels quels au navigateur en écriture ES module
native. L'interopérabilité CommonJS → ESM que Vite applique
automatiquement ne concerne que les dépendances tierces installées via
npm (`node_modules`), jamais un fichier à nous importé par chemin relatif.
Résultat : aucune variante d'import (`import { x }`, `import x from`,
`import * as x`) ne pouvait faire fonctionner un import direct de
`backend/validators.js`, quelle que soit sa syntaxe — ce n'était pas un
problème de syntaxe d'import, mais un mur structurel.

**La solution retenue** : `src/validators/formValidators.js` copie à la main,
mot pour mot (vérifié par comparaison automatique), les seules fonctions
de `backend/validators.js` réellement utilisées par un formulaire :
`validateSignup`, `validateTask`, `validateProject`, `validateRoom`,
`validateFloor`, `PET_SPECIES`. Écrit en ESM natif (`export function`),
il n'a besoin d'aucune interopérabilité pour fonctionner avec Vite.

**Le vrai coût, à ne pas perdre de vue** : si une règle de validation
change dans `backend/validators.js` (ex. la longueur minimale d'un mot de
passe), il faut la répercuter manuellement dans `formValidators.js`. Ce
n'est plus une seule source de vérité. Les fonctions **non** dupliquées
(jamais utilisées par un formulaire) : `validateUser`, `validateHousehold`,
`validateInvitation`, `validateOccupant` — celles-ci ne vivent toujours
que côté serveur.

## Frontend — le rôle de chaque fichier

| Fichier | Rôle |
|---|---|
| `package.json` / `vite.config.js` / `index.html` / `setupTests.js` | scaffold Vite standard, à la racine de `frontend/` ; `index.html` charge `/src/main.jsx` ; `vite.config.js` proxyfie `/api/` vers `http://localhost:3001` en développement |
| `src/main.jsx` | point d'entrée réel : monte `App` dans le DOM, importe tous les styles |
| `src/App.jsx` | **point d'entrée applicatif.** Pas de session → onglets Inscription/Connexion/"J'ai une invitation". Session active → `AppShell`. La session est un simple objet utilisateur gardé dans `localStorage` (pas un vrai jeton — voir "Ce qui manque") |
| `src/api.js` | seule couche qui appelle `fetch` ; une fonction par route, contrat `{success,data,error}` identique au backend |
| `src/hooks/useItems.js` | hook générique : `loading`, `error`, `creating`, `mutatingIds`, `create/update/remove`, via des tables `LISTERS`/`CREATORS`/`UPDATERS`/`REMOVERS` par `kind` ("task", "project", "room", "floor") |
| `src/hooks/useToast.js` | file de notifications éphémères |
| `src/components/auth/SignupForm.jsx` | inscription (crée foyer + compte) ; réutilise `validateSignup` (via `formValidators.js`) |
| `src/components/auth/LoginForm.jsx` | connexion ; ne réutilise **pas** `validateSignup` (les règles de force du mot de passe ne s'appliquent qu'à sa création, pas à sa vérification) |
| `src/components/auth/InviteForm.jsx` | invite un email à rejoindre le foyer courant |
| `src/components/auth/AcceptInvitationForm.jsx` | finalise le compte de l'invité à partir d'un jeton (modifiable à la main : pas de vrai email envoyé, voir plus bas) ; réutilise `validateSignup` (via `formValidators.js`) |
| `src/components/auth/ForgotPasswordForm.jsx` | réinitialisation en deux étapes (demande par email, puis code + nouveau mot de passe) ; le code n'apparaît jamais dans l'interface, seulement journalisé côté serveur |
| `src/components/layout/AppShell.jsx` | tableau de bord : appelle `useItems` pour "task"/"project"/"room" (+ "floor" via `FloorPlanSection`), partage les résultats à tous les enfants |
| `src/components/layout/Dashboard.jsx` | 3 cartes KPI (projets actifs, tâches en attente, taux de complétion) |
| `src/components/tasks/TaskOverview.jsx` | liste des tâches triable par urgence ou regroupée par pièce |
| `src/components/items/ItemCard.jsx` / `ItemForm.jsx` / `ItemGrid.jsx` | les 3 composants génériques réutilisés pour task/project/room ; `ItemForm` garde l'état/validation/soumission et délègue le RENDU des champs à `src/components/forms/*FormFields.jsx` (purement présentationnels, aucun état propre) ; `ItemGrid` accepte une prop `renderItems` pour remplacer les cartes par un autre rendu (ex. le plan des pièces) sans dupliquer formulaire/toasts/erreurs |
| `src/components/floorplan/RoomFloorPlan.jsx` | plan 2D : glisser-déposer, magnétisme, blocage de collision, suppression avec confirmation (affiche le nombre de tâches qui seraient supprimées) |
| `src/components/floorplan/FloorPlanSection.jsx` | conteneur du plan : sélecteur d'étages (miniatures + nom), boutons ajouter/retirer un étage (avec confirmation détaillant pièces + tâches concernées), formulaire d'étage réutilisant `validateFloor` |
| `src/components/floorplan/FloorThumbnail.jsx` | miniature statique "de biais" (isométrique), uniquement dans les onglets du sélecteur d'étages — pas d'interaction, pas de rotation |
| `src/components/common/Toast.jsx` / `Spinner.jsx` / `Skeleton.jsx` / `StatusBadge.jsx` / `ProgressBar.jsx` | composants d'affichage réutilisables, génériques (aucun domaine métier particulier) |
| `src/styles/ui-feedback.css` | animations (apparition, squelette de chargement, mutation) |
| `src/styles/visual-hierarchy.css` | styles de base : cartes KPI, badges, barres de progression, grille/carte/formulaire génériques, écran de connexion |
| `src/styles/floor-plan.css` | styles du plan 2D et du sélecteur d'étages |
| `src/styles/task-overview.css` | styles de la liste de tâches triable |
| `src/styles/room-3d.css` | styles de la miniature isométrique (`FloorThumbnail`) |

## Comment lancer l'application en local

Deux processus séparés, dans deux terminaux :

**Terminal 1 — le serveur :**
```bash
cd backend
node server.js
```
Devrait afficher `API disponible sur http://localhost:3001/api`.

**Terminal 2 — le frontend :**
```bash
cd frontend
npm install
npm run dev
```
Ouvrir l'adresse affichée par Vite (normalement `http://localhost:5173`).

Tu devrais voir un écran d'inscription/connexion. Crée un compte → tableau
de bord vide → à partir de là, tout ce qui est documenté ci-dessus est
testable : étages, pièces (glisser-déposer, magnétisme), tâches,
invitations (le jeton s'affiche à l'écran, à transmettre toi-même —
aucun email n'est réellement envoyé).

## Lancer les tests

Aucune dépendance à installer — le testeur intégré de Node (`node:test`,
natif depuis Node 18+) suffit :
```bash
cd backend
node --test
```
146 tests actuellement, répartis en 10 fichiers couvrant : validation de
chaque entité, lecture/écriture robuste du fichier JSON (fichier absent/
corrompu/écritures concurrentes), authentification (mot de passe jamais en
clair, message d'erreur générique), invitations (jeton expiré/déjà
utilisé), occupants (réclamation, animal jamais réclamable), étages et
pièces (placement automatique, collisions par étage, suppression en
cascade), réinitialisation de mot de passe et limitation des tentatives de
connexion (`passwordSecurity.test.js` — vérifie explicitement que le code
de réinitialisation n'apparaît jamais dans la réponse HTTP), et une suite
dédiée aux cas limites de sécurité (injection, pollution de prototype,
payloads démesurés).

Pour une vérification de bout en bout côté HTTP réel :
```bash
node live-test.js
```

### Tests frontend (Vitest + React Testing Library)

Contrairement au backend, ceux-ci nécessitent une installation
(`vitest`/RTL ne sont pas natifs à Node) :
```bash
cd frontend
npm install
npm test
```
`npm run test:watch` relance automatiquement les tests concernés à chaque
modification.

Configuration : `vite.config.js` porte aussi la config Vitest (pas de
fichier séparé) — `environment: "jsdom"` simule un DOM en Node,
`setupTests.js` enregistre les matchers `@testing-library/jest-dom`
(`toBeInTheDocument`, etc.). `globals: false` : chaque fichier de test
importe explicitement `describe`/`it`/`expect`/`vi` de `"vitest"`, pas de
globales magiques — cohérent avec le style du backend (`node:test`
importé explicitement, lui aussi).

Trois fichiers dans `frontend/tests/` :
- **`ItemForm.test.jsx`** — rendu délégué aux sous-composants
  (`components/forms/*FormFields.jsx`) selon le `kind`, blocage de
  soumission si invalide, coercion des champs (nombres, `""` → `null`),
  affichage d'une erreur serveur, annulation.
- **`RoomFloorPlan.test.jsx`** — affichage des pièces, glisser-déposer via
  de vrais événements `pointerdown`/`pointermove`/`pointerup` (pas de
  drag-and-drop HTML5 natif), blocage de collision, et un test qui
  vérifie que le magnétisme "tire" la pièce jusqu'au contact exact même
  quand la souris ne s'est déplacée que d'une fraction de ce trajet.
- **`TaskCreation.integration.test.jsx`** — `ItemGrid` + `ItemForm` +
  `useItems` réels ensemble, seul `api.js` (la frontière réseau) simulé :
  crée une tâche, sélectionne une pièce, vérifie que `api.createTask`
  reçoit le bon `roomId`, et que la tâche apparaît avec sa pièce affichée
  après le rafraîchissement automatique de la liste.

**Les validateurs (`formValidators.js`) sont simulés (`vi.mock`)** dans
ces trois fichiers plutôt qu'importés réellement : ils sont déjà couverts
par les 146 tests backend (dont ils sont la copie fidèle) ; un test de
composant doit vérifier le câblage du composant, pas re-vérifier des
règles métier testées ailleurs.

**Point de vigilance, à vérifier en lançant ces tests pour de vrai** : je
n'ai pas d'accès réseau dans cet environnement pour exécuter `npm install`
moi-même, donc rien de tout ça n'a été lancé réellement.
1. `jsdom` doit correctement supporter la construction de `PointerEvent`
   pour que les tests de glisser-déposer fonctionnent (généralement le
   cas depuis un moment, mais non vérifié ici).
2. L'import direct de `backend/validators.js` (CommonJS) depuis du code
   servi par Vite s'est révélé, lui, **réellement cassé** en usage (pas
   qu'une inquiétude théorique) — voir la section dédiée `formValidators.js`
   plus haut pour la cause exacte et la solution retenue.

## MVP vue 2.5D et vue d'ensemble (`src/components/spatial/`)

Prototype d'un nouveau paradigme visuel (déplacement d'avatar case par
case en 2.5D, à la Duolingo), **entièrement sur données mock** — pas
connecté au backend, pas au modèle de données réel (rooms/tasks).

**Historique** : une première version (`IsometricGrid.jsx`, supprimée)
utilisait de vraies transformations 3D CSS (`rotateX`/`rotateZ`,
`preserve-3d`), la même technique que `FloorThumbnail.jsx`. Testée pour
de vrai, elle s'est révélée cassée (superpositions, murs découpés) — ce
que je n'avais pas pu vérifier moi-même avant. `RoomView2D.jsx` la
remplace entièrement : **aucune transformation 3D nulle part**. La
profondeur vient uniquement de deux choses simples et robustes :
1. Un tri par superposition (`z-index: case.y * 10`) — ce qui est en bas
   de la pièce (y grand) passe toujours devant ce qui est en haut.
2. Les meubles/l'avatar ont une hauteur visuelle supérieure à une case
   (ancrés en bas de leur case via `align-self: end`, débordant
   naturellement vers le haut) — sans aucun calcul de rotation.

Deux fichiers :

- `src/data/mockData.js` — inchangé depuis la version précédente (la
  grille 6×6, la géométrie, tout reste identique — seule la façon de la
  DESSINER a changé).
- `src/components/spatial/RoomView2D.jsx` (+ son CSS) — sol et meubles
  posés sur une seule et même grille CSS Grid standard (alignement
  garanti sans calcul de pourcentage à la main) ; **l'avatar est la seule
  exception**, positionné en pourcentage absolu (`left`/`top`) plutôt que
  par `grid-column`/`grid-row` — ces deux dernières propriétés ne sont
  **pas animables** en CSS, une transition dessus n'aurait produit aucun
  glissé, juste un saut instantané. Clic sur une case "sol" → déplacement
  fluide de l'avatar ; clic sur le canapé → tiroir en bas d'écran avec la
  tâche liée et un bouton de validation.

**Câblage dans `main.jsx`** : pour un affichage immédiat au lancement
(demandé explicitement dès le début de ce chantier), `main.jsx` monte
`<ApartmentSpatialMvp />` (l'orchestrateur — voir plus bas) au lieu de
`<App />`. **`App.jsx` n'a pas été modifié** — le vrai flux
inscription/connexion existe toujours intact, juste momentanément pas
branché depuis ce fichier. Pour y revenir : remplacer
`<ApartmentSpatialMvp />` par `<App />` dans `main.jsx`.

**Point résolu depuis** : la première version avait une inquiétude notée
ici sur un "double bord" (tuiles murales de `mockData.js` + barres
décoratives de mur autour de la grille) — résolu naturellement par la
suite en passant à une vue par étage à plusieurs pièces (voir "Vue par
étage, carte continue" plus bas), qui a supprimé les barres décoratives
au profit des seules tuiles murales du modèle de données.

**Simplifications assumées pour ce MVP**, pas des bugs :
- Le canapé (2 cases) se rend comme deux blocs adjacents avec la même
  étiquette, pas un seul volume fusionné.
- Le déplacement est un glissé direct vers la case cible (transition CSS
  sur `left`/`top`), pas une marche case par case avec chemin calculé.
- La porte du Salon/Cuisine est maintenant franchissable (voir "Vue par
  étage, carte continue" plus bas) ; celles de la Chambre et de la Salle
  de bain restent visibles mais non franchissables, aucune des deux
  n'étant reliée à quoi que ce soit pour l'instant.

### Vue d'ensemble + commutateur (`ApartmentOverview2D.jsx`, `ApartmentSpatialMvp.jsx`)

Complète le MVP avec une deuxième vue et un commutateur entre les deux,
toujours 100% mock :

- **`src/data/mockData.js` étendu** : passé d'une seule pièce (Salon) à 4
  (`MOCK_ROOMS`) — Salon (avec le canapé existant), Cuisine, Chambre,
  Salle de bain. Les 3 nouvelles pièces ont une grille simple (murs +
  porte + sol), **sans mobilier particulier** — aucun n'a été spécifié
  pour elles, donc pas inventé. Les tâches de `MOCK_TASKS` sont réparties
  entre les 4 pièces avec des statuts choisis pour obtenir un vrai
  dégradé de couleurs : Salon 33% (rouge), Cuisine 100% (vert), Chambre
  67% (jaune), Salle de bain 0% (rouge) — vérifié par calcul avant
  d'écrire le fichier, pas juste espéré.
- **`ApartmentOverview2D.jsx`** — un bloc par pièce, coloré selon sa
  catégorie de progression, avec nom, nombre de tâches restantes et
  mini barre de progression. Positionnement des blocs via
  `room.layoutArea` (défini dans `mockData.js`) — **pas de vraies
  coordonnées de plan réel ici**, juste un agencement approximatif en
  grille CSS pour donner une impression de plan du dessus. Clic sur une
  pièce → bascule vers sa vue détaillée.
- **`ApartmentSpatialMvp.jsx`** (nouveau) — l'orchestrateur : commutateur
  "🗺️ Vue ensemble" / "🏠 Vue pièce" dans l'en-tête, garde en état la
  pièce sélectionnée. C'est ce composant que `main.jsx` monte
  maintenant (plus `RoomView2D` directement).

**Point d'architecture React important, pas évident à l'œil** :
`RoomView2D` reçoit maintenant `key={selectedRoom.id}` quand
`ApartmentSpatialMvp` le monte. Sans ce `key`, changer de pièce ne
réinitialiserait pas la position de l'avatar ni les tâches affichées —
`useState()` ne se réexécute qu'au tout premier rendu d'une instance de
composant, pas à chaque changement de prop. Le `key` force React à
traiter chaque pièce comme une instance neuve.

### Navigation entre pièces via les portes (historique — voir section suivante pour le mécanisme actuel)

Cette section décrivait le mécanisme initial : les portes portaient une
destination (`targetRoomId`/`targetX`/`targetY`), et traverser une porte
déclenchait une téléportation avec un fondu au noir de 0.2s
(`ApartmentSpatialMvp.jsx`), avant de repositionner l'avatar dans la
pièce cible. **Ce mécanisme a été entièrement remplacé** par la carte
continue de `FloorView2D.jsx` (voir "Vue par étage, carte continue" plus
bas) : les pièces d'un même étage sont maintenant physiquement adjacentes
sur une seule carte, donc traverser une porte revient à marcher
normalement — plus de téléportation, plus de fondu, plus de coordonnées
de destination sur les portes reliées. Gardé ici pour l'historique du
raisonnement, pas comme documentation du comportement actuel.

### Création de tâches (`TaskFormModal.jsx`)

Deux façons de créer une tâche depuis `RoomView2D.jsx` : bouton flottant
"+ Créer une tâche" (tâche de pièce, sans meuble) et bouton "+ Ajouter une
tâche à ce [Meuble]" dans le tiroir d'un meuble (tâche verrouillée sur ce
meuble). Les deux ouvrent le même composant réutilisable
`src/components/forms/TaskFormModal.jsx`.

**Changement de modèle de données important** : la relation meuble ↔
tâches est **inversée**. Avant, une case de meuble portait un `taskId`
unique (un seul lien). Maintenant, chaque meuble porte un `furnitureId`
**stable**, et c'est la **tâche** qui référence `furnitureId` — un même
meuble peut donc porter plusieurs tâches (le tiroir du canapé affiche
maintenant une vraie liste, pas une tâche unique). Le vocabulaire de
statut change aussi : `"todo"/"done"` → `"pending"/"completed"` — propre
à ce MVP mock, sans rapport avec le statut des vraies tâches backend
(`"todo"/"in_progress"/"done"`).

**Refactor d'état nécessaire pour la réactivité demandée** : avant ce
chantier, `RoomView2D.jsx` gardait sa **propre copie locale** des tâches
(`useState`), initialisée depuis la prop `tasks` puis jamais resynchronisée
avec le parent — une tâche complétée ou créée là-dedans ne serait jamais
apparue dans `ApartmentOverview2D.jsx` en changeant de vue. La liste des
tâches vit maintenant dans **`ApartmentSpatialMvp.jsx`** (le parent
commun), qui la transmet en lecture aux deux vues et expose
`onCreateTask`/`onCompleteTask` à `RoomView2D` pour la faire évoluer. Les
deux vues lisent donc toujours la même source, jamais une copie qui
pourrait diverger.

**En attrapant ce refactor, un bug pré-existant a été corrigé au
passage** : `ApartmentOverview2D.jsx` vérifiait encore
`task.status === "done"` (ancien vocabulaire) — resté silencieusement
correct jusqu'ici seulement parce que les données mock utilisaient encore
ce même mot ; avec le renommage vers `"completed"`, ce test aurait
autrement fait retomber le pourcentage de chaque pièce à 0% sans erreur
visible. Corrigé en même temps que le reste.

**Simplification assumée** : `points` n'est pas un champ du formulaire de
création (pas demandé dans la spec) — une valeur fixe (5 pts) est
appliquée par `ApartmentSpatialMvp.jsx` à chaque tâche créée.

### Sélecteur d'étage (`MOCK_FLOORS`)

Ajoute la couche "étage" au prototype mock, dans la continuité de la
hiérarchie complète voulue à terme (Compte → Résidence → Étage → Pièce →
Meuble/Tâche — voir la discussion dédiée). **Ce chantier ne concerne que
le prototype mock** ; le vrai backend a déjà `floors`/`households` (voir
plus haut), mais un compte n'y appartient encore qu'à un seul foyer —
choix distinct, pas traité ici.

- **`MOCK_FLOORS`** (dans `mockData.js`) : 2 étages — Salon et Cuisine au
  rez-de-chaussée (`floor-rdc`), Chambre et Salle de bain au 1er étage
  (`floor-1`). Chaque pièce de `MOCK_ROOMS` porte un `floorId`.
- **Sélecteur d'étage** dans l'en-tête de `ApartmentSpatialMvp.jsx` —
  boutons "RDC"/"Étage 1" (`shortLabel` sur chaque étage, distinct du
  `name` complet). Changer d'étage ramène toujours à la Vue Ensemble de
  ce nouvel étage — deux étages ne peuvent pas être fusionnés
  visuellement sur une seule carte continue (contrairement aux pièces
  d'un même étage, voir juste en dessous).

### Vue par étage, plan réel unifié (`FloorView2D.jsx`)

**Deuxième refonte de cette vue.** La version précédente gardait une
grille par pièce, recollées via `room.floorOffset`. Maintenant, chaque
étage a **une seule grille de dalles** (`MOCK_FLOOR_TILES`, dans
`mockData.js`) : chaque dalle porte des coordonnées globales `(x, y)` et
un `roomId` direct (ou `null` si mur/porte). Les pièces (`MOCK_ROOMS`) ne
portent plus de géométrie du tout — juste leur identité (nom, couleur,
étage, disposition dans la vue d'ensemble).

**Plans dessinés puis vérifiés avant l'écriture du fichier** (simulation
Python, puis exécution du vrai fichier avec Node pour confirmer) : le
rez-de-chaussée est un plan Salon | Couloir | Cuisine (13×8 dalles),
séparés par de vrais murs avec une porte chacun ; le 1er étage est
Chambre | Salle de bain (9×8), même principe. Chaque porte vérifiée pour
relier exactement les deux bonnes pièces des deux côtés, et pour
qu'aucun trou ("case vide" non couverte par mur/sol) ne subsiste dans le
contour.

**"Dans quelle pièce suis-je ?" devient une simple lecture**, plus un
calcul de boîte englobante comme avant : chaque dalle connaît directement
son `roomId`, donc il suffit de regarder la dalle sous l'avatar. Se
tenir précisément sur une porte (roomId `null`) affiche "Passage" en
en-tête plutôt que de perdre le nom de la pièce — la dernière pièce
connue (`lastRoomId`) reste utilisée pour cibler le bon `roomId` quand on
crée une tâche de pièce, même en plein passage.

**Identité visuelle par pièce** : chaque dalle de sol est teintée avec la
couleur de sa pièce (`room.color`), avec une légère variation en damier
(`shade()`, assombrissement de ~10) pour le relief — pas juste un
damier clair/foncé générique déconnecté de la pièce comme avant.

**Zoom/pan/pincement : changement de bibliothèque, pas juste
d'implémentation.** La version précédente codait le pincement à la main
(`addEventListener` sur `touchmove`) — c'était déjà le point que je ne
pouvais pas vérifier moi-même. Cette demande ajoutait EN PLUS le
glisser-déplacer (pan) à un doigt, une interaction tout aussi délicate à
coder à la main sans pouvoir tester sur un vrai appareil. **Choix
assumé** : utiliser `react-zoom-pan-pinch`, une bibliothèque dédiée et
éprouvée pour exactement ce cas d'usage, plutôt que doubler le code fait
main. Le compromis : une nouvelle dépendance à installer
(`npm install` la récupérera automatiquement, déjà ajoutée à
`package.json`).
- `TransformWrapper`/`TransformComponent` encapsulent la grille — zoom
  (molette/pincement), glisser-déplacer, tout géré par la bibliothèque.
- `useControls()` (dans `ZoomControls`, un sous-composant qui DOIT être
  enfant de `TransformWrapper` — ce hook ne fonctionne que dans ce
  contexte) expose `zoomIn`/`zoomOut`/`zoomToElement`/`centerView`,
  branchés sur les boutons flottants `[+]`/`[-]`/`[🎯]`. Le bouton 🎯
  recentre sur l'avatar via `zoomToElement` (une ref posée sur son
  élément), avec repli sur `centerView()` (centre de l'étage) si la ref
  n'est pas encore prête.
- **Honnêteté sur la limite réelle** : je ne peux toujours pas exécuter
  `npm install` ni tester la bibliothèque en conditions réelles ici —
  je suis raisonnablement confiant sur `TransformWrapper`/
  `TransformComponent`/`useControls` (l'API stable et documentée de
  cette bibliothèque depuis longtemps), mais c'est la première vraie
  preuve d'exécution qui viendra de toi.

**Simplifications assumées, inchangées** : le canapé (2 cases) reste
deux blocs adjacents avec la même étiquette. Le Couloir n'a aucune tâche
(convention déjà en place : 0 tâche = 100%/vert) — il apparaît comme
n'importe quelle autre pièce dans la Vue Ensemble ; dis-le si tu préfères
qu'il en soit exclu.

### Déplacement pas à pas et recherche de chemin (`src/services/pathfinding.js`)

Le déplacement était jusqu'ici une téléportation instantanée vers la case
cliquée. `src/services/pathfinding.js` (nouveau, pur JS sans dépendance
React — testable indépendamment) calcule maintenant un vrai chemin, et
`FloorView2D.jsx` anime l'avatar case par case le long de ce chemin.

**BFS, pas A*** : tous les déplacements ont le même coût (pas de terrain
pondéré), donc un simple parcours en largeur trouve déjà le plus court
chemin — code plus simple à vérifier qu'un A* (pas de fonction
heuristique à valider). Déplacement à 4 directions, sans diagonale.

**Vérifié par exécution réelle sur nos vraies données de plan avant
l'intégration dans le composant** (pas juste la logique relue à l'œil) :
chemin Salon→Cuisine traversant bien les deux portes dans l'ordre,
destination sur un mur correctement rejetée (`null`), départ = arrivée
géré (chemin d'une seule case), et un cas limite intéressant confirmé :
demander le chemin vers le canapé **en étant déjà juste à côté** renvoie
un chemin d'une seule case — ce qui, dans le composant, déclenche
l'ouverture immédiate du tiroir sans marche du tout (voir plus bas).

**`findNearestWalkableAdjacent`** : pour un clic sur un meuble (qui
occupe une ou plusieurs cases impassables), trouve la case marchable
adjacente au meuble accessible par le chemin le plus court depuis la
position actuelle — gère nativement les meubles à plusieurs cases (le
canapé) en cherchant autour de CHACUNE de ses cases, pas une seule.

**Ouverture différée du tiroir ("on arrival")** : cliquer un meuble ne
déclenche plus l'ouverture immédiate du tiroir. À la place, l'avatar
marche jusqu'à la case adjacente la plus proche, et `pendingAction`
(état dans `FloorView2D.jsx`) mémorise "ouvrir tel meuble" jusqu'à ce que
la marche soit terminée — seulement à ce moment le tiroir s'ouvre.
Exception assumée : si l'avatar est déjà juste à côté du meuble (chemin
d'une seule case), le tiroir s'ouvre immédiatement, sans déclencher
d'animation de marche inutile.

**Redirection en cours de marche** : cliquer une nouvelle destination
pendant que l'avatar marche remplace le chemin en cours plutôt que
d'ignorer le clic — un nouveau chemin est calculé depuis la position
ACTUELLE de l'avatar (pas sa position de départ d'origine), et l'ancien
minuteur de marche est annulé automatiquement (nettoyage de l'effet React
dont dépend `path`).

**Synchronisation JS/CSS** : la marche avance d'une case toutes les
`STEP_DURATION_MS` (250ms, dans `FloorView2D.jsx`), et la transition CSS
de `.floor-avatar` dure exactement la même durée (`0.25s`, commentée vers
l'autre dans les deux fichiers) — sans ça, le glissé visuel et le rythme
des étapes désynchroniseraient, donnant une marche saccadée. Transition
`linear` plutôt que `ease` : `ease` ralentit en fin de mouvement, ce qui
créerait un à-coup à chaque jonction entre deux cases enchaînées ; `linear`
maintient une vitesse constante, plus adapté à une animation chaînée
comme celle-ci (contrairement à un mouvement unique isolé, où `ease`
serait plus naturel).

### Tâches sur plusieurs pièces à la fois (`TaskFormModal.jsx`)

**Changement de modèle de données** : une tâche portait `roomId`
(singulier, une seule pièce). Elle porte maintenant `roomIds` (tableau)
— une même tâche (ex. "passer l'aspirateur") peut couvrir plusieurs
pièces à la fois. Ajouté aussi : `recurrenceDays`, présenté dans le
formulaire comme des choix simples ("Une fois"/"Tous les
jours"/"Toutes les semaines"/"Tous les mois") plutôt qu'un nombre de
jours à saisir à la main — purement informatif pour l'instant, aucune
logique de régénération automatique derrière.

**Choix assumé sur la validation** : une tâche partagée entre plusieurs
pièces n'a qu'**un seul statut partagé** — la valider la termine partout
où elle apparaît en même temps, pas une validation indépendante par
pièce. C'est le choix le plus simple, cohérent avec "une tâche divisée
sur plusieurs pièces" ; si tu préfères qu'une tâche partagée puisse être
faite dans une pièce mais pas l'autre, ce serait un modèle différent
(plus proche d'une tâche par pièce générée depuis un même "modèle" de
tâche récurrente) — pas construit ici, dis-le si c'est ce que tu veux.

**Tâche de MEUBLE reste à une seule pièce** : un meuble ne peut pas être
physiquement dans deux pièces à la fois, donc la sélection multi-pièces
n'apparaît que pour les tâches de pièce générales (bouton "+ Créer une
tâche"), pas pour celles créées depuis le tiroir d'un meuble.

**La sélection propose TOUTES les pièces, tous étages confondus** — pas
seulement celles de l'étage affiché. `ApartmentSpatialMvp.jsx` transmet
maintenant `allRooms` (la liste complète) à `FloorView2D.jsx`, en plus de
`rooms` (déjà filtré par étage, pour le rendu de la carte) — un choix
délibéré : "passer l'aspirateur partout" pourrait très bien couvrir des
pièces sur des étages différents.

**Vérifié par calcul avant l'écriture du fichier** : la nouvelle tâche de
démonstration partagée Salon+Chambre change légèrement les anciens
pourcentages (Salon 33%→25%, Chambre 67%→50%) mais aucune pièce ne
change de catégorie de couleur — confirmé par simulation, puis en
exécutant le vrai fichier.

**Limite pré-existante, pas causée par ce chantier, mais plus visible
maintenant** : il n'existe toujours aucun écran pour parcourir/valider
les tâches de PIÈCE (générales, sans meuble) depuis la vue spatiale —
seul le tiroir d'un MEUBLE affiche une liste de tâches avec un bouton
Valider. Une tâche de pièce (comme la nouvelle tâche partagée) ne se
reflète donc que dans le pourcentage de la Vue Ensemble, sans endroit
pour la marquer faite directement depuis `FloorView2D.jsx`. Pas traité
ici — dis-le si tu veux qu'on construise cet écran.

### Mode Édition du plan (`LayoutEditor.jsx`)

Permet de créer ou modifier la disposition des pièces par tracé au
doigt/à la souris, plutôt que de dessiner un plan à la main dans
`mockData.js` comme jusqu'ici.

**Flux d'accès, comme demandé** :
- **Aucun logement** (`rooms.length === 0`) → `OnboardingScreen.jsx`,
  un seul bouton "➕ Créer un logement" → ouvre directement le Mode
  Édition, canevas vide.
- **Logement existant** → bouton "✏️ Modifier le plan" dans l'en-tête de
  la vue spatiale → ouvre le Mode Édition en chargeant les pièces de
  l'étage AFFICHÉ (pas toutes, juste celui-là).

**Changement de modèle de données important** : `MOCK_ROOM_LAYOUTS`
(dans `mockData.js`) devient la source de vérité ÉDITABLE — de simples
rectangles `{id, x, y, width, height}` par pièce. Les dalles
(`MOCK_FLOOR_TILES`) ne sont plus jamais dessinées à la main : elles
sont **dérivées automatiquement** de ces rectangles via
`generateFloorTiles` (nouveau, `src/services/layoutGeneration.js`) :
- une case dans le rectangle d'une pièce → sol,
- une case hors de toute pièce mais adjacente à une case de sol → mur
  (contour extérieur ET séparations entre pièces, jamais dessinés à la
  main),
- **une porte automatique** entre deux pièces différentes séparées par
  exactement 1 case d'écart (avec au moins 2 cases de chevauchement sur
  l'axe perpendiculaire) — au milieu du chevauchement.

**Choix confirmé explicitement avant d'écrire cet algorithme** : deux
pièces tracées directement collées (aucune case d'écart) restent deux
pièces distinctes, mais **sans mur ni porte entre elles** — aucune case
disponible pour en placer une.

**Vérifié avant l'intégration, pas juste relu à l'œil** : appliqué à
notre géométrie RDC actuelle (Salon-Couloir-Cuisine, jusque-là dessinée
à la main), l'algorithme retrouve **exactement les mêmes positions de
porte** — (5,3) et (8,3) — sans qu'elles aient été codées en dur. Un
test de bout en bout supplémentaire (charger l'existant → ajouter une
pièce "Bureau" à côté de la Cuisine avec un écart d'1 case → sauvegarder)
confirme que la nouvelle porte Cuisine↔Bureau apparaît automatiquement,
que les 2 portes existantes et le mobilier du Salon sont préservés, et
que les nouvelles cases de la pièce ajoutée sont correctes.

**Interaction de tracé** : Pointer Events (pas mousedown/touchstart
séparés — un seul modèle unifié souris/tactile). Case de départ au
`pointerdown`, rectangle de prévisualisation en pointillés qui suit le
doigt/la souris au `pointermove`, figé au `pointerup` — refusé si moins
de 2×2 dalles ou si la zone chevauche une pièce déjà tracée, sinon une
petite modale (`RoomNameModal.jsx`) demande le nom avant de valider.
Bouton flottant "Enregistrer le plan" en bas d'écran.

**Limite assumée, documentée dans le code** : le mobilier (le canapé) ne
fait pas partie du modèle d'édition — ce sont des rectangles de PIÈCES
uniquement. En sauvegardant, le mobilier existant est réappliqué
automatiquement, mais **seulement si sa case tombe encore sur une case
de sol de la MÊME pièce qu'avant** (vérifié par `generateFloorTiles` via
`expectedRoomId`) ; sinon il est simplement abandonné plutôt que de
corrompre le plan — pas de message d'erreur affiché pour l'instant si ça
arrive.

**Autre limite assumée** : si une pièce n'est pas un simple rectangle
(forme en L, par exemple, pas possible à tracer avec ce mécanisme de
toute façon), `extractRoomRectsFromTiles` ne retrouverait que son
rectangle englobant, pas sa forme exacte — sans conséquence pour nos
pièces actuelles (toutes déjà de simples rectangles).

**Portes entre pièces séparées par PLUS d'1 case** : toujours pas
gérées automatiquement — au-delà d'un écart de 1 case, aucune porte
n'est générée. **Mise à jour** : la création de porte manuelle
mentionnée ici comme "chantier séparé" a depuis été construite — voir
juste en dessous.

### Retrait temporaire du mobilier et des tâches

Décidé ensemble avant de construire les fonctionnalités qui suivent :
le foyer se concentre d'abord sur l'éditeur de plan (déplacement,
aimantage, portes) avant de remettre tâches et mobilier par-dessus une
base spatiale solide. Concrètement :
- `MOCK_TASKS` et toute la logique de tâches (tiroir de meuble, bouton
  "+ Créer une tâche", `TaskFormModal.jsx`) retirés de `FloorView2D.jsx`,
  `ApartmentSpatialMvp.jsx`. `TaskFormModal.jsx`/CSS supprimés (plus
  aucune référence ailleurs, vérifié).
- `ApartmentOverview2D.jsx` simplifié : simple bloc coloré par pièce
  (`room.color`), plus de pourcentage/heatmap (qui dépendait des tâches).
- **Rien n'est perdu pour de bon** : toute cette conversation reste la
  référence exacte de comment ça marchait (modèle `roomIds` tableau,
  `recurrenceDays`, tâches multi-pièces, tiroir de meuble) pour quand ce
  chantier reprendra.

### Déplacement de pièces : aimantage et résolution de collision (`src/services/roomCollision.js`)

Poignée de déplacement (✢) au centre de chaque pièce, ou appui long
(500ms) n'importe où ailleurs sur la pièce — les deux déclenchent le
même geste de déplacement, routé via Pointer Events sur la grille de
`LayoutEditor.jsx`.

**`applyMagneticSnap`** : pendant le glissé, si une pièce voisine est à
moins de 2 cases (avec un chevauchement suffisant sur l'axe
perpendiculaire pour que l'alignement ait un sens), la pièce déplacée
"colle" instantanément contre son bord — exactement la mécanique
demandée pour réaligner les murs facilement.

**`resolveOverlap`** : au relâchement, si la position choisie chevauche
une ou plusieurs pièces, pousse la pièce déplacée jusqu'à ce qu'il n'y
ait plus de chevauchement — least-effort, le déplacement le plus court
parmi les 4 directions (haut/bas/gauche/droite).

**Un vrai bug trouvé et corrigé AVANT l'intégration, pas après** : la
première version de `resolveOverlap` traitait un chevauchement à la
fois (la première pièce trouvée), et pouvait **osciller** — pousser hors
d'une pièce recréait un chevauchement avec une autre juste à côté,
sans jamais converger. Repéré en testant un scénario à 2 pièces voisines
avant toute intégration dans l'éditeur. Corrigé en calculant, à chaque
étape, le push nécessaire pour dégager **toutes** les pièces actuellement
chevauchées à la fois (le maximum par direction), pas juste la première
— revérifié ensuite avec un scénario encore plus dense (3 pièces en U,
pièce déposée en plein centre) pour confirmer la convergence.

**Retour visuel pendant le glissé** : opacité réduite + bordure rouge
si la position actuelle chevauche une autre pièce (`layout-editor__room--invalid`),
matchant exactement la demande.

### Outil de placement de porte manuel

Bouton bascule "🚪 Ajouter une porte" dans la barre d'outils de
`LayoutEditor.jsx`. Actif, il calcule via **`findDoorCandidates`**
(nouveau, `layoutGeneration.js`) — contrairement à l'auto-détection qui
ne choisit qu'UNE position (le milieu du chevauchement), cette fonction
énumère **toutes** les positions valides le long de chaque frontière
partagée par deux pièces séparées de 1 case, affichées comme des
marqueurs cliquables en surbrillance sur la grille. Cliquer un marqueur
bascule cette position dans l'état `doors` de l'éditeur (ajoute si
absente, retire si déjà présente).

**`generateFloorTiles` accepte maintenant des portes explicites** —
`generateFloorTiles(rooms, { explicitDoors })`. Si fournies, elles
remplacent ENTIÈREMENT l'auto-détection (l'utilisateur garde le contrôle
total, y compris pour retirer une porte auto-détectée) ; si omises,
l'ancien comportement par auto-détection reste inchangé — rétrocompatible
avec tout code qui ne connaît pas encore les portes explicites.

**Vérifié de bout en bout avant livraison** : chargé les portes
existantes du RDC depuis les dalles (`(5,3)` et `(8,3)`), simulé le
retrait de l'une d'elles et l'ajout d'une nouvelle position sur la même
frontière, régénéré avec `explicitDoors`, confirmé que l'ancienne porte a
bien disparu, la nouvelle est bien présente, et que ré-extraire les
pièces depuis le résultat final retombe exactement sur la géométrie
d'origine.

**`ApartmentSpatialMvp.jsx`** extrait maintenant les portes existantes de
l'étage édité (`type === "door"` dans les dalles actuelles) pour que
l'outil parte de l'état réel, et transmet les portes éditées à
`generateFloorTiles` au moment d'enregistrer.

### Bascule directe vers la vue 2.5D après sauvegarde

Deux écarts trouvés en relisant la demande précisément par rapport à ce
qui existait déjà, corrigés dans `ApartmentSpatialMvp.jsx` :

1. **Après "Enregistrer le plan"**, l'application bascule maintenant
   directement vers `FloorView2D.jsx` (`view = "floor"`) — avant, elle
   revenait vers la Vue Ensemble, ce qui n'était pas ce qui était
   demandé.
2. **Position de départ de l'avatar recalculée, jamais figée en dur** :
   auparavant, un tout nouveau logement plaçait l'avatar à `{x:1, y:1}`
   sans vérifier que cette case existe même dans la pièce dessinée — si
   la première pièce n'était pas tracée à cet endroit précis, l'avatar
   aurait pu se retrouver sur un mur ou hors de l'appartement. Corrigé :
   la position est maintenant TOUJOURS recalculée au centre géométrique
   de la première pièce tracée, à chaque sauvegarde (pas seulement à la
   création). Vérifié par calcul que le centre d'un rectangle de pièce
   tombe toujours sur une case de sol de cette pièce (par construction),
   avec des dimensions paires ET impaires, puis simulé le flux complet
   (créer une pièce loin de l'origine → l'avatar démarre bien dessus, pas
   sur un mur ; créer deux pièces → l'avatar démarre bien dans la
   première, pas la seconde).

Le reste de la demande (murs extérieurs, cloisons intérieures, découpe
des portes, sol unifié teinté par pièce, aucun meuble/tâche) était déjà
construit dans les étapes précédentes — voir les sections dédiées plus
haut (`generateFloorTiles` dans `layoutGeneration.js`, et le retrait du
mobilier/tâches).

### Type de pièce, couleur fonctionnelle et surface (`RoomInspector.jsx`)

**Divergence assumée par rapport à l'exemple fourni** : le schéma
suggéré utilisait `bounds: {x1,y1,x2,y2}` — gardé notre `{x, y, width,
height}` existant à la place, puisque tout notre code déjà vérifié
(génération de murs/portes, aimantage, collision) l'utilise ; changer de
convention géométrique partout aurait été un risque réel pour un simple
changement de représentation, sans bénéfice fonctionnel. Les nouveaux
champs (`type`, `icon`, `surfaceM2`, `tilesCount`) s'ajoutent par-dessus.

**`src/data/roomTypes.js`** (nouveau) : les 9 types demandés
(Salon/Séjour, Cuisine, Chambre, Salle de Bain, Toilettes, Entrée/
Couloir, Bureau, Balcon/Terrasse, Autre/Cellier), chacun avec une icône
et une teinte pastel très légère. `findRoomType` retombe sur "Autre" si
le type est absent/inconnu — important pour la rétrocompatibilité avec
des pièces créées avant cette fonctionnalité (voir plus bas).

**Déclencheur : tap rapide, distinct de l'appui long qui déplace** — un
minuteur d'appui long partagé détermine lequel des deux gestes se
produit : si le relâchement arrive AVANT que le minuteur ne se
déclenche (500ms), c'est un tap → ouvre `RoomInspector.jsx` ; si le
minuteur se déclenche, c'est un déplacement, et c'est alors la grille
(pas la pièce) qui gère le relâchement final, puisque le pointeur a été
capturé dessus.

**La couleur est toujours dérivée du type, jamais une valeur
indépendante** : choisir un type dans l'inspecteur met à jour `color`,
`icon` ET `name` (au nom du type) en une fois — l'utilisateur peut
ensuite personnaliser le nom librement, jusqu'à ce qu'il change de type
à nouveau (qui écrase le nom personnalisé par le nouveau nom par
défaut — comportement volontairement simple, comme décrit dans la
demande).

**Surface : constante d'échelle isolée, jamais stockée en dur** —
`TILE_SIZE_METERS` (dans `layoutGeneration.js`, 1 par défaut = 1 dalle
= 1 m²) est la SEULE chose à modifier pour changer l'échelle partout ;
`computeRoomSurface(room)` recalcule toujours `tilesCount`/`surfaceM2` à
la volée depuis `width × height`, jamais une valeur figée qui pourrait
devenir incohérente après un redimensionnement. Affiché en temps réel
au centre de chaque pièce dans `LayoutEditor.jsx` (icône + nom + m²) —
se met donc à jour automatiquement pendant un déplacement/redimensionnement,
sans code supplémentaire.

**Rétrocompatibilité vérifiée** : `extractRoomRectsFromTiles` (recharge
un étage existant dans l'éditeur) propage `type`/`icon` s'ils existent
déjà sur la pièce, et retombe proprement sur "Autre" (📦) sinon — testé
avec les deux cas avant intégration. `MOCK_ROOMS` mis à jour avec les
vrais types de chaque pièce existante (Salon→salon, Couloir→entree,
Cuisine→cuisine, Chambre→chambre, Salle de bain→sdb).

### Persistance localStorage et export/import JSON (`src/services/layoutStorage.js`)

**Précision importante** : la restriction "jamais de localStorage" qui
s'applique aux *artifacts* générés dans la conversation ne concerne pas
ce projet — `ApartmentSpatialMvp.jsx` est un vrai composant d'un vrai
projet Vite, qui tourne dans le navigateur de l'utilisateur, pas dans le
bac à sable d'un artifact. `localStorage` y est parfaitement approprié.

**Schéma choisi** (la section 4 de la demande s'est coupée avant
d'arriver — schéma conçu moi-même, à corriger si ce n'est pas ce qui
était prévu) :
```json
{
  "version": 1,
  "exportedAt": "2026-...",
  "floors": [{ "id", "name", "shortLabel", "level", "avatarStart" }],
  "rooms": [{ "id", "name", "type", "icon", "color", "floorId", "x", "y", "width", "height" }],
  "doors": { "floor-rdc": [{ "x", "y" }], "floor-1": [...] }
}
```
**`floorTiles` n'y figure jamais** — voir plus bas, c'est maintenant une
valeur entièrement dérivée, jamais persistée séparément.

**Changement d'architecture au passage** : `floorTiles` n'est plus un
état séparé dans `ApartmentSpatialMvp.jsx` (fini `setFloorTiles`).
Comme il est entièrement calculable à partir de `rooms` + `doors` via
`generateFloorTiles`, le garder comme état à part risquait de le
laisser désynchronisé après un changement quelque part dans le code.
Il est maintenant recalculé à chaque rendu via `useMemo` — ne peut plus
jamais diverger des données qui le produisent. Bénéfice direct pour
cette fonctionnalité : stocker/exporter seulement `floors`/`rooms`/
`doors` suffit, pas besoin de sérialiser les dalles générées.

**Sauvegarde automatique** : un seul `useEffect` qui surveille
`[floors, rooms, doors]` — couvre déjà tous les cas demandés (création,
déplacement, suppression, ajout de porte, changement de type/nom),
puisque chacune de ces actions passe forcément par l'un de ces trois
états. Échoue silencieusement si `localStorage` est indisponible (mode
privé, quota dépassé) plutôt que de faire planter l'application pour une
fonctionnalité annexe.

**Chargement au démarrage** : `localStorage` est vérifié AVANT les
props/données mock, dans les initialiseurs `useState` (évalués une seule
fois par React, au tout premier rendu) — si des données valides existent,
elles remplacent entièrement `MOCK_FLOORS`/`MOCK_ROOMS`.

**Export** : génère le JSON et déclenche son téléchargement via la
technique standard navigateur (Blob + URL objet temporaire + clic
programmatique sur un lien invisible).

**Import** : lit le fichier, vérifie la présence de `rooms` (tableau),
`doors` (objet) et `floors` (tableau) avant d'accepter quoi que ce soit
— message d'erreur clair et dismissible sinon ("Fichier JSON invalide"),
jamais une exception qui remonterait jusqu'à l'utilisateur.

**Vérifié avant intégration** : la validation rejette correctement
`null`, un objet vide, chacune des 3 clés manquante individuellement, et
`doors` fourni comme un tableau au lieu d'un objet — puis accepte
correctement le cas minimal valide. **Round-trip complet simulé** :
mêmes portes générées avant l'export et après un import simulé des
mêmes données (comparaison stricte des dalles dérivées) — confirmé
identique.

**Réinitialisation** : bouton discret dans la barre d'outils de
`LayoutEditor.jsx`, avec une modale de confirmation avant d'agir (pas
d'action irréversible sans confirmation) — efface `localStorage` et
remet l'état à zéro, retombant sur l'écran d'accueil.

**Ce que je n'ai pas pu vérifier moi-même** : tout ce qui touche
réellement au DOM du navigateur (lecture/écriture `localStorage`,
téléchargement de fichier via Blob/URL objet, lecture d'un fichier
importé via `<input type="file">`) — aucun de ces trois ne peut
s'exécuter dans mon environnement de travail (ni navigateur, ni DOM). La
logique PURE (validation, construction du schéma, dérivation des dalles)
est vérifiée à fond ; l'exécution réelle dans ton navigateur reste la
première vraie preuve.

## Ce qui manque encore (connu, pas caché)

- **Connexion via Google (OAuth)** — pas commencé. Ça demande d'abord une
  action de ta part que je ne peux pas faire à ta place : créer un projet
  sur la Google Cloud Console, configurer l'écran de consentement OAuth,
  et générer un Client ID + Client Secret avec les bonnes URI de
  redirection autorisées. Une fois ces identifiants en main, le code
  (redirection vers Google, échange du code contre un jeton, vérification
  de sa signature) est faisable sans nouvelle dépendance npm, mais c'est un chantier à part — sécuritairement sensible, et que je ne peux
  vérifier moi-même avant que tu aies ces identifiants réels.
- **Prénom/nom restent combinés en un seul `name`** — les formulaires
  d'inscription les saisissent séparément, mais les concatènent avant
  l'envoi. Le modèle de données (backend + tout le reste de l'affichage)
  n'a toujours qu'un seul champ `name` ; les séparer pour de vrai
  toucherait beaucoup de fichiers qui affichent déjà `user.name`.
- **Un compte n'appartient qu'à un seul foyer à la fois.** Accepter une
  invitation avec un compte déjà existant CHANGE son foyer, ça ne l'ajoute
  pas à une liste de plusieurs foyers. Pas de vrai support multi-foyer.

- **La session n'est pas un vrai jeton.** `App.jsx` garde l'utilisateur
  connecté dans `localStorage` — ça suffit pour tester en local, mais il
  n'y a ni expiration, ni révocation côté serveur, ni vérification que le
  compte existe encore. À remplacer avant tout usage au-delà de ta propre
  machine.
- **Les invitations n'envoient pas de vrai email.** `inviteUser` génère un
  jeton et le retourne à l'appelant ; rien ne l'achemine par email (SMTP,
  SendGrid…). Le champ jeton du formulaire d'acceptation est modifiable à
  la main pour cette raison.
- **`createHousehold`/`listHouseholds` et `listInvitations`** existent
  côté `dataService.js` mais n'ont pas de route HTTP exposée — pas
  utilisés par le frontend actuellement.
- **`createRoom` avec un `x`/`y` explicite** ne vérifie pas les
  chevauchements à la création (seul le déplacement le fait).
- **Suppression en cascade irréversible** : une fois confirmée (étage ou
  pièce), pas de corbeille, pas d'annulation.
- **Aucune notion de permission liée à `createdBy`** : le foyer sait qui
  l'a créé, mais rien n'empêche un autre membre de faire les mêmes actions
  (inviter, créer des occupants, etc.).
- **La grille du plan 2D est virtuelle**, pas liée à une surface réelle du
  logement (largeur de mise en page arbitraire pour le retour à la ligne).
