# ✅ Chez Nous (Homee) — TO DO (Correctifs & Petites UI)

> **Usage :** ce fichier complète `PROJET.md` (anciennement `CHEZ_NOUS_SUIVI_PROJET.md`, renommé). Celui-là garde la vue d'ensemble architecture/roadmap ; **celui-ci est le carnet du quotidien** — bugs à corriger, petits ajustements d'UI, détails de finition. Une ligne = une chose faisable en une session ou moins.
>
> Ajoute une ligne dès qu'une idée ou un bug te vient, même sans date de traitement prévue. On la déplace vers "Traités" une fois faite.

---

## 🐛 Correctifs à faire (bugs connus)

| # | Description | Où | Priorité | Ajouté le |
| :-: | :--- | :--- | :---: | :--- |
| 1 | Le champ `name` (compte) reste un seul champ concaténé alors que les formulaires saisissent prénom/nom séparément — à séparer proprement dans le modèle si on veut les ré-exploiter distinctement ailleurs | `userService.js`, formulaires signup | 🟡 Moyenne | 31/07/2026 |
| 2 | `useHouseholds()` est appelé indépendamment à 3 endroits (`RequireHousehold`, `HouseholdDashboardPage`, `AppLayout`) — 3 fetches Supabase séparés au lieu d'un cache/contexte partagé. Pas de bug visible pour l'instant, mais à surveiller si des flashs de chargement apparaissent | `useHouseholds.js` et ses 3 appelants | 🟢 Basse | 31/07/2026 |
| 3 | Reconnexion du plan 2D/3D à Supabase (`floorPlanService.js`) : seul le cas nominal a été testé en réel (créer/sauvegarder/recharger). **Pas encore vérifié explicitement** : (a) qu'un LOCATAIRE est bien bloqué en écriture par la RLS s'il tente de sauvegarder, (b) que le message de conflit de version s'affiche bien en cas d'édition concurrente (deux onglets sur le même foyer) | `floorPlanService.js` | 🟡 Moyenne | 01/08/2026 |
| 4 | **Régression connue et acceptée temporairement** (refonte mur-arête, priorité 2D confirmée par Paul) : `FloorView3D.jsx`/`pathfinding.js` restent sur l'ancien modèle où la marche de l'avatar ne connaît que le TYPE de dalle (floor/door = praticable). Depuis que `tiles` ne contient plus de dalles "wall"/"door" (murs = arêtes désormais), l'avatar peut traverser un mur sans porte en 3D. **À corriger avant de rouvrir ce chantier** : `findPath` doit devenir arête-aware (bloqué par une arête wall-ext/wall-int entre deux cases voisines, sauf si c'est une arête "door") | `FloorView3D.jsx`, `utils/pathfinding.js` | 🔴 Haute (bloquant avant de rouvrir la 3D) | 01/08/2026 |
| 5 | Refonte mur-arête : composants React (`LayoutEditor.jsx`, `Plan2DView.jsx`, `WallEdges.jsx`) non testés dans un vrai navigateur/Vite — seule la logique pure (`layoutGeneration.js`) a été vérifiée par test Node réel (pas d'accès réseau dans l'environnement d'assistance pour lancer `npm run dev`). À valider visuellement chez toi avant de considérer ce chantier terminé | `LayoutEditor.jsx`, `Plan2DView.jsx`, `WallEdges.jsx` | 🟡 Moyenne | 01/08/2026 |
| 6 | Refonte mur-arête : si le foyer de test a déjà un plan enregistré avec des portes, elles sont au format `{id, floorId, x, y}` (sans `orientation`) — plus reconnues comme portes valides par le nouveau code (silencieusement ignorées, pas de crash, mais "disparaissent"). Réinitialiser le plan de test (`resetHouseholdLayout`, bouton "🗑️ Réinitialiser le plan") avant de valider | `floorPlanService.js` | 🟡 Moyenne | 01/08/2026 |

## 🎨 UI/UX — petites améliorations

| # | Description | Où | Priorité | Ajouté le |
| :-: | :--- | :--- | :---: | :--- |
| 1 | Lien "Règles du Foyer" (pied de page connexion/inscription) pointe vers `#` — la page de règles/CGU n'existe pas encore, à créer puis relier | `HouseholdRoot.jsx` (footer auth) | 🟢 Basse | 31/07/2026 |
| 2 | Lien "Consulter le guide" (tableau de bord des logements) est un placeholder — aucune page de guide n'existe encore | `HousingDashboard.jsx` | 🟢 Basse | 31/07/2026 |
| 3 | Sous-titre d'inscription "Créer votre foyer" utilise un infinitif plutôt que l'impératif attendu grammaticalement — gardé tel quel volontairement jusqu'ici, à valider si on corrige ou si c'est un choix de ton assumé | `HouseholdRoot.jsx` | 🟢 Basse | 31/07/2026 |
| 4 | Bouton "Rejoindre" (modale `JoinHousingModal`) reste désactivé — pas d'UI à revoir tant que le système d'invitation par code n'est pas branché (voir roadmap), mais penser au texte d'aide une fois actif | `JoinHousingModal.jsx` | 🟢 Basse | 31/07/2026 |
| 5 | La cloche de notifications a été retirée du header (remplacée par le menu profil) — pas de nouvel emplacement prévu pour l'instant ; à réintroduire quelque part si de vraies notifications arrivent un jour (voir `PROJET.md`, canal de notification encore une question ouverte) | `AppLayout.jsx` | 🟢 Basse | 01/08/2026 |
| 6 | Vérifier visuellement la barre de navigation basse (6 onglets depuis l'ajout de "Dépenses") sur un très petit écran (iPhone SE ou équivalent) — tailles réduites au moment de l'ajout mais jamais vérifiées sur un écran réellement étroit | `AppLayout.css` | 🟢 Basse | 01/08/2026 |
| 7 | Cible tactile des candidats de porte (outil de porte, `LayoutEditor.jsx`) : segment de 16px d'épaisseur, sous la recommandation habituelle de 44×44px pour une zone cliquable au doigt — fonctionnel mais perfectible (zone de tolérance invisible plus large, par ex.) | `LayoutEditor.jsx`, `LayoutEditor.css` | 🟢 Basse | 01/08/2026 |
| 8 | Rendu des portes (`WallEdges.jsx`) : simple trait pointillé de couleur distincte pour l'instant — un symbole d'arc d'ouverture (convention architecturale classique) serait plus lisible/professionnel, repoussé pour rester dans le temps imparti au refactoring | `WallEdges.jsx` | 🟢 Basse | 01/08/2026 |

**⚠️ Note sur les entrées #1, #2, #3, #4 ci-dessus (UI/UX) :** elles concernent toutes des fichiers **dormants**, plus montés dans `AppRouter.jsx` depuis la bascule vers `AppLayout`/Supabase (`HouseholdRoot.jsx`, `HousingDashboard.jsx`, `JoinHousingModal.jsx` — confirmé en grep, aucune des trois ne s'affiche plus jamais à un utilisateur réel). Pas retirées de la liste pour autant : elles redeviendront pertinentes si ce code dormant sert de référence pendant la migration (voir `README.md`), sinon elles s'évaporeront avec lui à sa suppression.

## ✅ Traités

| # | Description | Résolu le |
| :-: | :--- | :--- |
| 1 | Après ajout de badges streak/gemme cliquables (`StreakModal`, `/rewards`), deux fichiers modifiés (`AppRouter.jsx`, `AppLayout.css`) avaient été sauvegardés au mauvais endroit (`features/household/AppRouter.jsx` et `src/AppLayout.css` au lieu de `src/AppRouter.jsx` et `src/features/household/AppLayout.css`) — la route `/rewards` n'était jamais réellement montée, les styles de survol jamais chargés. Fusionnés dans les bons fichiers | 31/07/2026 |
| 2 | Une reconnexion ramenait sur la dernière page ouverte avant déconnexion au lieu de l'Accueil (`LoginPage.jsx` utilisait `location.state.from`) — corrigé : connexion → toujours `/households`, redirection auto vers l'unique foyer si un compte n'en a qu'un | 31/07/2026 |
| 3 | Fichiers orphelins sans plus aucun importeur : `HouseholdViewPage.jsx`/`.css` (remplacé par `AppLayout.jsx` + `HouseholdLifePage.jsx`), `App.jsx` (racine, plus monté), `features/household/Icons.jsx` (copie orpheline de `components/ui/Icons.jsx`) — supprimés | 31/07/2026 |
| 4 | Incohérence interne à `docs/DATA_MODEL.md` : `password_hash` listé comme colonne obligatoire de `users` dans l'ERD et le dictionnaire, alors que la section 6 du même document affirmait déjà son absence (Supabase Auth gère ça dans `auth.users`) — retiré des deux premiers endroits | 01/08/2026 |
| 5 | Renommage terminologique et de fichiers (demande de Paul) : "vue 2.5D"/"2.5D" → "vue 3D"/"3D" partout ; `ApartmentSpatialMvp.jsx`/`.css` → `HouseholdSpatialView.jsx`/`.css` ; `FloorView2D.jsx`/`.css` → `FloorView3D.jsx`/`.css` ; préfixe CSS `spatial-mvp__` → `spatial-view__`. Appliqué au code (frontend+backend) et à toute la documentation, vérifié à zéro résidu par grep | 01/08/2026 |

---

### Légende priorité
🔴 Haute (bloque un usage courant) · 🟡 Moyenne (gênant, pas bloquant) · 🟢 Basse (finition/cosmétique)
