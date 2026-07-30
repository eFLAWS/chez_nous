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