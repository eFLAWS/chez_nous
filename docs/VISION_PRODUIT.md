# 🎯 Chez Nous (Homee) — Vision Produit

> **Document de référence vivant, distinct de `PROJET.md`.** Celui-ci répond à "qu'est-ce que l'app doit faire et pour qui" (le **quoi**) ; l'autre répond à "où en est le code" (le **où**). Se met à jour à chaque évolution de vision — pas à chaque session de code.
>
> **Dernière mise à jour :** 31 juillet 2026

---

## 1. Pitch

Une application de **gestion de foyer centralisée** qui organise tâches ménagères, dépenses, courses et agenda **autour de l'espace physique réel du logement** (plan 2D/2.5D interactif), pour des colocations, familles et couples.

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
- Un PROPRIETAIRE qui part **doit transférer avant de partir** s'il reste d'autres occupants ; s'il est seul, le foyer est **supprimé** (cascade plan/tâches/dépenses). *(Déjà spécifié et implémenté côté ancien backend — cf. `PROJET.md` §3.1 ; à reporter sur Supabase.)*
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

- **Récurrentes ou ponctuelles.**
- Une tâche peut être rattachée à **une ou plusieurs pièces** (ex. "passer l'aspirateur" dans tout l'appart).
  - **⚠️ Écart avec le schéma actuel** : `tasks.room_id` est aujourd'hui une colonne unique (*une* pièce par tâche). Passer à plusieurs pièces demande une vraie table de jonction (`task_rooms`), pas juste une modification de colonne — implication de modèle de données à trancher avant de coder, pas juste un détail d'implémentation.
- Une tâche peut être **assignée à un utilisateur** (et, extension déjà en base, à un occupant non-utilisateur — ex. gérer la litière du chat).
- Une tâche peut avoir une **deadline**.
- **Dette de ménage** *(nouveau concept)* : une tâche non réalisée avant sa deadline (ou sa prochaine occurrence si récurrente) compte dans une "dette" — à qui ? À l'utilisateur assigné, ou au foyer entier si personne n'est assigné ? **Aucun modèle actuel** (pas de colonne, pas de logique) — chantier à part entière, pas une extension mineure de la gamification.
- Quand une tâche est accomplie :
  1. **Notification** aux autres membres du foyer.
  2. **Points** accordés à l'utilisateur.
  3. Entrée dans son **historique**.

  **❓ Question ouverte — canal de notification :** in-app uniquement (petit badge/cloche, déjà retiré du header au profit du menu profil — cf. suivi projet §3.9, à réintroduire ailleurs ?), notification push (nécessite un service tiers type Firebase/OneSignal + gestion des tokens d'appareil), email, ou combinaison ? Impact d'infra très différent selon la réponse — à trancher tôt.

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

---

## 11. Journal des mises à jour

| Date | Changement |
| :--- | :--- |
| 31/07/2026 | Création initiale — retranscription structurée de la vision produit décrite par Paul, avec écarts techniques et questions ouvertes identifiés en la confrontant au code/schéma existants. |
| 31/07/2026 | Ajout de l'équilibrage automatique des dépenses (§5), du schéma en 3 piliers (§1) et d'une proposition de base pour les Invités (§7, statut d'occupant simplifié) — repris et adaptés d'une réponse de Gemini au même brief, avec réserves explicites conservées (notamment : la proposition Invités tranche implicitement une question ouverte sans le dire). |
