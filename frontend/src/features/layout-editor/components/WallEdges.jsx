// src/features/layout-editor/components/WallEdges.jsx
// Rendu SVG des arêtes (murs extérieurs, cloisons intérieures,
// portes/fenêtres/passages) calculées par `computeRoomEdges`/
// `generateFloorTiles` (layout-editor/utils/layoutGeneration.js) — un
// seul point de rendu, utilisé par Plan2DView.jsx (vue lecture seule)
// et PlanEditorView.jsx (édition) pour ne jamais dessiner les murs deux
// fois avec une logique différente. Réutilisable tel quel par
// FloorView3D.jsx quand son rendu sera adapté au modèle mur-arête
// (chantier suivant, voir la conversation).
//
// EXTENSION PORTE/FENÊTRE/PASSAGE (03/08/2026, demande explicite de
// Paul, prototype ui_plan_editor_v0.3.0.html — remplace le simple
// binaire mur/ouverture du 01/08/2026) :
//   - `door`    : mur retiré (comme l'ancien "opening") + un petit
//     marqueur ambré au milieu du segment (façon poignée de porte).
//   - `window`  : mur CONSERVÉ (dessiné comme un mur normal — une
//     fenêtre ne supprime pas le mur qui la porte, contrairement à une
//     porte) + un petit marqueur bleu ciel par-dessus.
//   - `passage` (ou absent, plans enregistrés avant ce champ) : mur
//     retiré, AUCUN marqueur — comportement identique à l'ancien
//     "opening" binaire (01/08/2026), entièrement préservé pour les
//     plans déjà enregistrés.
//
// `edges[i]` : `{ orientation: 'h'|'v', x, y, kind: 'wall-ext'|'wall-int'|'door'|'window'|'passage' }`.
// Convention de coordonnées (voir layoutGeneration.js) : une arête 'h'
// à (x,y) est la bordure HAUTE de la case (x,y) ; une arête 'v' à (x,y)
// est la bordure GAUCHE de la case (x,y). Traduction en pixels directe
// via `cellPx`, aucune autre transformation nécessaire.
//
// `offsetXPx`/`offsetYPx` (03/08/2026, ajouté pour le recadrage
// dynamique de Plan2DView.jsx sur la bounding box des pièces — voir la
// conversation) : décalage en PIXELS à soustraire de chaque coordonnée
// calculée, pour que l'origine du rendu corresponde à l'origine de la
// bounding box (pas forcément (0,0) de la grille complète de l'étage).
// Défaut 0 : comportement inchangé pour PlanEditorView.jsx, qui trace
// toujours depuis (0,0) et n'a pas besoin de ce recadrage.
//
// `strokeColor` (03/08/2026, prototype ui_2d_v0.3.1.html, demande
// explicite de Paul) : couleur du trait, personnalisable par
// l'appelant. Plan2DView.jsx passe désormais du blanc (`#ffffff`,
// "bordures blanches" du prototype) — défaut `#2b2b2b` (gris foncé)
// inchangé pour PlanEditorView.jsx, qui garde son propre style.
const DOOR_MARKER_COLOR = "#f59e0b"; // ambre — même teinte que --color-amber (theme.css)
const WINDOW_MARKER_COLOR = "#38bdf8"; // bleu ciel — proche de --color-sky (theme.css)

export default function WallEdges({ edges, cellPx, width, height, wallThickness = 4, strokeColor = "#2b2b2b", offsetXPx = 0, offsetYPx = 0, className }) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
      aria-hidden="true"
    >
      {edges.map((edge) => {
        const x1 = edge.x * cellPx - offsetXPx;
        const y1 = edge.y * cellPx - offsetYPx;
        const x2 = edge.orientation === "h" ? x1 + cellPx : x1;
        const y2 = edge.orientation === "h" ? y1 : y1 + cellPx;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // `passage` : mur retiré, aucun marqueur — comportement
        // identique à l'ancien "opening" binaire, préservé tel quel.
        if (edge.kind === "passage") return null;

        // `door` : mur retiré (comme passage) + marqueur ambré.
        if (edge.kind === "door") {
          return (
            <g key={edge.key}>
              {edge.orientation === "h" ? (
                <rect x={midX - cellPx * 0.28} y={midY - 2} width={cellPx * 0.56} height={4} rx={2} fill={DOOR_MARKER_COLOR} />
              ) : (
                <rect x={midX - 2} y={midY - cellPx * 0.28} width={4} height={cellPx * 0.56} rx={2} fill={DOOR_MARKER_COLOR} />
              )}
            </g>
          );
        }

        // `window` : mur CONSERVÉ (rendu comme un mur normal ci-dessous)
        // + marqueur bleu ciel superposé — ne fait PAS de `return`
        // anticipé, contrairement à `door`/`passage`.
        return (
          <g key={edge.key}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth={wallThickness} strokeLinecap="square" />
            {edge.kind === "window" &&
              (edge.orientation === "h" ? (
                <rect x={midX - cellPx * 0.32} y={midY - 3} width={cellPx * 0.64} height={6} rx={3} fill={WINDOW_MARKER_COLOR} />
              ) : (
                <rect x={midX - 3} y={midY - cellPx * 0.32} width={6} height={cellPx * 0.64} rx={3} fill={WINDOW_MARKER_COLOR} />
              ))}
          </g>
        );
      })}
    </svg>
  );
}
