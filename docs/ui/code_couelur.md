Voici les directives du Design System & des Tokens de couleur retenues pour l'application "Chez nous". 

Attention : nous utilisons Tailwind uniquement pour le prototypage rapide, mais l'application est développée en CSS classique (vanilla / modules CSS). Merci de structurer le code avec des variables CSS (`:root`).

---

### 1. Philosophie Design
- Direction visuelle : Mobile-first Dark Mode épuré, dynamique et moderne.
- Ambiance : Fond sombre profond unifié relevé par des touches de lumière néon (Glow) en Vert Émeraude, Teal et Lime.
- Principe UX : Pas de superposition lourde ("boîte sur boîte"). Fond unifié avec flou de verre (`backdrop-filter`) et contrastes élevés.

---

### 2. Déclaration des Variables CSS (`:root`)

```css
:root {
  /* --- SURFACES & FONDS --- */
  --bg-app: #090d16;               /* Dark Slate très profond (fond principal) */
  --bg-card: rgba(15, 23, 42, 0.9); /* Surface carte / conteneur mobile */
  --bg-input: rgba(2, 6, 23, 0.6);  /* Champs de saisie */
  --border-color: #1e293b;         /* Bordures subtiles */

  /* --- COULEURS DE MARQUE & ACCENTS --- */
  --color-emerald: #10b981;        /* Couleur principale (icônes, focus, actif) */
  --color-teal: #14b8a6;           /* Transition de dégradé */
  --color-lime: #84cc16;           /* Accent dynamique & points forts */
  --color-amber: #f59e0b;          /* Accent secondaire & alertes douces */

  /* --- TYPOGRAPHIE & CONTRASTES --- */
  --text-primary: #ffffff;         /* Titres & textes principaux */
  --text-muted: #94a3b8;           /* Labels & sous-titres */
  --text-on-accent: #090d16;       /* Texte très sombre sur les boutons néon */
}

---

### 3. Prompt

/* Je te fournis le prototype HTML/Tailwind validé : [NOM_DU_FICHIER.html].
Je veux que tu génères/mettes à jour les fichiers React correspondants (`[NomPage].jsx` et `[NomPage].css`) de mon application de manière fonctionnelle et fidèle.

⚠️ RÈGLE CRUCIALE : DESIGN FIDÈLE VS DONNÉES DYNAMIQUES
- **Visuel & Layout (100% Fidèle)** : Transcris exactement le design system (halos lumineux, glassmorphism, dégradés, bordures `.card-glow`, typographies épaisses 700-900, ombres, animations et positionnement). Ne simplifie aucun composant visuel.
- **Données & Contenu (Dynamique & Fonctionnel)** : Les textes, titres de tâches, nombres de points, pièces et membres affichés dans le prototype sont de simples DONNÉES FACTICES (mock data). Ne les code pas en dur ! Le composant React doit mapper sur de vraies props/états (State) et gérer les interactions (ex: clics, modales, filtres, checkbox, routing).

CONSIGNES DE CODE :
1. **Style CSS dédié** : Écris le CSS correspondant dans `[NomPage].css` en t'appuyant sur les variables globales de `theme.css`.
2. **Arrière-plans & Atmosphere** : Conserve les `div` d'arrière-plan avec halos floutés (`blur`) et dégradés.
3. **Icônes** : Utilise exclusivement les icônes SVG importées depuis `src/components/ui/Icons.jsx`.
4. **Composants** : Découpe le JSX proprement tout en gardant une intégration dynamique des données.

Voici le prototype de référence :
[Coller le code HTML du prototype ici] */