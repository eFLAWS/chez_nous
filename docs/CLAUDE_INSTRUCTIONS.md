# Instructions Claude — Projet Chez Nous (Homee)

## Documents à toujours consulter en premier

Avant de travailler sur ce projet (nouveau fil ou reprise), lire les fichiers suivants (fournis en project knowledge ou dans le zip du projet) — ils font foi, pas un résumé de mémoire qui peut avoir du retard ou venir d'un autre fil de conversation :

- `README.md` — état du code, arborescence, comment lancer le projet
- `docs/PROJET.md` — avancement détaillé par phases/chantiers (anciennement `CHEZ_NOUS_SUIVI_PROJET.md`, renommé)
- `docs/DATA_MODEL.md` — schéma Postgres/Supabase réel
- `docs/VISION_PRODUIT.md` — objectifs produit, questions ouvertes à trancher
- `docs/TO_DO.md` — carnet du quotidien : bugs connus, petites améliorations UI/UX

## Mise à jour proactive de la documentation

À chaque avancée notable (code, décision produit, correctif) faite pendant une session, mettre à jour les documents concernés **sans attendre qu'on le demande explicitement** :

- `docs/PROJET.md` — état du code, chantiers/roadmap
- `README.md` — si pertinent (architecture, arborescence, statut de migration)
- `docs/TO_DO.md` — dès qu'un bug ou une petite amélioration UI est identifié, par Claude ou signalé par l'utilisateur
- `docs/VISION_PRODUIT.md` — si la vision produit évolue
- `docs/DATA_MODEL.md` — corriger toute incohérence trouvée avec le schéma Postgres réel

## Livraison de fichiers modifiés

- Ne jamais se contenter de blocs de code à copier-coller pour des fichiers réels du projet : toujours les fournir en **téléchargement réel** (fichiers dans l'espace de travail, présentés pour téléchargement).
- Toujours accompagner d'une **arborescence explicite** indiquant CHAQUE fichier touché avec son opération, directement dans l'arborescence (pas seulement signalé à part dans le texte) :
  - `NOUVEAU` — fichier à créer
  - `MODIFIÉ` — fichier existant à remplacer
  - `DÉPLACÉ` — ancien chemin → nouveau chemin (les deux visibles)
  - `← À SUPPRIMER` — fichier devenu obsolète, à retirer

## Avant de coder : inspecter l'existant

Toujours inspecter le zip/dossier fourni avant de proposer du nouveau code. Plusieurs fois sur ce projet, une fonctionnalité déjà construite — et parfois déjà testée — a été retrouvée simplement non branchée ou non montée dans le routing, plutôt que manquante. Ne jamais supposer qu'une fonctionnalité n'existe pas sans avoir grep/lu le code source.

## Handoff de design (prototypes Tailwind)

Paul prototype avec Tailwind (CDN) de son côté et fournit parfois un fichier HTML/Tailwind comme référence visuelle. Dans ce cas :
- Extraire une palette de 5-6 tokens de couleur nommés, en **valeurs hex** (jamais les noms de classes Tailwind).
- Traduire le design en **CSS pur**, cohérent avec le reste du projet.
- Ne **jamais** adopter Tailwind ou FontAwesome comme dépendance réelle de l'application sans demande explicite séparée — le projet n'utilise que du CSS classique et des icônes SVG maison (`components/ui/Icons.jsx`).

## Multi-fil de conversation

Chaque nouvelle conversation peut être un fil de travail différent sur ce même projet, mené par une instance différente de Claude. Les fichiers `.md` de `docs/` (+ `README.md`) sont la source de vérité **partagée entre fils** — pas les résumés de mémoire, qui peuvent être incomplets ou en retard sur ce qu'un autre fil a fait.
