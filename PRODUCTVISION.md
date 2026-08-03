# 🎯 Chez Nous (Homee) — Vision Produit

> **Document de référence vivant, distinct de `PROJECT.md`.** Celui-ci répond à "qu'est-ce que l'app doit faire et pour qui" (le **quoi**) ; l'autre répond à "où en est le code" (le **où**). Se met à jour à chaque évolution de vision — pas à chaque session de code.
>
> **Dernière mise à jour :** 31 juillet 2026

---

## 1. Pitch

Une application de **gestion de foyer centralisée** qui organise tâches ménagères, dépenses, courses et agenda **autour de l'espace physique réel du logement** (plan 2D/3D interactif), pour des colocations, familles et couples.

```
                    ┌───────────────────────────────┐
                    │   ESPACE PHYSIQUE (Plan 2D)    │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────┴────────┐        ┌─────────┴─────────┐        ┌────────┴─────────┐
│ Ménage & Dette  │        │ Dépenses partagées │        │ Vie du foyer &   │
│   (Tâches)      │        │  & équilibrage     │        │  Gamification    │
└─────────────────┘        └────────────────────┘        └──────────────────┘
```

---

## 2. Utilisateurs, foyers & rôles

- Un compte (**occupant**, au sens large — cf. question ouverte ci-dessous) peut appartenir à **plusieurs foyers, ou aucun**.
- Un foyer doit avoir **au moins un PROPRIETAIRE**.
- **Créer un foyer** = dessiner son plan 2D (outil maison, ou scan d'un dessin). La personne qui crée devient automatiquement PROPRIETAIRE.
- Le PROPRIETAIRE peut **transférer l'ownership** à tout moment.
- Un PROPRIETAIRE qui part **doit transférer avant de partir** s'il reste d'autres occupants ; s'il est seul, le foyer est **supprimé** (cascade plan/tâches/dépenses). *(Déjà spécifié et implémenté côté ancien backend — cf. `PROJECT.md` §3.1 ; à reporter sur Supabase.)*
- **LOCATAIRE** : accès complet tâches/dépenses/courses/agenda, lecture seule sur le plan.
- **Invité** *(nouveau concept, voir §7)* : présence à durée limitée, droits restreints, visibilité cloisonnée.

**❓ Question ouverte — terminologie "occupant" :** le modèle actuel distingue déjà `occupants` (humains *ou animaux*, un humain peut exister sans compte puis être "réclamé") de `users` (comptes réels). Quand tu dis *"un occupant peut avoir plusieurs foyers ou aucun"*, tu parles bien d'un **compte utilisateur** rattaché à plusieurs foyers (via `household_members`, aujourd'hui limité à un seul foyer actif — chantier 🅵/🅸 du suivi projet) ? Les animaux ne sont pas concernés par le multi-foyer, j'imagine — à confirmer que ça ne change rien à la distinction occupant/compte déjà en place.

---

## 3. Plan spatial & pièces

- Le plan divise le logement en **pièces**.
- Chaque pièce peut porter des **tâches**.
- **Cœur fonctionnel de l'éditeur déjà construit** (tracé, déplacement, portes, aimantage — cf. suivi projet §3.2-3.3), pas concerné par cette réflexion produit.

---

## 4. Tâches ménagères

*(Section substantiellement enrichie le 03/08/2026 — voir la conversation. Champs/mécaniques ci-dessous classés V1 (à construire maintenant) / V2 (plus tard, explicitement hors périmètre pour l'instant).)*

### Champs d'une tâche (V1)

- **Titre**, description libre (existe déjà : `tasks.title`, à généraliser).
- **Récurrence ou ponctuelle** — existe déjà (`tasks.recurrence_days`, "tous les N jours"). Volontairement simple pour la V1 (pas de "tous les lundis"/RRULE complet) — à réévaluer si ça se révèle insuffisant à l'usage.
- **Niveau d'importance** *(nouveau)* — enum simple (ex. Basse/Normale/Haute), purement informatif/visuel pour la V1 (tri, badge) — PAS encore de logique de calcul liée (voir dette de ménage, déjà une question ouverte séparée ci-dessous, qui pourra s'appuyer dessus plus tard).
- **Délai/deadline** — existe déjà (`tasks.due_date`), mais sa sémantique doit être précisée pour une tâche RÉCURRENTE : une date fixe unique n'a pas de sens pour une tâche qui se répète. Proposition : garder `due_date` (date absolue) pour les tâches ponctuelles, et un `deadline_offset_days` (délai relatif après le début de CHAQUE occurrence) pour les récurrentes — l'échéance réelle se recalcule à chaque occurrence plutôt que d'être figée.
- **Assignation à une ou plusieurs personnes du foyer** *(nouveau — actuellement une seule via `tasks.assigned_to`)* — passe par une vraie table de jonction (`task_assignees`), pas une colonne unique. Doit couvrir aussi le cas déjà existant en base (`tasks.assigned_to_occupant_id`) : assigner à un **occupant non-utilisateur** (ex. le chat pour "changer la litière") — `task_assignees` devra donc référencer soit un `user_id`, soit un `occupant_id`, comme le fait déjà `tasks` aujourd'hui avec ses deux colonnes séparées.
  - **✅ Décidé (03/08/2026)** : n'importe quel assigné qui coche la tâche la termine pour tout le monde — pas besoin que chaque personne confirme sa propre part.
- **Rattachée à une pièce** — existe déjà (`tasks.room_id`), reste une colonne unique par tâche (voir "Groupe de tâches" ci-dessous pour le cas multi-pièces, qui remplace l'idée de `task_rooms`).

### Groupe de tâches (V1) — remplace l'ancienne piste `task_rooms`

Une même "sorte" de tâche répétée dans plusieurs pièces (ex. "Laver les vitres" dans le Salon ET la Cuisine) n'est **pas une seule tâche qui couvre plusieurs pièces** — ce sont **des instances distinctes, une par pièce**, chacune avec son propre état d'avancement (on peut cocher celle du Salon sans cocher celle de la Cuisine), simplement rattachées à un **groupe commun** (`task_groups` : `id`, `household_id`, `name`, éventuellement une icône/couleur par défaut).

Ça résout l'ancienne question ouverte "une tâche peut être rattachée à plusieurs pièces" (§4, version précédente de ce document) sans avoir besoin d'une table `task_rooms` : plus réaliste (le ménage se fait pièce par pièce), et ça prépare naturellement les "tâches prédéfinies par type de pièce" (V2, voir plus bas) — un type de pièce pourra suggérer un ensemble de groupes pertinents.

### Dépendances entre tâches (V1 limitée, V2 pour le reste)

Deux niveaux distincts dans le raisonnement de Paul, à ne pas confondre :
1. **Dépendance d'instance** : "passer la serpillère **Cuisine** dépend d'avoir passé l'aspirateur **dans la Cuisine**" — une tâche précise dépend d'une autre tâche précise.
2. **Dépendance de groupe (règle générique)** : "passer la serpillère **en général** dépend d'avoir passé l'aspirateur **avant**" — une règle qui s'applique automatiquement à CHAQUE pièce (la serpillère de telle pièce dépend de l'aspirateur de cette MÊME pièce), pas une dépendance codée en dur par instance.

Le niveau 2 est un vrai petit moteur de règles (appliquer une dépendance de groupe à chaque nouvelle instance, par pièce) — trop tôt pour le construire avant d'avoir la boucle de base qui tourne. **Phasage :**
- **V1** : dépendance d'instance uniquement (`depends_on_task_id`, auto-référence nullable sur `tasks`), et **purement informative** — affichée comme suggestion/avertissement, jamais bloquante. Pas de dépendance de groupe.
- **V2** : dépendance de groupe (nouvelle table `task_group_dependencies`, groupe A dépend de groupe B), appliquée automatiquement à la création d'une instance ; **et/ou** passage à une dépendance réellement bloquante — si la V1 informative se révèle insuffisante à l'usage.

**✅ Décidé (03/08/2026) — dépendance non remplie :** un simple avertissement visuel, la tâche reste cochable quand même si l'utilisateur veut passer outre. Pas de blocage dur en V1 — évite d'avoir à gérer les cycles (A dépend de B qui dépend de A) et les dépendances jamais remplies qui bloqueraient indéfiniment.

**✅ Décidé (03/08/2026) — décalage de récurrence, mécanisme de COUPLAGE plutôt que de vérification :** la formulation initiale de cette question ("regarde-t-on la dernière fois que la dépendance a été faite ?") n'était pas la bonne façon de penser le problème. Paul précise : une tâche dépendante est **toujours au moins aussi récurrente que sa dépendance** ("serpillère" ne peut pas être plus fréquente qu'"aspirateur" dont elle dépend) — et le mécanisme n'est pas une vérification a posteriori, mais un **couplage direct des occurrences** : si aspirateur = hebdomadaire, serpillère = "toutes les 2 occurrences d'aspirateur", et concrètement, **quand une occurrence de serpillère arrive, une occurrence d'aspirateur est TOUJOURS générée le même jour** (pas besoin de vérifier un historique — les deux naissent ensemble, par construction).
  - **Implication de modèle** : une tâche avec dépendance n'a plus besoin de son propre `recurrence_days` indépendant — sa récurrence effective est **dérivée** de celle de sa dépendance : `recurrence_days (dépendante) = recurrence_days (dépendance) × N`, les deux calculées depuis la MÊME date d'ancrage/origine, pour que leurs occurrences tombent forcément le même jour (pas juste "environ tous les 14 jours" chacune de son côté, avec un risque de dérive).
  - Champ proposé : `depends_on_every_n` (entier, défaut 1 = "à chaque occurrence de la dépendance") sur `tasks`, à côté de `depends_on_task_id`.
  - **⚠️ Détail d'algorithme pas encore figé** : le calcul exact de la prochaine échéance (ancrage commun, gestion du cas où la dépendance elle-même change de fréquence après coup) sera à concevoir précisément au moment d'écrire la logique de planification — la décision produit est prise, l'implémentation reste à faire avec soin.

### Tâches prédéfinies par type de pièce (V2, explicitement pour plus tard)

Une fois les groupes de tâches en place (V1) : un type de pièce (`roomTypes.js`, ex. "Cuisine") pourrait suggérer un ensemble de groupes pertinents (ex. "Vaisselle", "Plan de travail") à la création d'une pièce de ce type. Idée retenue, hors périmètre tant que la boucle de tâches de base n'est pas construite et testée.

### Ce qui existait déjà dans cette section (inchangé)

- Quand une tâche est accomplie : (1) notification aux autres membres, (2) points accordés, (3) entrée dans l'historique.
- **Dette de ménage** *(concept séparé, toujours sans modèle)* : une tâche non réalisée avant sa deadline (ou sa prochaine occurrence si récurrente) compte dans une "dette" — à qui ? Voir question ouverte #2 (§10). Le niveau d'importance (V1, ci-dessus) pourra peser sur ce calcul plus tard, mais ce n'est pas décidé.

**❓ Question ouverte — canal de notification :** in-app uniquement, push (service tiers), email, ou combinaison ? Impact d'infra très différent selon la réponse — à trancher tôt (inchangé depuis la version précédente de cette section).

---

## 5. Dépenses & courses

- **Dépenses récurrentes** (abonnement, loyer...) et **ponctuelles** (courses).
  - Le modèle `expenses` actuel n'a **aucune notion de récurrence** — mais `tasks.recurrence_days` existe déjà comme précédent réutilisable (même logique, à dupliquer/généraliser plutôt qu'inventer un nouveau pattern).
- **Équilibrage automatique** *(ajouté après relecture d'une réponse de Gemini au même brief — bon ajout, absent de la description initiale)* : calculer qui doit combien à qui pour équilibrer le budget du foyer, plutôt qu'un simple registre de dépenses sans consolidation (ex. "Alex doit 14€ à Sam"). Nécessite un algorithme de règlement (minimiser le nombre de transferts entre occupants), pas juste une somme par personne.
- **Vie du foyer — vue d'ensemble** : qui a fait quelles dépenses, qui a fait quelles tâches (un peu comme un tableau de bord/classement du foyer).

**❓ Question ouverte — courses vs dépenses, une seule fonctionnalité ou deux ?** Ton message initial les liste comme **deux items distincts** ("tâches, dépenses, courses, agenda"), mais dans l'Accueil qu'on a construit ensemble, la carte "Liste de courses" mène vers l'onglet **Dépenses** (cf. suivi projet §3.9) — une liste de courses collaborative (ce qu'il faut acheter, pas encore acheté) est un objet différent d'un suivi de dépenses (ce qui a été payé, par qui, combien). Je pense qu'on devrait les traiter comme deux modèles de données distincts (`shopping_items` vs `expenses`), même s'ils partagent un onglet pour l'instant — sinon on va vouloir faire rentrer une liste de courses cochable dans une table pensée pour des montants. À valider avant de créer les tables.

---

## 6. Agenda / Calendrier

- Agenda des occupants — mentionné dans ta description, mais peu détaillé au-delà de "traquer l'agenda". Onglet Calendrier déjà présent dans l'app (placeholder, cf. suivi projet §3.9).

**❓ Question ouverte :** un agenda **partagé du foyer** (événements communs, qui affecte tout le monde) ou un agenda **par occupant** consultable par les autres (dispos de chacun) ? Ou les deux ? Pas assez de matière dans ta description pour trancher.

---

## 7. Invités & séjours temporaires

Idée encore à un stade exploratoire ("peut-être", dans l'optique d'une implémentation type location) — je la documente telle quelle plutôt que de la spécifier en détail, pour ne pas figer des décisions prématurément.

- Un invité est présent dans un foyer pour une **durée limitée**.
- Des tâches lui sont attribuées **à son départ** (ménage de fin de séjour ?).
- Le PROPRIETAIRE doit pouvoir voir les tâches associées au séjour de l'invité, **mais pas** ses dépenses partagées ni son ménage dans les statistiques globales du foyer (cloisonnement de la vue d'ensemble du §5).

**❓ Questions ouvertes (nombreuses, à éclaircir avant tout travail technique) :**
- Un invité a-t-il un compte (même minimal), ou est-ce un `occupant` non-utilisateur comme un animal aujourd'hui ?
- La "durée limitée" est-elle fixée à l'arrivée (dates de séjour), ou libre/indéterminée ?
- "Tâches assignées à son départ" — ce sont des tâches *créées automatiquement* au départ (ménage de fin de séjour), ou des tâches assignées *pendant* le séjour dont la deadline coïncide avec le départ ?
- Le cloisonnement "visible mais pas comptabilisé" s'applique-t-il aussi aux autres LOCATAIRES du foyer, ou seulement à l'agrégat/vue d'ensemble ?
- Est-ce qu'on parle vraiment d'une fonctionnalité de **location courte durée** (façon Airbnb, avec ce que ça implique : réservation, paiement, calendrier de disponibilité) ou d'un **statut d'occupant simplifié** pour un ami qui reste 2 semaines ? Les deux ont un nom similaire mais des implications produit et techniques très différentes — à clarifier avant d'estimer l'ampleur de ce chantier.

**💡 Proposition de base (à valider, pas encore décidée)** — *reprise d'une réponse de Gemini au même brief, cohérente avec l'hypothèse "statut d'occupant simplifié" ci-dessus (elle ne mentionne ni réservation, ni paiement, ni calendrier de disponibilité — donc répond implicitement à la dernière question ouverte en choisissant l'option la plus légère, sans le dire explicitement) :*
- Rôle `INVITE` + `stay_start_at`/`stay_end_at` directement sur `household_members` (pas de nouvelle table).
- Générateur de QR code dédié "inviter quelqu'un" dans les réglages du foyer (distinct du `invite_code` texte des LOCATAIRE/PROPRIETAIRE ? à confirmer).
- Dashboard adapté en "mode invité" : header allégé (sans gamification), plan en lecture seule avec des informations pratiques épinglées (wifi, poubelles...), onglet Tâches filtré aux seules checklists d'arrivée/départ.
- Isolation : ces données masquées des statistiques de dépenses et de dette long terme du foyer permanent (répond à l'avant-dernière question ouverte : le cloisonnement s'appliquerait à l'agrégat/vue d'ensemble, pas nécessairement à la visibilité brute pour les LOCATAIRES).

Cette proposition est un bon point de départ **si** l'hypothèse "statut simplifié" est la bonne — mais elle ne doit pas faire oublier qu'il s'agit d'un choix parmi deux, pas d'une évidence.

---

## 8. Onboarding & invitations

- **Inscription** : sign up ou login.
- **Nouveau compte** → proposé de créer un foyer, mais peut **passer** (skip).
  - **⚠️ Écart avec le routing actuel** : aujourd'hui, tout compte avec 0 foyer est redirigé de force vers `/onboarding` par `RequireHousehold` — il n'existe pas de "passer et voir autre chose". Il faut définir ce qu'un compte sans foyer peut concrètement voir/faire s'il skip (écran d'attente ? état vide explicite ? juste re-proposer la création plus tard ?).
- **Créer un plan** : outil maison, ou **scanner un dessin** (déjà identifié comme chantier "Scan de plan (IA)" dans le suivi projet, toujours un placeholder).
- **Rejoindre un foyer** : par **email d'invitation**, ou en **scannant un QR code**.
  - Email d'invitation implique un vrai envoi d'email transactionnel (au-delà des emails d'auth déjà gérés par Supabase) — service à choisir (Resend, Supabase Edge Function + provider...).
  - QR code implique génération côté foyer (déjà propriétaire) + scan caméra côté nouvel arrivant (librairie de décodage QR côté frontend) — deux briques techniques distinctes à construire.
  - Le système `invite_code` textuel existe déjà en base (génération auto, cf. suivi projet §4) — le QR code et l'email seraient probablement des *façons de transmettre ce même code*, pas un système parallèle. À confirmer que c'est bien l'intention plutôt que 3 mécanismes séparés.

---

## 9. Ce qui ne change pas (déjà stable, pas remis en question ici)

- Palette émeraude/teal, glassmorphisme, mobile-first, dark mode natif.
- Modèle PROPRIETAIRE/LOCATAIRE et ses règles de transfert/suppression.
- Plan = source de vérité unique en JSONB, pièces rectangulaires.
- Occupants humains/animaux distincts des comptes utilisateurs.

---

## 10. Récapitulatif des questions ouvertes

*(Pour discussion — à trancher au fur et à mesure, pas besoin de tout résoudre avant de commencer à coder.)*

1. Terminologie "occupant" = compte multi-foyer, animaux non concernés — confirmer (§2).
2. Dette de ménage : portée sur l'utilisateur assigné ou le foyer entier si non-assigné ? (§4)
3. Canal de notification : in-app / push / email / combinaison ? (§4)
4. Courses et Dépenses : un seul modèle ou deux (`shopping_items` vs `expenses`) ? (§5)
5. Agenda : partagé foyer, par occupant, ou les deux ? (§6)
6. Invités : statut de compte, durée fixe ou libre, tâches auto-créées ou deadline coïncidente, portée du cloisonnement, "location courte durée" vs "statut simplifié" ? (§7 — le plus gros bloc de questions, à éclaircir avant d'estimer l'ampleur du chantier)
7. Skip onboarding : que voit un compte sans foyer ? (§8)
8. Invitation : QR code et email sont deux canaux pour le même `invite_code`, ou deux systèmes distincts ? (§8)

~~Anciennes questions ouvertes sur les Tâches~~ **Toutes tranchées le 03/08/2026** (voir §4 pour le détail de chaque décision) : tâches multi-pièces → concept de groupe (plus de `task_rooms`) ; sémantique de complétion à plusieurs assignés → n'importe qui coche, terminé pour tous ; comportement d'une dépendance non remplie → avertissement visuel, jamais bloquant en V1 ; décalage de récurrence entre une tâche et sa dépendance → couplage direct des occurrences (`depends_on_every_n`), pas une vérification d'historique.

---

## 11. Journal des mises à jour

| Date | Changement |
| :--- | :--- |
| 31/07/2026 | Création initiale — retranscription structurée de la vision produit décrite par Paul, avec écarts techniques et questions ouvertes identifiés en la confrontant au code/schéma existants. |
| 31/07/2026 | Ajout de l'équilibrage automatique des dépenses (§5), du schéma en 3 piliers (§1) et d'une proposition de base pour les Invités (§7, statut d'occupant simplifié) — repris et adaptés d'une réponse de Gemini au même brief, avec réserves explicites conservées (notamment : la proposition Invités tranche implicitement une question ouverte sans le dire). |
| 03/08/2026 | **§4 (Tâches ménagères) substantiellement enrichie** avant le début du chantier 🅲 (demande explicite de Paul : documenter clairement avant de coder). Nouveaux champs détaillés : niveau d'importance, délai adapté aux tâches récurrentes (`deadline_offset_days` proposé), assignation multi-personnes (`task_assignees`, doit couvrir le cas occupant non-utilisateur déjà en base). **Concept de "groupe de tâches" introduit** — résout l'ancienne question ouverte sur les tâches multi-pièces (`task_rooms`) d'une manière plus réaliste : plusieurs instances de tâches (une par pièce), rattachées à un groupe commun, plutôt qu'une tâche unique couvrant plusieurs pièces avec un seul état d'avancement. **Dépendances entre tâches** : distinction faite entre dépendance d'instance (V1, informative, pas bloquante) et dépendance de groupe/règle générique (V2) — recommandation de ne PAS construire de système bloquant dès la V1 (gestion de cycles, dépendances jamais remplies, décalages de récurrence — complexité disproportionnée avant d'avoir la boucle de base qui tourne). Phasage V1/V2 explicite pour toute la section. 2 nouvelles questions ouvertes ajoutées à §10 (sémantique multi-assignés, comportement des dépendances non remplies). |
| 03/08/2026 | **4 décisions actées par Paul, toutes les questions ouvertes sur les Tâches fermées** (§4, §10 mis à jour en conséquence) : (1) groupe de tâches adopté définitivement. (2) Dépendance non remplie → avertissement visuel seulement, jamais bloquant en V1. (3) **Décalage de récurrence, précision importante de Paul** : pas une vérification a posteriori ("la dépendance a-t-elle été faite récemment ?") mais un **couplage direct des occurrences** — une tâche dépendante (ex. serpillère) est toujours au moins aussi récurrente que sa dépendance (ex. aspirateur), et une occurrence de la dépendance est TOUJOURS générée le même jour qu'une occurrence de la tâche dépendante (pas de vérification d'historique nécessaire, elles naissent ensemble par construction). Implique que la récurrence d'une tâche dépendante devient DÉRIVÉE de celle de sa dépendance (`recurrence_days × depends_on_every_n`, même ancrage de date) plutôt qu'indépendante — nouveau champ `depends_on_every_n` proposé. Algorithme de planification exact pas encore figé, à concevoir avec soin à l'implémentation. (4) Multi-assignés : n'importe qui coche termine pour tout le monde. |

