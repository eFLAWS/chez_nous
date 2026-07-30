# Chez nous (Homee)

Application de gestion de foyer : plan 2D/2.5D interactif, tâches liées aux pièces et occupants, dépenses partagées, notes spatiales. Cible : produit commercialisable, mobile-first, dark mode natif, glassmorphism, palette émeraude/teal.

> Distinct de l'artefact React autonome "chez-nous.jsx" produit en tout début de projet (prototype figé, vocabulaire codé en dur) — ce dépôt est l'architecture générique réelle.

---

## ⚠️ État actuel : migration en cours vers Supabase

Le projet est **en transition** entre deux architectures. C'est la chose la plus importante à comprendre avant de lire le reste de ce document.

| | Ancien système (encore actif) | Nouveau système (cible, en construction) |
|---|---|---|
| **Backend** | Node.js natif + fichier JSON (`backend/`) | Supabase (Postgres + Auth + RLS) |
| **Auth** | Formulaires maison (`SignupForm`/`LoginForm`) + session `localStorage` | Supabase Auth (`AuthContext`, `LoginPage`, `SignupPage`) |
| **Foyers** | `HouseholdRoot.jsx` → `HousingDashboard.jsx` → `ApartmentSpatialMvp.jsx` | `CreateHouseholdPage.jsx` → tables `households`/`household_members` |
| **Monté par `main.jsx`** | ✅ Oui, via `AppRouter.jsx` → `RequireAuth` → `RequireHousehold` → `HouseholdRoot` | Partiellement — l'onboarding (`/signup`, `/onboarding`) est réel, mais tout ce qui suit retombe encore sur l'ancien système |

**Concrètement, aujourd'hui, un nouvel utilisateur :**
1. S'inscrit sur `/signup` (Supabase Auth) ou se connecte sur `/login`.
2. `RequireHousehold` vérifie s'il a un foyer dans la table Supabase `household_members`. Sinon → `/onboarding`.
3. Crée un foyer sur `/onboarding` → `INSERT` réel dans `households`/`household_members` (Supabase).
4. Retombe ensuite sur `HouseholdRoot`, qui **ignore totalement** ce qui vient de se passer et affiche **son propre écran de connexion interne**, câblé sur l'ancien backend Node.js. Un compte doit donc exister sur les **deux systèmes séparément** pour aller jusqu'au bout.

Ce n'est pas un bug caché — c'est l'état réel du chantier de migration. La suite du travail consiste à faire disparaître la colonne de droite du tableau ci-dessus, remplaçant `HouseholdRoot`/`HousingDashboard`/l'ancien backend par des équivalents Supabase, jusqu'à ce que `backend/` (Node.js) puisse être supprimé.

---

## Stack technique

- **Frontend :** React + Vite + React Router (`react-router-dom` v7)
- **Backend cible :** Supabase (Postgres, Auth, Row Level Security, Storage)
- **Backend actuel (à retirer progressivement) :** Node.js natif, zéro dépendance, stockage JSON (`backend/data/store.json`)
- **UI :** CSS classique (pas de Tailwind en production — voir `docs/ui/code_couelur.md` pour la charte ; Tailwind/FontAwesome utilisés uniquement dans les maquettes HTML de `docs/ui/`)

---

## Schéma de données

**Référence canonique : [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)** — schéma Postgres complet, matrice de droits RLS (PROPRIETAIRE/LOCATAIRE), logique de transfert de propriété. Les extensions ajoutées côté implémentation (table `occupants`, assignation de tâche à un occupant non-utilisateur) y sont documentées en section 6.

Le schéma réel vit dans `backend/supabase/migrations/` (exécuté manuellement dans l'éditeur SQL Supabase — pas encore de CLI Supabase configurée pour appliquer ces fichiers automatiquement) :
- `01_schema_and_rls.sql` — schéma initial
- `02_reconcile_with_data_model.sql` — corrige les écarts trouvés avec `docs/DATA_MODEL.md` (noms de colonnes, `invite_code`, `version`)

**Palette de couleurs** : voir [`docs/ui/code_couelur.md`](docs/ui/code_couelur.md) pour les tokens CSS officiels (`--color-emerald`, `--color-teal`, etc.) — c'est la référence, pas les valeurs devinées à partir d'une seule maquette.

**Maquettes** : `docs/ui/` contient les prototypes HTML/Tailwind de référence pour chaque écran (`login/`, `signup/`, `new/` = choix de création de foyer, `home/`). Plusieurs versions coexistent par écran (`v0.1.1`, `v0.1.2`...) — la version la plus récente fait foi sauf indication contraire.

**Flow d'onboarding** : voir [`docs/user-flows/USER-FLOW_ONBOARDING.md`](docs/user-flows/USER-FLOW_ONBOARDING.md) — routes cibles (`/login`, `/home`, `/onboarding/select`, `/editor/new`, `/editor/review`), les 4 options de l'écran de choix (Créer / Scanner / Rejoindre / Continuer sans foyer), gestion des cas limites.

---

## Arborescence

```
backend/                          # ANCIEN système, Node.js natif — à retirer progressivement
  validators.js / auth.js / logger.js / store.js / dataService.js
  core/storageUtils.js
  services/
    userService.js                  # comptes, auth, invitations, occupants, multi-foyers (createHouseholdForUser, leaveHousehold, transferOwnership...)
    roomService.js                  # étages, pièces, portes (doors), collisions
    taskService.js / projectService.js
  server.js                       # serveur HTTP natif, routes /api/...
  tests/                           # 197 tests (node --test), tous passants
  supabase/
    migrations/
      01_schema_and_rls.sql
      02_reconcile_with_data_model.sql

docs/
  DATA_MODEL.md                   # schéma canonique (voir plus haut)
  user-flows/USER-FLOW_ONBOARDING.md
  ui/                              # maquettes HTML/Tailwind (référence visuelle uniquement)
    code_couelur.md                 # palette de couleurs officielle
    login/ signup/ new/ home/

frontend/
  src/
    main.jsx                      # monte AppRouter
    AppRouter.jsx                 # routes réelles (voir tableau plus haut)
    App.jsx                       # ANCIEN point d'entrée (comptes réels tâches/projets), plus monté depuis main.jsx
    api.js                        # appels fetch vers l'ancien backend Node.js
    lib/
      supabaseClient.js           # client Supabase (Auth + Postgres)

    features/
      auth/
        AuthContext.jsx            # NOUVEAU — session Supabase (AuthProvider/useAuth)
        RequireAuth.jsx             # NOUVEAU — garde de route (session Supabase)
        LoginPage.jsx / SignupPage.jsx   # NOUVEAU — Supabase Auth
        LoginForm.jsx / SignupForm.jsx / InviteForm.jsx / AcceptInvitationForm.jsx / ForgotPasswordForm.jsx   # ANCIEN — ancien backend, utilisés par HouseholdRoot
        MockAuthScreen.jsx          # ANCIEN — mock encore présent, plus utilisé activement

      household/
        householdService.js         # NOUVEAU — Supabase (createHousehold, listMyHouseholds)
        useHouseholds.js             # NOUVEAU — hook de chargement des foyers Supabase
        RequireHousehold.jsx         # NOUVEAU — garde de route (≥1 foyer Supabase)
        CreateHouseholdPage.jsx/.css  # NOUVEAU — onboarding réel (/onboarding), fidèle à docs/ui/new/
        HouseholdRoot.jsx             # ANCIEN — orchestrateur complet et fonctionnel (auth+dashboard+plan), ancien backend
        HousingDashboard.jsx/.css     # ANCIEN — liste des foyers (ancien backend)
        HouseholdViewPage.jsx         # PARTIEL — variante React Router de l'ancien système (route /households/:id), jamais branchée dans AppRouter.jsx
        useHouseholdRole.js           # PARTIEL — résout le rôle via l'ancien backend (occupants + claimedByUserId), pas Supabase
        ApartmentSpatialMvp.jsx/.css  # Éditeur spatial complet (étages, plan 2D/2.5D) — ancien backend
        FloorView2D.jsx / Plan2DView.jsx / OnboardingScreen.jsx / CreateHousingScreen.jsx / JoinHousingModal.jsx / ScanPlanModal.jsx / PlaceholderModal.jsx
        mockData.js
        utils/pathfinding.js / householdLayoutApi.js

      layout-editor/
        components/LayoutEditor.jsx / RoomInspector.jsx / RoomNameModal.jsx
        utils/layoutGeneration.js / roomCollision.js / layoutStorage.js / validateLayout.js
        roomTypes.js

    components/                    # UI générique multi-feature
      ui/ (Toast, Spinner, Skeleton, StatusBadge, ProgressBar, ItemCard, ItemForm, ItemGrid, Icons)
      forms/ (ProjectFormFields, TaskFormFields, RoomFormFields, PetFormFields)   # ANCIEN backend
      layout/AppShell.jsx / tasks/TaskOverview.jsx / floorplan/*                   # ANCIEN backend

    hooks/ (useItems, useToast)
    utils/formValidators.js
    assets/ (theme.css, ui-feedback.css, visual-hierarchy.css, floor-plan.css, task-overview.css, room-3d.css)
```

**Légende :** NOUVEAU = Supabase, cible de la migration. ANCIEN = backend Node.js, à retirer une fois la migration complète. PARTIEL = commencé sur l'ancien backend, jamais fini ni branché — voir "État de la migration".

---

## État de la migration (routing + Supabase)

| Étape | État | Détail |
|---|---|---|
| **1. React Router réel** | 🟡 Partiel | `AppRouter.jsx`/`RequireAuth`/`RequireHousehold` réels et fonctionnels. Mais l'intérieur de `HouseholdRoot` ne route pas encore en vraies URLs (`/editor`, etc. — tout en state interne). `HouseholdViewPage.jsx`/`useHouseholdRole.js` existent mais ciblent l'ancien backend et ne sont pas montés dans `AppRouter.jsx`. |
| **2. Projet Supabase** | 🟢 Fait | Projet créé, clés dans `.env.local`. |
| **3. Schéma SQL** | 🟢 Fait | `01_schema_and_rls.sql` + `02_reconcile_with_data_model.sql` exécutés. |
| **4. Auth + Onboarding Supabase** | 🟡 Partiel | Connexion/inscription/création de foyer fonctionnent sur Supabase. Aucun dashboard ni éditeur de plan Supabase — tout retombe sur l'ancien `HouseholdRoot` ensuite (voir tableau de transition plus haut). |

---

## Lancer le projet en local

**Terminal 1 — ancien backend (encore nécessaire, `HouseholdRoot` en dépend) :**
```
cd backend
node server.js
```

**Terminal 2 — frontend :**
```
cd frontend
npm install
npm run dev
```

Variables d'environnement (`frontend/.env.local`, non commité) :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Tests

```
cd backend
node --test        # 197 tests
node live-test.js   # vérification HTTP de bout en bout (serveur doit tourner)
```

```
cd frontend
npm test
```
