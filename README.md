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
  .eslintrc.cjs / .prettierrc / .prettierignore   # qualité de code — voir section dédiée
  .env.example                                     # variables d'environnement documentées — voir section dédiée
  tests/
    ItemForm.test.jsx
    RoomFloorPlan.test.jsx
    TaskCreation.integration.test.jsx
  src/
    main.jsx               # point d'entrée réel (référencé par index.html)
    AppRouter.jsx           # configuration des routes — voir section dédiée
    lib/
      supabaseClient.js       # câblage du client Supabase — voir section dédiée
    App.jsx                # session : pas connecté -> formulaires ; connecté -> AppShell
    api.js                  # fetch vers le serveur (une fonction par route)

    features/              # MODULES FONCTIONNELS — voir section dédiée sur cette restructuration
      auth/
        LoginForm.jsx / SignupForm.jsx / ForgotPasswordForm.jsx / InviteForm.jsx / AcceptInvitationForm.jsx   # vrai backend — réutilisés tels quels par HouseholdRoot.jsx (voir section dédiée)
        AuthForm.css                              # styles partagés du thème connexion/inscription
        AuthContext.jsx                            # session partagée (AuthProvider/useAuth) — voir section dédiée
        RequireAuth.jsx                            # garde de route — voir section dédiée
        LoginPage.jsx                              # page /login — voir section dédiée
      household/
        Dashboard.jsx                     # vrai backend
        HouseholdDashboardPage.jsx        # page /households — voir section dédiée (React Router)
        HouseholdViewPage.jsx             # page /households/:householdId — voir section dédiée
        useHouseholdRole.js               # hook rôle PROPRIETAIRE/LOCATAIRE — voir section dédiée
        HousingDashboard.jsx / .css       # cartes de logements (MVP)
        JoinHousingModal.jsx / .css       # placeholder "rejoindre un logement"
        ScanPlanModal.jsx                 # placeholder "scanner un plan" — voir section dédiée
        PlaceholderModal.jsx / .css       # feuille du bas partagée par les deux placeholders ci-dessus
        CreateHousingScreen.jsx / .css    # accordéon Créer/Scanner/Rejoindre — voir section dédiée
        OnboardingScreen.jsx / .css       # écran "aucun logement" interne à ApartmentSpatialMvp
        ApartmentSpatialMvp.jsx / .css    # orchestrateur d'UN logement (étages, commutateur de vue)
        FloorView2D.jsx / .css            # vue étage 2.5D, marche pas à pas
        Plan2DView.jsx / .css             # vue "Plan 2D" en lecture seule, sans avatar — voir section dédiée
        mockData.js                       # données de départ du MVP
        utils/
          pathfinding.js                    # recherche de chemin (BFS)
          householdLayoutApi.js              # pont vers le vrai backend (étages/pièces/portes) — voir section dédiée
      layout-editor/
        components/
          LayoutEditor.jsx / .css             # canevas d'édition (tracé, déplacement, redimensionnement, portes)
          RoomInspector.jsx / .css             # type/nom/surface d'une pièce
          RoomNameModal.jsx / .css              # nommage d'une pièce fraîchement tracée
        utils/
          layoutGeneration.js                     # dérive murs+portes+surface à partir de rectangles de pièces
          roomCollision.js                          # détection de chevauchement (rectsOverlap)
          layoutStorage.js                           # export/import de fichier JSON du plan uniquement (plus de persistance localStorage, voir section dédiée)
          validateLayout.js                            # validation Zod du plan importé — voir section dédiée
        roomTypes.js                                  # types de pièce prédéfinis (icône, couleur pastel)

    components/            # UI générique, réutilisable par N'IMPORTE QUELLE feature
      ui/
        Toast.jsx / Spinner.jsx / Skeleton.jsx / StatusBadge.jsx / ProgressBar.jsx   # génériques
        Icons.jsx                                    # pictogrammes SVG minimalistes, teintables — partagés par plusieurs features, voir section dédiée
        ItemCard.jsx / ItemForm.jsx / ItemGrid.jsx                                    # génériques, réutilisés pour task/project/room
      forms/                # PAS ENCORE migré — voir la note sur ce choix plus bas
        ProjectFormFields.jsx / TaskFormFields.jsx / RoomFormFields.jsx / PetFormFields.jsx
      layout/
        AppShell.jsx          # PAS ENCORE migré — voir la note plus bas
      tasks/
        TaskOverview.jsx        # PAS ENCORE migré — voir la note plus bas
      floorplan/
        RoomFloorPlan.jsx / FloorPlanSection.jsx / FloorThumbnail.jsx   # PAS ENCORE migré — voir la note plus bas

    hooks/                  # hooks RÉELLEMENT globaux (pas propres à une feature)
      useItems.js
      useToast.js
    utils/                  # fonctions utilitaires RÉELLEMENT partagées
      formValidators.js       # copie ESM native de quelques règles de backend/validators.js
    assets/                 # styles globaux (pas de sprites/icônes binaires pour l'instant)
      theme.css                                 # tokens de couleur globaux (:root) — voir section dédiée
      ui-feedback.css / visual-hierarchy.css / floor-plan.css / task-overview.css / room-3d.css
```

> **Passage à une architecture Feature-Based (nouveau)** : voir la
> section dédiée juste après ce tableau pour le détail de cette
> restructuration — quels fichiers sont partis où, et pourquoi certains
> sont volontairement restés en place.

## Restructuration Feature-Based (`src/features/`)

Le dossier `src/` du frontend est passé d'une organisation "par type de
composant" (`components/spatial/`, `components/forms/`,
`components/auth/`...) à une organisation **par fonctionnalité métier**
(`features/auth/`, `features/household/`, `features/layout-editor/`),
plus un `components/` réduit aux éléments VRAIMENT génériques.

**48 fichiers déplacés**, tous les chemins d'import corrigés dans
l'ensemble du projet (`src/` et `tests/`) — vérifié par un audit complet
après coup (chaque import résout bien vers un export réel), pas
seulement supposé correct après le déplacement.

**Point important à connaître avant d'aller plus loin : deux systèmes
parallèles coexistent** dans ce projet, comme documenté depuis le début
— le vrai backend (comptes réels, `App.jsx`/`AppShell.jsx`/
`Dashboard.jsx`, formulaires d'authentification réels) et le MVP spatial
mock que nous développons activement (monté à la place du premier dans
`main.jsx`). Cette restructuration couvre les 3 dossiers `features/`
explicitement demandés, qui concernent tous les deux à la fois (le vrai
`Dashboard.jsx` et le mock `HousingDashboard.jsx` vivent tous les deux
dans `features/household/`, par exemple) — mais **certains fichiers du
vrai backend, non liés aux 3 features nommées, ont été volontairement
laissés en place** plutôt que déplacés à l'aveugle vers un dossier qui
ne leur correspond pas encore :
- `components/forms/` : `ProjectFormFields.jsx`, `TaskFormFields.jsx`,
  `RoomFormFields.jsx`, `PetFormFields.jsx` — formulaires du vrai modèle
  de tâches/projets, pas encore couverts par une feature nommée (viendra
  probablement avec l'étape 4 de la feuille de route — mobilier/tâches).
- `components/floorplan/` : `RoomFloorPlan.jsx`, `FloorPlanSection.jsx`,
  `FloorThumbnail.jsx` — l'ANCIEN éditeur de plan du vrai backend
  (glisser-déposer, magnétisme — historique, avant la reconstruction
  complète en MVP spatial). Probablement obsolète face à
  `layout-editor/`, mais pas supprimé sans confirmation.
- `components/layout/AppShell.jsx` — coquille de la vraie application
  (nav, en-tête), pas spécifique à un logement.
- `components/tasks/TaskOverview.jsx` — vue des tâches du vrai backend.

Si tu préfères que je les déplace aussi maintenant (ex. dans un futur
`features/tasks/` ou en les supprimant s'ils sont vraiment obsolètes),
dis-le — je ne l'ai pas fait de mon propre chef pour ne pas prendre de
décision architecturale non demandée sur du code qui n'est pas
activement en développement en ce moment.

**Répartition à l'intérieur de `features/household/`** : à la fois le
vrai `Dashboard.jsx` (backend) et tout le MVP spatial (`HouseholdRoot`,
`HousingDashboard`, `ApartmentSpatialMvp`,
`FloorView2D`, `OnboardingScreen`, `mockData.js`) — `FloorView2D.jsx` y
vit plutôt que dans `layout-editor/`, parce qu'il s'agit de la vue
DÉPLACEMENT/NAVIGATION dans un plan déjà construit (une pièce de
"household"), alors que `layout-editor/` reste réservé à la CRÉATION/
MODIFICATION du plan lui-même.

**Dépendance intentionnelle entre features** : `features/household/`
importe `generateFloorTiles` depuis `features/layout-editor/utils/` (la
vue d'un logement a besoin de dériver ses dalles depuis les mêmes
rectangles de pièces que l'éditeur) — pas de duplication de cette
logique, un seul endroit qui sait générer un plan à partir de
rectangles.

**`components/ui/`** : `Toast`, `Spinner`, `Skeleton`, `StatusBadge`,
`ProgressBar` (anciennement `common/`) et `ItemCard`/`ItemForm`/
`ItemGrid` (anciennement `items/`) — tous fusionnés ici, puisque les deux
anciens dossiers avaient exactement la même vocation ("UI générique
réutilisable par n'importe quelle feature").

**`assets/`** : renommé depuis `styles/` — pas encore de vraies images/
sprites/icônes binaires dans ce projet, seulement les styles globaux du
vrai backend pour l'instant (le MVP spatial garde ses CSS
co-localisées avec chaque composant, comme avant).

**Un vrai bug trouvé et corrigé pendant la correction automatique des
imports, pas juste supposé correcte** : le premier passage du script de
correction a accidentellement ajouté des extensions `.jsx`/`.js`
explicites à des imports qui n'en avaient jamais eu (aurait quand même
fonctionné avec Vite, mais cassait la convention "sans extension"
utilisée partout ailleurs dans ce projet) — repéré via mon propre audit,
qui avait lui-même un bug de troncature de chaîne (`.replace(".js","")`
corrompait ".jsx" en laissant un "x" parasite, faussant les résultats).
Les deux ont été corrigés avant de considérer la restructuration
terminée. Deux imports gardent délibérément leur extension `.js`
explicite (`mockData.js` → `layoutGeneration.js`, `layoutGeneration.js`
→ `roomTypes.js`) — pour rester exécutables directement avec `node` lors
de mes vérifications, sans rien changer côté Vite.

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

**La solution retenue** : `src/utils/formValidators.js` copie à la main,
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
| `src/features/auth/SignupForm.jsx` | inscription (crée foyer + compte) ; réutilise `validateSignup` (via `formValidators.js`) |
| `src/features/auth/LoginForm.jsx` | connexion ; ne réutilise **pas** `validateSignup` (les règles de force du mot de passe ne s'appliquent qu'à sa création, pas à sa vérification) |
| `src/features/auth/InviteForm.jsx` | invite un email à rejoindre le foyer courant |
| `src/features/auth/AcceptInvitationForm.jsx` | finalise le compte de l'invité à partir d'un jeton (modifiable à la main : pas de vrai email envoyé, voir plus bas) ; réutilise `validateSignup` (via `formValidators.js`) |
| `src/features/auth/ForgotPasswordForm.jsx` | réinitialisation en deux étapes (demande par email, puis code + nouveau mot de passe) ; le code n'apparaît jamais dans l'interface, seulement journalisé côté serveur |
| `src/components/layout/AppShell.jsx` | tableau de bord : appelle `useItems` pour "task"/"project"/"room" (+ "floor" via `FloorPlanSection`), partage les résultats à tous les enfants |
| `src/components/layout/Dashboard.jsx` | 3 cartes KPI (projets actifs, tâches en attente, taux de complétion) |
| `src/components/tasks/TaskOverview.jsx` | liste des tâches triable par urgence ou regroupée par pièce |
| `src/components/ui/ItemCard.jsx` / `ItemForm.jsx` / `ItemGrid.jsx` | les 3 composants génériques réutilisés pour task/project/room ; `ItemForm` garde l'état/validation/soumission et délègue le RENDU des champs à `src/components/forms/*FormFields.jsx` (purement présentationnels, aucun état propre) ; `ItemGrid` accepte une prop `renderItems` pour remplacer les cartes par un autre rendu (ex. le plan des pièces) sans dupliquer formulaire/toasts/erreurs |
| `src/components/floorplan/RoomFloorPlan.jsx` | plan 2D : glisser-déposer, magnétisme, blocage de collision, suppression avec confirmation (affiche le nombre de tâches qui seraient supprimées) |
| `src/components/floorplan/FloorPlanSection.jsx` | conteneur du plan : sélecteur d'étages (miniatures + nom), boutons ajouter/retirer un étage (avec confirmation détaillant pièces + tâches concernées), formulaire d'étage réutilisant `validateFloor` |
| `src/components/floorplan/FloorThumbnail.jsx` | miniature statique "de biais" (isométrique), uniquement dans les onglets du sélecteur d'étages — pas d'interaction, pas de rotation |
| `src/components/ui/Toast.jsx` / `Spinner.jsx` / `Skeleton.jsx` / `StatusBadge.jsx` / `ProgressBar.jsx` | composants d'affichage réutilisables, génériques (aucun domaine métier particulier) |
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

Tu devrais voir l'écran de connexion/inscription **réel** (`HouseholdRoot.jsx`
— voir sa section dédiée : appelle le vrai backend, `node server.js` doit
tourner). Une fois connecté, le Dashboard de logements s'affiche : crée
un logement (ou sélectionne-en un existant) → à partir de là, tout ce
qui est documenté ci-dessus est testable : étages, pièces (tracé,
déplacement, redimensionnement, portes), plan persistant. Le vrai flux
d'inscription/connexion du backend (comptes réels, tâches, invitations
par email) existe toujours
intact dans `App.jsx` — juste momentanément pas branché depuis
`main.jsx` (voir plus bas).

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

## MVP vue 2.5D et vue d'ensemble (`src/features/household/` et `src/features/layout-editor/`)

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

- `src/features/household/mockData.js` — inchangé depuis la version précédente (la
  grille 6×6, la géométrie, tout reste identique — seule la façon de la
  DESSINER a changé).
- `src/features/household/FloorView2D.jsx` (+ son CSS) — sol et meubles
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
`<HouseholdRoot />` (le nouvel orchestrateur racine — vrai login/inscription →
Dashboard → `ApartmentSpatialMvp`, voir sa section dédiée) au lieu de
`<App />`. **`App.jsx` n'a pas été modifié** — le vrai flux
inscription/connexion existe toujours intact, juste momentanément pas
branché depuis ce fichier. Pour y revenir : remplacer
`<HouseholdRoot />` par `<App />` dans `main.jsx`.

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

- **`src/features/household/mockData.js` étendu** : passé d'une seule pièce (Salon) à 4
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

### Déplacement pas à pas et recherche de chemin (`src/features/household/utils/pathfinding.js`)

Le déplacement était jusqu'ici une téléportation instantanée vers la case
cliquée. `src/features/household/utils/pathfinding.js` (nouveau, pur JS sans dépendance
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
`generateFloorTiles` (nouveau, `src/features/layout-editor/utils/layoutGeneration.js`) :
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

### Déplacement de pièces : aimantage et résolution de collision (`src/features/layout-editor/utils/roomCollision.js`)

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

**`src/features/layout-editor/roomTypes.js`** (nouveau) : les 9 types demandés
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

### Persistance localStorage et export/import JSON (`src/features/layout-editor/utils/layoutStorage.js`)

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

### Retrait de l'aimantage, masquage de l'avatar, redimensionnement de pièces

Trois changements dans `LayoutEditor.jsx`/`FloorView2D.jsx` : deux
correctifs rapides, un nouveau chantier plus conséquent.

**Masquage de l'avatar sans pièce** : `FloorView2D.jsx` ne rend
maintenant l'avatar que si `rooms.length > 0` — garde-fou posé
directement dans le composant (pas seulement dans le parent qui évite
déjà de le monter dans ce cas), pour rester correct même si cette
logique de montage change un jour ailleurs.

**Aimantage entièrement retiré, y compris la prévention de
chevauchement** : `applyMagneticSnap` et `resolveOverlap` ont été
supprimés de `roomCollision.js` (qui ne garde plus que `rectsOverlap`).
**Interprétation littérale assumée** : la demande explicite ("sans
contrainte par rapport aux pièces voisines") a été comprise comme
couvrant aussi bien l'attraction (snap) que la répulsion
(anti-chevauchement) — pas seulement l'une des deux. **Conséquence
réelle à connaître** : deux pièces peuvent désormais se chevaucher après
un déplacement, rien ne l'empêche plus. La bordure rouge pendant le
glissé reste affichée à titre indicatif (elle utilise toujours
`rectsOverlap`, resté disponible), mais elle n'empêche plus rien au
relâchement — juste une information, plus un blocage. Si ce n'est pas ce
qui était voulu, dis-le : réintroduire une simple prévention (sans
aimantage) serait un changement contenu.

**Redimensionnement de pièce**, vérifié par calcul avant intégration
(les 4 coins, dont le plafonnement à la taille minimale en poussant
loin dans le mauvais sens) : 4 poignées aux coins, visibles quand une
pièce est sélectionnée. Le coin OPPOSÉ à celui attrapé reste toujours
fixe pendant le geste.

**Réorganisation nécessaire de l'interaction tap**, pour faire de la
place au redimensionnement : un tap rapide sur une pièce **sélectionne**
maintenant celle-ci (affiche ses poignées) plutôt que d'ouvrir
directement l'Inspecteur comme avant. Le nom/la surface affichés sur
la pièce deviennent la cible dédiée pour ouvrir l'Inspecteur — un
`stopPropagation` sur SON PROPRE `pointerDown` (pas seulement `onClick`)
est nécessaire pour empêcher le minuteur d'appui long du parent de
démarrer, puisque pointerdown/up précèdent click dans l'ordre des
événements ; un `stopPropagation` posé seulement dans `onClick`
arriverait trop tard. **Un vrai bug attrapé en vérifiant, pas supposé
correct** : `.layout-editor__room-info` avait `pointer-events: none`
dans le CSS existant (pour laisser les clics traverser jusqu'au parent,
utile avant) — laissé tel quel, le nouveau clic dédié sur le nom
n'aurait jamais pu se déclencher. Retiré au passage.

### Compte (mock), Dashboard et logements multiples (`HouseholdRoot.jsx`)

Nouvelle couche de plus haut niveau, montée par `main.jsx` à la place
d'`ApartmentSpatialMvp` directement : Authentification (mock) →
Dashboard (sélection/création de logement) → `ApartmentSpatialMvp`,
maintenant borné à UN SEUL logement à la fois.

**`MockAuthScreen.jsx`** : "Se connecter" et "S'inscrire" font
volontairement la même chose — simuler une connexion, en état local
(`isAuthenticated`, pas persisté : se reconnecter à chaque rechargement
est acceptable pour un mock sans rien de réel derrière). Le vrai système
d'authentification du backend existe toujours (`App.jsx`/
`AppShell.jsx`) — ce MVP spatial reste volontairement déconnecté, comme
documenté depuis le début.

**Changement de modèle important : plusieurs logements distincts**,
chacun avec ses propres étages/pièces — jusqu'ici, l'application ne
connaissait qu'UN SEUL logement implicite. `HousingDashboard.jsx`
affiche chaque logement sous forme de carte arrondie, plus deux cartes
d'action : `+ Créer un logement` (nom auto-généré "Logement N", pas de
modale de nommage à cette étape — évite d'en ajouter une de plus) et
`🔗 Rejoindre un logement` (`JoinHousingModal.jsx`, **placeholder non
fonctionnel comme demandé explicitement** — un champ de saisie, un
bouton désactivé).

**Persistance à deux niveaux, deux fichiers séparés** :
- `services/housingStorage.js` (nouveau) : la LISTE des logements
  (id, nom) — `chez_nous_housings`.
- `services/layoutStorage.js` (modifié) : le PLAN de chaque logement
  (étages/pièces/portes, comme avant), mais la clé localStorage est
  maintenant **paramétrable** (`storageKey`, défaut inchangé pour la
  rétrocompatibilité) plutôt que fixe — chaque logement a la sienne
  (`chez_nous_layout_<housingId>`, centralisé dans
  `layoutStorageKeyFor`). Vérifié : deux logements avec des plans
  différents ne s'écrasent jamais l'un l'autre, chacun dérive
  correctement ses propres dalles sans aucune interférence.

**Un point de flux à régler pour éviter une redondance** : cliquer
"+ Créer un logement" sur le Dashboard devait lancer directement
`LayoutEditor.jsx`, sans repasser par le propre écran d'accueil interne
d'`ApartmentSpatialMvp` (`OnboardingScreen.jsx`, qui a AUSSI son bouton
"Créer un logement" — redondant dans ce nouveau contexte). Résolu avec
un nouveau prop `startInEditor` : `ApartmentSpatialMvp` démarre
directement en mode édition quand on vient de cette création, sans
montrer son propre accueil. Annuler sans rien enregistrer à cette étape
retourne au Dashboard (pas à cet accueil interne, qui n'a plus de sens
ici).

**`ApartmentSpatialMvp.jsx`** reçoit maintenant `storageKey`,
`housingName` (affiché dans une nouvelle barre en haut) et
`onBackToDashboard` (bouton "← Mes logements").

**Ce que je n'ai pas pu vérifier moi-même** : comme pour la persistance
localStorage, tout ce qui touche réellement au DOM/navigateur ne peut
pas s'exécuter dans mon environnement de travail — la logique pure
(clés de stockage distinctes, validation, dérivation des dalles par
logement) est vérifiée à fond ; l'exécution réelle dans ton navigateur
(créer plusieurs logements, vérifier qu'ils ne se mélangent jamais)
reste la première vraie preuve.

## Qualité de code : ESLint, Prettier, validation Zod, variables d'environnement

### ESLint & Prettier

**`.eslintrc.cjs`** (format classique, PAS la "flat config" d'ESLint 9+
qui ignorerait ce fichier) : `eslint` est donc volontairement fixé sur
la branche `^8.57.0` dans `package.json`, pas la dernière version
majeure — un choix de compatibilité, pas un oubli. Règles React
adaptées à ce projet précis : `react/react-in-jsx-scope` désactivée
(React 17+/nouvelle transformation JSX, jamais besoin d'importer React
dans un fichier qui utilise du JSX), `react/prop-types` désactivée
(aucun composant de ce projet n'utilise PropTypes). `eslint-config-prettier`
en dernier dans `extends` pour désactiver toute règle ESLint qui
entrerait en conflit avec le formatage de Prettier.

**`.prettierrc`** : 2 espaces, points-virgules, guillemets simples,
virgules finales "es5" — exactement les 4 règles demandées.
**Attention** : le code existant utilise des guillemets DOUBLES partout
jusqu'ici — lancer `npm run format` va donc reformater l'ensemble du
projet vers des guillemets simples (et harmoniser le reste). C'est
voulu, mais le premier `git diff` après ce lancement sera large (du
formatage, pas de changement de logique) — à savoir avant de l'exécuter.

**Scripts ajoutés** : `npm run lint` (ESLint sur `src/`) et
`npm run format` (Prettier sur `src/` + `tests/`, écrit directement les
fichiers — `--write`, pas juste un rapport).

### Validation Zod (`src/features/layout-editor/utils/validateLayout.js`)

**Divergence assumée, comme la fois précédente sur ce même sujet** : le
schéma décrit (`apartment.name`, `bounds`) ne correspond pas à notre
modèle de données réel (`floors`, `rooms` en `{x, y, width, height}` —
pas `bounds`, pas de wrapper `apartment`). Gardé notre structure
existante, déjà utilisée partout (`generateFloorTiles`,
`extractRoomRectsFromTiles`...) — les vérifications demandées sont
respectées à l'identique sur nos noms de champs réels : présence de
`rooms`/`doors`/`floors`, et chaque pièce a bien un `id`, des
coordonnées valides (`x`/`y`/`width`/`height`) et un `type`.

**Remplace l'ancienne validation à la main** (`isValidLayoutData`,
retirée) — unifié sur un seul schéma Zod, utilisé à la fois pour le
chargement localStorage ET l'import de fichier, pour que les deux ne
puissent plus jamais être en désaccord sur ce qui compte comme valide.
Messages d'erreur bien plus précis qu'avant (quel champ exact, quel
problème) plutôt qu'un "Fichier JSON invalide" générique.
`safeParse` (jamais `parse`) : ne lance jamais d'exception, n'altère
jamais l'état local en cas de fichier invalide — exactement comme
demandé.

**Honnêteté sur ce que je n'ai pas pu vérifier** : pas d'accès réseau
dans mon environnement de travail pour installer `zod` et exécuter ce
fichier directement, contrairement à ma pratique habituelle sur ce
projet jusqu'ici. L'API utilisée (`z.object`, `z.array`, `.safeParse`,
`result.error.issues`) est stable et documentée depuis longtemps — j'ai
volontairement simplifié le schéma pour éviter des options moins
certaines (ex. un message d'erreur personnalisé en 3ᵉ argument de
`z.array`/`z.record`, dont je n'étais pas sûr à 100 % de la signature
exacte), en faveur des messages d'erreur par défaut de Zod pour ces cas
précis. L'exécution réelle chez toi reste la première vraie preuve pour
ce fichier.

### Variables d'environnement

**`frontend/.env.example`** (dans `frontend/`, pas la racine globale du
projet — Vite ne lit ses fichiers `.env` que depuis son propre dossier
racine) : documente `VITE_API_URL` et `VITE_APP_ENV`. Seules les
variables préfixées `VITE_` sont exposées côté navigateur — une
contrainte de sécurité de Vite, pas une convention de ce projet.

**`api.js`** : `BASE_URL` lit maintenant `import.meta.env.VITE_API_URL`,
avec repli sur `"/api"` (le chemin relatif géré par le proxy de
`vite.config.js`) si la variable n'est pas définie — pour ne rien casser
tant qu'aucun `.env` n'a été créé. Aucune autre URL/constante en dur
trouvée ailleurs dans le frontend (recherche faite sur tout `src/`).

**`.gitignore`** : déjà correct depuis sa création, vérifié à nouveau
avec un vrai test git cette fois (pas juste relu) — `.env` et
`.env.local` sont bien ignorés à n'importe quelle profondeur (donc
`frontend/.env` aussi, sans règle spécifique à ajouter), et
`.env.example` reste bien suivi par Git.

## Commutateur 2D/2.5D, source unique de vérité (`ApartmentSpatialMvp.jsx`)

**Clarifications obtenues avant de construire, qui ont considérablement
réduit la portée de ce chantier** : la demande initiale suggérait de
convertir `LayoutEditor.jsx` en composant "contrôlé" (chaque action
mettant à jour un état global en continu, sans brouillon) — mais la
réponse a précisé le contraire : garder le fonctionnement actuel de
l'éditeur (brouillon local + Annuler/Enregistrer explicites), les deux
vues (2D et 2.5D) devant simplement **lire le même layout sauvegardé**,
chacune le rendant différemment. C'était déjà notre architecture
existante (`floorTiles` dérivé de `rooms`+`doors` via `useMemo`, voir
plus haut) — pas de réécriture nécessaire là.

**Ce qui a vraiment changé : la navigation, simplifiée**. L'ancien
système à 3 destinations (Vue Ensemble en cartes / Vue Étage / bouton
séparé "Modifier le plan") devient un commutateur à 2 positions clair,
dans l'en-tête : **"✏️ Plan 2D"** (ouvre `LayoutEditor` — remplace
l'ancien bouton "Modifier le plan", même action) et **"🏠 Vue 2.5D"**
(`FloorView2D`, recentre sur la première pièce valide de l'étage si
cliqué). La Vue Ensemble (`ApartmentOverview2D.jsx`, cartes de pièces)
est **supprimée** — remplacée par le Plan 2D lui-même, qui montre déjà
toutes les pièces vues du dessus, comme confirmé explicitement avant de
la retirer. `layoutArea` (champ de `MOCK_ROOMS` qui ne servait qu'à son
positionnement en grille CSS) retiré au passage, devenu sans usage.

**Vérifié de bout en bout avant livraison** : simulé l'enregistrement
d'une pièce dans l'éditeur, confirmé qu'elle se recharge à l'identique
au prochain "Plan 2D" (`extractRoomRectsFromTiles`) ET qu'elle apparaît
bien dans les dalles dérivées que lit directement `FloorView2D` — les
deux vues restent en accord sur le même état, sans duplication.

## Anti-chevauchement réintroduit (relâchement seulement), pièce 1×1 minimum

**Réintroduction partielle et volontaire** : l'aimantage complet (voir
plus haut, "Retrait de l'aimantage...") avait retiré à la fois
l'attraction pendant le glissé ET la résolution anti-chevauchement au
relâchement. Cette fois, seule la seconde partie est réintroduite —
`resolveOverlap` (`src/features/layout-editor/utils/roomCollision.js`)
s'applique de nouveau, mais UNIQUEMENT au relâchement (déplacement ET
redimensionnement), jamais pendant le glissé lui-même (qui reste du
cadrillage pur, sans attraction vers les pièces voisines). Reprend la
version déjà vérifiée et corrigée précédemment (bug d'oscillation entre
deux pièces trouvé et corrigé à l'époque) — revérifiée avec les mêmes
scénarios avant réintégration, aucune régression.

**Taille minimale d'une pièce : 1×1 dalle** (`MIN_ROOM_SIZE`, était 2×2)
— s'applique au tracé d'une nouvelle pièce ET au redimensionnement
depuis les coins. Vérifié par calcul qu'un redimensionnement poussé à
l'extrême s'arrête bien à 1×1, pas moins.

## Correctifs : plan écrasé (NaN), et Plan 2D redevient une vue en lecture seule

**Bug réel trouvé et corrigé, pas juste supposé** : un nouveau logement
créé de zéro affichait tout écrasé dans un coin de l'écran. Cause
retracée précisément : le nouvel objet `floor` créé dans
`handleSaveLayout` (`ApartmentSpatialMvp.jsx`) n'avait jamais de
`gridWidth`/`gridHeight` — hérité des `MOCK_FLOORS` d'origine
(hardcodés), ce champ n'existait tout simplement pas pour un étage
nouvellement créé. `FloorView2D.jsx` calcule `floor.gridWidth * CELL_PX`
pour dimensionner la grille : `undefined * 50 = NaN`, une valeur CSS
invalide que le navigateur ignore, effondrant la grille à presque rien.
**Corrigé** : `gridWidth`/`gridHeight` sont maintenant TOUJOURS
recalculés à chaque enregistrement (même logique que `avatarStart` —
jamais figés), à partir de l'étendue réelle des pièces tracées + une
marge de 2 dalles (murs extérieurs). Vérifié par calcul avec le
scénario exact signalé. Renforcement supplémentaire au passage :
`.floor-viewport` a maintenant une hauteur explicite (pas seulement une
largeur), pour ne jamais dépendre de son contenu pour sa propre taille.

**Correctif d'architecture : "Plan 2D" redevient une vraie vue en
lecture seule** — une simplification précédente avait fait de "Plan 2D"
un raccourci direct vers `LayoutEditor.jsx`, confondant "consulter" et
"éditer". Nouveau composant **`Plan2DView.jsx`** (+ CSS) : aperçu du
plan déjà construit, SANS avatar, sans aucune interaction d'édition
(pas de poignées, pas d'outil de porte) — juste les dalles vues du
dessus, zoomables, avec un clic sur une pièce qui bascule vers la Vue
2.5D centrée dessus. Le bouton **"✏️ Modifier le plan" redevient une
action séparée** dans la barre de l'étage (comme avant la
simplification précédente), ouvrant `LayoutEditor.jsx` avec son propre
fonctionnement brouillon + Annuler/Enregistrer, inchangé. Le
commutateur devient donc : **"🗺️ Plan 2D"** (`Plan2DView`, lecture
seule) / **"🏠 Vue 2.5D"** (`FloorView2D`, avatar) — les deux en
lecture seule, l'édition étant l'action à part.

## Plan 2D : défilement natif, retrait de react-zoom-pan-pinch pour cette vue

**Bug signalé** : la Vue Plan 2D coupait le mur à droite et en bas —
le contenu n'était pas entièrement visible/accessible.

**Cause probable, honnêtement pas 100% certaine** : `react-zoom-pan-pinch`
n'a jamais pu être testée réellement dans un navigateur dans mon
environnement de travail (déjà signalé à son introduction). Son
comportement d'auto-centrage/zoom initial ne garantissait
apparemment pas que l'INTÉGRALITÉ du contenu (y compris les bords)
reste visible ou atteignable.

**Correctif choisi** : plutôt que de continuer à ajuster une
bibliothèque tierce dont je ne peux pas observer le rendu réel,
`Plan2DView.jsx` adopte maintenant le **même défilement natif déjà
éprouvé dans `LayoutEditor.jsx`** (`overflow: auto` sur un conteneur de
taille fixe, zéro bibliothèque tierce) — jamais signalé comme
problématique jusqu'ici. Garantit que la totalité du plan reste
TOUJOURS accessible en faisant défiler, quel que soit sa taille, sans
jamais rien couper. Perdu au passage : le zoom par pincement et les
boutons +/−/recentrer (remplacés par le défilement tactile/souris
classique) — `FloorView2D.jsx` (Vue 2.5D, immersive) garde `react-zoom-pan-pinch`
pour l'instant, n'ayant reçu aucun signalement similaire ; à surveiller
si un problème du même type y apparaît aussi.

## Suppression d'un logement (survol / appui long)

**Contrainte HTML résolue** : chaque carte de logement était un
`<button>` — impossible d'y imbriquer la croix de suppression (un
bouton dans un bouton n'est pas du HTML valide). Convertie en
`<div role="button" tabIndex={0}>`, ce qui permet la croix comme vrai
`<button>` enfant, tout en restant accessible au clavier
(`onKeyDown` gère "Entrée").

**Survol (souris)** : géré entièrement en CSS
(`.housing-dashboard__card:hover .housing-dashboard__delete-btn`),
aucun JS nécessaire.

**Appui long (tactile)** : même minuteur que `LayoutEditor.jsx` (500ms).
Un point à régler qui n'était pas évident au premier abord : relâcher le
doigt après un appui long réussi déclenche normalement AUSSI
l'événement `onClick` du parent (puisque appui + relâchement au même
endroit est un "clic" aux yeux du navigateur) — sans précaution, ça
aurait ouvert le logement juste après avoir révélé sa croix. Résolu
avec un drapeau (`justLongPressedRef`) : mis à `true` quand le minuteur
se déclenche, vérifié (et remis à `false`) dans le clic — la navigation
est sautée une seule fois, juste après un appui long.

**Confirmation avant suppression, comme pour la réinitialisation du
plan dans `LayoutEditor.jsx`** — action irréversible (le plan complet
du logement est perdu), jamais sans confirmation explicite.

**Nettoyage complet, pas juste retiré de la liste** :
`handleDeleteHousing` (`HouseholdRoot.jsx`) retire le logement de
`housings` ET efface sa clé localStorage propre
(`chez_nous_layout_<id>`, via `clearLayoutStorage`) — sans ce second
nettoyage, ses données resteraient orphelines dans localStorage
indéfiniment. Vérifié par calcul que seul le bon logement est retiré de
la liste, les autres intacts.

## Quitter vs supprimer un logement, selon le nombre d'occupants

**Limite honnête à connaître avant tout** : ce MVP mock n'a AUCUNE
vraie notion de plusieurs utilisateurs partageant un logement —
`JoinHousingModal.jsx` reste un placeholder non fonctionnel. Le nouveau
champ `occupantsCount` (sur chaque logement) vaut donc TOUJOURS `1` en
pratique aujourd'hui (`handleCreateHousing` l'initialise ainsi). La
logique de branchement ci-dessous est correctement implémentée et
prête, mais la branche "quitter sans supprimer" ne peut pas encore se
déclencher réellement tant que rejoindre un logement ne fonctionne pas.

**La logique elle-même** (`HouseholdRoot.jsx`, `handleRemoveHousing`) :
- `occupantsCount > 1` → **quitter** : retiré de la liste de CET
  utilisateur seulement, son plan (`chez_nous_layout_<id>`) n'est
  JAMAIS touché — les autres occupants en ont toujours besoin.
- `occupantsCount <= 1` → **supprimer** : retiré de la liste ET son plan
  est effacé définitivement.
- `?? 1` partout où `occupantsCount` est lu : les logements créés avant
  l'ajout de ce champ retombent sur "1 occupant" (suppression réelle),
  jamais un branchement cassé sur `undefined`.

**`HousingDashboard.jsx`** ne fait QUE choisir le bon texte/bouton de
confirmation ("Quitter le foyer" vs "Supprimer", avec l'avertissement
"vous êtes le dernier occupant..." dans ce second cas) — sur le MÊME
champ `occupantsCount`, jamais une décision dupliquée qui pourrait
diverger de celle du parent.

Vérifié par calcul les 3 cas : dernier occupant, plusieurs occupants,
et logement créé avant ce champ (rétrocompatibilité) — tous se
comportent correctement.

## Vraie authentification branchée (phase 1/2 : login, pas encore compte/occupant/logement)

**Cadrage explicite, à respecter** : ce chantier ne branche QUE le
login/l'inscription sur le vrai backend — la phase suivante (le
concept compte/occupant/logement : plusieurs occupants par logement, un
compte occupant de plusieurs logements, etc.) reste à faire séparément.
La LISTE des logements reste donc encore mock/localStorage pour
l'instant, juste scopée par compte réel maintenant (voir plus bas).

**Changement opérationnel important à savoir** : contrairement à avant,
le MVP a maintenant besoin du **serveur backend démarré**
(`node server.js`) pour fonctionner du tout — l'inscription/connexion
appelle le vrai serveur. Ce n'était pas le cas jusqu'ici (tout tournait
hors-ligne). Voir "Comment lancer l'application" plus haut, inchangé
dans sa forme mais désormais réellement nécessaire pour ce flux aussi.

**`MockAuthScreen.jsx` supprimé** — remplacé par `SignupForm`/
`LoginForm`, EXACTEMENT le même flux déjà construit et fonctionnel dans
`App.jsx` (réutilisés tels quels, aucune modification) : appelle
`api.signup`/`api.login`, session gardée dans localStorage sous LA MÊME
clé que `App.jsx` (`chez-nous-session`) — les deux flux ne sont jamais
montés en même temps (`main.jsx` choisit l'un ou l'autre), mais
partager la clé garde une session cohérente si jamais on bascule de
l'un à l'autre.

**Vérifié avant d'écrire le code, pas juste supposé correct** : les
routes backend (`/api/auth/signup`, `/api/auth/login`) correspondent
bien à ce que `api.js` appelle, et surtout — l'asymétrie des réponses
copiée depuis `App.jsx` a été revérifiée contre le VRAI code backend :
`signup` renvoie `{ user, household }` (d'où `res.data.user`), `login`
renvoie l'utilisateur DIRECTEMENT (d'où `res.data`, sans `.user`) — les
deux confirmés en lisant `userService.js` ligne par ligne, pas
simplement recopiés à l'aveugle depuis `App.jsx`.

**`housingStorage.js` scopée par COMPTE réel (nouveau)** : maintenant
que plusieurs comptes réels et distincts peuvent se connecter sur le
même navigateur l'un après l'autre, la liste des logements est stockée
sous une clé propre à chaque compte (`chez_nous_housings_<userId>`) —
sans ça, les logements du compte A se mélangeraient avec ceux du compte
B. Même principe que `layoutStorageKeyFor` (clé propre à chaque
logement), appliqué maintenant aussi au niveau du compte.

**Déconnexion ajoutée** (`HousingDashboard.jsx`, nouvelle barre en
haut) — n'existait pas avec le mock (connexion à sens unique). Affiche
qui est connecté et permet de changer de compte pour tester le
scoping par compte.

**Limite connue, assumée pour cette phase** : le vrai backend limite
encore un compte à un seul foyer (`session.householdId` unique) — pas
encore réconcilié avec le support multi-logements de ce MVP,
volontairement remis à la phase 2 (compte/occupant/logement), comme
annoncé.

## Phase 2/2 (en cours) : lever la limite "un seul foyer par compte" côté backend

**Étape 1 du plan en 4 points, terminée et vérifiée** — les 3 suivantes
(étendre le schéma pièces/étages, ajouter les portes, brancher le
frontend) restent à faire, volontairement pas enchaînées dans la même
session vu l'ampleur.

**Ce qui a été trouvé en creusant, pas juste supposé** : le backend a
déjà un concept d'Occupant (distinct du compte), avec un `householdId`
et un `claimedByUserId` optionnel — presque déjà la table de jointure
many-to-many nécessaire pour "un compte peut être occupant de plusieurs
foyers." Le vrai verrou était précis et localisé : dans
`claimOccupant` (`userService.js`), une garde explicite empêchait un
compte de réclamer plus d'UN SEUL occupant, tous foyers confondus, plus
une vérification `user.householdId !== occupant.householdId` qui
supposait la même chose.

**Ce qui a changé** :
- **`claimOccupant`** : la garde devient "un seul occupant PAR FOYER"
  (pas "un seul, tous foyers confondus") — un compte peut maintenant
  réclamer un occupant dans autant de foyers différents qu'il veut,
  mais toujours un seul par foyer donné.
- **`listHouseholdsForUser(userId)`** (nouveau) : la vraie source de
  vérité sur "quels foyers ce compte peut-il voir" — interroge
  `occupants` (foyers où `claimedByUserId === userId`), PAS le champ
  `user.householdId` (qui reste le foyer "par défaut", celui créé à
  l'inscription, mais n'est plus la seule source).
- **`createHouseholdForUser({userId, householdName})`** (nouveau) —
  jusqu'ici, un foyer n'était créé qu'à l'inscription (un seul, pour le
  tout premier compte). Crée un foyer supplémentaire ET un occupant
  auto-réclamé pour le créateur.
- **`signup` corrigé pour rester cohérent** : ne créait auparavant
  QUE le foyer + le compte, sans occupant — un vrai écart trouvé en
  écrivant les tests (`listHouseholdsForUser` ne retrouvait jamais le
  foyer de l'inscription elle-même !). Corrigé : signup crée maintenant
  aussi un occupant auto-réclamé, exactement comme
  `createHouseholdForUser` — cohérent avec "un compte = un occupant".
- **Deux nouvelles routes** : `POST /api/households` (créer un foyer
  supplémentaire), `GET /api/households?userId=...` (lister les foyers
  d'un compte).

**Vérifié à trois niveaux, pas juste un seul** : tests unitaires mis à
jour (152/152, plusieurs tests existants ont dû être corrigés — ils
supposaient l'ancien comportement "un seul foyer", devenu la
NOUVELLE exception plutôt que la règle) ; ET un vrai test de bout en
bout avec le serveur réellement démarré et de vraies requêtes HTTP
(`curl`) : inscription → 1 foyer trouvé → création d'un second foyer
pour ce même compte → 2 foyers trouvés. Pas simplement supposé
fonctionner après les tests unitaires.

**Reste à faire (annoncé, pas caché)** : étendre le schéma des pièces
(`type`/`icon`, renommer `length`→`height`, cases de grille plutôt que
mètres), étendre celui des étages (`shortLabel`/`avatarStart`/
`gridWidth`/`gridHeight`), ajouter les portes comme nouveau concept
backend, puis brancher `HousingDashboard.jsx` sur ces vrais foyers, et
enfin basculer `layoutStorage.js` du localStorage vers de vraies
routes API — dans cet ordre, un morceau à la fois.

## Étapes 2-3/4 : schéma pièces/étages étendu, portes ajoutées côté backend

**Ce qui a changé, précisément** :
- **Pièces** (`validators.js`, `roomService.js`) : `length` renommé
  `height` (cases de grille, entiers — 1 case = 1 mètre par convention,
  cohérent avec `TILE_SIZE_METERS` côté frontend), `MIN_ROOM_DIMENSION`
  passé de 0.5 à 1. Ajout de `type` (requis) et `icon` (optionnel) —
  volontairement juste une chaîne non vide côté backend, PAS une liste
  fermée de types valides : la vraie liste vit dans `roomTypes.js` côté
  frontend, dupliquer cette liste aurait risqué une dérive entre les
  deux à terme.
- **Étages** (`validators.js`, `roomService.js`) : ajout de
  `shortLabel`, `avatarStart {x,y}`, `gridWidth`, `gridHeight` — tous
  optionnels à la création (retombent sur `null`). Nouvelle fonction
  `updateFloorLayout(id, patch)` + route `PATCH /api/floors/:id/layout`
  : ces valeurs se recalculent à CHAQUE enregistrement du plan côté
  frontend (jamais figées), pas seulement à la création de l'étage.
- **Portes** (nouveau concept entier) : `validateDoor`, service
  (`createDoor`/`listDoors`/`deleteDoor`), collection `doors` dans
  `store.js`, 3 routes. Volontairement minimal — juste `{householdId,
  floorId, x, y}`, le frontend calcule lui-même géométriquement quelles
  pièces une porte relie. `deleteFloor` étendu pour supprimer aussi les
  portes de l'étage en cascade.

**Anciens composants du floorplan historique mis à jour, pas cassés
silencieusement** : `components/floorplan/RoomFloorPlan.jsx` et
`FloorThumbnail.jsx` référençaient directement `room.length` —
renommés en `.height` au passage (en prenant soin de ne jamais toucher
aux vrais `.length` de tableaux JS ailleurs dans ces mêmes fichiers,
qui n'ont rien à voir avec les pièces).

**36 échecs de tests après ce changement, tous corrigés méthodiquement,
pas juste ignorés** : les tests existants (`rooms.test.js`,
`floors.test.js`, `taskContext.test.js`) créaient des pièces avec
l'ancien schéma (`length`, sans `type`). Corrigé fichier par fichier —
170/170 au final, avec de nouveaux tests ajoutés pour chaque nouveauté
(type/icon, champs d'étage étendus, portes, cascade de suppression).

**Une découverte utile en cours de route** : `live-test.js` (script de
smoke-test autonome, `node live-test.js`) est en fait AUSSI détecté et
exécuté par `node --test` (son nom correspond au motif de découverte
par défaut du testeur Node) — ses appels API codés en dur utilisaient
aussi l'ancien schéma, corrigés de la même façon. Deux niveaux de
vérification distincts désormais confirmés après ce chantier : les
tests unitaires (170/170) ET ce smoke-test avec un vrai serveur
démarré, de bout en bout.

**Vérifié une troisième fois, avec de vraies requêtes HTTP `curl`**
(pas seulement les tests unitaires/smoke-test) : création d'un étage
avec tous les nouveaux champs, création d'une pièce avec type/icon,
création d'une porte, listage filtré par étage, et mise à jour du
layout d'un étage via `PATCH` — les cinq confirmés fonctionnels en
conditions réelles.

**Reste à faire (annoncé, pas caché)** : brancher `HousingDashboard.jsx`
sur ces vrais foyers (au lieu du mock localStorage), puis basculer
`layoutStorage.js` du localStorage vers ces nouvelles routes API — dans
cet ordre, comme prévu depuis le début de ce chantier.

## Étape 3/4 : `HousingDashboard.jsx` branché sur les vrais foyers

**Deux fonctions backend ajoutées, qui manquaient encore** : la
fonctionnalité "quitter vs supprimer selon le nombre d'occupants"
existait déjà côté frontend (chantier précédent), mais rien côté
backend ne lui correspondait. Ajouté :
- **`leaveHousehold(householdId, userId)`** : déréclame l'occupant de ce
  compte dans CE foyer précis, sans rien supprimer d'autre.
- **`deleteHousehold(householdId, userId)`** : suppression réelle en
  cascade (occupants, étages, pièces, portes, tâches) — réservée au
  dernier occupant humain réclamé.

**Le point le plus important de ce chantier** : le nombre d'occupants
restants est **recalculé côté serveur à chaque suppression**, jamais
fait confiance au frontend. Un test dédié le vérifie explicitement
("REFUSÉ s'il reste d'autres occupants réclamés — même si le frontend
prétend le contraire") — un frontend buggé ou malveillant ne doit
jamais pouvoir effacer les données d'un foyer encore occupé par
quelqu'un d'autre.

**Frontend (`HouseholdRoot.jsx`)** : `housingStorage.js` ne garde plus
que `layoutStorageKeyFor` — `loadHousings`/`saveHousings` (le mock
localStorage) ont été retirées, remplacées par de vrais appels API
(`listHouseholdsForUser`, `createHouseholdForUser`, `leaveHousehold`,
`deleteHousehold`). **Changement d'architecture réel** : passer de
lectures localStorage synchrones à des appels API asynchrones a
nécessité un état de chargement (`housingsLoading`) — auparavant, la
liste des logements était disponible immédiatement au premier rendu ;
maintenant, il y a un court instant de chargement après la connexion.

**`occupantsCount` recalculé au chargement, pas stocké** : le backend
ne renvoie pas ce compte directement dans la liste des foyers — un
appel `listOccupants` supplémentaire par foyer le calcule (occupants
humains réclamés). Un repli prudent en cas d'échec de cet appel :
suppose "dernier occupant" plutôt que de bloquer une suppression
légitime sans raison (et de toute façon, le backend revérifie ce
compte lui-même avant d'agir, donc ce repli ne peut jamais causer de
perte de données injustifiée).

**Vérifié à deux niveaux** : 176/176 tests unitaires (nouveaux tests
pour `leaveHousehold`/`deleteHousehold`, y compris le refus forcé côté
serveur), ET une séquence complète de vraies requêtes HTTP reproduisant
exactement ce que `HouseholdRoot.jsx` fait réellement : inscription →
liste (1 foyer) → création d'un second logement → liste (2 foyers) →
comptage des occupants → suppression → liste finale (1 foyer,
retombée correcte).

**Ce qui reste (annoncé, pas caché)** : le PLAN de chaque logement
(étages/pièces/portes) est encore en localStorage
(`ApartmentSpatialMvp.jsx`/`layoutStorage.js`) — seule la LISTE des
logements est réelle pour l'instant. La dernière étape (4/4) : basculer
`layoutStorage.js` vers les routes API déjà construites à l'étape
précédente (rooms/floors/doors).

## Étape 4/4, DERNIÈRE : le plan est réel, plus de localStorage nulle part dans ce flux

**Le changement architectural central** : le backend attend des
opérations CRUD PAR ENTITÉ (une pièce à la fois), alors que
localStorage se contentait d'écrire un blob entier d'un coup. Stratégie
choisie : **"supprimer puis recréer"**, pas un diff fin champ par champ
— pour UN étage donné, à chaque "Enregistrer le plan" : toutes les
pièces/portes EXISTANTES de cet étage sont supprimées, puis celles
éditées sont recréées avec leurs ids d'origine. Plus simple et plus sûr
à raisonner qu'un patch incrémental (qui aurait demandé une route
"modifier tous les champs d'une pièce", pas seulement sa position) — au
prix de plusieurs appels séquentiels par enregistrement. Limite assumée,
pas cachée : ces opérations ne sont PAS transactionnelles — une erreur
réseau en plein enregistrement peut laisser un état partiel. Acceptable
pour ce MVP local à un seul utilisateur, documenté dans
`householdLayoutApi.js` pour quiconque reprendrait ce code plus tard.

**Nouveau fichier `features/household/utils/householdLayoutApi.js`** :
isole cette réconciliation en fonctions pures et testables
(`fetchHouseholdLayout`, `saveFloorLayout`, `resetHouseholdLayout`) —
plutôt que de l'enterrer directement dans le composant. Vérifié avec de
VRAIES requêtes HTTP contre un serveur réellement démarré AVANT d'être
branché à l'interface (chargement vide → première sauvegarde (2 pièces
+ 1 porte) → deuxième sauvegarde (remplace par 1 pièce agrandie, sans
porte) → vérification que l'ancienne pièce a bien disparu et que
`avatarStart` est recalculé sur la nouvelle → réinitialisation complète)
— chaque valeur attendue confirmée exacte.

**Un vrai bug trouvé par cette vérification en direct, pas juste
supposé correct** : la fonction de sauvegarde codait en dur le nom
"Rez-de-chaussée" pour tout nouvel étage créé — correct pour "premier
étage d'un tout nouveau logement", mais faux pour l'IMPORT
multi-étages (chaque étage importé recevait le même nom générique,
peu importe son vrai nom). Corrigé avec un paramètre `floorMeta`
optionnel, transmettant le vrai nom/étiquette/niveau de chaque étage
importé — revérifié après coup, chaque étage récupère maintenant son
propre nom distinct.

**`ApartmentSpatialMvp.jsx`** : `storageKey` (clé synthétique
localStorage) remplacé par `householdId` (le VRAI id du foyer, transmis
directement depuis `HouseholdRoot.jsx` — plus besoin de clé construite,
`selectedHousingId` EST déjà l'id réel). Chargement désormais
asynchrone (nouvel état `dataLoading`) : chargement explicite au
montage via `fetchHouseholdLayout`, plus de sauvegarde automatique en
continu (impossible de toute façon avec des appels API individuels) —
la sauvegarde reste le geste explicite "Enregistrer le plan", comme
demandé dans une conversation précédente sur ce sujet précis.
`LayoutEditor.jsx` reçoit un nouveau prop `saving` : affiche
"Enregistrement..." et désactive le bouton pendant l'opération
(plusieurs appels séquentiels maintenant, potentiellement quelques
secondes — pas instantané comme literalStorage).

**Fichiers devenus morts, retirés** : `housingStorage.js` (ne gardait
plus que `layoutStorageKeyFor`, plus utilisée nulle part) supprimé
entièrement. `layoutStorage.js` réduit à l'export/import de fichier JSON
uniquement (`downloadLayoutAsJson`/`readLayoutFile`) — les 4 fonctions
de persistance localStorage (`buildLayoutPayload`/`saveLayoutToStorage`/
`loadLayoutFromStorage`/`clearLayoutStorage`) retirées, plus aucun
appelant nulle part.

**Import** : réutilise `saveFloorLayout` (déjà vérifiée) une fois par
étage du fichier importé, après une réinitialisation complète du
logement — remplace tout, comme le faisait déjà l'ancienne version
localStorage. Vérifié en direct avec un fichier à 2 étages.

**Avec cette étape, le plan complet en 4 points est terminé** :
1. ✅ Schéma backend étendu, limite "un seul foyer" levée.
2. ✅ Vrai login/inscription branché.
3. ✅ `HousingDashboard.jsx` branché sur les vrais foyers.
4. ✅ `layoutStorage.js` basculé vers les vraies routes API.

Plus aucun localStorage dans le flux compte → logements → plan — tout
passe par le vrai backend, du login jusqu'à la moindre pièce tracée.

## `SignupForm.jsx` : retrait du nom de foyer, validation en direct, afficher/masquer

**"Nom du foyer" retiré de l'inscription** — viendra dans un futur écran
dédié, pas à la création de compte. Vérifié avant de le retirer : le
backend (`userService.js`, `signup`) a déjà un repli si absent
(`Foyer de {nom}`) — rien à ajuster côté serveur pour ce retrait.

**Validation du mot de passe en direct** : une checklist (longueur ≥ 8,
majuscule, symbole) se coche au fur et à mesure de la frappe, pas
seulement au clic sur "Créer mon compte". **Pas une nouvelle
duplication de règle** — `formValidators.js` documente déjà pourquoi
les règles de validation sont recopiées à la main depuis le backend
(Vite ne traite jamais nos propres fichiers comme du CommonJS) ; cette
checklist recalcule simplement ces mêmes règles à chaque frappe à
partir de l'état déjà présent dans le composant. `validateSignup` reste
la validation qui fait autorité à la soumission, inchangée — la
checklist est un confort visuel, pas un remplacement du vrai contrôle.
Vérifié par calcul que la checklist et `isStrongPassword` (règle
d'origine) sont bien en accord.

**Correspondance des mots de passe en direct** : un indicateur
✓/✗ apparaît dès qu'il y a du contenu dans "Confirmer le mot de passe",
mis à jour à chaque frappe de l'un OU l'autre champ (modifier le
premier mot de passe après avoir déjà rempli la confirmation met aussi
à jour l'indicateur).

**Afficher/masquer pour les deux champs de mot de passe** — masqué par
défaut (`type="password"`), un bouton dédié bascule vers `type="text"`.
Les deux champs (mot de passe, confirmation) ont leur propre bouton,
indépendant l'un de l'autre.

**Question ouverte, pas tranchée unilatéralement** : `LoginForm.jsx` a
aussi un champ mot de passe qui pourrait bénéficier du même bouton
afficher/masquer — pas touché pour l'instant, la demande semblait
spécifiquement viser l'inscription. À me dire si tu veux l'étendre là
aussi.

## Thème émeraude/ambre pour la connexion/inscription

**Direction visuelle fournie par l'utilisateur** (prototype HTML/
Tailwind + FontAwesome), **traduite en CSS pur** plutôt qu'adoptée
littéralement — voir la conversation pour le raisonnement complet sur
ce choix (Tailwind/FontAwesome ne sont utilisés nulle part ailleurs
dans ce projet, qui a toujours utilisé du CSS écrit à la main + des
émojis comme icônes).

**Nouveau fichier `AuthForm.css`**, partagé par `SignupForm.jsx` et
`LoginForm.jsx` : inputs à icône (emoji, pas FontAwesome), bouton
"Créer mon compte"/"Se connecter" en dégradé, checklist et indicateur
de correspondance des mots de passe restylés avec la même palette.
`HouseholdRoot.css` réécrit : fond dégradé, bulles lumineuses de fond,
carte avec flou d'arrière-plan, badge en dégradé, commutateur
d'onglets en pilule.

**Palette (6 tokens nommés)**, extraite/adaptée du prototype fourni,
pas recopiée telle quelle (Tailwind utilise ses propres noms de
teintes) : `--auth-deep` (#059669), `--auth-mid` (#22c55e),
`--auth-amber` (#fbbf24), `--auth-ink` (#1e293b), `--auth-muted`
(#64748b), `--auth-mist` (#ecfdf5).

**`LoginForm.jsx` a aussi reçu le bouton afficher/masquer** — question
restée ouverte lors du chantier précédent sur `SignupForm.jsx` ; les
deux formulaires partagent maintenant la même feuille de style, les
garder cohérents entre eux avait plus de sens que de laisser cette
différence.

**Anciennes classes `.signup-form__*` retirées** de
`visual-hierarchy.css` (remplacées entièrement par `AuthForm.css`,
plus aucun appelant).

## Thème Dark Mode néon (v0.3.3) — remplace le thème clair précédent

**Deuxième direction visuelle fournie par l'utilisateur** — cette fois
avec un fichier `code_couleur.md` donnant directement les tokens exacts
(pas besoin de les extraire d'un prototype comme la première fois).

**Nouveau fichier global `assets/theme.css`** : les tokens sont
déclarés en `:root` comme demandé explicitement dans le document fourni
— recopiés tels quels (`--bg-app`, `--color-emerald`, `--text-on-accent`,
etc.), aucun nom de token réinventé. Importé une fois dans `main.jsx`.
**Portée volontairement limitée** : ces tokens sont globaux et prêts
pour de futures pages, mais ne sont utilisés QUE par l'écran de
connexion/inscription pour l'instant — le reste du MVP garde son thème
clair existant (Plan2DView, FloorView2D, HousingDashboard...), aucun
changement plus large n'a été demandé.

**Une divergence entre le code source fourni et la capture d'écran,
tranchée en faveur du code** : le HTML et le document de tokens
s'accordent tous les deux explicitement sur `--text-on-accent` (texte
très sombre sur les éléments en dégradé néon — badge, onglet actif,
bouton) — la capture d'écran, elle, donnait l'impression d'un texte
plus clair sur le bouton. Deux sources indépendantes et cohérentes
entre elles (le code ET la documentation écrite) contre une seule
impression visuelle sur une image compressée : gardé le texte sombre,
comme spécifié.

**`HouseholdRoot.css`/`AuthForm.css` réécrits entièrement** avec ces
tokens — halos lumineux plus sombres/discrets (fond quasi-noir plutôt
que fond clair), carte avec flou de verre plus prononcé, badge/onglet
actif/bouton en dégradé émeraude→teal→lime. **Aucun changement de
structure JSX** — seules les feuilles de style changent, les
composants restent les mêmes qu'avant.

## Corrections visuelles : retrait de l'encadré, icônes SVG minimalistes

**Retour explicite de l'utilisateur, avec capture d'écran annotée** :
mon rendu précédent créait un effet "boîte dans une boîte" (une carte
avec bordure/ombre/flou flottant sur un fond visiblement plus sombre
autour) — pas fidèle au prototype, qui n'a qu'une seule surface : le
fond thématique lui-même. Corrigé : `.household-root__auth-card` ne
dessine plus AUCUNE surface propre (pas de `background`, bordure,
ombre, flou de verre) — c'est maintenant juste un conteneur de mise en
page (largeur maximale, centrage), le fond dégradé + halos de
`.household-root__auth` est la seule chose visible.

**Émoji remplacés par des icônes SVG minimalistes** (nouveau fichier
`AuthIcons.jsx`) : les émoji utilisés avant (👤🔒🛡️📧👁️) gardent leurs
couleurs natives (peau, jaune, bleu...) et ne peuvent pas être teintés
— incompatible avec "je veux des pictos qui respectent le thème
couleur". Chaque icône est maintenant un petit SVG en ligne, contour
simple (`stroke="currentColor"`, pas de remplissage), qui hérite sa
couleur du CSS `color` de son parent — teinté à l'émeraude du thème
partout où il apparaît. Utilisé par `SignupForm.jsx`, `LoginForm.jsx`
(prénom/nom, email, cadenas, bouclier, œil/œil barré, flèche) et le
badge maison de `HouseholdRoot.jsx`. **Reste de l'app inchangé** —
cette exception au "tout en émoji" est justifiée seulement ici, parce
que c'est le seul endroit où le thème couleur doit teinter les
pictogrammes eux-mêmes.

## Correction du recentrage sur la page de connexion, pied de page ajouté

**Signup confirmé bon** ("Parfait pour la page signup") — thème et
pictogrammes inchangés, ce chantier ne touche que la structure.

**Le souci de recentrage sur la connexion, expliqué** : le formulaire de
connexion (email + mot de passe) est bien plus court que celui
d'inscription (prénom/nom/email/mot de passe/confirmation). Comme
`.household-root__auth-card` n'avait pas de hauteur propre, il était
centré comme un simple bloc dans les 100vh du fond — un bloc plus court
se retrouve donc positionné plus bas à l'écran qu'un bloc plus long,
donnant l'impression que "tout se recentre" en changeant d'onglet.

**Corrigé** : le cadre (`.household-root__auth-card`) occupe maintenant
toute la hauteur de l'écran (`min-height: 100vh`) et répartit son
contenu en colonne (`justify-content: space-between`) — l'en-tête, les
onglets et le formulaire restent groupés en haut
(`.household-root__auth-top`), le nouveau pied de page reste ancré en
bas. Le cadre garde ainsi toujours la même taille/position, que la vue
active soit courte ou longue — seul l'espace entre le formulaire et le
pied de page varie, jamais la position du cadre lui-même.

**Pied de page "Règles du Foyer" ajouté** — présent dans les deux
prototypes HTML fournis depuis le début, mais jamais réellement
implémenté jusqu'ici (vérifié avant de commencer : absent du code,
malgré sa présence dans les mockups — un oubli de traduction de ma
part, corrigé maintenant). Commun aux deux vues (signup et login), lien
`href="#"` en attente : **la page des termes et conditions n'existe pas
encore** ("que nous allons créer après", comme précisé) — le lien
pointera vers cette page une fois construite.

**Sous-titre d'inscription mis à jour** : "Bienvenue ! Créez votre
compte foyer" → "Bienvenue chez vous ! Créer votre foyer" (texte exact
demandé, y compris son infinitif plutôt que l'impératif attendu
grammaticalement — gardé tel quel, sans le corriger de mon propre chef).

## `HousingDashboard.jsx` restylé (thème sombre néon), icônes consolidées

**Troisième page restylée avec le même thème** — fond thématique plein
écran, halos, aucun conteneur encadré (même principe que l'écran de
connexion). Barre supérieure (pastille "connecté en tant que" + bouton
déconnexion, vire au rose au survol), badge/titre/sous-titre
dynamique selon qu'il existe déjà des logements ou non, cartes d'action
"Créer"/"Rejoindre" avec icône/titre/description/chevron, pied de page
"Consulter le guide" (lien placeholder, comme "Règles du Foyer" —
aucune page de guide n'existe encore).

**Icônes déplacées vers `components/ui/Icons.jsx`** (depuis
`features/auth/AuthIcons.jsx`) : maintenant utilisées par
`HousingDashboard.jsx` en plus des écrans de connexion/inscription — leur
place est dans `components/ui/` (UI générique, réutilisable par
n'importe quelle feature), pas dans un dossier propre à une seule
feature. 4 nouvelles icônes ajoutées à ce jeu partagé : maison+occupant
(badge "Mes logements", distincte du badge maison de connexion), plus
(créer), maillon de chaîne (rejoindre), chevron (bout de chaque carte),
déconnexion.

**Logements existants** : pas montrés dans le prototype fourni (qui ne
montre que l'état "aucun logement"), mais restylés dans le même esprit
— carte avec icône maison, nom, chevron ; la croix de suppression
(survol/appui long) reste fonctionnelle, inchangée dans son
comportement.

**Boîte de confirmation, exception délibérée au "pas de conteneur"** :
contrairement au reste de l'écran, la confirmation de suppression garde
un fond/bordure/ombre propres (`--bg-card`) — un dialogue de
confirmation est un patron d'interface différent d'une page plein
écran, il doit se détacher visuellement de ce qu'il y a derrière.

## Correctif : bouton "Créer un logement" muet, "Scanner un plan" ajouté

**Le bug signalé** ("le bouton devrait mener à l'éditeur de plan mais
n'ouvre rien") **retracé précisément** : `handleCreateHousing`/
`handleRemoveHousing` (`HouseholdRoot.jsx`) avalaient silencieusement
tout échec de l'appel API (`if (!res.success) return;`, sans jamais
rien afficher) — introduit lors du branchement sur le vrai backend.
**Vérifié avant de conclure** : l'appel `POST /api/households`
lui-même fonctionne correctement en isolation (reproduit avec une
vraie requête HTTP), et la chaîne `startInEditor` → mode "editing" →
`LayoutEditor` est correcte à la lecture — le problème n'était donc pas
la logique elle-même, mais son silence total en cas d'échec (serveur
non démarré, ou toute autre erreur réseau), qui donne exactement
l'impression que "le bouton ne fait rien".

**Corrigé** : les deux fonctions affichent maintenant le VRAI message
d'erreur retourné par le serveur (nouvel état `housingActionError`,
affiché dans `HousingDashboard.jsx`) — si le serveur backend n'est pas
démarré, ou toute autre erreur survient, ce sera visible au lieu de
silencieux.

**Sous-texte mis à jour** : "Dessiner un plan 2D / 2.5D et inviter vos
proches" → "Dessiner un plan de chez vous." (texte exact demandé).

**Nouveau bouton "Scanner un plan"**, entre "Créer" et "Rejoindre" —
placeholder pour une fonctionnalité à venir (scanner un plan dessiné à
main levée). Nouveau composant partagé **`PlaceholderModal.jsx`**
(feuille du bas, thème sombre) : extrait plutôt que dupliqué, puisque
`JoinHousingModal.jsx` (restylé au passage — il était resté au thème
clair d'avant le changement de thème) et le nouveau `ScanPlanModal.jsx`
ont exactement le même habillage visuel, seul le contenu diffère (un
champ de saisie pour l'un, rien pour l'autre). Nouvelle icône `ScanIcon`
ajoutée au jeu partagé (`components/ui/Icons.jsx`).

## Nouvel écran "Créer un logement" (accordéon à sélection unique)

**Changement d'interaction, pour le tout premier écran après
l'inscription uniquement** (voir la conversation) : nouveau composant
**`CreateHousingScreen.jsx`** — trois options (Créer/Scanner/Rejoindre)
en accordéon à sélection UNIQUE, remplaçant les anciennes cartes qui
naviguaient directement au clic, spécifiquement quand
`housings.length === 0`. Cliquer une option ne navigue plus
immédiatement : ça surligne son icône (dégradé émeraude→teal), fait
pivoter son chevron, et déplie ses détails en dessous (nom du logement
pour "Créer" ; nom + zone de dépôt d'image pour "Scanner" ; code à 6
caractères pour "Rejoindre"). Un bouton "Continuer" en bas, désactivé
tant qu'aucune option n'est choisie, valide le choix.

**Portée volontairement limitée** : ce nouvel accordéon ne s'affiche
QUE quand aucun logement n'existe encore — dès qu'un logement existe,
`HousingDashboard.jsx` retrouve son affichage précédent (liste +
cartes d'action simples, modals inchangés). La demande concernait
spécifiquement "après avoir créé un compte", pas une refonte du reste
du tableau de bord.

**"Continuer" avec Scanner/Rejoindre sélectionné** : ces deux options
restent des fonctionnalités à venir (badge "Bientôt", comme la
maquette) — déplier leurs détails montre un aperçu de ce à quoi ça
ressemblera, mais valider avec "Continuer" affiche un message "pas
encore disponible" plutôt que d'effectuer une action réelle.

**`handleCreateHousing` étendu** pour accepter un nom personnalisé
(saisi dans l'option "Créer") — recopié tel quel vers le backend, avec
repli sur le nom auto-généré si le champ est laissé vide.

**Nouvelles icônes** ajoutées au jeu partagé
(`components/ui/Icons.jsx`) : un chevron unique, pivoté via CSS
(`transform: rotate`) selon l'état déplié/replié plutôt que deux icônes
séparées haut/bas ; une icône de dépôt de fichier (zone d'import photo).

## Rôles PROPRIETAIRE/LOCATAIRE — fondations backend (phase 1, frontend à suivre)

**Cadrage explicite, décidé avant de commencer** (voir la conversation,
suite à la lecture de `USER_FLOW_ONBOARDING.md`/`DATA_MODEL.md` fournis
par l'utilisateur) : cette session couvre les FONDATIONS backend
(schéma, assignation, autorisation, départ/transfert) — l'interface
(masquer l'édition du plan pour un LOCATAIRE, écran de transfert de
propriété, expulsion d'un membre) reste pour une prochaine passe,
volontairement pas enchaînée vu l'ampleur déjà couverte ici.

**Rôle assigné à la création, pas seulement à la réclamation** :
l'occupant auto-créé lors de l'inscription ou de la création d'un
foyer supplémentaire (`signup`, `createHouseholdForUser`) reçoit
`role: "PROPRIETAIRE"` — c'est le fondateur. Tout AUTRE occupant humain
ajouté ensuite (`createOccupant`) reçoit `"LOCATAIRE"` par défaut. Un
animal n'a jamais de rôle (`validateOccupant` l'interdit explicitement).

**Autorisation sur la modification du plan** — nouvelle fonction
`isHouseholdOwner(occupants, householdId, userId)` (`roomService.js`),
vérifiée avant TOUTE écriture (créer/déplacer/supprimer pièce, étage,
porte) ; les fonctions de LECTURE (`listRooms`/`listFloors`/`listDoors`)
restent ouvertes à tous, sans vérification de rôle — correspond
exactement à la matrice de droits du document fourni ("Modifier le
plan" : PROPRIETAIRE seul ; "Consulter le plan" : les deux).

**Un point d'ordre corrigé avant même d'exécuter les tests** :
l'autorisation doit être vérifiée APRÈS la validation de base (le
foyer/étage référencé existe-t-il ?), pas avant — sinon un
`householdId` inexistant renvoie "vous n'êtes pas propriétaire" au lieu
de "ce foyer n'existe pas", un message bien moins utile. Reordonné dans
les 3 fonctions de création (`createFloor`/`createRoom`/`createDoor`)
avant de lancer quoi que ce soit.

**Départ d'un PROPRIETAIRE bloqué tant que d'autres occupants
restent** (voir DATA_MODEL.md, section "Logique de départ d'un
foyer") — `leaveHousehold` renvoie maintenant une erreur explicite
invitant à transférer la propriété d'abord. Un LOCATAIRE, lui, peut
toujours partir librement.

**Nouvelle fonction `transferOwnership(householdId, fromUserId,
toUserId)`** : échange les rôles (l'ancien propriétaire devient
LOCATAIRE) — conçue comme une action SÉPARÉE de "quitter" (composable :
transférer sans partir est possible, ou transférer PUIS quitter via un
second appel), plutôt que les combiner en une seule opération comme le
suggérait le diagramme fourni — plus simple à raisonner et à tester
indépendamment.

**`deleteHousehold` renforcé** : vérifie maintenant explicitement le
rôle PROPRIETAIRE, pas seulement "dernier occupant réclamé" — aligné
avec la matrice de droits ("Supprimer le foyer" : PROPRIETAIRE
seulement).

**60 régressions corrigées méthodiquement** après l'ajout de
l'autorisation (chaque appel de test à `createRoom`/`createFloor`/
`createDoor`/`updateRoomPosition`/etc. avait besoin d'un `userId`) —
**deux vrais bugs trouvés dans mon propre script de correction
automatique**, pas juste des oublis manuels : un `userId` référencé
sans jamais être déclaré dans un test qui n'en avait pas besoin
(aurait levé une exception), et un appel `createFloor` étalé sur
plusieurs lignes que le script de correction (basé sur une expression
régulière sur une seule ligne) n'a pas su reconnaître. Les deux
corrigés après avoir vu les tests échouer, pas anticipés à l'avance.

**Nouveau fichier `tests/roles.test.js`** (21 tests) : assignation des
rôles, autorisation refusée/acceptée sur chaque fonction de
modification, blocage du départ d'un propriétaire, transfert (cas
nominal + 3 cas de rejet), et la lecture reste bien ouverte à tous.

**Vérifié une dernière fois avec un vrai serveur démarré, requêtes HTTP
réelles** (pas seulement les tests unitaires) : le parcours complet —
LOCATAIRE refusé sur la création d'une pièce, PROPRIETAIRE accepté,
PROPRIETAIRE bloqué pour partir, transfert réussi, ancien propriétaire
peut enfin partir — chaque étape confirmée exacte.

197/197 tests backend (176 existants + 21 nouveaux).

## Validation d'email en direct, diagnostic de "Route inconnue"

**"Route inconnue : POST /api/households"** — vérifié : cette route
existe bel et bien dans le code actuel, et fonctionne (revérifié avec
une vraie requête HTTP reproduisant exactement ta capture d'écran).
Cette erreur signifie que le `server.js` (et probablement d'autres
fichiers backend) en cours d'exécution est une version antérieure à
l'ajout de cette route — pas un bug dans le code livré aujourd'hui.
Pour résoudre : remplace l'intégralité de ton dossier `backend/` par
celui fourni dans cette réponse plutôt que de chercher quel fichier
précis manque.

**Validation d'email en direct** sur l'inscription — même principe que
le mot de passe : rien avant la première frappe dans ce champ, un
message s'affiche si le format n'est pas valide (même expression que
`validateSignup`, dupliquée uniquement pour l'affichage immédiat,
comme documenté pour le mot de passe). Vérifié par calcul sur plusieurs
cas (vide, sans @, sans domaine, valide).

## React Router + câblage du client Supabase (étapes 1 et 2 sur 3)

**Cadrage assumé, décidé avant de commencer** : cette session couvre
les routes de haut niveau (connexion → tableau de bord → vue d'un
logement) et le câblage du client Supabase — PAS encore la sous-route
dédiée à l'éditeur de plan (le vrai bénéfice "bouton retour sort de
l'éditeur"), ni la migration des données du backend actuel vers de
vraies tables Postgres. Les deux sont annoncés, pas faits ici,
volontairement, pour ne pas risquer une décomposition bâclée de
`ApartmentSpatialMvp.jsx` (sa logique de sauvegarde a été vérifiée avec
beaucoup de soin par le passé — pas question de la fragiliser dans la
précipitation).

### Étape 1 : React Router

**`HouseholdRoot.jsx` retiré entièrement** — remplacé par
`AppRouter.jsx` (nouveau) + 4 pages/composants dédiés :
- `/login` → `LoginPage.jsx` (connexion/inscription, même JSX qu'avant).
- `/households` → `HouseholdDashboardPage.jsx` (tableau de bord).
- `/households/:householdId` → `HouseholdViewPage.jsx` (enveloppe
  `ApartmentSpatialMvp.jsx`, INCHANGÉ à l'intérieur pour cette
  première passe).

**"Nettoyage des états globaux" (demandé explicitement)** : la session
(`session`) sort d'un `useState` local à un seul composant pour devenir
un vrai contexte partagé — nouveau `AuthContext.jsx`
(`AuthProvider`/`useAuth()`). Les états propres au TABLEAU DE BORD
(`housings`/`housingsLoading`/`housingActionError`), eux, restent
volontairement LOCAUX à `HouseholdDashboardPage.jsx` — ils n'ont jamais
besoin d'être connus ailleurs que sur cet écran précis, les rendre
globaux aurait été un nettoyage dans le mauvais sens.

**`RequireAuth.jsx`** (nouveau) : garde de route — redirige vers
`/login` si aucune session active, en gardant la page visée
(`location.state.from`) pour y revenir juste après une connexion
réussie.

**`householdId` vient maintenant de l'URL** (`useParams()`), plus d'un
état `selectedHousingId` porté par un composant parent — le nom du
logement, lui, est encore récupéré via `listHouseholdsForUser`
(pas encore de route dédiée "un seul foyer par id" côté backend, léger
surcoût accepté pour l'instant).

### Étape 2 : câblage du client Supabase

**Nouveau fichier `src/lib/supabaseClient.js`** — instancie le client
(`createClient`) à partir de `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` (ajoutées à `.env.example`). Avertissement en
console (pas une exception) si ces variables sont absentes — le reste
de l'app doit continuer à fonctionner tant que Supabase n'est pas
réellement branché nulle part.

**Honnêteté nécessaire, comme annoncé avant de commencer** : ce fichier
n'a jamais pu être exécuté ni vérifié dans mon environnement de travail
— pas d'accès réseau externe, et aucun projet Supabase réel n'existe
encore pour "Chez nous". L'API `createClient()` est stable et
documentée depuis longtemps, donc raisonnablement fiable telle quelle
— mais la première vraie preuve de connexion viendra de toi, une fois
un projet Supabase créé et ses identifiants renseignés dans `.env`.

**Rien n'utilise encore ce client** — aucune requête Supabase nulle
part dans l'app. C'est la prochaine étape (câbler les services un par
un sur de vraies tables Postgres), pas celle-ci.

### Ce qui reste (annoncé, pas caché)

- Sous-route `/households/:householdId/edit` pour l'éditeur de plan
  (vrai bénéfice mobile du bouton retour) — `ApartmentSpatialMvp.jsx`
  gère encore cette bascule en interne.
- Migration réelle des données (backend actuel → tables Postgres,
  blob JSON pour le plan) — un chantier à part, plus large.
- Étape 3 annoncée par l'utilisateur (service/hook d'authentification +
  onboarding selon les rôles PROPRIETAIRE/LOCATAIRE) — pas commencée.

197/197 tests backend inchangés (ce chantier est entièrement
frontend). Audit complet des imports sans problème.

## Étape 3 : service/hook d'authentification + onboarding selon les rôles

**Nouveau fichier `useHouseholdRole.js`** — c'est le "premier
service/hook" demandé : résout le rôle (PROPRIETAIRE/LOCATAIRE) du
compte connecté (`useAuth()`) au sein d'UN foyer précis, à partir du
modèle relationnel déjà en place côté backend (occupants +
`claimedByUserId` + `role`, construit lors du chantier précédent sur
les rôles). Retourne `{ role, isOwner, loading }`.

**Branché dans `HouseholdViewPage.jsx`**, transmis à
`ApartmentSpatialMvp.jsx` (nouveaux props `role`/`isOwner`) :
- Le bouton "Modifier le plan" ne s'affiche plus du tout pour un
  LOCATAIRE.
- Si le plan est encore vide ET que le compte n'est pas propriétaire,
  un message d'attente s'affiche ("En attente du propriétaire...")
  plutôt que l'écran de création — qui échouerait de toute façon côté
  backend (`isHouseholdOwner`, déjà vérifié lors du chantier
  précédent).

**Le backend reste la vraie barrière de sécurité** — ce hook n'ajuste
QUE l'affichage frontend, jamais une protection en soi (un LOCATAIRE
qui contournerait l'interface se ferait de toute façon refuser par le
backend, comme vérifié précédemment).

**Vérifié avec de vraies requêtes HTTP** (pas la logique React
elle-même, que je ne peux pas exécuter dans mon environnement) : la
donnée que consomme ce hook (`listOccupants`) renvoie bien le rôle
correct pour un propriétaire et un locataire distincts — confirmé par
un scénario complet (inscription du propriétaire, ajout + réclamation
d'un locataire, vérification du rôle de chacun).

197/197 tests backend inchangés (ce chantier est entièrement
frontend). Audit complet des imports sans problème.

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

