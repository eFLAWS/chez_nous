# Chez nous (Homee)

Application de gestion de foyer : plan 2D/3D interactif, tâches liées aux pièces et occupants, dépenses partagées, notes spatiales. Cible : produit commercialisable, mobile-first, dark mode natif, glassmorphism, palette émeraude/teal.

> Distinct de l'artefact React autonome "chez-nous.jsx" produit en tout début de projet (prototype figé, vocabulaire codé en dur) — ce dépôt est l'architecture générique réelle.

---

## État actuel : coquille applicative + foyers + plan 2D/3D sur Supabase, tous validés par des tests réels

Le projet reste **en transition** entre deux architectures, mais la bascule a nettement avancé — plus loin qu'il n'y paraît sur les foyers, moins loin qu'annoncé précédemment sur le plan (voir correction ci-dessous).

| | Ancien système | Nouveau système (Supabase) |
|---|---|---|
| **Backend** | Node.js natif + fichier JSON (`backend/`) | Supabase (Postgres + Auth + RLS) |
| **Auth** | Formulaires maison + session `localStorage` | Supabase Auth (`AuthContext`, `LoginPage`, `SignupPage`) |
| **Foyers (liste + détail + rôles)** | `HouseholdRoot.jsx` → `HousingDashboard.jsx` | `HouseholdDashboardPage.jsx` (`/households`) → `AppLayout.jsx` (`/households/:id/*`, 6 onglets) |
| **Plan 2D/3D** | `ApartmentSpatialMvp.jsx` — plus aucun importeur actif (`api.js`/`householdLayoutApi.js` orphelins, confirmé) | `floorPlanService.js` (blob JSONB `floor_plans.layout_data`, verrou optimiste). Monté sur `/spatial`. **Testé en conditions réelles par Paul — fonctionne** |
| **Tâches / Dépenses / Calendrier / Vie du foyer** | N'existaient pas | Placeholders statiques (`HouseholdTasksPage.jsx`, `HouseholdExpensesPage.jsx`, `HouseholdCalendarPage.jsx`, `HouseholdLifePage.jsx`) — aucune couche de données encore, ni ancien ni nouveau système |
| **Monté par `AppRouter.jsx`** | ❌ Non — `HouseholdRoot` retiré du flux | ✅ Oui, c'est le flux principal |

**Le flux réel aujourd'hui :** inscription/connexion (Supabase Auth) → si aucun foyer, `/onboarding` (création réelle sur Supabase) → si un seul foyer, redirection directe vers `/households/:id` (Accueil) ; sinon `/households` (liste, ou `?manage=1` pour la gérer explicitement) → `AppLayout` (header avec switcher de foyer + menu profil, 6 onglets : Accueil, Plan, Tâches, Dépenses, Calendrier, Vie du foyer). **Le plan 2D/3D est monté sur `/spatial`, connecté à Supabase, et testé en conditions réelles — fonctionne** (créer un plan, sauvegarder, recharger).

⚠️ **Correction (voir `docs/PROJET.md` §2, journal) :** une version antérieure de ce README laissait entendre que rien côté données métier n'était sur Supabase — c'est faux pour les foyers, vérifié en lisant `householdService.js`. Le vrai goulot d'étranglement est le plan 2D/3D : entièrement fonctionnel mais toujours branché sur l'ancien backend (`api.js`, CRUD par entité, IDs incompatibles UUID) et **pas monté dans le routing actuel**.

`HouseholdRoot.jsx`, `ApartmentSpatialMvp.jsx`, `layout-editor/`, les anciens formulaires d'auth, `App.jsx` et `api.js` restent dans le dépôt **volontairement**, dormants — c'est la référence qui sera portée vers Supabase lors du prochain chantier (voir "Fichiers dormants" plus bas).

---

## Stack technique

- **Frontend :** React + Vite + React Router (`react-router-dom` v7)
- **Backend cible :** Supabase (Postgres, Auth, Row Level Security, Storage)
- **Backend actuel (dormant, à retirer après migration du plan) :** Node.js natif, zéro dépendance, stockage JSON (`backend/data/store.json`), 197 tests (`node --test`)
- **UI :** CSS classique (pas de Tailwind en production — voir `docs/ui/code_couelur.md` pour la charte ; Tailwind/FontAwesome utilisés uniquement dans les maquettes HTML de `docs/ui/`)

---

## Schéma de données

**Référence canonique : [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)** — schéma Postgres complet, matrice de droits RLS (PROPRIETAIRE/LOCATAIRE), logique de transfert de propriété. Extensions conservées (table `occupants`, assignation de tâche à un occupant non-utilisateur) documentées en section 6.

Migrations réelles, dans l'ordre, dans `backend/supabase/migrations/` :
1. `01_schema_and_rls.sql` — schéma initial
2. `02_reconcile_with_data_model.sql` — aligne le schéma sur `docs/DATA_MODEL.md` (`invite_code`, `version`, noms de colonnes)
3. `03_fix_households_select_bootstrap.sql` — corrige un piège RLS : `.insert().select()` relit la ligne créée, soumise à la policy de SELECT — qui échouait au tout premier foyer d'un compte (aucune ligne `household_members` n'existe encore à cet instant précis). Policy `households_select_own_on_create` ajoutée pour couvrir ce cas.

**Palette de couleurs officielle** : [`docs/ui/code_couelur.md`](docs/ui/code_couelur.md). **Maquettes** : `docs/ui/` (`login/`, `signup/`, `new/`, `home/`). **Flow d'onboarding** : [`docs/user-flows/USER-FLOW_ONBOARDING.md`](docs/user-flows/USER-FLOW_ONBOARDING.md). **Routing détaillé (guards, arborescence des routes) :** [`docs/user-flows/ROUTING_AND_USER_FLOWS.md`](docs/user-flows/ROUTING_AND_USER_FLOWS.md) *(⚠️ toujours à 5 onglets documentés, le code réel en a 6 — pas encore mis à jour)*.

**Suivi & vision produit** — trois documents compagnons, mis à jour à chaque avancée :
- [`docs/PROJET.md`](docs/PROJET.md) *(anciennement `CHEZ_NOUS_SUIVI_PROJET.md`, renommé)* — état du code, chantiers restants par phase, jusqu'à la commercialisation.
- [`docs/VISION_PRODUIT.md`](docs/VISION_PRODUIT.md) — objectifs et fonctionnalités visées, questions ouvertes à trancher.
- [`docs/TO_DO.md`](docs/TO_DO.md) — carnet du quotidien : bugs connus, petites améliorations UI/UX, distinct de `PROJET.md` (qui garde la vue d'ensemble architecture/roadmap).

---

## Arborescence

```
backend/                          # ANCIEN système, dormant — gardé pour la migration du plan
  validators.js / auth.js / logger.js / store.js / dataService.js
  core/storageUtils.js
  services/ (userService.js, roomService.js, taskService.js, projectService.js)
  server.js
  tests/                          # 197 tests, tous passants
  supabase/migrations/
    01_schema_and_rls.sql
    02_reconcile_with_data_model.sql
    03_fix_households_select_bootstrap.sql

docs/
  DATA_MODEL.md
  user-flows/USER-FLOW_ONBOARDING.md
  ui/ (code_couelur.md, login/, signup/, new/, home/)

frontend/
  src/
    main.jsx                      # monte AppRouter
    AppRouter.jsx                 # routes réelles — HouseholdRoot n'est plus routé (étape 4)
    App.jsx                       # ANCIEN point d'entrée, dormant, plus monté
    api.js                        # ANCIEN, appels vers le backend Node.js, dormant
    lib/supabaseClient.js

    features/
      auth/
        AuthContext.jsx / RequireAuth.jsx / LoginPage.jsx / SignupPage.jsx / AuthPage.css   # NOUVEAU (Supabase)
        LoginForm.jsx / SignupForm.jsx / InviteForm.jsx / AcceptInvitationForm.jsx / ForgotPasswordForm.jsx / AuthForm.css   # ANCIEN, dormant

      household/
        householdService.js / useHouseholds.js / useHouseholdDetail.js / RequireHousehold.jsx   # NOUVEAU (Supabase)
        HouseholdDashboardPage.jsx/.css   # NOUVEAU — route /households (liste, redirige seule si 1 foyer)
        AppLayout.jsx/.css                # NOUVEAU — coquille de /households/:id/* (header + 6 onglets)
        HouseholdSwitcher.jsx/.css        # NOUVEAU — switcher de foyer + "Gérer mes logements" (header)
        UserMenu.jsx/.css                 # NOUVEAU — menu profil (Réglages/Profil "Bientôt", Déconnexion)
        HouseholdHomePage.jsx/.css        # NOUVEAU — onglet Accueil (données statiques pour l'instant)
        HouseholdSpatialPage.jsx          # NOUVEAU — onglet Plan, monte ApartmentSpatialMvp (Supabase)
        floorPlanService.js               # NOUVEAU — Supabase (blob JSONB floor_plans.layout_data)
        HouseholdTasksPage.jsx            # NOUVEAU — onglet Tâches (placeholder)
        HouseholdExpensesPage.jsx         # NOUVEAU — onglet Dépenses (placeholder, table déjà en base)
        HouseholdCalendarPage.jsx         # NOUVEAU — onglet Calendrier (placeholder)
        HouseholdLifePage.jsx/.css        # NOUVEAU — onglet Vie du foyer (nom, code d'invitation, membres)
        HouseholdRewardsPage.jsx          # NOUVEAU — page /rewards (placeholder, atteinte via badge gemme)
        StreakModal.jsx                   # NOUVEAU — modale détail streak (badge flamme, header)
        TabPlaceholder.jsx/.css           # NOUVEAU — habillage partagé des onglets pas encore implémentés
        CreateHouseholdPage.jsx/.css      # NOUVEAU — route /onboarding
        HouseholdRoot.jsx/.css            # ANCIEN, dormant — plus routé
        HousingDashboard.jsx/.css / ApartmentSpatialMvp.jsx/.css / FloorView2D.jsx/.css / Plan2DView.jsx/.css / OnboardingScreen.jsx/.css / CreateHousingScreen.jsx/.css / JoinHousingModal.jsx/.css / ScanPlanModal.jsx / PlaceholderModal.jsx/.css / mockData.js   # ApartmentSpatialMvp RECONNECTÉ (floorPlanService.js) et monté sur /spatial — le reste encore dormant
        utils/pathfinding.js / householdLayoutApi.js   # ANCIEN, dormant — householdLayoutApi.js confirmé sans plus aucun importeur actif

      layout-editor/    # ANCIEN, dormant en entier (LayoutEditor.jsx, RoomInspector.jsx, RoomNameModal.jsx, layoutGeneration.js, roomCollision.js, layoutStorage.js, validateLayout.js, roomTypes.js)

    components/
      ui/ (Toast, Spinner, Skeleton, StatusBadge, ProgressBar, ItemCard, ItemForm, ItemGrid, Icons)   # génériques, toujours utilisés
      forms/ / layout/AppShell.jsx / tasks/TaskOverview.jsx / floorplan/*   # ANCIEN, dormant

    hooks/ (useItems, useToast)
    utils/formValidators.js
    assets/ (theme.css, ui-feedback.css, visual-hierarchy.css, floor-plan.css, task-overview.css, room-3d.css)
```

**Fichiers supprimés depuis la dernière version** (plus aucun importeur nulle part, vérifié) :
- `features/household/useHouseholdRole.js` (remplacé par `useHouseholdDetail.js`)
- `features/auth/MockAuthScreen.jsx` + `.css` (jamais réellement utilisé)
- `App.jsx` (racine `src/`) — ancien point d'entrée, plus jamais monté par `main.jsx`
- `features/household/HouseholdViewPage.jsx` + `.css` — remplacé par `AppLayout.jsx` (coquille) + `HouseholdLifePage.jsx` (contenu : le nom/code d'invitation/membres correspondait en fait à l'onglet "Vie du foyer", pas à l'Accueil)
- `features/household/Icons.jsx` — copie orpheline de `components/ui/Icons.jsx`, jamais importée

**Fichiers "ANCIEN, dormant" ci-dessus** : gardés intentionnellement, pas d'importeur actif depuis `AppRouter.jsx`, mais nécessaires comme référence pour porter le plan 2D/3D vers Supabase (prochain chantier). À supprimer une fois cette migration terminée.

---

## État de la migration (routing + Supabase)

| Étape | État |
|---|---|
| **1. React Router réel** | 🟢 Fait |
| **2. Projet Supabase** | 🟢 Fait |
| **3. Schéma SQL** | 🟢 Fait (3 migrations) |
| **4. Auth + Onboarding + retrait de HouseholdRoot** | 🟢 Fait |
| **5. Coquille applicative (`AppLayout`, 6 onglets, switcher, menu profil)** | 🟢 Fait |
| **6. Reconnexion du plan 2D/3D (`floor_plans`, JSONB)** | 🟢 Fait et testé en conditions réelles |
| **7. Tâches / Dépenses / Calendrier / Vie du foyer (Supabase réel)** | 🔴 Pas commencé — placeholders uniquement |

---

## Lancer le projet en local

**Terminal 1 — ancien backend (optionnel aujourd'hui — voir correction ci-dessus : plus aucune route montée ne l'appelle, seul le code dormant du plan 2D/3D en dépend encore) :**
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
node live-test.js
```

```
cd frontend
npm test
```
