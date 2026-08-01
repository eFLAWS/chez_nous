🗺️ Spécification Spatiale, Routing & User Flows — Chez NousProjet : Chez NousFichier : docs/ROUTING_AND_USER_FLOWS.mdStatut : Validé (Juillet 2026)  Portée : Navigation, Guards, Deep Linking, Layout Mobile-First & Dashboard📐 1. Architecture Mobile-First & Layout Global (AppLayout)L'application repose sur un App Shell fixe pour les écrans principaux du foyer actif. Ce layout conserve les éléments globaux fixes pour éviter les sauts visuels lors de la navigation :  Header Fixe (Haut) :Switcher de foyer actif ("Super Coloc" $\rightarrow$ dropdown multi-foyer).  Éléments de gamification (Streak 🔥, Gems/Points 💎).  Cloche de notifications.  Centre Dynamique (<Outlet/>) : Zone de défilement scrollable qui charge la page active.  Footer Fixe / Bottom Navigation Bar (Bas) : Barre à 5 onglets fixes alignée sur le prototype :  🏠 Accueil (/households/:householdId)  🧩 Plan (/households/:householdId/spatial)  📋 Tâches (/households/:householdId/tasks)  📅 Calendrier (/households/:householdId/calendar)  👥 Vie du foyer (/households/:householdId/life)  🛣️ 2. Arborescence Complète des Routes (react-router-dom)Plaintext/
├── login                            [Plein écran - Publique] Connexion / Inscription Supabase
│
├── onboarding                       [Plein écran - AuthGuard] Utilisateur connecté SANS foyer
│   ├── select                       Choix : Créer / Scanner / Saisir un code (Accordéon)
│   └── join                         Saisie / Validation du code d'invitation
│
└── households/:householdId          [AuthGuard + HouseholdMemberGuard] Foyer Actif
    │                                └─ Enveloppé par AppLayout (Header + Bottom Nav)
    ├── (index)                      -> Dashboard d'accueil (Résumé propreté, tâches du jour, courses)[cite: 3, 4]
    ├── spatial                      -> Vue interactive du plan 2D/3D (Lecture / Interaction pièces)[cite: 3, 4]
    ├── tasks                        -> Gestionnaire de corvées & assignations (par pièce/occupant)[cite: 2, 3, 4]
    ├── calendar                     -> Planning du foyer & événements partagés
    ├── life                         -> Vie du foyer (Membres, occupants, invite_code, dépenses)[cite: 2, 3, 4]
    │
    └── editor                       [Plein écran - OwnerGuard]
                                     -> Éditeur de plan 2D/3D (Réservé au rôle PROPRIETAIRE)
🔄 3. Moteur de Redirection Automatique (Guards)À l'ouverture de l'application, les middlewares de route évaluent la session dans l'ordre suivant :Plaintext[Utilisateur tente d'accéder à une route]
                    │
   1. AuthGuard : Session Supabase valide ?
        ├── NON  ──────> Redirection vers /login
        └── OUI  ──────> Étape 2
                    │
   2. HouseholdGuard : Nombre de foyers rattachés (household_members)
        ├── 0 foyer ───> Redirection vers /onboarding/select[cite: 3]
        ├── 1 foyer ───> Redirection directe vers /households/:householdId
        └── N foyers ──> Redirection vers le dernier foyer actif consulté
                    │
   3. RoleGuard (Route /editor uniquement) : role == 'PROPRIETAIRE' ?[cite: 2]
        ├── NON  ──────> Accès refusé -> Redirection /households/:householdId[cite: 2]
        └── OUI  ──────> Autorise l'accès à l'Éditeur Spatial[cite: 2]
📱 4. User Flows & Cas SpécifiquesA. Flux d'Onboarding & Absence de FoyerCompte sans foyer ($N=0$) : Entièrement géré par la route /onboarding/select[cite: 3].Créer un logement : Redirige le créateur vers /households/:householdId/editor pour dessiner/valider son premier plan[cite: 3]. Il prend automatiquement le rôle PROPRIETAIRE.  Rejoindre un logement : Saisie du code invite_code $\rightarrow$ Validation BDD $\rightarrow$ Attribution du rôle LOCATAIRE $\rightarrow$ Redirection vers /households/:householdId.  B. Inviter un Membre (Deep Linking)Un membre génère ou partage le lien : [https://cheznous.app/join?code=K9B-2X1](https://cheznous.app/join?code=K9B-2X1)[cite: 2, 3].Si le destinataire n'est pas connecté, le paramètre code est sauvegardé en sessionStorage[cite: 3].L'utilisateur se connecte ou crée un compte sur /login[cite: 3].Après connexion, le système détecte le code en mémoire et redirige directement sur /onboarding/join avec le champ prémaqué[cite: 3].C. Gestion des Rôles (Propriétaire vs Locataire)PROPRIETAIRE : Accès complet à l'édition spatiale (/editor), à la gestion des membres, au transfert de propriété et à la suppression du foyer[cite: 2].LOCATAIRE : Plan en lecture seule sur /spatial[cite: 2]. Accès complet aux tâches, au calendrier, aux dépenses et aux pièces sur le Dashboard[cite: 2].🎨 5. Découpage Composants d'après le Prototype HTMLLe prototype fourni servira de référence pour découper la page Dashboard (/households/:householdId) :  HouseholdHeader.jsx : Intègre le switcher de foyer, la météo/indicateurs du foyer et les compteurs de gamification (Streaks/Gems).  HomeSpatialWidget.jsx : Carte d'état global du logement (chips des pièces, barre de propreté globale).  QuickStatsGrid.jsx : Accès rapide aux tâches du jour et à la liste de courses.  TodayTasksWidget.jsx : Liste interactive des corvées du jour avec cases à cocher synchronisées.  BottomNav.jsx : Navigation principale à 5 boutons avec gestion de l'état actif selon l'URL.  💡 Remarques & Conseils pour la suite du devIntégration de la Gamification (Streaks 🔥 / Gems 💎) :
Le prototype inclut des éléments très sympas pour motiver les colocataires (la série de jours et les gemmes). En BDD, nous pourrons facilement ajouter deux colonnes sur public.users ou household_members (streak_count et points_balance) pour alimenter cet en-tête.  Gestion de l'état "Propreté globale" :
Dans le prototype, la jauge affiche "78% de propreté"[cite: 4]. Cet indicateur pourra être calculé dynamiquement en effectuant le ratio entre les tâches terminées (DONE) et les tâches à faire (TODO) du foyer[cite: 2].Transition avec Claude :Maintenant que nous avons ce document, la prochaine étape avec Claude consistera à créer le composant <AppLayout/> avec react-router-dom et d'y injecter la structure HTML du prototype.