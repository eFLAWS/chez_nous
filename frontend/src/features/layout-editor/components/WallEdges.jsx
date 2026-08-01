// src/features/layout-editor/components/WallEdges.jsx
// Rendu SVG des arêtes (murs extérieurs, cloisons intérieures, portes)
// calculées par `computeRoomEdges`/`generateFloorTiles`
// (layout-editor/utils/layoutGeneration.js) — un seul point de rendu,
// utilisé par Plan2DView.jsx (vue lecture seule) pour ne jamais dessiner
// les murs deux fois avec une logique différente. Réutilisable tel quel
// par FloorView3D.jsx quand son rendu sera adapté au modèle mur-arête
// (chantier suivant, voir la conversation).
//
// Une porte INTERROMPT le mur sur son segment (pas de trait "wall")
// plutôt que de laisser un vide qui pourrait passer pour un oubli de
// rendu — trait plus fin, pointillé, couleur distincte (réutilise la
// teinte historique des dalles de porte, #f3c98a).
//
// `edges[i]` : `{ orientation: 'h'|'v', x, y, kind: 'wall-ext'|'wall-int'|'door' }`.
// Convention de coordonnées (voir layoutGeneration.js) : une arête 'h'
// à (x,y) est la bordure HAUTE de la case (x,y) ; une arête 'v' à (x,y)
// est la bordure GAUCHE de la case (x,y). Traduction en pixels directe
// via `cellPx`, aucune autre transformation nécessaire.
export default function WallEdges({ edges, cellPx, width, height, wallThickness = 4, className }) {
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
        const isDoor = edge.kind === "door";
        const x1 = edge.x * cellPx;
        const y1 = edge.y * cellPx;
        const x2 = edge.orientation === "h" ? x1 + cellPx : x1;
        const y2 = edge.orientation === "h" ? y1 : y1 + cellPx;
        return (
          <line
            key={edge.key}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isDoor ? "#f3c98a" : "#2b2b2b"}
            strokeWidth={isDoor ? Math.max(2, wallThickness - 2) : wallThickness}
            strokeDasharray={isDoor ? "6 4" : undefined}
            strokeLinecap="square"
          />
        );
      })}
    </svg>
  );
}
