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
// MURS BLANCS 2PX (03/08/2026, demande explicite de Paul, prototype
// ui_2d_v0.3.1.html — "bordures blanches de 2px, angles droits
// stricts") : le prototype dessine un `border-2 border-white` autour de
// CHAQUE pièce individuellement — repris tel quel, ça aurait réintroduit
// exactement le bug déjà corrigé (une bordure par pièce ignore les
// ouvertures, deux pièces séparées par une cloison PLEINE se
// retrouveraient quand même avec un "mur" dessiné même là où il ne
// devrait pas — et une ouverture resterait invisible sous la bordure de
// chaque pièce). Choix fait à la place : GARDER `WallEdges` (correct par
// construction), juste changer sa couleur en blanc et son épaisseur à
// 2px (`strokeColor`/`wallThickness`, voir WallEdges.jsx) — même rendu
// visuel que demandé, sans regarder en arrière sur la correction du bug
// d'origine. "Angles droits stricts" : déjà le cas, `.plan2d-room` n'a
// jamais eu de `border-radius` (seul le cadre extérieur `.plan2d-grid`
// est arrondi).
//
// FILTRE PROPRETÉ / HEATMAP (03/08/2026, demande explicite de Paul,
// même prototype) : `showHeatmap` (état local, bouton dédié) bascule
// entre couleur NEUTRE (`room.color`, choisie par l'utilisateur — voir
// roomTypes.js/ROOM_COLORS) et couleur THERMIQUE dérivée du nombre de
// tâches actives (0=vert, 1=jaune, 2=orange, 3+=rouge, voir
// `heatColor()`). Masqué en mode compact (`showHint=false`, voir plus
// bas) — inutile dans un aperçu réduit (HouseholdHomePage.jsx).
//
// CLIC SUR UNE PIÈCE — CHANGEMENT DE COMPORTEMENT (03/08/2026, demande
// explicite de Paul) : `onSelectRoom(room.id)` n'ouvre plus la Vue 3D —
// c'est maintenant au PARENT de décider (voir HouseholdSpatialView.jsx,
// qui bascule vers `RoomDetailView.jsx`, la vue détaillée d'une pièce).
// Ce composant reste inchangé de ce point de vue : il appelle juste
// `onSelectRoom` si fourni, sans connaître ni se soucier de la
// destination.
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
// INTÉGRATION COMPACTE (03/08/2026, demande explicite de Paul — intégrer
// ce composant dans la carte "Vue du foyer" de HouseholdHomePage.jsx, à
// la place des données placeholder) : `maxHeight` (optionnel) permet au
// parent de réduire la hauteur du cadre (65vh par défaut, bien trop
// grand pour une carte d'aperçu compacte) sans dupliquer tout le
// composant. `showHint` (optionnel, true par défaut) masque la ligne
// d'aide ET le bouton de filtre propreté (inutiles dans un aperçu
// réduit).
import { useState, useRef, useEffect } from "react";
import WallEdges from "../layout-editor/components/WallEdges";
import { FlameIcon } from "../../components/ui/Icons";
import "./Plan2DView.css";

const DEFAULT_CELL_PX = 40; // filet de sécurité avant la toute première mesure du conteneur
const MIN_CELL_PX = 14; // grand appartement : jamais illisible pour autant tenir dans le cadre
const MAX_CELL_PX = 64; // petit appartement : jamais démesurément agrandi
const WALL_THICKNESS_PX = 2; // 2px, "bordures blanches" du prototype (voir en-tête)
const WALL_COLOR = "#ffffff";
const BBOX_PADDING_CELLS = 1; // ~1 case de marge tout autour des pièces, demandé explicitement

/** "Aucune tâche" / "1 tâche active" / "N tâches actives" — accord singulier/pluriel. */
function formatTaskCount(count) {
  if (!count) return "Aucune tâche";
  if (count === 1) return "1 tâche active";
  return `${count} tâches actives`;
}

/**
 * Couleur thermique selon le nombre de tâches actives — échelle fixée
 * par Paul : 0=vert, 1=jaune, 2=orange, 3+=rouge (`--color-emerald`/
 * `--color-yellow`/`--color-orange`/`--color-rose`, voir theme.css).
 */
function heatColor(count) {
  if (!count) return "var(--color-emerald)";
  if (count === 1) return "var(--color-yellow)";
  if (count === 2) return "var(--color-orange)";
  return "var(--color-rose)";
}

export default function Plan2DView({ floor, edges = [], rooms, onSelectRoom, maxHeight, showHint = true }) {
  const scrollRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showHeatmap, setShowHeatmap] = useState(false);

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
      {showHint && (
        <div className="plan2d-toolbar">
          <p className="plan2d-hint">{floor.name} — touchez une pièce pour voir son détail</p>
          <button
            type="button"
            className={showHeatmap ? "plan2d-heatmap-btn plan2d-heatmap-btn--active" : "plan2d-heatmap-btn"}
            onClick={() => setShowHeatmap((v) => !v)}
            aria-pressed={showHeatmap}
          >
            <FlameIcon size={12} />
            <span>Filtre propreté</span>
          </button>
        </div>
      )}

      {showHint && showHeatmap && (
        <div className="plan2d-legend">
          <span className="plan2d-legend__label">Ménage :</span>
          <span className="plan2d-legend__item" style={{ color: "var(--color-emerald)" }}>
            <span className="plan2d-legend__dot" style={{ background: "var(--color-emerald)" }} />0
          </span>
          <span className="plan2d-legend__item" style={{ color: "var(--color-yellow)" }}>
            <span className="plan2d-legend__dot" style={{ background: "var(--color-yellow)" }} />1
          </span>
          <span className="plan2d-legend__item" style={{ color: "var(--color-orange)" }}>
            <span className="plan2d-legend__dot" style={{ background: "var(--color-orange)" }} />2
          </span>
          <span className="plan2d-legend__item" style={{ color: "var(--color-rose)" }}>
            <span className="plan2d-legend__dot" style={{ background: "var(--color-rose)" }} />
            3+
          </span>
        </div>
      )}

      <div className="plan2d-scroll" ref={scrollRef} style={maxHeight ? { maxHeight } : undefined}>
        <div className="plan2d-grid" style={{ width: gridWidthPx, height: gridHeightPx }}>
          {rooms.map((room) => {
            const clickable = Boolean(onSelectRoom);
            const taskCount = room.activeTaskCount ?? 0;
            const background = showHeatmap ? heatColor(taskCount) : room.color;
            return (
              <div
                key={room.id}
                className="plan2d-room"
                style={{
                  left: (room.x - contentMinX) * cellPx,
                  top: (room.y - contentMinY) * cellPx,
                  width: room.width * cellPx,
                  height: room.height * cellPx,
                  background,
                  cursor: clickable ? "pointer" : "default",
                }}
                onClick={clickable ? () => onSelectRoom(room.id) : undefined}
                role={clickable ? "button" : undefined}
                aria-label={clickable ? `Voir le détail de ${room.name}` : undefined}
              >
                <span className="plan2d-room__name">{room.name}</span>
                <span className="plan2d-room__tasks">{formatTaskCount(taskCount)}</span>
              </div>
            );
          })}

          <WallEdges
            edges={edges}
            cellPx={cellPx}
            width={gridWidthPx}
            height={gridHeightPx}
            wallThickness={WALL_THICKNESS_PX}
            strokeColor={WALL_COLOR}
            offsetXPx={offsetXPx}
            offsetYPx={offsetYPx}
          />
        </div>
      </div>
    </div>
  );
}

