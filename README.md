# Chez nous (Homee)

Application de gestion de foyer : plan 2D/2.5D interactif, tâches liées aux pièces et occupants, dépenses partagées, notes spatiales. Cible : produit commercialisable, mobile-first, dark mode natif, glassmorphism, palette émeraude/teal.

> Distinct de l'artefact React autonome "chez-nous.jsx" produit en tout début de projet (prototype figé, vocabulaire codé en dur) — ce dépôt est l'architecture générique réelle.

---

## État actuel : routing + onboarding Supabase terminés, plan 2D/2.5D pas encore migré

Le projet reste **en transition** entre deux architectures, mais la bascule a nettement avancé.

| | Ancien système | Nouveau système (Supabase) |
|---|---|---|
| **Backend** | Node.js natif + fichier JSON (`backend/`) | Supabase (Postgres + Auth + RLS) |
| **Auth** | Formulaires maison + session `localStorage` | Supabase Auth (`AuthContext`, `LoginPage`, `SignupPage`) |
| **Foyers (liste + détail)** | `HouseholdRoot.jsx` → `HousingDashboard.jsx` | `HouseholdDashboardPage.jsx` (`/households`) → `HouseholdViewPage.jsx` (`/households/:id`) |
| **Plan 2D/2.5D** | `ApartmentSpatialMvp.jsx` (seul système existant) | Pas encore construit — prochain chantier |
| **Monté par `AppRouter.jsx`** | ❌ Non — `HouseholdRoot` retiré du flux (étape 4) | ✅ Oui, c'est le flux principal |

**Le flux réel aujourd'hui :** inscription/connexion (Supabase Auth) → si aucun foyer, `/onboarding` (création réelle sur Supabase) → `/households` (liste) → `/households/:id` (détail : nom, code d'invitation, membres, rôle). **Le plan 2D/2.5D n'apparaît pas encore sur cette page** — espace réservé en attendant sa migration.

`HouseholdRoot.jsx` et tout son écosystème (`ApartmentSpatialMvp.jsx`, `layout-editor/`, anciens formulaires d'auth, `App.jsx`, `api.js`) restent dans le dépôt **volontairement**, dormants — c'est la référence qui sera portée vers Supabase lors du prochain chantier (voir "Fichiers dormants" plus bas).

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

**Palette de couleurs officielle** : [`docs/ui/code_couelur.md`](docs/ui/code_couelur.md). **Maquettes** : `docs/ui/` (`login/`, `signup/`, `new/`, `home/`). **Flow d'onboarding** : [`docs/user-flows/USER-FLOW_ONBOARDING.md`](docs/user-flows/USER-FLOW_ONBOARDING.md).

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
        HouseholdDashboardPage.jsx/.css   # NOUVEAU — route /households
        HouseholdViewPage.jsx/.css        # NOUVEAU — route /households/:id (pas encore de plan affiché)
        CreateHouseholdPage.jsx/.css      # NOUVEAU — route /onboarding
        HouseholdRoot.jsx/.css            # ANCIEN, dormant — plus routé
        HousingDashboard.jsx/.css / ApartmentSpatialMvp.jsx/.css / FloorView2D.jsx/.css / Plan2DView.jsx/.css / OnboardingScreen.jsx/.css / CreateHousingScreen.jsx/.css / JoinHousingModal.jsx/.css / ScanPlanModal.jsx / PlaceholderModal.jsx/.css / mockData.js   # ANCIEN, dormant
        utils/pathfinding.js / householdLayoutApi.js   # ANCIEN, dormant

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

**Fichiers "ANCIEN, dormant" ci-dessus** : gardés intentionnellement, pas d'importeur actif depuis `AppRouter.jsx`, mais nécessaires comme référence pour porter le plan 2D/2.5D vers Supabase (prochain chantier). À supprimer une fois cette migration terminée.

---

## État de la migration (routing + Supabase)

| Étape | État |
|---|---|
| **1. React Router réel** | 🟢 Fait |
| **2. Projet Supabase** | 🟢 Fait |
| **3. Schéma SQL** | 🟢 Fait (3 migrations) |
| **4. Auth + Onboarding + retrait de HouseholdRoot** | 🟢 Fait |
| **5. Migration du plan 2D/2.5D (`floor_plans`)** | 🔴 Prochain chantier |

---

## Lancer le projet en local

**Terminal 1 — ancien backend (encore nécessaire tant que le code dormant n'est pas migré) :**
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
