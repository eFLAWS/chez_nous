# Chez Nous (Homee) — Instructions pour Claude Code

## Documents à lire en premier, à chaque session

Avant de coder quoi que ce soit (nouvelle session ou reprise), lire dans cet ordre — ils font foi, jamais un résumé de mémoire :

- `README.md` — état du code, arborescence, comment lancer le projet
- `PROJECT.md` — avancement détaillé par phases/chantiers
- `DATAMODEL.md` — schéma Postgres/Supabase réel
- `PRODUCTVISION.md` — objectifs produit, questions ouvertes tranchées ou non
- `TODO.md` — carnet du quotidien : bugs connus, petites améliorations UI/UX

## Avant de coder : inspecter l'existant

Toujours lire/grep le code source avant de proposer du nouveau code. Plusieurs fois sur ce projet, une fonctionnalité déjà construite a été retrouvée simplement non branchée plutôt que manquante — ne jamais supposer qu'une fonctionnalité n'existe pas sans avoir vérifié. Idem pour un fichier documenté "supprimé" : vérifier qu'il n'est pas encore physiquement présent avant de le considérer réglé.

## Mise à jour proactive de la documentation

À chaque avancée notable (code, décision produit, correctif), mettre à jour les documents concernés sans attendre qu'on le demande :

- `PROJECT.md` — état du code, chantiers/roadmap, entrée de journal datée
- `README.md` — si l'architecture/l'arborescence change
- `TODO.md` — dès qu'un bug ou une petite amélioration est identifié
- `PRODUCTVISION.md` — si la vision produit évolue
- `DATAMODEL.md` — corriger toute incohérence avec le schéma Postgres réel

## Conventions du projet

- Mobile-first, dark mode natif, glassmorphisme, palette émeraude/teal (`--color-emerald: #10b981`, `--color-teal: #14b8a6`), tokens dans `frontend/src/assets/theme.css`.
- CSS classique uniquement — pas de Tailwind/FontAwesome en dépendance réelle. Icônes SVG maison dans `frontend/src/components/ui/Icons.jsx` (style plein/solide).
- Vraies routes URL (React Router) partout, jamais de state en mémoire pour simuler la navigation.
- Organisation par feature (`frontend/src/features/*`), pas par type de composant — un sous-domaine qui prend de l'ampleur (fichiers + complexité propre) mérite son propre dossier plutôt que de continuer à grossir un dossier voisin.

## Handoff de design (prototypes Tailwind)

Paul prototype avec Tailwind (CDN) de son côté et fournit parfois un fichier HTML/Tailwind comme référence visuelle. Dans ce cas : extraire une palette de tokens nommés en valeurs hex, traduire fidèlement en CSS pur cohérent avec `theme.css`, ne jamais adopter Tailwind/FontAwesome comme dépendance sans demande explicite séparée.

## Avant un chantier de grande ampleur

Pour une refonte importante ou un changement de modèle de données, proposer un plan et signaler les points de décision/conflit avec l'existant *avant* d'écrire le composant final — pas seulement pour les migrations SQL.

## Lancer le projet

```
cd backend && node server.js   # ancien backend, optionnel — voir README.md pour son statut réel
cd frontend && npm install && npm run dev
cd backend && node --test      # 197 tests backend
cd frontend && npm test        # voir README.md pour l'état réel de la couverture
```
