# 🏠 Chez Nous (Homee) — Suivi de Projet

> **Document de référence vivant.** Ce fichier sert de trame d'avancement : il fige l'état connu du projet à une date donnée, et se complète au fil des sessions avec les idées, correctifs et décisions à venir (section *Backlog* en bas de fichier). Voir aussi **`docs/VISION_PRODUIT.md`** (document compagnon : objectifs et fonctionnalités visées, questions ouvertes) — celui-ci répond à "où en est le code", l'autre à "que doit faire l'app".
>
> **Dernière mise à jour du contenu :** 1er août 2026
> **Source :** Documentation projet (`README.md`, `docs/DATA_MODEL.md`, `docs/user-flows/`, `docs/VISION_PRODUIT.md`, code source backend/frontend)

---

## 1. Qu'est-ce que Chez Nous (Homee) ?

**Chez Nous** (nom commercial : **Homee**) est une application SaaS de gestion de foyer, pensée pour être un produit commercialisable — pas un prototype jetable. Elle cible les **colocations**, **familles** et **couples** qui partagent un même logement.

### Objectif produit
Donner à un foyer un espace commun numérique organisé **autour de l'espace physique réel du logement** : au lieu d'une simple liste de tâches ou d'un tableur de dépenses déconnecté du contexte, chaque tâche, chaque note, chaque objet est rattaché à une pièce précise d'un plan 2D/3D interactif du logement.

### Modules fonctionnels visés

| Module | Description | Statut |
| :--- | :--- | :---: |
| **Plan interactif 2D/3D** | Éditeur de plan (murs, pièces, portes, mobilier), navigable en vue du dessus (2D) ou isométrique (3D) | 🟢 Construit, connecté à Supabase et testé en conditions réelles (§3.9, §5) |
| **Rôles & permissions** | PROPRIETAIRE (édition du plan, gestion des membres) / LOCATAIRE (lecture seule sur le plan, accès complet au reste) | 🟢 Fondations backend + affichage frontend faits |
| **Gestionnaire de tâches** | Tâches ménagères liées à une pièce et/ou un occupant (humain ou animal), récurrence | 🟡 Construit puis retiré temporairement du flux actif (voir §3.4) |
| **Dépenses partagées** | Suivi des dépenses du foyer, réparties entre occupants | 🔴 Spécifié (schéma + RLS), aucun code |
| **Notes spatiales** | Notes rattachées à un point précis du plan | 🔴 Spécifié (mention dans la matrice de droits), aucun code |
| **Mobilier** | Objets positionnés dans les pièces, porteurs de tâches | 🟡 Modèle de tuiles existant, éditeur dédié non actif |
| **Gamification** | Mécaniques ludiques pour motiver l'entretien du foyer | 🔴 Objectif produit, pas encore de traduction technique |
| **Invitation par code** | Rejoindre un foyer existant via un code à 6-8 caractères | 🔴 Placeholder UI uniquement, non fonctionnel |
| **Scan de plan (IA)** | Génération du plan à partir d'une photo | 🔴 Placeholder UI uniquement, non fonctionnel |

Légende : 🟢 Fonctionnel · 🟡 Partiel / en pause · 🔴 Non commencé ou placeholder

### Valeurs UX non négociables
- **Mobile-first** : conçu d'abord pour un écran de smartphone vertical, zones cliquables ≥ 44×44px, mises en page fluides (Flexbox/Grid).
- **Dark mode natif**, esthétique glassmorphique, thème "sombre néon".
- **Palette émeraude/teal** (`#34d399`, `#2dd4bf`) comme identité visuelle.
- **Vraies routes URL** (React Router) partout — jamais de state en mémoire pour simuler de la navigation (impératif pour le geste "retour" mobile et les liens d'invitation directs).

---

## 2. Vue d'ensemble de l'architecture actuelle

**⚠️ Correction (voir la conversation) : le schéma ci-dessous, dans une version antérieure de ce document, affirmait qu'"aucune requête de données ne passe encore par Supabase" — c'est faux, vérifié en lisant le code plutôt qu'en supposant.** La réalité est plus fine, à trois vitesses différentes selon la donnée :

```
┌───────────────────────────────────────────────────────────────┐
│  DÉJÀ SUR SUPABASE (vérifié : householdService.js interroge    │
│  réellement household_members/households, pas l'ancien backend)│
│                                                                 │
│  Auth (session réelle, AuthContext)                            │
│  Foyers / membres / rôles (créer, lister, détail, invite_code) │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│  CONSTRUIT, TESTÉ, MAIS ENCORE SUR L'ANCIEN BACKEND —          │
│  ET SURTOUT : PAS MONTÉ DANS LE ROUTING ACTUEL                 │
│                                                                 │
│  Plan 2D/3D (HouseholdSpatialView, LayoutEditor, FloorView3D) │
│  → householdLayoutApi.js → api.js → ancien backend Node.js     │
│  → CRUD par entité (une pièce à la fois), IDs incompatibles    │
│    avec les UUID Supabase                                       │
│  `/spatial` (route réelle) n'affiche qu'un placeholder ;       │
│  aucune route `/editor` n'existe encore                        │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│  AUCUNE COUCHE DE DONNÉES DU TOUT (ni ancien backend, ni       │
│  Supabase) — placeholders statiques uniquement                 │
│                                                                 │
│  Tâches, Dépenses, Calendrier, dette de ménage, gamification   │
└───────────────────────────────────────────────────────────────┘
```

Autrement dit : ce n'est pas "l'auth est migrée, le reste est sur l'ancien backend" comme affirmé précédemment — les foyers/rôles sont déjà pleinement sur Supabase. Le vrai goulot d'étranglement est le **plan 2D/3D**, qui existe et fonctionne mais reste connecté à l'ancien backend et n'est même pas accessible depuis l'app aujourd'hui (`api.js` n'est plus importé que par `householdLayoutApi.js` — plus aucun autre fichier du frontend n'y touche).

---

## 3. État détaillé par blocs

### 3.1 — Backend "cœur métier" (Node.js, zéro dépendance)

- Stockage : fichier JSON à plat (`store.json`), lecture/écriture atomique et sérialisée, avec sauvegarde (`store.json.bak`).
- Architecture en services découplés : `userService` (comptes, auth, invitations, occupants), `roomService` (étages/pièces/portes/collisions), `taskService`, `projectService`.
- Toutes les fonctions asynchrones suivent le contrat `{ success, data?, error? }` de bout en bout, jusque dans les composants React.
- **197/197 tests passants** (176 tests historiques + 21 dédiés au système de rôles).
- Script de smoke-test (`live-test.js`) qui démarre un vrai serveur et l'interroge en HTTP réel, en plus des tests unitaires.

**Modèle Occupants vs Comptes** : un occupant (humain ou animal) est une entité distincte d'un compte utilisateur. Un occupant humain peut exister sans compte, puis être "réclamé" (`claimedByUserId`) par un compte réel. Un animal n'a jamais de rôle. Ce découplage permet d'assigner une tâche à quelqu'un qui n'a pas encore de compte, et de superposer l'authentification sans casser le modèle de tâches.

**Rôles PROPRIETAIRE / LOCATAIRE — fondations backend :**
- Rôle assigné à la création : le fondateur d'un foyer (inscription ou création d'un foyer supplémentaire) reçoit automatiquement `PROPRIETAIRE`. Tout occupant humain ajouté ensuite reçoit `LOCATAIRE` par défaut.
- Autorisation vérifiée via `isHouseholdOwner()` avant toute écriture sur le plan (créer/déplacer/supprimer pièce, étage, porte). Les fonctions de lecture restent ouvertes aux deux rôles.
- Ordre de vérification volontaire : la validité de la ressource (le foyer/étage existe-t-il ?) est vérifiée **avant** l'autorisation de rôle, pour des messages d'erreur plus utiles.
- Départ / transfert de propriété : un PROPRIETAIRE seul dans le foyer peut partir librement (déclenche une suppression cascade complète : foyer, plan, tâches, dépenses). Un PROPRIETAIRE avec d'autres occupants ne peut pas partir sans transfert explicite au préalable. Le nombre d'occupants restants est **recalculé côté serveur** à chaque suppression, jamais fait confiance au frontend.

### 3.2 — Éditeur de plan 2D (`LayoutEditor.jsx`, `layout-editor/`)

Le cœur spatial de l'application.

- **Tracé de pièces** : un seul modèle d'interaction (Pointer Events, souris/tactile unifiés) — case de départ, prévisualisation en pointillés, validation au relâchement (refusée sous 2×2 dalles ou en cas de chevauchement). Taille minimale d'une pièce réduite depuis à **1×1 dalle**.
- **Déplacement de pièces** : poignée centrale ou appui long (500ms). ~~Aimantage magnétique pendant le glissé~~ **Correction (01/08/2026, en relisant `roomCollision.js`/`LayoutEditor.jsx` plutôt qu'en supposant) : PAS d'attraction pendant le glissé** — cadrillage pur, la pièce suit le pointeur exactement (l'aimantage avait été retiré à une demande explicite antérieure et n'a jamais été réintroduit, contrairement à ce qu'affirmait une version précédente de cette ligne). Seule la résolution anti-chevauchement (`resolveOverlap`) s'applique, **au relâchement uniquement**, avec correction d'un bug d'oscillation entre pièces voisines (le calcul traite tous les chevauchements simultanés, pas un à la fois).
- **Portes — refonte mur-arête (01/08/2026, voir la conversation)** : ~~génération automatique entre deux pièces séparées d'exactement 1 case~~ retirée. Une porte est maintenant une **arête** (bordure entre deux cases), pas une case de grille — elle ne peut exister qu'entre deux pièces qui se **touchent réellement** (gap=0), l'inverse de l'ancien modèle. Plus d'auto-détection : toutes les frontières entre pièces sont des murs pleins tant que l'utilisateur n'en perce pas une via l'outil (`findDoorCandidates`, énumère tous les segments d'arête disponibles le long d'une cloison).
- **Modèle de données** : les pièces (`rooms`, simples rectangles `{id, x, y, width, height}`) restent la source de vérité éditable. ~~les dalles de sol/mur/porte sont dérivées automatiquement~~ **Correction (01/08/2026)** : seules les dalles de **sol** sont dérivées (`generateFloorTiles` → `tiles`, un type unique désormais) ; les murs/portes sont dérivés séparément sous forme d'**arêtes** (`computeRoomEdges` → `edges`), jamais de dalles de grille — voir `docs/DATA_MODEL.md` §5 pour le détail de l'algorithme et la justification (l'ancien modèle mur-dalle faisait fusionner visuellement deux pièces collées, faute de case disponible pour un mur entre elles). Opération inverse (`extractRoomRectsFromTiles`) pour recharger un plan existant dans l'éditeur — inchangée, toujours basée sur les dalles de sol.
- **Limite assumée** : uniquement des pièces rectangulaires (pas de formes en L). Le mobilier existant est réappliqué à la sauvegarde seulement s'il retombe sur la même pièce qu'avant, sinon silencieusement abandonné.

### 3.3 — Vue spatiale 2D/3D (navigation, hors édition)

- Commutateur à 2 positions dans l'en-tête : **"✏️ Plan 2D"** (éditeur) / **"🏠 Vue 3D"** (`FloorView3D`, vue de déplacement/navigation).
- Les deux vues lisent le **même layout sauvegardé**, chacune le rendant différemment — pas de duplication d'état ni de double logique de sauvegarde.
- **Plan2DView adapté au modèle mur-arête (01/08/2026)** : reçoit maintenant `tiles` (sol uniquement) **et** `edges` (murs/portes), rendus en surimpression via un nouveau composant partagé `WallEdges.jsx` (SVG). **`FloorView3D` PAS encore adapté** — toujours sur l'ancien modèle tile-based, priorité donnée au 2D d'abord (demande explicite). Conséquence connue et acceptée temporairement : une fois `FloorView3D`/`pathfinding.js` alimentés par des `tiles` qui ne contiennent plus de dalles "wall"/"door", l'avatar pourra traverser un mur sans porte (le pathfinding actuel ne connaît que le type de dalle, pas les arêtes) — à corriger avant de rouvrir ce chantier, voir `docs/TO_DO.md`.
- L'ancienne "Vue Ensemble" en cartes (`ApartmentOverview2D.jsx`) a été supprimée : redondante avec le Plan 2D qui montre déjà toutes les pièces vues du dessus.

### 3.4 — Tâches & Mobilier (en pause volontaire)

- Une première version complète existait (tiroir de meuble, création de tâche multi-pièces, récurrence, heatmap de progression par pièce) mais a été **retirée intentionnellement** du flux actif pour stabiliser d'abord l'éditeur de plan (déplacement, aimantage, portes) sur une base spatiale solide.
- Rien n'est perdu : la logique reste documentée dans l'historique de conversation pour reprise ultérieure.
- Le modèle de tuiles connaît déjà un type `furniture`, mais aucun éditeur de mobilier n'est actif aujourd'hui.

### 3.5 — Rôles PROPRIETAIRE/LOCATAIRE (frontend)

- `useHouseholdRole(householdId)` : hook qui résout `{ role, isOwner, loading }` pour le compte connecté sur un foyer donné, à partir du modèle `occupants` + `claimedByUserId` + `role` déjà en place côté backend.
- Branché dans `HouseholdViewPage.jsx` → transmis à `HouseholdSpatialView.jsx` :
  - le bouton "Modifier le plan" est masqué pour un LOCATAIRE ;
  - si le plan est vide et que le compte n'est pas propriétaire, un message d'attente s'affiche plutôt que l'écran de création (qui échouerait de toute façon côté backend).
- **Le backend reste la seule vraie barrière de sécurité** — ce hook n'ajuste que l'affichage ; un contournement frontend serait de toute façon refusé côté serveur.

### 3.6 — Réorganisation Frontend (architecture Feature-Based)

- Passage d'une organisation "par type de composant" à une organisation **par fonctionnalité métier** : `src/features/auth/`, `src/features/household/`, `src/features/layout-editor/`.
- 48 fichiers déplacés, tous les imports audités et corrigés (`src/` et `tests/`).
- `components/` réduit aux éléments **vraiment génériques** : `Icons.jsx` (pictogrammes SVG teintables, remplacent progressivement les emojis), `Toast`/`Spinner`/`Skeleton`/`StatusBadge`/`ProgressBar`, `ItemCard`/`ItemForm`/`ItemGrid` (réutilisés pour tâches/projets/pièces).
- Certains fichiers de l'ancien backend "classique" (`components/forms/`, `components/floorplan/` (ancien éditeur, probablement obsolète face à `layout-editor/`), `components/layout/AppShell.jsx`, `components/tasks/TaskOverview.jsx`) sont **volontairement restés en place**, non déplacés/supprimés sans confirmation explicite.

### 3.7 — Migration Supabase (routing + auth) — en cours

- `AppRouter.jsx` : vraies routes (`/login`, `/signup`, `/onboarding`, route protégée générale) avec gardes empilées `RequireAuth` → `RequireHousehold`.
- `AuthContext.jsx` (`AuthProvider`/`useAuth()`) : session Supabase partagée dans toute l'app, écoute `onAuthStateChange`, expose `signUp`/`signIn`/`signOut` au contrat `{ success, data?, error? }`.
- `RequireAuth.jsx` / `RequireHousehold.jsx` : gardes de route, mémorisent la page d'origine pour y revenir après connexion.
- `src/lib/supabaseClient.js` créé et câblé sur les variables d'environnement (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) — **mais aucune requête de données ne l'utilise encore**.
- Schéma Postgres + RLS complet écrit (`backend/supabase/migrations/01_schema_and_rls.sql`) : tables `users`, `households`, `household_members`, `occupants`, `floor_plans` (JSONB `layout_data`, source unique de vérité), `tasks`, `expenses` ; fonctions `security definer` (`is_household_member`, `get_household_role`) pour éviter la récursion RLS ; policies alignées sur la matrice de droits (lecture ouverte à tous les membres, écriture du plan réservée au PROPRIETAIRE).
- **Correction (voir §4) : ce schéma A bien été exécuté et testé sur un projet Supabase réel** — `03_fix_households_select_bootstrap.sql` documente un vrai bug de policy RLS trouvé en conditions réelles (relecture `.insert().select()` soumise à la policy SELECT, échouant tant que `household_members` n'a pas encore sa ligne), avec diagnostic détaillé et correctif. L'affirmation inverse plus bas dans une version antérieure de ce document était erronée.
- État transitoire connu : le composant historique conserve pour l'instant son propre écran de connexion interne (ancien backend), indépendant de Supabase — les deux coexistent le temps de la bascule.

### 3.8 — Design & Habillage visuel

- Thème sombre néon cohérent sur les écrans Connexion/Inscription, tableau de bord des logements, création de foyer — fond plein écran avec halos, pas de conteneurs encadrés (sauf les dialogues de confirmation, volontairement différenciés).
- Traduction systématique des maquettes Tailwind/FontAwesome fournies par Paul (`docs/ui/new/*.html`) en CSS classique — **Tailwind et FontAwesome ne sont jamais adoptés comme dépendances réelles**.
- Onboarding en accordéon à 3 options + 1 option secondaire ("Créer" / "Scanner un plan" / "Rejoindre un logement" / "Continuer sans foyer") : seule **"Créer un logement"** est fonctionnelle aujourd'hui, les deux autres sont visibles mais désactivées ("Bientôt").

### 3.9 — Coquille applicative & Accueil (`AppLayout`, thread de conversation séparé)

Travail mené dans un autre fil de conversation que celui ayant produit les sections précédentes — ajouté ici pour que ce document reste la trame unique inter-fils (voir tête de fichier). Construit *au-dessus* de la migration Supabase de la §3.7 (routing/auth), sans dépendre des blocs métier (plan, tâches) encore sur l'ancien backend. Ordre chronologique réel de ce fil :

1. **Restructuration du routing en routes imbriquées** : `/households/:householdId` devient une route PARENT montant `<AppLayout/>`, avec les écrans du foyer actif en routes enfants (`<Outlet/>`) plutôt qu'une seule page plate. `HouseholdViewPage.jsx` retiré du routing — son contenu (nom, code d'invitation, membres) correspondait en fait à l'onglet "Vie du foyer" de la spec, pas à l'Accueil (qui doit être un résumé) : renommé `HouseholdLifePage.jsx`. `TabPlaceholder.jsx` introduit comme habillage partagé pour les onglets pas encore implémentés (même logique que `PlaceholderModal.jsx`).
2. **Menu profil (`UserMenu.jsx`)** : remplace une cloche de notifications — "Profil"/"Réglages" en badge "Bientôt", "Se déconnecter" fonctionnel (`useAuth().signOut()`). Absent jusque-là : aucun moyen facile de se déconnecter.
3. **Correctif de redirection post-connexion** : une reconnexion ramenait sur la dernière page ouverte avant déconnexion (`LoginPage.jsx` utilisait `location.state.from`, mémorisé par `RequireAuth.jsx` au moment de l'interception) au lieu de l'Accueil. Corrigé : connexion → toujours `/households` ; `HouseholdDashboardPage.jsx` redirige maintenant automatiquement vers l'unique foyer d'un compte qui n'en a qu'un (implémente le cas N=1 de la spec, jusque-là non fait). **Effet de bord découvert et corrigé dans la foulée** : cette redirection auto rendait `/households` (et son "+ Créer un logement") injoignable pour un compte à un seul foyer — ajout de "+ Ajouter un logement" dans `HouseholdSwitcher.jsx` pour garder ce chemin ouvert.
4. **Accueil traduit du prototype** (`HouseholdHomePage.jsx`, `docs/ui/home/ui_home_v0.5.x.html`) en CSS classique (palette étendue : `--color-sky`/`--color-rose`/`--color-violet` ajoutés à `theme.css`). **Données statiques** (pièces, tâches du jour, liste de courses) en attendant les services réels.
5. **`HouseholdSwitcher.jsx`** : remplace le `<select>` natif de l'étape 1 (rendu par l'OS, cassait l'esthétique glassmorphique) par un bouton + menu déroulant maison. Ajoute "Gérer mes logements" (`/households?manage=1`, contourne la redirection auto de l'étape 3) et une icône de foyer cliquable pour en changer la photo — **aperçu local uniquement (`URL.createObjectURL`), non persistant** (voir nuance §4 sur `households.avatar_url`, colonne inexistante à ce jour).
6. **6ᵉ onglet "Dépenses"** ajouté à `AppLayout.jsx` (la table `expenses` existe déjà en base, §3.7, mais aucun service frontend ne la consomme — `HouseholdExpensesPage.jsx` en placeholder). Cartes de l'Accueil rendues cliquables vers les onglets correspondants (Vue du foyer → Plan, Tâches ménagères/Tâches du jour → Tâches, Liste de courses → Dépenses).
7. **Badges streak/gemme (header)** deviennent de vrais boutons — flamme ouvre `StreakModal.jsx` (même habillage que `PlaceholderModal.jsx`), gemme mène à `/households/:id/rewards` (`HouseholdRewardsPage.jsx`, placeholder). Valeurs toujours à 0 (pas de colonnes `streak_count`/`points_balance` en base).
8. **Correction post-upload** : un routeur (`AppRouter.jsx`) et une feuille de style (`AppLayout.css`) modifiés pour l'étape 7 avaient été sauvegardés au mauvais endroit (`features/household/AppRouter.jsx` et `src/AppLayout.css`, au lieu de `src/AppRouter.jsx` et `src/features/household/AppLayout.css`) — la route `/rewards` n'était donc jamais réellement montée, et les styles de survol des badges jamais chargés. Fusionnés dans les bons fichiers ; doublons et un `HouseholdViewPage.jsx`/`.css` de l'étape 1, déjà remplacé mais non supprimé localement, supprimés.
- **⚠️ À répercuter dans `docs/user-flows/ROUTING_AND_USER_FLOWS.md`** : ce document spécifiait 5 onglets avec les dépenses logées dans "Vie du foyer" — le code réel en a 6, dépenses séparées. Document pas encore mis à jour en conséquence.

---

## 4. Divergences connues entre la documentation et le code

**⚠️ Correction (voir la conversation) : les trois points ci-dessous étaient périmés.** Ils décrivaient l'état de `01_schema_and_rls.sql` seul, sans tenir compte de `02_reconcile_with_data_model.sql`, qui existe précisément pour les corriger. Les deux migrations sont bien présentes dans `backend/supabase/migrations/` — à vérifier si les deux ont réellement été *exécutées* sur le projet Supabase (le code des deux fichiers existe, mais ça ne garantit pas qu'un `02` a été appliqué après un `01` déjà en place ; à confirmer avec Paul).

- ~~`docs/DATA_MODEL.md` mentionne un champ `invite_code`... aucune colonne `invite_code`~~ → **Résolu par `02`** : `households.invite_code` ajouté, généré automatiquement (format `K9B-2X1`) par trigger.
- ~~`users.name` unique, pas de `display_name`/`avatar_url`~~ → **Résolu par `02`** : `users.name` renommé en `display_name`, `avatar_url` ajouté. `password_hash` reste volontairement absent de `public.users` (délégué à `auth.users` de Supabase — dupliquer un hash de mot de passe dans une table publique serait un vrai problème de sécurité, ce n'est pas un oubli).
  - **Nuance importante pour la fonctionnalité de photo/icône personnalisable évoquée récemment** (switcher de foyer, header) : cet `avatar_url` est sur **`users`** (photo de profil **personnelle**), pas sur `households`. Il n'existe **aucune colonne `households.avatar_url`** dans les migrations actuelles — c'est ce qu'il faudrait ajouter (+ un bucket Supabase Storage + policy RLS) pour rendre persistante l'icône de foyer, qui n'est aujourd'hui qu'un aperçu local non sauvegardé (voir §3.9 et §5).
- ~~`tasks.assigned_to`/`expenses.category`... distingue `assignee_user_id`~~ → **Résolu par `02`** : renommé en `assigned_to` (nom exact du doc) ; `expenses.category` ajoutée (`varchar(50)`, défaut `'GENERAL'`). Extensions volontairement conservées au-delà du doc : `tasks.assignee_occupant_id` (assigner une tâche à un occupant non-utilisateur, ex. un animal), `tasks.description`, `tasks.recurrence_days`.
- Le système d'invitation par `invite_code` est au cœur du user flow d'onboarding documenté, mais n'a aucune implémentation fonctionnelle actuelle côté frontend (placeholder désactivé) — la colonne et la génération existent désormais côté base (`02`), reste à câbler le service frontend.

---

## 5. Feuille de route — Phases jusqu'à la commercialisation

Restructuré (voir §7, journal) suite à une session de clarification produit approfondie — voir **`docs/VISION_PRODUIT.md`**, le nouveau document compagnon qui fige *ce que l'app doit faire* (les chantiers ci-dessous répondent à *comment y arriver techniquement*, et renvoient vers les questions ouvertes de la Vision quand une décision produit doit être prise avant de coder).

L'ordre de phase est une proposition de priorité, pas une obligation. Beaucoup de chantiers de Phase 2 ont une **question ouverte associée** (voir `VISION_PRODUIT.md` §10) qui doit être tranchée avant de commencer à coder ce chantier précis — pas besoin de toutes les résoudre d'un coup, juste avant d'attaquer le chantier concerné.

### Phase 1 — Fondations techniques (prérequis silencieux, pas visibles pour l'utilisateur)

#### 🅰️ Branchement Supabase des données métier — *le socle*
Tant que ce chantier n'avance pas, tout le reste tourne sur deux systèmes en parallèle (§2).
- ~~Câbler les services foyers/occupants/rôles sur Supabase~~ → **déjà fait** (`householdService.js`, vérifié en lisant le code — §2 corrigé en conséquence).
- ~~Reconnecter le plan 2D/3D~~ → **fait et validé par un test réel** (Paul a créé un plan, sauvegardé, rechargé — fonctionne). `floorPlanService.js` lit/écrit le blob `floor_plans.layout_data` en un seul appel avec verrou optimiste sur `version` (colonne déjà en base, jusque-là inutilisée) — remplace `householdLayoutApi.js` (ancien backend, CRUD par entité). Mêmes signatures de fonctions exactement : `HouseholdSpatialView.jsx` n'a changé qu'une ligne (son import). Monté sur `/spatial` via `HouseholdSpatialPage.jsx` — le composant gère lui-même la bascule vers son mode édition via son propre bouton "Modifier le plan" (masqué pour LOCATAIRE), donc pas besoin d'une route `/editor` séparée pour que ça fonctionne ; une sous-route dédiée reste une amélioration mobile possible plus tard (chantier 🅲), pas un bloquant. `api.js`/`householdLayoutApi.js` n'ont plus aucun importeur actif, confirmé.
- Câbler tâches/dépenses/calendrier sur Supabase — aucune couche de données n'existe pour l'instant (ni ancien backend, ni Supabase : placeholders statiques uniquement, §2).
- **Suppression cascade / transfert de propriété obligatoire avant départ** (§3.1 — déjà implémenté côté ancien backend Node.js via `isHouseholdOwner()`) : à reporter côté Postgres sous forme de **triggers**, pas seulement de logique applicative React/service — sinon la règle n'est plus garantie une fois qu'on cesse de passer par l'ancien backend.
- Confirmer que `02_reconcile_with_data_model.sql` et `03_fix_households_select_bootstrap.sql` (§4) ont bien été *exécutées* sur le projet Supabase réel, pas seulement écrites dans le dépôt.
- **Bloque partiellement toute la Phase 2.**

#### 🅱️ Unification de l'authentification
- Retirer l'écran de connexion interne historique (ancien backend) une fois 🅰️ suffisamment avancé — les deux ne doivent plus coexister (§2, §3.1).
- **Dépend de** : 🅰️.

---

### Phase 2 — Boucle produit fonctionnelle (MVP utilisable de bout en bout)

#### 🅲 Modèle spatial → tâches, multi-pièces
- **Décision de modèle de données à prendre en premier** : `tasks.room_id` est aujourd'hui une colonne unique (une pièce par tâche) ; passer à "une tâche peut couvrir plusieurs pièces" (`VISION_PRODUIT.md` §4) demande une vraie table de jonction `task_rooms`, pas un simple changement de colonne.
- Réintégrer tâches et mobilier dans le flux actif, sur la base spatiale maintenant stabilisée (§3.4).
- **Dépend de** : 🅰️.

#### 🅳 Dette de ménage, notifications & gamification réelle
- **Dette de ménage** (`VISION_PRODUIT.md` §4) : aucun modèle actuel — décider si elle est portée par l'utilisateur assigné ou le foyer (question ouverte #2), puis concevoir le calcul (tâche en retard = +1 dette, à quel moment exactement pour une récurrente : à la deadline ratée ou à la prochaine occurrence ?).
- **Canal de notification** (question ouverte #3) à trancher avant de commencer : in-app / push (service tiers) / email / combinaison — impact d'infra très différent selon le choix.
- Traduire "gamification" en mécaniques concrètes : `streak_count`/`points_balance` (colonnes absentes des deux migrations actuelles), logique de calcul, historique des tâches accomplies. `StreakModal.jsx`/`HouseholdRewardsPage.jsx` existent déjà comme coquilles UI (§3.9) — ce chantier leur donne du contenu réel.
- **Dépend de** : 🅰️, 🅲 (le calcul de dette/streak a besoin du modèle de tâches final).

#### 🅴 Dépenses, courses & vue d'ensemble "Vie du foyer"
- **Décision de modèle à prendre en premier** : Courses (liste collaborative, cochable, "pas encore acheté") et Dépenses (montant payé, par qui) sont probablement **deux modèles distincts** (`shopping_items` vs `expenses`), pas un seul — voir question ouverte #4. À trancher avant de créer les tables, sinon risque de devoir tout refaire.
- Dépenses récurrentes (loyer, abonnements) vs ponctuelles — étendre `expenses` sur le même principe que `tasks.recurrence_days` (précédent déjà en base, à généraliser plutôt qu'inventer un nouveau pattern).
- Construire le tracker de dépenses partagées (table + RLS existent, §3.7 — `HouseholdExpensesPage.jsx` est un placeholder, §3.9).
- Vue d'ensemble "Vie du foyer" : qui a fait quelles dépenses / quelles tâches (`VISION_PRODUIT.md` §5).
- Notes spatiales (aucun code existant, seulement mentionnées dans la matrice de droits) — plus petit, peut se glisser ici ou être repoussé en Phase 3.
- **Dépend de** : 🅰️ ; 🅳 pour la partie "qui a fait ses tâches" de la vue d'ensemble.

#### 🅵 Onboarding complet & invitations
- Décider ce que voit un compte à 0 foyer qui choisit de "passer" la création (question ouverte #7) — le routing actuel force l'onboarding, il n'y a pas de vrai "skip" aujourd'hui.
- Split `/onboarding/select` (accordéon Créer/Scanner/Rejoindre) + `/onboarding/join` — actuellement une seule route plate (§3.8).
- Scan d'un dessin de plan (déjà identifié comme chantier "Scan de plan (IA)", toujours un placeholder) — gros morceau, nécessite un choix de service IA.
- Rejoindre par QR code ou email d'invitation (`VISION_PRODUIT.md` §8) : à confirmer que ce sont deux *canaux* pour transmettre le même `invite_code` déjà en base (question ouverte #8), pas trois systèmes séparés. Email = service d'envoi transactionnel à choisir ; QR = génération + scan caméra, deux briques distinctes.
- Mettre à jour `docs/user-flows/ROUTING_AND_USER_FLOWS.md` : toujours à 5 onglets (dépenses dans "Vie du foyer"), alors que le code en a 6 depuis §3.9.
- **Dépend de** : 🅰️ pour l'invite_code réel ; indépendant pour le reste.

---

### Phase 3 — Différenciation & robustesse (après un MVP qui tourne)

#### 🅶 Invités & séjours temporaires (statut exploratoire)
Le plus gros bloc de questions ouvertes du document Vision (`VISION_PRODUIT.md` §7) — **ne pas commencer à coder avant d'avoir clarifié au moins** : compte ou occupant simplifié, durée fixe ou libre, tâches auto-créées ou deadline coïncidente, portée exacte du cloisonnement, et surtout si on parle d'un vrai système de location courte durée (réservation, calendrier de dispo, paiement) ou d'un statut d'occupant allégé — les deux ampleurs de chantier sont très différentes.

#### 🅷 Agenda / Calendrier
- Partagé foyer, par occupant, ou les deux (question ouverte #5) — pas assez de matière pour trancher seul, à décider ensemble.
- Onglet déjà présent (placeholder).

#### 🅸 Icône de foyer personnalisable — persistance
Petit chantier isolé, peut se faire en parallèle de n'importe lequel des précédents.
- Colonne `households.avatar_url` (n'existe pas — à ne pas confondre avec `users.avatar_url`, déjà ajoutée par `02` mais pour la photo de profil **personnelle**, §4).
- Bucket Supabase Storage dédié + policy RLS (upload réservé au PROPRIETAIRE ?), service d'upload frontend pour remplacer l'aperçu local actuel (`HouseholdSwitcher.jsx`, §3.9).

#### 🅹 Dette technique
- Séparer prénom/nom (actuellement concaténés en un seul champ `name`/`display_name` partout).
- Multi-foyer réel avec "dernier foyer actif" persisté (confirmé comme intention produit, `VISION_PRODUIT.md` §2 — actuellement un seul foyer actif à la fois, retombe sur une simple liste, §3.9).
- Connexion Google (OAuth) — bloqué côté Paul : nécessite d'abord un projet Google Cloud Console.

---

### Phase 4 — Commercialisation

Pas que du code — des décisions produit/business à anticiper, même si elles ne se codent pas tout de suite.

- **Modèle de pricing** : gratuit avec limites (nb de foyers/occupants ?) + palier payant ? Abonnement par foyer ou par utilisateur ? À définir avant d'implémenter la facturation.
  - **Brouillon de départ** *(repris d'une réponse de Gemini au même brief — une base de discussion, pas une décision arrêtée)* : palier Gratuit = 1 foyer + fonctionnalités de base ; palier Premium = foyers illimités, mode Invité avancé (dépend du chantier 🅶, encore à définir), export comptable des dépenses, scan de plan par IA. Cohérent avec les chantiers déjà identifiés comme "gros morceaux" (scan IA, invités) — logique de les réserver au palier payant plutôt que de les développer sans modèle de monétisation en tête.
- **Facturation** : intégration Stripe (ou équivalent) une fois le modèle de pricing tranché.
- **Conformité RGPD** : des données de foyer (dépenses partagées, présence d'occupants, potentiellement de mineurs si usage familial) sont des données personnelles sensibles — CGU, politique de confidentialité, droit à l'export/suppression des données. À anticiper, pas à improviser en dernière minute vu le public visé (familles).
- **Distribution** : rester en PWA mobile-first, ou packager en app native (App Store / Play Store) ? Impact sur les notifications push (question ouverte #3) si natif.
- **Support & feedback** : canal de retour utilisateur (même minimal) avant tout lancement public.
- **Observabilité** : sauvegardes Supabase, monitoring d'erreurs (Sentry ou équivalent), avant d'avoir de vrais utilisateurs non-Paul.

---

## 6. Backlog — Idées, correctifs & décisions à venir

*(Section à compléter au fil des prochaines sessions — chaque entrée peut préciser : date, description, bloc concerné, statut.)*

| Date | Idée / Correctif | Bloc concerné | Statut |
| :--- | :--- | :--- | :--- |
| — | — | — | — |

---

## 7. Journal des mises à jour de ce document

| Date | Changement |
| :--- | :--- |
| 31/07/2026 | Création initiale du fichier — état des lieux complet à partir de la documentation et du code existants. |
| 31/07/2026 | Ajout §3.9 (travail AppLayout/Accueil d'un autre fil, absent de la version initiale). Correction §3.7 et §4 : la section "Divergences connues" avait été écrite en ne lisant que `01_schema_and_rls.sql`, sans voir que `02_reconcile_with_data_model.sql` (déjà dans le dépôt) résolvait déjà ces mêmes écarts ; de même, `03_fix_households_select_bootstrap.sql` prouve que le schéma RLS a bien été testé en réel, contrairement à ce qu'affirmait §3.7. Corrigé un routeur et une feuille de style sauvegardés au mauvais endroit (voir §3.9) et supprimé 2 fichiers orphelins. |
| 31/07/2026 | Complété §3.9 avec deux étapes manquantes de ce fil (restructuration initiale du routing en routes imbriquées, correctif de redirection post-connexion vers l'Accueil). Transformé §5 d'une liste plate en feuille de route par chantiers priorisés avec dépendances explicites (🅰️ à 🅵). |
| 31/07/2026 | Création de `docs/VISION_PRODUIT.md` (document compagnon, fige les objectifs/fonctionnalités de l'app suite à une session de clarification produit avec Paul) et restructuration complète de §5 en 4 phases (Fondations → Boucle produit fonctionnelle → Différenciation/robustesse → Commercialisation), avec renvois vers les questions ouvertes de la Vision produit qui doivent être tranchées avant certains chantiers. |
| 31/07/2026 | Ajout de deux idées reprises d'une réponse de Gemini au même brief (triggers Postgres pour la cascade/transfert de propriété dans 🅰️, brouillon de pricing Gratuit/Premium en Phase 4) — les autres apports de Gemini (équilibrage des dépenses, proposition Invités) ajoutés côté `VISION_PRODUIT.md`. |
| 31/07/2026 | **Correction d'architecture importante** (§2, 🅰️) : en lisant `householdService.js` plutôt qu'en supposant, foyers/membres/rôles sont **déjà** sur Supabase — l'affirmation inverse d'une version antérieure de ce document était fausse. Le vrai goulot d'étranglement identifié : le plan 2D/3D est construit et testé mais parle encore à l'ancien backend et n'est même pas monté dans le routing actuel (`/spatial` = placeholder, pas de route `/editor`). Consigne ajoutée en mémoire : mettre à jour ce document et `README.md` proactivement à chaque avancée, sans attendre la demande. |
| 31/07/2026 | Reconnexion du plan 2D/3D à Supabase (chantier 🅰️) : `floorPlanService.js` créé (blob JSONB + verrou optimiste sur `version`), `HouseholdSpatialView.jsx` reconnecté (un seul import changé), monté sur `/spatial` via `HouseholdSpatialPage.jsx`. Pas encore testé en conditions réelles (prochaine étape). |
| 01/08/2026 | **Test réel confirmé par Paul** : créer un plan, sauvegarder, recharger — fonctionne. Chantier 🅰️ mis à jour en conséquence. Correction d'une incohérence interne à `docs/DATA_MODEL.md` (repérée en revérifiant les 4 documents avant une nouvelle conversation) : `password_hash` apparaissait dans l'ERD et le dictionnaire de la table `users` alors que la section 6 du même document affirmait déjà son absence (Supabase Auth gère l'auth dans `auth.users`) — retiré des deux premiers endroits. |
| 01/08/2026 | **Correction de `README.md`** (repérée en inspectant le code de `LayoutEditor.jsx`/`HouseholdSpatialView.jsx`/`FloorView3D.jsx`/`Plan2DView.jsx` avant une reprise de travail sur l'éditeur) : `layout-editor/` (tout entier — `LayoutEditor.jsx`, `RoomInspector.jsx`, `RoomNameModal.jsx`, `layoutGeneration.js`, `roomCollision.js`, `layoutStorage.js`, `validateLayout.js`, `roomTypes.js`) était étiqueté "ANCIEN, dormant" alors qu'il est activement importé et rendu par `HouseholdSpatialView.jsx`, lui-même monté sur `/spatial` via `AppRouter.jsx` — confirmé par la chaîne d'imports réelle, pas supposé. Même erreur pour `FloorView3D.jsx`, `Plan2DView.jsx`, `OnboardingScreen.jsx` et `features/household/utils/pathfinding.js`, tous importés par `HouseholdSpatialView.jsx`. README corrigé : arborescence et note de statut mises à jour, liste des fichiers réellement dormants resserrée à `HouseholdRoot.jsx`/`HousingDashboard.jsx`/`CreateHousingScreen.jsx`/`JoinHousingModal.jsx`/`ScanPlanModal.jsx`/anciens formulaires d'auth/`App.jsx`/`api.js`/`householdLayoutApi.js`. ~~`docs/PROJET.md` §3.2 n'était pas affecté~~ **Correction du jour suivant : si, en partie** (voir entrée suivante — l'affirmation sur l'aimantage dans ce même §3.2 était, elle, obsolète). |
| 01/08/2026 | **Refonte mur-arête** (raffinement de l'éditeur déjà construit, §3.2 — demande explicite de Paul, priorité donnée à la vue 2D avant la 3D ; distinct du chantier 🅲 de la feuille de route, qui concerne les tâches multi-pièces) : remplace le modèle où les murs étaient des **dalles pleines** (1 case de grille consommée par mur, et bug de fusion visuelle quand deux pièces se touchaient directement, faute de case disponible pour un mur entre elles) par un modèle où les murs sont des **arêtes** (segments sur la bordure des cases), calculées à la volée par la nouvelle fonction `computeRoomEdges()` (`layout-editor/utils/layoutGeneration.js`) à partir de `rooms`+`doors`, jamais stockées. Algorithme vérifié par test Node réel (11 assertions, 4 géométries dont Salon/Couloir/Cuisine en L) — pas juste relu, y compris exécuté contre le vrai fichier du projet. `generateFloorTiles()` ne produit plus que des dalles de sol ; nouveau composant partagé `WallEdges.jsx` (SVG) pour le rendu des murs/portes, utilisé par `Plan2DView.jsx` (réécrit) et réutilisable plus tard par `FloorView3D.jsx`. `LayoutEditor.jsx` : outil de porte adapté aux arêtes (candidats = cloisons entre pièces qui se touchent réellement, plus d'auto-détection à 1 case d'écart — **inverse de l'ancien comportement**, à savoir avant de tracer un plan). Propagé à `HouseholdSpatialView.jsx` (`floorEdges`), `floorPlanService.js` (persistance de `orientation`) et `validateLayout.js` (schéma Zod des portes). **Correction au passage** : §3.2 affirmait un aimantage magnétique pendant le glissé — faux, vérifié en relisant `roomCollision.js`/`LayoutEditor.jsx` : l'aimantage a été retiré à une demande antérieure et jamais réintroduit (seule la résolution anti-chevauchement au relâchement existe). **Non fait volontairement** (priorité 2D confirmée par Paul) : `FloorView3D.jsx` et `pathfinding.js` restent sur l'ancien modèle tile-based — régression connue et acceptée temporairement (l'avatar pourra traverser un mur sans porte une fois `tiles` privé de ses dalles "wall"/"door"), à corriger avant de rouvrir ce chantier. `docs/DATA_MODEL.md` §5 étoffé (structure du blob + modèle mur-arête, jusque-là un stub). **Vérification non faite** : composants React non testés dans un vrai navigateur/Vite (pas d'accès réseau dans cet environnement) — à valider chez Paul avant de considérer le chantier terminé. Point pratique : tout plan de test déjà enregistré avec des portes doit être réinitialisé (portes au format `{x,y}` sans `orientation`, plus reconnues). |
| 01/08/2026 | **Renommage terminologique et de fichiers** (demande explicite de Paul) : (1) le vocabulaire "vue 2.5D"/"2.5D" devient **"vue 3D"/"3D"** partout — code, commentaires, documentation (changement de VOCABULAIRE uniquement, le rendu de `FloorView3D` reste une grille CSS vue de dessus avec avatar, pas un moteur isométrique/WebGL ; à confirmer avec Paul si un vrai rendu 3D est souhaité un jour, ce serait un chantier distinct). (2) `ApartmentSpatialMvp.jsx`/`.css` → **`HouseholdSpatialView.jsx`/`.css`** (plus un prototype "MVP" depuis longtemps ; "Apartment" retiré, l'app cible des logements en général, pas spécifiquement des appartements) ; `FloorView2D.jsx`/`.css` → **`FloorView3D.jsx`/`.css`**. Préfixe CSS `spatial-mvp__` → `spatial-view__`. Appliqué de façon exhaustive (grep de vérification à zéro résidu) : code source (frontend + backend dormant), toute la documentation (`README.md`, ce document y compris les entrées de journal déjà datées, `docs/DATA_MODEL.md`, `docs/VISION_PRODUIT.md`, `docs/TO_DO.md`, `docs/user-flows/*.md`) — même logique que le renommage antérieur de `CHEZ_NOUS_SUIVI_PROJET.md` : le nom courant partout plutôt qu'un mélange ancien/nouveau selon la date de l'entrée. Deux incohérences trouvées et corrigées au passage dans l'en-tête de `HouseholdSpatialView.jsx` (sans lien avec le renommage) : `householdId`/`isOwner`/`role` étaient documentés comme venant de `HouseholdRoot.jsx`/`HouseholdViewPage.jsx` (dormants depuis la bascule Supabase) alors qu'ils viennent de `HouseholdSpatialPage.jsx` (`useParams`/`useOutletContext`) ; et `FloorView3D.jsx` était toujours documenté "100% mock, pas d'appel API" alors qu'il reçoit des données réelles en usage normal. **Non touché, hors sujet** : `HouseholdViewPage.jsx`/`.css`, physiquement toujours présents dans le zip fourni alors que `README.md`/`TO_DO.md` les documentent comme supprimés — à vérifier côté dépôt réel de Paul (export antérieur à la suppression ?). |



