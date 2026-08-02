// src/features/layout-editor/components/WallEdges.jsx
// Rendu SVG des arêtes (murs extérieurs, cloisons intérieures,
// ouvertures) calculées par `computeRoomEdges`/`generateFloorTiles`
// (layout-editor/utils/layoutGeneration.js) — un seul point de rendu,
// utilisé par Plan2DView.jsx (vue lecture seule) pour ne jamais dessiner
// les murs deux fois avec une logique différente. Réutilisable tel quel
// par FloorView3D.jsx quand son rendu sera adapté au modèle mur-arête
// (chantier suivant, voir la conversation).
//
// OUVERTURE = MUR RETIRÉ, PAS PORTE POSÉE (01/08/2026, demande explicite
// de Paul, corrige une version précédente de ce composant qui dessinait
// un trait pointillé ambré pour une "porte") : une arête "opening" ne
// dessine AUCUN trait — absence pure, comme si ce pan de mur avait été
// retiré, pas un objet de porte stylé différemment. Le mur plein reste
// le rendu par défaut entre deux pièces : rien n'oblige une frontière à
// avoir une ouverture.
//
// `edges[i]` : `{ orientation: 'h'|'v', x, y, kind: 'wall-ext'|'wall-int'|'opening' }`.
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
        if (edge.kind === "opening") return null; // mur retiré : rien à dessiner, ouverture pure
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
            stroke="#2b2b2b"
            strokeWidth={wallThickness}
            strokeLinecap="square"
          />
        );
      })}
    </svg>
  );
}
