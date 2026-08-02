// src/features/layout-editor/components/LayoutEditor.jsx
// Mode édition du plan : tracé de pièces par rectangle, déplacement de
// pièces existantes, redimensionnement depuis les coins, un outil de
// retrait manuel de pan de mur (ouverture), et un Inspecteur de Pièce
// (type, nom, surface) — sur une grille neutre, sans meubles, sans
// texture de sol par pièce.
//
// MURS RENDUS EN DIRECT (corrigé 01/08/2026, voir la conversation) :
// contrairement à une version précédente de ce commentaire, les murs
// sont bien dessinés ici, en direct — via `WallEdges` (le même composant
// que Plan2DView.jsx, pour ne jamais avoir deux logiques de rendu
// différentes), calculés à chaque rendu par `computeRoomEdges(rooms,
// doors)`. Avant ce correctif, chaque pièce n'affichait que sa propre
// bordure CSS, insensible au concept d'ouverture : "retirer un mur"
// n'avait donc aucun effet visible tant qu'on n'avait pas enregistré et
// consulté le Plan 2D. Les pièces elles-mêmes n'ont plus de bordure
// (voir LayoutEditor.css) — `WallEdges` est désormais la SEULE source
// de vérité visuelle pour les murs, garantissant qu'une ouverture
// retire réellement le trait, ici comme dans Plan2DView.jsx.
//
// Interaction en Pointer Events partout (pas mousedown/touchstart
// séparés) : un seul modèle unifié souris/tactile.
//
// Gestes distincts sur une pièce existante, routés via un minuteur
// d'appui long partagé (longPressTimerRef) :
//   - VERROU (nouveau, voir la conversation) : chaque pièce porte un
//     cadenas (coin supérieur gauche). Verrouillée (par défaut, y compris
//     les pièces déjà existantes au chargement) : le déplacement et le
//     redimensionnement sont désactivés, la pièce affiche son nom et sa
//     superficie. Déverrouillée : affiche la poignée ✢ de déplacement et
//     les 4 poignées de redimensionnement, bordure mise en évidence. Une
//     SEULE pièce déverrouillée à la fois — en déverrouiller une
//     reverrouille automatiquement l'ancienne (état scalaire unique,
//     `unlockedRoomId`). Se reverrouille aussi automatiquement dès qu'on
//     commence à tracer une NOUVELLE pièce, et lors de l'enregistrement
//     du plan. Une pièce fraîchement créée démarre déverrouillée.
//   - Relâchement AVANT 500ms sur une pièce déverrouillée (le minuteur
//     est encore en attente) -> tap rapide -> ne fait plus rien de
//     spécial (juste nettoyage du minuteur) ; une pièce VERROUILLÉE
//     n'arme même pas le minuteur.
//   - Le minuteur se déclenche (500ms tenus, pièce déverrouillée) ->
//     démarre un déplacement ; le relâchement final est alors géré par
//     la grille (le pointeur a été capturé dessus), pas par la pièce
//     elle-même.
//   - Poignée ✢ (visible seulement pièce déverrouillée) : démarre un
//     déplacement immédiatement, pas de tap possible dessus (uniquement
//     pour glisser).
//   - Nom/surface affichés sur la pièce (visible seulement pièce
//     VERROUILLÉE — remplace la poignée ✢) : cible DÉDIÉE et DISTINCTE
//     pour ouvrir l'Inspecteur — son propre stopPropagation sur
//     pointerDown (pas seulement onClick) empêche le minuteur d'appui
//     long du parent de démarrer, puisque pointerdown/up précèdent click
//     dans l'ordre des événements. Fonctionne indépendamment du verrou
//     (renommer/changer le type n'affecte pas la position).
//   - Poignées de redimensionnement (coins, visibles seulement pièce
//     déverrouillée) : démarrent un redimensionnement immédiatement,
//     comme la poignée de déplacement.
//
// COLLISION (voir la conversation) : le cadrillage pur pendant le
// glissé/redimensionnement (aucune attraction/aimantage vers les pièces
// voisines), MAIS une résolution anti-chevauchement s'applique au
// RELÂCHEMENT (resolveOverlap, src/features/layout-editor/utils/roomCollision.js)
// — deux pièces ne peuvent plus se retrouver superposées une fois le
// geste terminé. Taille minimale d'une pièce : 1×1 dalle (MIN_ROOM_SIZE).
// Redimensionnement vérifié par calcul avant intégration (les 4 coins,
// taille minimale respectée). Type/couleur/surface : src/data/roomTypes.js
// + computeRoomSurface (layoutGeneration.js).
//
// IMPORTANT — limite assumée (voir README) : ce composant ne connaît que
// des PIÈCES (rectangles) et des OUVERTURES DE MUR, jamais de meubles
// (retirés du MVP pour l'instant).
import { useState, useRef } from "react";
import RoomNameModal from "./RoomNameModal";
import RoomInspector from "./RoomInspector";
import { findOpenableWallSegments, edgeKey, computeRoomEdges } from "../utils/layoutGeneration";
import { rectsOverlap, resolveOverlap } from "../utils/roomCollision";
import { findRoomType, DEFAULT_ROOM_TYPE } from "../roomTypes";
import { computeRoomSurface } from "../utils/layoutGeneration";
import WallEdges from "./WallEdges";
import "./LayoutEditor.css";

const CELL_PX = 28; // plus petit que dans FloorView3D : besoin de voir toute la grille de tracé à l'écran
const MIN_ROOM_SIZE = 1; // au moins 1x1 dalle, comme demandé
const DEFAULT_GRID_WIDTH = 20;
const DEFAULT_GRID_HEIGHT = 16;
const LONG_PRESS_MS = 500;
// Épaisseur du segment cliquable affiché sur une cloison pour une
// ouverture (candidate ou déjà retirée) — voir le rendu en bas du
// fichier. Volontairement plus large que le simple trait mural
// (WallEdges.jsx, vue lecture seule) pour rester praticable au doigt
// malgré la finesse intrinsèque d'une arête (voir TO_DO.md : cible
// tactile encore petite, amélioration possible plus tard).
const DOOR_HIT_THICKNESS_PX = 16;

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x) + 1;
  const height = Math.abs(b.y - a.y) + 1;
  return { x, y, width, height };
}

/**
 * Calcule le nouveau rectangle d'une pièce en train d'être redimensionnée
 * depuis un coin (`handle` : "nw"|"ne"|"sw"|"se"). Le coin OPPOSÉ à celui
 * attrapé reste toujours fixe. Taille minimale (MIN_ROOM_SIZE) toujours
 * respectée. Vérifié par calcul avant intégration (voir la conversation)
 * : les 4 coins, y compris le plafonnement à la taille minimale quand on
 * pousse très loin dans le mauvais sens.
 */
function computeResizedRect(original, handle, pointerCell) {
  let { x, y, width, height } = original;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes("w")) {
    const newX = Math.min(pointerCell.x, right - MIN_ROOM_SIZE);
    width = right - newX;
    x = newX;
  }
  if (handle.includes("e")) {
    width = Math.max(MIN_ROOM_SIZE, pointerCell.x - x + 1);
  }
  if (handle.includes("n")) {
    const newY = Math.min(pointerCell.y, bottom - MIN_ROOM_SIZE);
    height = bottom - newY;
    y = newY;
  }
  if (handle.includes("s")) {
    height = Math.max(MIN_ROOM_SIZE, pointerCell.y - y + 1);
  }
  return { ...original, x, y, width, height };
}

export default function LayoutEditor({
  existingRooms = [],
  existingDoors = [],
  floorName,
  onSave,
  saving = false,
  onCancel,
  onExport,
  onImport,
  importError,
  onDismissImportError,
}) {
  const [rooms, setRooms] = useState(existingRooms);
  const [doors, setDoors] = useState(existingDoors); // [{orientation: 'h'|'v', x, y}, ...] — voir layoutGeneration.js. Nom de donnée conservé ("doors") malgré le renommage conceptuel de l'outil en "ouverture" (voir plus bas) : c'est toujours la même liste d'arêtes persistée telle quelle, seul le vocabulaire de l'INTERACTION change.
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [pendingRect, setPendingRect] = useState(null);
  const [message, setMessage] = useState(null);
  const [wallToolActive, setWallToolActive] = useState(false);
  const [inspectedRoomId, setInspectedRoomId] = useState(null);
  const [unlockedRoomId, setUnlockedRoomId] = useState(null); // une seule pièce déverrouillée à la fois ; null = toutes verrouillées (défaut à l'ouverture, y compris pièces déjà existantes)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Réinitialiser efface le BROUILLON EN COURS d'édition (cet étage
  // seulement, ou le nouvel étage en cours de création) — état local
  // pur, aucun appel backend. **Correction (01/08/2026, demande
  // explicite de Paul, "ne fait rien")** : appelait auparavant `onReset`
  // (prop du parent), qui déclenchait un appel backend effaçant TOUT LE
  // FOYER (tous les étages), puis reposait sur `existingRooms`/
  // `existingDoors` (props) pour réafficher un plan vide — sauf que
  // `useState(existingRooms)` ne s'exécute qu'au tout premier montage,
  // jamais ré-exécuté quand les props changent sans démontage/remontage
  // du composant (pas de `key` côté parent) : le brouillon affiché à
  // l'écran ne changeait donc JAMAIS, quoi que fasse le backend derrière
  // — d'où "ne fait rien" à l'écran. Solution plus simple ET plus sûre :
  // ne toucher QUE l'état local, comme "Annuler" — rien n'est persisté
  // tant que l'utilisateur ne clique pas explicitement sur "Enregistrer
  // le plan" ensuite (qui, lui, écrira bien 0 pièce pour CET étage
  // uniquement, sans jamais toucher aux autres étages du foyer).
  const handleConfirmReset = () => {
    setResetConfirmOpen(false);
    setRooms([]);
    setDoors([]);
    setUnlockedRoomId(null);
    setInspectedRoomId(null);
    setWallToolActive(false);
    setPendingRect(null);
    setDragStart(null);
    setDragCurrent(null);
    setMovingRoomId(null);
    setMovePreviewRect(null);
    setResizingRoomId(null);
    setResizePreviewRect(null);
    setMessage(null);
  };

  // Déplacement d'une pièce existante.
  const [movingRoomId, setMovingRoomId] = useState(null);
  const [movePreviewRect, setMovePreviewRect] = useState(null);
  const moveStartRef = useRef(null); // { room, startCell }
  const longPressTimerRef = useRef(null);

  // Redimensionnement d'une pièce existante (depuis un coin).
  const [resizingRoomId, setResizingRoomId] = useState(null);
  const [resizePreviewRect, setResizePreviewRect] = useState(null);
  const resizeStartRef = useRef(null); // { room, handle }

  const gridRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImport?.(file);
    e.target.value = ""; // permet de réimporter le même fichier deux fois de suite si besoin
  };

  // Bornes de la grille de tracé : au moins la taille par défaut, ou
  // assez grande pour englober les pièces déjà présentes (+ marge) si on
  // édite un étage existant.
  const gridWidth = Math.max(DEFAULT_GRID_WIDTH, ...rooms.map((r) => r.x + r.width + 2), 0) || DEFAULT_GRID_WIDTH;
  const gridHeight = Math.max(DEFAULT_GRID_HEIGHT, ...rooms.map((r) => r.y + r.height + 2), 0) || DEFAULT_GRID_HEIGHT;

  const cellFromPointer = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_PX);
    const y = Math.floor((e.clientY - rect.top) / CELL_PX);
    return {
      x: Math.max(0, Math.min(gridWidth - 1, x)),
      y: Math.max(0, Math.min(gridHeight - 1, y)),
    };
  };

  /* ------------------------------ Tracé (nouvelle pièce) ------------------------------ */

  const handleGridPointerDown = (e) => {
    if (wallToolActive || pendingRect || movingRoomId || resizingRoomId) return; // outil de retrait de mur actif, nommage en attente, ou déplacement/redimensionnement déjà en cours
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const cell = cellFromPointer(e);
    setDragStart(cell);
    setDragCurrent(cell);
    setMessage(null);
    setUnlockedRoomId(null); // on commence à dimensionner une nouvelle pièce -> reverrouille la précédente (une seule déverrouillée à la fois)
  };

  /* -------------------------------- Déplacement / tap de pièce ------------------------ */

  const beginMove = (room, startCell) => {
    moveStartRef.current = { room, startCell };
    setMovingRoomId(room.id);
    setMovePreviewRect(room);
  };

  const handleRoomPointerDown = (room, e) => {
    if (wallToolActive) return; // en mode retrait de mur, les pièces ne se déplacent/inspectent pas
    e.stopPropagation(); // empêche le tracé d'une nouvelle pièce sur la grille en dessous, verrouillée ou non
    if (room.id !== unlockedRoomId) return; // verrouillée : ni déplacement ni appui long tant qu'on ne l'a pas déverrouillée via le cadenas
    const startCell = cellFromPointer(e);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      gridRef.current?.setPointerCapture?.(e.pointerId);
      beginMove(room, startCell);
    }, LONG_PRESS_MS);
  };

  const handleRoomPointerUp = () => {
    // Le verrou (toggleLock, sur le cadenas dédié) a remplacé le tap
    // rapide comme mécanisme de sélection — il ne reste ici qu'à
    // nettoyer un minuteur d'appui long éventuellement en attente
    // (pièce déverrouillée, relâchée avant les 500ms).
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRoomPointerLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleHandlePointerDown = (room, e) => {
    if (wallToolActive) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gridRef.current?.setPointerCapture?.(e.pointerId);
    beginMove(room, cellFromPointer(e));
  };

  // Cible dédiée pour ouvrir l'Inspecteur (le nom/la surface affichés sur
  // la pièce, visibles seulement verrouillée) — distincte du reste de la
  // pièce. `stopPropagation` sur pointerDown (pas seulement onClick) :
  // nécessaire pour empêcher le minuteur d'appui long du parent de
  // démarrer, puisque pointerdown/up précèdent click dans l'ordre des
  // événements — un stopPropagation posé seulement dans onClick
  // arriverait trop tard. Rendu seulement pièce VERROUILLÉE (voir plus
  // bas) — pour renommer/changer le type d'une pièce déverrouillée,
  // la reverrouiller d'abord via son cadenas.
  const handleInfoPointerDown = (e) => {
    e.stopPropagation();
  };
  const handleInfoClick = (room, e) => {
    e.stopPropagation();
    setInspectedRoomId(room.id);
  };

  /* ----------------------------------- Verrou de pièce ----------------------------------- */

  // Une seule pièce déverrouillée à la fois : déverrouiller room B
  // reverrouille automatiquement room A (état scalaire unique). Cliquer
  // le cadenas de la pièce déjà déverrouillée la reverrouille.
  const toggleLock = (roomId) => {
    setUnlockedRoomId((prev) => (prev === roomId ? null : roomId));
  };

  // Même raison que handleInfoPointerDown : stopPropagation sur
  // pointerDown (pas seulement onClick), sinon le pointerdown remonte
  // d'abord au conteneur de la pièce et arme quand même son minuteur
  // d'appui long avant que le clic sur le cadenas n'ait eu l'occasion de
  // reverrouiller la pièce.
  const handleLockPointerDown = (e) => {
    e.stopPropagation();
  };

  /* -------------------------------- Redimensionnement de pièce ------------------------- */

  const beginResize = (room, handle) => {
    resizeStartRef.current = { room, handle };
    setResizingRoomId(room.id);
    setResizePreviewRect(room);
  };

  const handleResizeHandlePointerDown = (room, handle, e) => {
    if (wallToolActive) return;
    e.stopPropagation();
    gridRef.current?.setPointerCapture?.(e.pointerId);
    beginResize(room, handle);
  };

  /* ----------------------------- Outil de retrait de mur (ouverture) ------------------- */

  // Candidats = arêtes "wall-int" (cloisons entre deux pièces qui se
  // touchent réellement, gap=0) — voir layoutGeneration.js. Une
  // ouverture retire le mur sur ce segment (aucun trait dessiné, voir
  // WallEdges.jsx) — ce n'est PAS un objet de porte ajouté. Deux pièces
  // peuvent tout à fait rester séparées par un mur plein SANS aucune
  // ouverture : le mur est le comportement par défaut, l'ouverture est
  // l'exception explicite.
  const wallSegments = wallToolActive ? findOpenableWallSegments(rooms) : [];

  const toggleWallSegment = (candidate) => {
    setDoors((prev) => {
      const key = edgeKey(candidate.orientation, candidate.x, candidate.y);
      const exists = prev.some((d) => edgeKey(d.orientation, d.x, d.y) === key);
      return exists
        ? prev.filter((d) => edgeKey(d.orientation, d.x, d.y) !== key)
        : [...prev, { orientation: candidate.orientation, x: candidate.x, y: candidate.y }];
    });
  };

  /* -------------------------------- Inspecteur de pièce --------------------------------- */

  const inspectedRoom = rooms.find((r) => r.id === inspectedRoomId) || null;


  const handleUpdateRoomName = (name) => {
    setRooms((prev) => prev.map((r) => (r.id === inspectedRoomId ? { ...r, name } : r)));
  };

  const handleUpdateRoomType = (type) => {
    const roomType = findRoomType(type);
    setRooms((prev) =>
      prev.map((r) => (r.id === inspectedRoomId ? { ...r, type, icon: roomType.icon, color: roomType.color, name: roomType.label } : r))
    );
  };

  /* --------------------------- Gestes partagés sur la grille --------------------------- */

  const handleGridPointerMove = (e) => {
    const cell = cellFromPointer(e);
    if (resizingRoomId && resizeStartRef.current) {
      const { room, handle } = resizeStartRef.current;
      setResizePreviewRect(computeResizedRect(room, handle, cell));
      return;
    }
    if (movingRoomId && moveStartRef.current) {
      // Pendant le glissé : cadrillage pur, aucune attraction vers les
      // pièces voisines — la pièce suit le décalage en cases entières
      // exactement. La résolution anti-chevauchement (resolveOverlap)
      // s'applique seulement au relâchement, dans handleGridPointerUp.
      const { room, startCell } = moveStartRef.current;
      const dx = cell.x - startCell.x;
      const dy = cell.y - startCell.y;
      setMovePreviewRect({ ...room, x: room.x + dx, y: room.y + dy });
      return;
    }
    if (dragStart) {
      setDragCurrent(cell);
    }
  };

  const handleGridPointerUp = () => {
    if (resizingRoomId) {
      // Résolution anti-chevauchement au relâchement seulement (pas
      // pendant le glissé — la pièce suit le pointeur exactement
      // jusque-là, cale-cadrillage pur).
      const others = rooms.filter((r) => r.id !== resizingRoomId);
      const resolved = resolveOverlap(resizePreviewRect, others);
      setRooms((prev) =>
        prev.map((r) =>
          r.id === resizingRoomId ? { ...r, x: resolved.x, y: resolved.y, width: resolved.width, height: resolved.height } : r
        )
      );
      setResizingRoomId(null);
      setResizePreviewRect(null);
      resizeStartRef.current = null;
      return;
    }

    if (movingRoomId) {
      // Idem : résolution anti-chevauchement uniquement au relâchement —
      // pas d'aimantage/attraction pendant le glissé (retiré à une
      // demande précédente, volontairement pas réintroduit).
      const others = rooms.filter((r) => r.id !== movingRoomId);
      const resolved = resolveOverlap(movePreviewRect, others);
      setRooms((prev) => prev.map((r) => (r.id === movingRoomId ? { ...r, x: resolved.x, y: resolved.y } : r)));
      setMovingRoomId(null);
      setMovePreviewRect(null);
      moveStartRef.current = null;
      return;
    }

    if (!dragStart || !dragCurrent) return;
    const rect = normalizeRect(dragStart, dragCurrent);
    setDragStart(null);
    setDragCurrent(null);

    if (rect.width < MIN_ROOM_SIZE || rect.height < MIN_ROOM_SIZE) {
      setMessage(`Une pièce doit faire au moins ${MIN_ROOM_SIZE}×${MIN_ROOM_SIZE} dalles.`);
      return;
    }
    if (rooms.some((r) => rectsOverlap(r, rect))) {
      setMessage("Cette zone chevauche une pièce déjà tracée.");
      return;
    }
    setPendingRect(rect);
  };

  const handleNameSubmit = (name) => {
    const defaultType = findRoomType(DEFAULT_ROOM_TYPE);
    const id = `room-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "piece"}-${Date.now()}`;
    setRooms((prev) => [...prev, { ...pendingRect, id, name, type: defaultType.value, icon: defaultType.icon, color: defaultType.color }]);
    setPendingRect(null);
    setUnlockedRoomId(id); // démarre déverrouillée — prête à être repositionnée/redimensionnée immédiatement si besoin
  };

  const handleNameCancel = () => {
    setPendingRect(null);
  };

  const removeRoom = (id) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (inspectedRoomId === id) setInspectedRoomId(null);
    if (unlockedRoomId === id) setUnlockedRoomId(null);
  };

  const previewRect = dragStart && dragCurrent ? normalizeRect(dragStart, dragCurrent) : null;
  const openSegmentKeys = new Set(doors.map((d) => edgeKey(d.orientation, d.x, d.y)));

  // Arêtes calculées EN DIRECT (pas seulement au rendu Plan2DView après
  // enregistrement) — corrige le bug signalé : "retirer un mur" n'avait
  // aucun effet visible ici, car aucun vrai mur n'était dessiné dans
  // l'éditeur (chaque pièce n'affichait que sa propre bordure CSS,
  // insensible au concept d'ouverture). Substitue la pièce en cours de
  // déplacement/redimensionnement par son rectangle d'APERÇU pour que
  // le mur suive visuellement le geste, pas la dernière position
  // enregistrée.
  const displayRoomsForEdges = rooms.map((r) => {
    if (r.id === movingRoomId) return movePreviewRect;
    if (r.id === resizingRoomId) return resizePreviewRect;
    return r;
  });
  const liveEdges = computeRoomEdges(displayRoomsForEdges, doors);

  return (
    <div className="layout-editor">
      <div className="layout-editor__header">
        <button type="button" className="layout-editor__cancel-btn" onClick={onCancel}>
          Annuler
        </button>
        <p className="layout-editor__hint">
          {wallToolActive
            ? "Touchez une cloison en surbrillance pour en retirer ou reboucher un pan (ouverture)."
            : `${floorName ? `Modifier : ${floorName}` : "Nouveau logement"} — touchez le cadenas d'une pièce pour la déverrouiller (déplacer/redimensionner), touchez son nom pour la qualifier, glissez sur la grille pour en tracer une nouvelle.`}
        </p>
        <button
          type="button"
          className={wallToolActive ? "layout-editor__wall-tool layout-editor__wall-tool--active" : "layout-editor__wall-tool"}
          onClick={() => setWallToolActive((v) => !v)}
        >
          🧱 Retirer un mur
        </button>

        <div className="layout-editor__toolbar-row">
          <button type="button" className="layout-editor__toolbar-btn" onClick={onExport}>
            📥 Exporter (.json)
          </button>
          <button type="button" className="layout-editor__toolbar-btn" onClick={() => fileInputRef.current?.click()}>
            📤 Importer un plan
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="layout-editor__file-input"
            onChange={handleImportFileChange}
          />
          <button type="button" className="layout-editor__toolbar-btn layout-editor__toolbar-btn--danger" onClick={() => setResetConfirmOpen(true)}>
            🗑️ Réinitialiser cet étage
          </button>
        </div>
      </div>

      {importError && (
        <p className="layout-editor__message">
          {importError}{" "}
          <button type="button" className="layout-editor__message-dismiss" onClick={onDismissImportError}>
            ✕
          </button>
        </p>
      )}

      {message && <p className="layout-editor__message">{message}</p>}

      <div className="layout-editor__scroll">
        <div
          ref={gridRef}
          className="layout-editor__grid"
          style={{
            width: gridWidth * CELL_PX,
            height: gridHeight * CELL_PX,
            backgroundSize: `${CELL_PX}px ${CELL_PX}px`,
          }}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
          onPointerCancel={handleGridPointerUp}
        >
          {rooms.map((room) => {
            const isMoving = room.id === movingRoomId;
            const isResizing = room.id === resizingRoomId;
            const displayRect = isResizing ? resizePreviewRect : isMoving ? movePreviewRect : room;
            const overlapping = (isMoving || isResizing) && rooms.some((r) => r.id !== room.id && rectsOverlap(displayRect, r));
            const roomType = findRoomType(room.type);
            const { surfaceM2 } = computeRoomSurface(displayRect);
            const isUnlocked = room.id === unlockedRoomId;
            return (
              <div
                key={room.id}
                className={`layout-editor__room${isMoving || isResizing ? " layout-editor__room--moving" : ""}${overlapping ? " layout-editor__room--invalid" : ""}${isUnlocked ? " layout-editor__room--unlocked" : ""}`}
                style={{
                  left: displayRect.x * CELL_PX,
                  top: displayRect.y * CELL_PX,
                  width: displayRect.width * CELL_PX,
                  height: displayRect.height * CELL_PX,
                  background: room.color,
                }}
                onPointerDown={(e) => handleRoomPointerDown(room, e)}
                onPointerUp={handleRoomPointerUp}
                onPointerLeave={handleRoomPointerLeave}
              >
                {isUnlocked ? (
                  <button
                    type="button"
                    className="layout-editor__room-handle"
                    onPointerDown={(e) => handleHandlePointerDown(room, e)}
                    aria-label={`Déplacer ${room.name}`}
                  >
                    ✢
                  </button>
                ) : (
                  <span
                    className="layout-editor__room-info"
                    onPointerDown={handleInfoPointerDown}
                    onClick={(e) => handleInfoClick(room, e)}
                  >
                    <span className="layout-editor__room-name">
                      {roomType.icon} {room.name}
                    </span>
                    <span className="layout-editor__room-surface">
                      {surfaceM2} m² ({displayRect.width}×{displayRect.height})
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  className="layout-editor__room-lock"
                  onPointerDown={handleLockPointerDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(room.id);
                  }}
                  aria-label={isUnlocked ? `Verrouiller ${room.name}` : `Déverrouiller ${room.name}`}
                  aria-pressed={!isUnlocked}
                >
                  {isUnlocked ? "🔓" : "🔒"}
                </button>
                <button
                  type="button"
                  className="layout-editor__room-delete"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRoom(room.id);
                  }}
                  aria-label={`Supprimer ${room.name}`}
                >
                  ×
                </button>

                {isUnlocked && !isMoving && (
                  <>
                    {["nw", "ne", "sw", "se"].map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        className={`layout-editor__resize-handle layout-editor__resize-handle--${handle}`}
                        onPointerDown={(e) => handleResizeHandlePointerDown(room, handle, e)}
                        aria-label={`Redimensionner ${room.name}`}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}

          <WallEdges
            edges={liveEdges}
            cellPx={CELL_PX}
            width={gridWidth * CELL_PX}
            height={gridHeight * CELL_PX}
            wallThickness={3}
          />

          {previewRect && (
            <div
              className="layout-editor__preview"
              style={{
                left: previewRect.x * CELL_PX,
                top: previewRect.y * CELL_PX,
                width: previewRect.width * CELL_PX,
                height: previewRect.height * CELL_PX,
              }}
            />
          )}

          {wallToolActive &&
            wallSegments.map((c) => {
              const isOpen = openSegmentKeys.has(c.key);
              const isHorizontal = c.orientation === "h";
              const style = isHorizontal
                ? {
                    left: c.x * CELL_PX,
                    top: c.y * CELL_PX - DOOR_HIT_THICKNESS_PX / 2,
                    width: CELL_PX,
                    height: DOOR_HIT_THICKNESS_PX,
                  }
                : {
                    left: c.x * CELL_PX - DOOR_HIT_THICKNESS_PX / 2,
                    top: c.y * CELL_PX,
                    width: DOOR_HIT_THICKNESS_PX,
                    height: CELL_PX,
                  };
              return (
                <button
                  type="button"
                  key={c.key}
                  className={
                    isOpen
                      ? "layout-editor__wall-segment layout-editor__wall-segment--open"
                      : "layout-editor__wall-segment"
                  }
                  style={style}
                  onClick={() => toggleWallSegment(c)}
                  aria-label={isOpen ? "Reboucher ce pan de mur" : "Retirer ce pan de mur (ouverture)"}
                />
              );
            })}
        </div>
      </div>

      <button
        type="button"
        className="layout-editor__save-btn"
        onClick={() => {
          setUnlockedRoomId(null); // enregistrer verrouille toutes les pièces
          onSave(rooms, doors);
        }}
        disabled={rooms.length === 0 || saving}
      >
        {saving ? "Enregistrement..." : "Enregistrer le plan"}
      </button>

      {pendingRect && <RoomNameModal onSubmit={handleNameSubmit} onCancel={handleNameCancel} />}
      {inspectedRoom && (
        <RoomInspector
          room={inspectedRoom}
          onUpdateName={handleUpdateRoomName}
          onUpdateType={handleUpdateRoomType}
          onClose={() => setInspectedRoomId(null)}
        />
      )}

      {resetConfirmOpen && (
        <>
          <div className="layout-editor__confirm-backdrop" onClick={() => setResetConfirmOpen(false)} />
          <div className="layout-editor__confirm" role="alertdialog" aria-modal="true" aria-label="Confirmer la réinitialisation">
            <p className="layout-editor__confirm-text">
              Réinitialiser efface toutes les pièces et ouvertures de mur de CET étage (le brouillon affiché à l'écran) — les autres
              étages ne sont pas concernés, et rien n'est définitivement perdu côté serveur tant que tu ne cliques pas sur "Enregistrer
              le plan" ensuite.
            </p>
            <div className="layout-editor__confirm-actions">
              <button type="button" className="layout-editor__confirm-danger-btn" onClick={handleConfirmReset}>
                Réinitialiser
              </button>
              <button type="button" className="layout-editor__confirm-cancel-btn" onClick={() => setResetConfirmOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
