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
| **Plan 2D/3D** | `HouseholdSpatialView.jsx` — plus aucun importeur actif (`api.js`/`householdLayoutApi.js` orphelins, confirmé) | `floorPlanService.js` (blob JSONB `floor_plans.layout_data`, verrou optimiste). Monté sur `/spatial`. **Testé en conditions réelles par Paul — fonctionne** |
| **Tâches / Dépenses / Vie du foyer** | N'existaient pas | Tâches : **schéma Supabase V1 + lecture/statut branchés** (`taskService.js`, 03/08/2026) — `Plan2DView`/`RoomDetailView.jsx` affichent de vraies données, `HouseholdTasksPage.jsx` liste réellement les tâches du foyer ; l'écran de création riche (groupe, assignation, dépendance) reste à construire. Dépenses (`HouseholdExpensesPage.jsx`) / Vie du foyer (`HouseholdLifePage.jsx`, contenu réel non-Supabase) : inchangés, aucune couche de données |
| **Calendrier** | N'existait pas | `HouseholdCalendarPage.jsx` — grille mensuelle **réellement interactive** (calculée dynamiquement, filtres, sélection de jour), événements toujours **statiques/mock** (aucune table `calendar_events`) |
| **Profil / Réglages / Préférences** | N'existaient pas | `features/account/` (nouveau) — `ProfilePage.jsx`, `SettingsPage.jsx`, `PreferencesPage.jsx`. Interrupteurs de Préférences réellement cliquables, **rien n'est persisté** (pas de table de préférences utilisateur) |
| **Monté par `AppRouter.jsx`** | ❌ Non — `HouseholdRoot` retiré du flux | ✅ Oui, c'est le flux principal |

**Le flux réel aujourd'hui :** inscription/connexion (Supabase Auth) → si aucun foyer, `/onboarding` (création réelle sur Supabase) → si un seul foyer, redirection directe vers `/households/:id` (Accueil) ; sinon `/households` (liste, ou `?manage=1` pour la gérer explicitement) → `AppLayout` (header avec switcher de foyer + menu profil, 6 onglets : Accueil, Plan, Tâches, Dépenses, Calendrier, Vie du foyer). **Le plan 2D/3D est monté sur `/spatial`, connecté à Supabase, et testé en conditions réelles — fonctionne** (créer un plan, sauvegarder, recharger). Depuis le menu profil (header), "Profil" et "Réglages" mènent vers `/profile` et `/settings` (pages plein écran autonomes, pas des onglets du foyer) ; "Notifications et Préférences" dans Réglages mène vers `/settings/preferences`.

⚠️ **Note historique (voir `PROJECT.md` §2, journal) :** une version antérieure de ce README laissait entendre que rien côté données métier n'était sur Supabase — c'est faux pour les foyers, vérifié en lisant `householdService.js`. Le goulot d'étranglement identifié à l'époque (le plan 2D/3D, alors branché sur l'ancien backend et pas monté dans le routing) est **résolu depuis** : reconnecté à Supabase et testé en conditions réelles (voir plus haut).

⚠️ **Correction (cette révision, 01/08/2026) :** `layout-editor/` (`LayoutEditor.jsx` et toute sa chaîne d'utilitaires) **n'est pas dormant** — c'est le Mode Édition réellement monté par `HouseholdSpatialView.jsx` (actif, routé sur `/spatial`), au même titre que `FloorView3D.jsx`, `Plan2DView.jsx`, `OnboardingScreen.jsx` et `pathfinding.js` (déplacé le 03/08/2026 dans `features/floor-plan/utils/`, voir plus bas), tous importés par lui et donc actifs eux aussi. Seuls restent réellement dormants (aucun importeur actif depuis `AppRouter.jsx`) : `HouseholdRoot.jsx`, `HousingDashboard.jsx`, `CreateHousingScreen.jsx`, `JoinHousingModal.jsx`, `ScanPlanModal.jsx`, les anciens formulaires d'auth, `App.jsx`, `api.js` et `householdLayoutApi.js` — **tous supprimés pour de bon depuis le 03/08/2026**, voir plus bas.

📝 **Renommage (01/08/2026, demande explicite de Paul)** : `ApartmentSpatialMvp.jsx`/`.css` → **`HouseholdSpatialView.jsx`/`.css`** (n'était plus un prototype "MVP" depuis longtemps ; "Apartment" retiré, l'app cible des logements en général) et `FloorView2D.jsx`/`.css` → **`FloorView3D.jsx`/`.css`** (le vocabulaire "vue 2.5D" devient "vue 3D" partout — plus clair pour les utilisateurs). Changement de nom et de vocabulaire uniquement : le rendu de `FloorView3D` reste une grille CSS vue de dessus avec avatar, pas un moteur isométrique/WebGL. Appliqué rétroactivement partout, y compris dans les entrées déjà datées du journal de `PROJECT.md` — même logique que le renommage antérieur de `CHEZ_NOUS_SUIVI_PROJET.md` : le nom courant partout plutôt qu'un mélange ancien/nouveau selon la date.

---

## Stack technique

- **Frontend :** React + Vite + React Router (`react-router-dom` v7)
- **Backend cible :** Supabase (Postgres, Auth, Row Level Security, Storage)
- **Backend actuel (dormant, à retirer après migration du plan) :** Node.js natif, zéro dépendance, stockage JSON (`backend/data/store.json`), 197 tests (`node --test`)
- **UI :** CSS classique (pas de Tailwind en production — voir `docs/ui/code_couelur.md` pour la charte ; Tailwind/FontAwesome utilisés uniquement dans les maquettes HTML de `docs/ui/`)

---

## Schéma de données

**Référence canonique : [`DATAMODEL.md`](DATAMODEL.md)** — schéma Postgres complet, matrice de droits RLS (PROPRIETAIRE/LOCATAIRE), logique de transfert de propriété. Extensions conservées (table `occupants`, assignation de tâche à un occupant non-utilisateur) documentées en section 6.

Migrations réelles, dans l'ordre, dans `backend/supabase/migrations/` :
1. `01_schema_and_rls.sql` — schéma initial
2. `02_reconcile_with_data_model.sql` — aligne le schéma sur `DATAMODEL.md` (`invite_code`, `version`, noms de colonnes)
3. `03_fix_households_select_bootstrap.sql` — corrige un piège RLS : `.insert().select()` relit la ligne créée, soumise à la policy de SELECT — qui échouait au tout premier foyer d'un compte (aucune ligne `household_members` n'existe encore à cet instant précis). Policy `households_select_own_on_create` ajoutée pour couvrir ce cas.

**Palette de couleurs officielle** : [`docs/ui/code_couelur.md`](docs/ui/code_couelur.md). **Maquettes** : `docs/ui/` (`login/`, `signup/`, `new/`, `home/`). **Flow d'onboarding** : [`USERFLOWONBOARDING.md`](USERFLOWONBOARDING.md). **Routing détaillé (guards, arborescence des routes) :** [`ROUTINGANDUSERFLOWS.md`](ROUTINGANDUSERFLOWS.md) *(⚠️ toujours à 5 onglets documentés, le code réel en a 6 — pas encore mis à jour)*.

**Suivi & vision produit** — trois documents compagnons, mis à jour à chaque avancée :
- [`PROJECT.md`](PROJECT.md) *(anciennement `CHEZ_NOUS_SUIVI_PROJET.md`, renommé)* — état du code, chantiers restants par phase, jusqu'à la commercialisation.
- [`PRODUCTVISION.md`](PRODUCTVISION.md) — objectifs et fonctionnalités visées, questions ouvertes à trancher.
- [`TODO.md`](TODO.md) — carnet du quotidien : bugs connus, petites améliorations UI/UX, distinct de `PROJECT.md` (qui garde la vue d'ensemble architecture/roadmap).

---

## Arborescence

```
README.md / PROJECT.md / DATAMODEL.md / PRODUCTVISION.md / TODO.md / CLAUDEINSTRUCTIONS.md / CLAUDEMEMORY.md / ROUTINGANDUSERFLOWS.md / USERFLOWONBOARDING.md   # toute la doc .md à la racine depuis le 03/08/2026 (avant : dans docs/, docs/user-flows/)

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
    04_tasks_v1_schema.sql        # NOUVEAU (03/08/2026) — tasks enrichie + task_groups + task_assignees, exécutée

docs/                              # ne contient plus que les maquettes depuis le déplacement des .md à la racine (03/08/2026, décision de Paul)
  ui/ (code_couelur.md, login/, signup/, new/, home/, tasks/)   # tasks/ NOUVEAU (03/08/2026) — ui_task_v0.1.1.html.html, prototype pour l'écran de création riche, pas encore traduit

frontend/
  src/
    main.jsx                      # MODIFIÉ (03/08/2026) — ne monte plus que assets/theme.css (les 5 autres imports globaux ne servaient qu'au sous-graphe mort ci-dessous, désormais supprimé)
    AppRouter.jsx                 # MODIFIÉ (03/08/2026) — import HouseholdSpatialPage corrigé (features/floor-plan/)
    lib/supabaseClient.js

    features/
      auth/
        AuthContext.jsx / RequireAuth.jsx / LoginPage.jsx / SignupPage.jsx / AuthPage.css   # Supabase, actif

      account/                          # pages de niveau COMPTE, pas foyer (plein écran, pas de bottom nav)
        account-pages.css
        ProfilePage.jsx/.css
        SettingsPage.jsx
        PreferencesPage.jsx
        UserMenu.jsx/.css                 # DÉPLACÉ (03/08/2026, depuis features/household/) — c'est un menu de COMPTE (profil/réglages/déconnexion), pas de foyer

      household/                         # 25 fichiers désormais (58 avant le 03/08/2026 — extraction floor-plan/+tasks/ et suppression du code mort)
        householdService.js / useHouseholds.js / useHouseholdDetail.js / RequireHousehold.jsx
        HouseholdDashboardPage.jsx/.css   # route /households (liste, redirige seule si 1 foyer)
        AppLayout.jsx/.css                # MODIFIÉ (03/08/2026) — import UserMenu corrigé (../account/)
        HouseholdSwitcher.jsx/.css        # switcher de foyer + "Gérer mes logements" (header)
        HouseholdHomePage.jsx/.css        # MODIFIÉ (03/08/2026) — imports floorPlanService/Plan2DView corrigés (../floor-plan/)
        HouseholdExpensesPage.jsx         # onglet Dépenses (placeholder, table déjà en base)
        HouseholdCalendarPage.jsx/.css    # onglet Calendrier (grille mensuelle réelle, événements mock)
        HouseholdLifePage.jsx/.css        # onglet Vie du foyer (nom, code d'invitation, membres)
        HouseholdRewardsPage.jsx          # page /rewards (placeholder, atteinte via badge gemme)
        StreakModal.jsx                   # modale détail streak (badge flamme, header)
        PlaceholderModal.jsx/.css         # PARTAGÉ — utilisé par StreakModal.jsx (plus aucun autre appelant depuis la suppression de ScanPlanModal/JoinHousingModal, voir plus bas)
        TabPlaceholder.jsx/.css           # habillage partagé des onglets pas encore implémentés
        CreateHouseholdPage.jsx/.css      # route /onboarding

      floor-plan/       # NOUVEAU dossier (03/08/2026, demande explicite de Paul — même logique que l'extraction de layout-editor/) :
        HouseholdSpatialView.jsx/.css     # DÉPLACÉ (depuis features/household/) — orchestrateur spatial, monté sur /spatial
        HouseholdSpatialPage.jsx          # DÉPLACÉ — route /households/:id/spatial
        Plan2DView.jsx/.css               # DÉPLACÉ
        FloorView3D.jsx/.css              # DÉPLACÉ
        RoomDetailView.jsx/.css           # DÉPLACÉ — vue détaillée d'une pièce (affiche aussi des tâches réelles, taskService.js)
        OnboardingScreen.jsx/.css         # DÉPLACÉ — écran "aucun plan encore" dans le flux spatial
        floorPlanService.js               # DÉPLACÉ — Supabase (blob JSONB floor_plans.layout_data)
        mockData.js                       # DÉPLACÉ — MOCK_USER/MOCK_FLOORS/etc. (Vue 3D)
        utils/pathfinding.js              # DÉPLACÉ (depuis features/household/utils/) — recherche de chemin de l'avatar, utilisé par FloorView3D.jsx
        # Aucun changement d'import interne à ce dossier : tous les imports relatifs entre ces fichiers
        # restaient valides tels quels après le déplacement en bloc (même profondeur que dans household/).

      layout-editor/    # ACTIF, inchangé — LayoutEditor.jsx (Mode Édition, monté par floor-plan/HouseholdSpatialView.jsx), RoomInspector.jsx, RoomCreateModal.jsx, layoutGeneration.js, roomCollision.js, layoutStorage.js, validateLayout.js, roomTypes.js, components/WallEdges.jsx

      tasks/            # taskService.js, useHouseholdTasks.js, useHouseholdRoomNames.js (MODIFIÉ 03/08 — import floorPlanService corrigé vers ../floor-plan/), HouseholdTasksPage.jsx/.css

    components/
      ui/
        Icons.jsx / AmbientGlow.jsx       # les SEULS fichiers de ce dossier réellement actifs (vérifié par chaîne d'import complète depuis AppRouter.jsx/main.jsx)

    lib/supabaseClient.js
```

⚠️ **Suppression massive de code mort le 03/08/2026 (demande explicite de Paul, confirmée avant exécution)** — tracé par chaîne d'import réelle depuis les deux seules vraies racines de l'app (`AppRouter.jsx`, `main.jsx`), pas supposé. Tout ce qui suit avait strictement **zéro importeur actif** :
- `features/household/` : `HouseholdRoot.jsx/.css`, `HousingDashboard.jsx/.css`, `CreateHousingScreen.jsx/.css`, `JoinHousingModal.jsx/.css`, `ScanPlanModal.jsx`, `HouseholdViewPage.jsx/.css` (documenté "supprimé" à deux reprises dans d'anciennes révisions de ce document sans jamais l'être réellement — confirmé et enfin supprimé pour de vrai cette fois), `Dashboard.jsx`, `utils/householdLayoutApi.js`, **et `Icons.jsx`** (copie orpheline de `components/ui/Icons.jsx`, elle aussi documentée supprimée par le passé sans jamais l'être — même histoire que `HouseholdViewPage.jsx`).
- `features/auth/` : `LoginForm.jsx`, `SignupForm.jsx`, `InviteForm.jsx`, `AcceptInvitationForm.jsx`, `ForgotPasswordForm.jsx`, `AuthForm.css`.
- `components/forms/`, `components/layout/` (`AppShell.jsx`), `components/floorplan/` (`RoomFloorPlan.jsx`, `FloorPlanSection.jsx`, `FloorThumbnail.jsx`), `components/tasks/` (`TaskOverview.jsx`) — **dossiers entiers**.
- `components/ui/` : `Toast.jsx`, `Spinner.jsx`, `Skeleton.jsx`, `StatusBadge.jsx`, `ProgressBar.jsx`, `ItemCard.jsx`, `ItemForm.jsx`, `ItemGrid.jsx` — contrairement à ce qu'affirmait une version antérieure de ce document ("génériques, toujours utilisés"), seuls `Icons.jsx`/`AmbientGlow.jsx` avaient réellement un importeur actif.
- `hooks/` (dossier entier : `useItems.js`, `useToast.js`), `utils/` racine (`formValidators.js`), `src/api.js`.
- `assets/` : `floor-plan.css`, `room-3d.css`, `task-overview.css`, `ui-feedback.css`, `visual-hierarchy.css` — chacune ne stylait que le code ci-dessus, désormais supprimé ; `main.jsx` ne charge plus que `theme.css`.
- `frontend/tests/` : `TaskCreation.integration.test.jsx`, `ItemForm.test.jsx`, `RoomFloorPlan.test.jsx` — ne testaient que ce même code mort (`useItems`, `ItemGrid`, `ItemForm`, `RoomFloorPlan`, `api.js`).


**Fichiers supprimés avant cette session** (plus aucun importeur nulle part, vérifié) :
- `features/household/useHouseholdRole.js` (remplacé par `useHouseholdDetail.js`)
- `features/auth/MockAuthScreen.jsx` + `.css` (jamais réellement utilisé)
- `App.jsx` (racine `src/`) — ancien point d'entrée, plus jamais monté par `main.jsx`

Le reste du sous-graphe mort (`HouseholdRoot.jsx`, `HousingDashboard.jsx`, `CreateHousingScreen.jsx`, `JoinHousingModal.jsx`, `ScanPlanModal.jsx`, `HouseholdViewPage.jsx`, `features/household/Icons.jsx`, les anciens formulaires d'auth, `api.js`, `householdLayoutApi.js`, et tout `components/forms|layout|floorplan|tasks`, la majorité de `components/ui/`, `hooks/`, `utils/`, 5 fichiers `assets/*.css`) était documenté "à supprimer après confirmation explicite de Paul" depuis plusieurs révisions — **confirmation obtenue et suppression effective le 03/08/2026**, voir le paragraphe ci-dessus.

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
| **7. Tâches / Dépenses / Vie du foyer (Supabase réel)** | 🟡 Tâches : schéma V1 + lecture/statut/ajout rapide branchés (`taskService.js`, 03/08/2026, voir `PROJECT.md` §3.11/§3.12, `DATAMODEL.md` §7) — écran de création riche (groupe/assignation/dépendance) pas encore construit. Dépenses/Vie du foyer : toujours 🔴 placeholders |
| **8. Profil / Réglages / Préférences / Calendrier (UI)** | 🟡 UI construite et interactive (grille calendrier, interrupteurs, recherche) — rien n'est persisté, aucun service Supabase derrière |

---

## Lancer le projet en local

**Terminal 1 — ancien backend (optionnel, et depuis le 03/08/2026 plus du tout nécessaire même en développement — `api.js`/`householdLayoutApi.js`, les deux seuls fichiers frontend qui l'appelaient encore, ont été supprimés, voir plus haut) :**
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
npm test     # frontend/tests/ est vide depuis le 03/08/2026 (les 3 tests existants ne couvraient que le code mort supprimé, voir plus haut) — aucun test frontend réel pour l'instant
```
