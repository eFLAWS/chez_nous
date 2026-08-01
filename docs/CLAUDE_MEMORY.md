# Mémoire projet — Chez Nous (Homee)

## Vision

SaaS de gestion de foyer centralisée, organisée autour du **plan 2D/3D réel du logement** — pas une liste de tâches déconnectée du contexte spatial. Cibles : colocations, familles, couples, et potentiellement location courte durée (encore exploratoire, voir `docs/VISION_PRODUIT.md` §7). Détail complet et questions ouvertes : `docs/VISION_PRODUIT.md`.

## Valeurs UX non négociables

- Mobile-first, dark mode natif, glassmorphisme.
- Palette émeraude/teal (`--color-emerald: #10b981`, `--color-teal: #14b8a6`).
- CSS classique uniquement — pas de Tailwind/FontAwesome en production (icônes SVG maison dans `components/ui/Icons.jsx`).
- Vraies routes URL (React Router) partout, jamais de state en mémoire pour simuler la navigation.

## Architecture actuelle

- **Déjà sur Supabase ET testé en conditions réelles** : auth (session réelle), foyers/membres/rôles (créer, lister, détail, `invite_code`), plan 2D/3D (table `floor_plans`, blob JSONB `layout_data`, verrou optimiste sur `version`).
- **Coquille applicative construite** : `AppLayout.jsx` — header avec switcher de foyer + menu profil, 6 onglets (Accueil, Plan, Tâches, Dépenses, Calendrier, Vie du foyer).
- **Placeholders sans aucune couche de données** : Tâches, Dépenses, Calendrier — ni ancien backend ni Supabase derrière pour l'instant.
- **Ancien backend Node.js** : dormant, plus aucune route active ne l'appelle. Gardé comme référence pour la migration du reste (tâches/dépenses), à supprimer une fois celle-ci terminée.

## Rôles & règles métier

- **PROPRIETAIRE** : seul à pouvoir éditer le plan, gérer les membres, transférer la propriété, supprimer le foyer.
- **LOCATAIRE** : lecture seule sur le plan, accès complet au reste une fois construit (tâches, dépenses, courses, agenda).
- **Départ du PROPRIETAIRE** : doit transférer la propriété avant de partir s'il reste d'autres occupants ; sinon (N=1) suppression cascade du foyer (plan, tâches, dépenses).
- **Occupants humains/animaux** distincts des comptes utilisateurs (`occupants` vs `users`) — un occupant humain peut exister sans compte puis être "réclamé" ; un animal ne peut jamais l'être.

## Décisions techniques clés

- **Plan 2D/3D** : un seul blob JSONB par foyer (`floor_plans.layout_data`), pas de tables séparées par entité — source unique de vérité, écriture atomique, verrou optimiste via la colonne `version`.
- **Collision spatiale** : bloquer plutôt que pousser les éléments dans l'éditeur.
- **`ApartmentSpatialMvp.jsx`** gère lui-même la bascule vue/édition via son propre bouton "Modifier le plan" (masqué pour LOCATAIRE) — pas besoin d'une route `/editor` séparée pour que ça fonctionne.

## Questions produit encore ouvertes

Dette de ménage (portée : utilisateur ou foyer ?), canal de notification (in-app/push/email), distinction Courses vs Dépenses (probablement deux modèles de données distincts), portée exacte du multi-foyer, invités/location courte durée (le plus flou — statut simplifié ou vraie fonctionnalité de réservation ?), ce que voit un compte qui "passe" l'onboarding. Détail : `docs/VISION_PRODUIT.md` §10.

## Documents de référence (source de vérité, pas cette mémoire)

`README.md`, `docs/PROJET.md` (anciennement `CHEZ_NOUS_SUIVI_PROJET.md`), `docs/DATA_MODEL.md`, `docs/VISION_PRODUIT.md`, `docs/TO_DO.md`.

**En cas de contradiction entre cette mémoire et ces fichiers, les fichiers l'emportent** — ils peuvent avoir été mis à jour par un autre fil de conversation depuis la dernière synchronisation de cette mémoire.
