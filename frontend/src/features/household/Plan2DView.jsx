// src/features/household/Plan2DView.jsx
// Vue "Plan 2D" : aperçu global, EN LECTURE SEULE, du plan déjà construit
// — pas d'avatar, pas de déplacement. Distincte de LayoutEditor.jsx (qui
// sert à CRÉER/MODIFIER le plan, pas à le consulter) et de
// FloorView3D.jsx (qui est la vue immersive AVEC avatar — pas encore
// adaptée au modèle mur-arête, voir la conversation).
//
// TAILLE DE CELLULE CALCULÉE, PAS FIXE (02/08/2026, demande explicite de
// Paul, capture d'écran à l'appui — comparée à LayoutEditor.jsx qui,
// avec sa cellule fixe plus petite (28px), montrait tout le plan sans
// recadrage) : une cellule fixe de 40px faisait dépasser le conteneur
// dès que le plan avait plusieurs pièces (une pièce coupée/illisible en
// bord d'écran, comme "Entrée / Couloir" sur la capture). `cellPx` est
// dérivé de la taille RÉELLE du conteneur (mesurée via ResizeObserver)
// divisée par les dimensions de la bounding box des pièces (voir plus
// bas) — tout l'appartement tient TOUJOURS à l'écran, quelle que soit
// sa taille.
//
// ZOOM RETIRÉ (03/08/2026, demande explicite de Paul) : un contrôle +/-
// avait été ajouté, puis affiné (dézoomer en dessous de l'ajustement
// automatique ne faisait que révéler du vide, corrigé en bornant
// `ZOOM_MIN` à 1) — Paul a finalement demandé de retirer complètement
// cette option. La vue affiche maintenant TOUJOURS l'ajustement
// automatique, sans état ni bouton de zoom. Plus simple, et l'ajustement
// automatique était de toute façon déjà le seul niveau vraiment utile
// (voir les corrections précédentes de ce fichier, journal
// `docs/PROJET.md`).
//
// UN RECTANGLE PAR PIÈCE, PAS PAR DALLE (02/08/2026, demande explicite
// de Paul, avec exemple visuel à l'appui) : avant, chaque case de la
// grille était son propre `<div>` bordé (`.plan2d-tile`), ce qui donnait
// un quadrillage visible sur TOUTE la surface de chaque pièce — l'effet
// inverse de ce que Paul voulait (le quadrillage doit être visible dans
// l'ÉDITEUR, pas ici, voir LayoutEditor.css). Une pièce est maintenant
// UN SEUL rectangle de couleur (directement dérivé de son rectangle
// `{x, y, width, height}`, plus besoin des dalles pour ça), avec son nom
// et son nombre de tâches actives affichés dessus, centrés. `tiles`
// n'est donc plus utilisé ici du tout (aucun meuble affiché non plus,
// cohérent avec le reste de l'app — voir FloorView3D.jsx).
//
// TÂCHES ACTIVES — PAS ENCORE DE VRAIES DONNÉES : aucune table `tasks`
// n'est encore interrogée par le frontend (voir docs/PROJET.md, chantier
// Tâches pas commencé) — `room.activeTaskCount` n'existe pas dans les
// données Supabase actuelles, retombe systématiquement sur 0 ("Aucune
// tâche") pour l'instant. Le composant est prêt à afficher un vrai
// nombre dès qu'un champ/une requête existera — voir `docs/TO_DO.md`.
//
// Les murs/ouvertures restent rendus par `WallEdges` (le modèle
// mur-arête, voir layoutGeneration.js) — PAS un simple contour par
// pièce : un contour uniforme ignorerait les ouvertures et referait
// fusionner visuellement deux pièces séparées par une cloison pleine
// avec le vide, l'inverse du bug déjà corrigé sur ce sujet.
//
// DÉFILEMENT NATIF, PAS react-zoom-pan-pinch (voir la conversation) :
// la bibliothèque de zoom/pincement a causé un vrai bug visuel signalé
// ici (le mur coupé à droite/en bas, contenu pas entièrement visible) —
// jamais pu la tester réellement dans un navigateur. `overflow: auto`
// reste en place malgré le retrait du zoom manuel : filet de sécurité
// pour un très grand appartement où `MIN_CELL_PX` empêcherait le
// contenu de rétrécir suffisamment pour tenir entièrement (cas limite,
// voir MIN_CELL_PX ci-dessous).
//
// RECADRAGE DYNAMIQUE SUR LA BOUNDING BOX (03/08/2026, demande explicite
// de Paul, capture d'écran à l'appui) : `gridWidth`/`gridHeight` de
// l'étage (`floor.gridWidth`/`floor.gridHeight`) correspondent à la
// grille COMPLÈTE disponible pour tracer (souvent bien plus large que
// les pièces réellement présentes, par ex. DEFAULT_GRID_WIDTH=20 dans
// LayoutEditor.jsx) — les utiliser pour dimensionner le conteneur
// laissait un grand bloc vide inutile là où aucune pièce n'existe (visible
// sur la capture : fond gris à droite des pièces). Le conteneur est
// maintenant dimensionné sur l'EMPRISE RÉELLE des pièces de l'étage
// (minX/minY/maxX/maxY, recalculée à chaque rendu — pas de coût
// significatif, quelques pièces par étage), plus 1 case de marge de
// chaque côté pour ne pas coller au bord. Toutes les pièces ET les
// arêtes (`WallEdges`, via `offsetXPx`/`offsetYPx`) sont décalées de
// l'origine de cette bounding box, pas de la grille complète.
//
// Clic sur une pièce : optionnel (`onSelectRoom`), pour sauter directement
// dans la Vue 3D centrée sur cette pièce si le parent le souhaite.
import { useState, useRef, useEffect } from "react";
import WallEdges from "../layout-editor/components/WallEdges";
import "./Plan2DView.css";

const DEFAULT_CELL_PX = 40; // filet de sécurité avant la toute première mesure du conteneur
const MIN_CELL_PX = 14; // grand appartement : jamais illisible pour autant tenir dans le cadre
const MAX_CELL_PX = 64; // petit appartement : jamais démesurément agrandi
const WALL_THICKNESS_PX = 4;
const BBOX_PADDING_CELLS = 1; // ~1 case de marge tout autour des pièces, demandé explicitement

/** "Aucune tâche" / "1 tâche active" / "N tâches actives" — accord singulier/pluriel. */
function formatTaskCount(count) {
  if (!count) return "Aucune tâche";
  if (count === 1) return "1 tâche active";
  return `${count} tâches actives`;
}

export default function Plan2DView({ floor, edges = [], rooms, onSelectRoom }) {
  const scrollRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Bounding box réelle des pièces + marge — filet de sécurité sur la
  // grille complète de l'étage si jamais `rooms` était vide (ne devrait
  // pas arriver : le parent affiche un message à la place dans ce cas,
  // voir HouseholdSpatialView.jsx).
  let contentMinX = 0;
  let contentMinY = 0;
  let contentWidth = floor.gridWidth || 10;
  let contentHeight = floor.gridHeight || 10;
  if (rooms.length > 0) {
    const minX = Math.min(...rooms.map((r) => r.x));
    const minY = Math.min(...rooms.map((r) => r.y));
    const maxX = Math.max(...rooms.map((r) => r.x + r.width));
    const maxY = Math.max(...rooms.map((r) => r.y + r.height));
    contentMinX = minX - BBOX_PADDING_CELLS;
    contentMinY = minY - BBOX_PADDING_CELLS;
    contentWidth = maxX - minX + BBOX_PADDING_CELLS * 2;
    contentHeight = maxY - minY + BBOX_PADDING_CELLS * 2;
  }

  // Mesure la taille RÉELLE du conteneur (dépend du CSS — largeur de
  // l'écran, 65vh de hauteur max, voir Plan2DView.css) pour calculer la
  // cellule qui fait tout tenir. ResizeObserver plutôt qu'un seul calcul
  // au montage : réagit à une rotation d'écran ou un redimensionnement
  // de fenêtre sans qu'il faille recharger la page.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cellPx =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.max(MIN_CELL_PX, Math.min(MAX_CELL_PX, Math.floor(Math.min(containerSize.width / contentWidth, containerSize.height / contentHeight))))
      : DEFAULT_CELL_PX;
  const gridWidthPx = contentWidth * cellPx;
  const gridHeightPx = contentHeight * cellPx;
  const offsetXPx = contentMinX * cellPx;
  const offsetYPx = contentMinY * cellPx;

  return (
    <div className="plan2d-view">
      <p className="plan2d-hint">{floor.name} — vue d'ensemble (touchez une pièce pour vous y rendre en 3D)</p>

      <div className="plan2d-scroll" ref={scrollRef}>
        <div className="plan2d-grid" style={{ width: gridWidthPx, height: gridHeightPx }}>
          {rooms.map((room) => {
            const clickable = Boolean(onSelectRoom);
            return (
              <div
                key={room.id}
                className="plan2d-room"
                style={{
                  left: (room.x - contentMinX) * cellPx,
                  top: (room.y - contentMinY) * cellPx,
                  width: room.width * cellPx,
                  height: room.height * cellPx,
                  background: room.color,
                  cursor: clickable ? "pointer" : "default",
                }}
                onClick={clickable ? () => onSelectRoom(room.id) : undefined}
                role={clickable ? "button" : undefined}
                aria-label={clickable ? `Aller à ${room.name}` : undefined}
              >
                <span className="plan2d-room__name">{room.name}</span>
                <span className="plan2d-room__tasks">{formatTaskCount(room.activeTaskCount ?? 0)}</span>
              </div>
            );
          })}

          <WallEdges
            edges={edges}
            cellPx={cellPx}
            width={gridWidthPx}
            height={gridHeightPx}
            wallThickness={WALL_THICKNESS_PX}
            offsetXPx={offsetXPx}
            offsetYPx={offsetYPx}
          />
        </div>
      </div>
    </div>
  );
}

