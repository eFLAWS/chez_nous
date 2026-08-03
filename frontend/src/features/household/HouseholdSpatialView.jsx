// src/features/household/HouseholdSpatialView.jsx
// Orchestrateur spatial d'UN foyer. Trois modes :
//   - "onboarding" : aucun étage/pièce -> écran d'accueil
//   - "editing"    : Mode Édition (LayoutEditor) -> CRÉE/MODIFIE le plan
//   - "app"        : le logement sélectionné, commutateur "Plan 2D" /
//                    "Vue 3D" — deux façons de LIRE le même plan déjà
//                    construit, jamais de le modifier (ça, c'est le rôle
//                    exclusif du mode "editing").
//
// RENOMMAGE (01/08/2026, voir la conversation) : "ApartmentSpatialMvp"
// devient "HouseholdSpatialView" — ce composant n'est plus un prototype
// ("MVP"), c'est l'orchestrateur spatial réel, actif, monté sur /spatial
// (voir HouseholdSpatialPage.jsx). "Apartment" retiré aussi : l'app cible
// des logements en général (foyer, appartement, maison...), pas
// spécifiquement des appartements. Seuls le nom du fichier/de la fonction
// et le préfixe CSS (`spatial-mvp__` -> `spatial-view__`) ont changé,
// aucune logique.
//
// PERSISTANCE, changement de modèle important : plus de sauvegarde
// automatique à chaque frappe (impossible de toute façon — chaque
// changement doit passer par des appels API individuels, pas un simple
// blob écrit en continu). La sauvegarde reste un geste explicite
// ("Enregistrer le plan" dans LayoutEditor), comme demandé
// explicitement dans une conversation précédente sur ce sujet.
//
// RÉCONCILIATION "supprimer puis recréer" (voir householdLayoutApi.js,
// dormant depuis la migration Supabase — floorPlanService.js l'a
// remplacé, voir §3.7/🅰️ de docs/PROJET.md) pour le détail historique et
// les limites assumées de l'ancienne approche.
//
// RÔLE — **correction (01/08/2026)** : `householdId`/`isOwner`/`role`
// viennent de `HouseholdSpatialPage.jsx` (useParams + useOutletContext,
// voir ce fichier), pas de `HouseholdRoot.jsx`/`HouseholdViewPage.jsx`
// comme l'affirmait une version précédente de ce commentaire — ces deux
// fichiers sont dormants depuis la bascule vers `AppLayout`/Supabase
// (voir README.md). Un LOCATAIRE ne voit jamais le bouton "Modifier le
// plan", et si le plan est encore vide, voit un message d'attente plutôt
// que l'écran de création (qui échouerait de toute façon côté backend/
// RLS). Le backend reste la vraie barrière de sécurité — ceci n'ajuste
// que l'affichage.
// GESTION DES ÉTAGES (01/08/2026, demande explicite de Paul) : "🏢
// Ajouter un étage" ET "🗑️ Supprimer cet étage" — **tous deux déplacés
// le 02/08/2026** de l'écran de consultation du plan vers
// `LayoutEditor.jsx` (ce sont des actions D'ÉDITION, demande explicite
// de Paul, en deux temps : d'abord "Ajouter", puis "Supprimer" par
// cohérence) : boutons + confirmations vivent maintenant dans
// LayoutEditor, qui appelle `onAddFloor`/`onDeleteFloor`
// (= `handleStartAddFloor`/`handleDeleteFloor` ci-dessous). `onDeleteFloor`
// n'est passé que si un étage existant est sélectionné (rien à
// supprimer sur un étage pas encore enregistré) — LayoutEditor masque
// son bouton "Supprimer" si ce prop est absent. `handleStartAddFloor`
// repart sur un floorId vide, le prochain enregistrement crée un
// nouvel étage numéroté après ceux déjà présents (voir handleSaveLayout
// — corrige au passage un bug latent : sans ce calcul, un nouvel étage
// retombait TOUJOURS sur "Rez-de-chaussée"/RDC/niveau 0, même s'il y en
// avait déjà un).
//
// "🗑️ Réinitialiser cet étage" (dans LayoutEditor.jsx) — **correction
// (01/08/2026, "ne fait rien")** : ne passe plus par ce composant du
// tout. Avant, le bouton appelait `onReset` ici, qui effaçait TOUT LE
// FOYER côté backend (`resetHouseholdLayout`) puis rechargeait des
// props vides — sauf que l'état local de LayoutEditor (`useState`) ne
// se resynchronise jamais avec des props qui changent sans démontage,
// donc rien ne changeait à l'écran. LayoutEditor gère maintenant sa
// réinitialisation entièrement en interne (vide son propre brouillon),
// sans prop `onReset` ni appel backend — voir ce fichier pour le détail.
// Le même mécanisme (vider l'état local avant de prévenir le parent)
// est réutilisé par "Ajouter un étage" ci-dessus.
import { useState, useMemo, useEffect } from "react";
import { MOCK_USER } from "./mockData";
import { generateFloorTiles, extractRoomRectsFromTiles } from "../layout-editor/utils/layoutGeneration";
import { downloadLayoutAsJson, readLayoutFile } from "../layout-editor/utils/layoutStorage";
import { fetchHouseholdLayout, saveFloorLayout, resetHouseholdLayout, deleteFloor } from "./floorPlanService";
import FloorView3D from "./FloorView3D";
import Plan2DView from "./Plan2DView";
import LayoutEditor from "../layout-editor/components/LayoutEditor";
import OnboardingScreen from "./OnboardingScreen";
import "./HouseholdSpatialView.css";

export default function HouseholdSpatialView({
  householdId,
  user = MOCK_USER,
  housingName,
  onBackToDashboard,
  startInEditor = false,
  role = null,
  isOwner = true, // par défaut true : garde le comportement existant pour tout appelant qui ne transmet pas encore le rôle
}) {
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  // { [floorId]: [{id, x, y}, ...] } — l'id de la porte est gardé (pas
  // juste x/y), nécessaire pour la supprimer individuellement au
  // prochain enregistrement (voir saveFloorLayout).
  const [doorsWithIds, setDoorsWithIds] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [mode, setMode] = useState(startInEditor ? "editing" : "onboarding");
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [initialRoomId, setInitialRoomId] = useState(null);
  const [importError, setImportError] = useState(null);
  const [viewMode, setViewMode] = useState("2d");

  // Charge le plan du logement depuis le vrai backend au montage (et si
  // jamais householdId changeait, bien que le `key={selectedHousingId}`
  // posé par HouseholdRoot.jsx force normalement un remontage complet à
  // chaque changement de logement).
  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    fetchHouseholdLayout(householdId).then((layout) => {
      if (cancelled) return;
      setFloors(layout.floors);
      setRooms(layout.rooms);
      setDoorsWithIds(layout.doors);
      setSelectedFloorId(layout.floors[0]?.id ?? null);
      setDataLoading(false);
      if (!startInEditor) {
        setMode(layout.floors.length === 0 || layout.rooms.length === 0 ? "onboarding" : "app");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  // floorTiles/floorEdges dérivés, jamais stockés — la SEULE source que
  // lisent LayoutEditor (via extractRoomRectsFromTiles, tiles
  // uniquement) et Plan2DView (tiles + edges). REFONTE MUR-ARÊTE (voir
  // la conversation) : `tiles` ne contient plus que des dalles de sol,
  // les murs/portes sont maintenant dans `edges` (calculés séparément
  // par floor). `doorsWithIds` garde `orientation` en plus de `{x,y}` —
  // ces fonctions n'ont toujours pas besoin de l'id backend d'une porte,
  // juste de savoir sur quelle arête précise elle se trouve.
  const floorTiles = useMemo(() => {
    const result = {};
    for (const floor of floors) {
      const floorRooms = rooms.filter((r) => r.floorId === floor.id);
      const floorDoors = (doorsWithIds[floor.id] || []).map((d) => ({ orientation: d.orientation, x: d.x, y: d.y }));
      result[floor.id] = generateFloorTiles(floorRooms, { openingEdges: floorDoors }).tiles;
    }
    return result;
  }, [floors, rooms, doorsWithIds]);

  const floorEdges = useMemo(() => {
    const result = {};
    for (const floor of floors) {
      const floorRooms = rooms.filter((r) => r.floorId === floor.id);
      const floorDoors = (doorsWithIds[floor.id] || []).map((d) => ({ orientation: d.orientation, x: d.x, y: d.y }));
      result[floor.id] = generateFloorTiles(floorRooms, { openingEdges: floorDoors }).edges;
    }
    return result;
  }, [floors, rooms, doorsWithIds]);

  const roomsOnSelectedFloor = rooms.filter((r) => r.floorId === selectedFloorId);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];
  const selectedFloorTiles = floorTiles[selectedFloorId] || [];
  const selectedFloorEdges = floorEdges[selectedFloorId] || [];

  const handleSelectFloor = (floorId) => {
    setSelectedFloorId(floorId);
    setInitialRoomId(null); // repart sur la position par défaut du nouvel étage
  };

  // Bascule vers "Vue 3D" — recentre sur la première pièce valide de
  // l'étage à chaque fois.
  const handleShowFloorView = () => {
    setInitialRoomId(roomsOnSelectedFloor[0]?.id ?? null);
    setViewMode("3d");
  };

  // Clic sur une pièce depuis Plan2DView (lecture seule) : bascule vers
  // la Vue 3D, centrée sur CETTE pièce précisément.
  const handleSelectRoomFromPlan = (roomId) => {
    setInitialRoomId(roomId);
    setViewMode("3d");
  };

  /* ------------------------------ Mode Édition ------------------------------ */

  const handleStartCreateHousing = () => {
    setMode("editing");
  };

  const handleStartEditLayout = () => {
    setMode("editing");
  };

  // "🏢 Ajouter un étage" (01/08/2026, déplacé le 02/08/2026 — demande
  // explicite de Paul : c'est une action D'ÉDITION, elle doit vivre
  // dans LayoutEditor.jsx, pas dans l'écran de consultation du plan.
  // Passée en prop `onAddFloor`, appelée par LayoutEditor APRÈS avoir
  // vidé son propre brouillon local, voir ce composant). Repart sur un
  // floorId vide -> handleSaveLayout (ci-dessus) crée un NOUVEL étage à
  // l'enregistrement, numéroté après ceux déjà présents. Ne touche PAS
  // aux étages existants. `setMode("editing")` est un no-op si déjà en
  // Mode Édition (cas normal désormais, appelé depuis l'éditeur
  // lui-même) — reste utile si un jour appelé d'ailleurs.
  const handleStartAddFloor = () => {
    setSelectedFloorId(null);
    setMode("editing");
  };

  const editorInitialRooms = mode === "editing" && selectedFloorId ? extractRoomRectsFromTiles(selectedFloorTiles, roomsOnSelectedFloor) : [];
  const editorInitialDoors =
    mode === "editing" && selectedFloorId
      ? (doorsWithIds[selectedFloorId] || []).map((d) => ({ orientation: d.orientation, x: d.x, y: d.y }))
      : [];

  const handleSaveLayout = async (editedRoomRects, editedDoors) => {
    setSaving(true);
    setSaveError(null);

    // Correction (01/08/2026, découverte en implémentant "+ Ajouter un
    // étage") : sans ce calcul, `saveFloorLayout` retombe TOUJOURS sur
    // son défaut "Rez-de-chaussée"/RDC/niveau 0 pour un nouvel étage
    // (`floorId` null) — un vrai bug dès qu'on a déjà un RDC et qu'on en
    // ajoute un second, avant même que l'ajout d'étage n'existe comme
    // fonctionnalité. Numérote maintenant selon le nombre d'étages déjà
    // présents.
    const isNewFloor = !selectedFloorId;
    const nextLevel = floors.length;
    const floorMeta = isNewFloor
      ? nextLevel === 0
        ? { name: "Rez-de-chaussée", shortLabel: "RDC", level: 0 }
        : { name: `${nextLevel}${nextLevel === 1 ? "er" : "e"} étage`, shortLabel: `E${nextLevel}`, level: nextLevel }
      : undefined;

    const result = await saveFloorLayout({
      householdId,
      floorId: selectedFloorId,
      floorMeta,
      existingDoorsWithIds: selectedFloorId ? doorsWithIds[selectedFloorId] || [] : [],
      editedRoomRects,
      editedDoors,
    });

    setSaving(false);

    if (!result.success) {
      setSaveError(result.error);
      return; // reste en mode édition, rien n'est perdu côté brouillon local de LayoutEditor
    }

    const floorId = result.floor.id;
    setFloors((prev) => {
      const exists = prev.some((f) => f.id === floorId);
      return exists ? prev.map((f) => (f.id === floorId ? result.floor : f)) : [...prev, result.floor];
    });
    setRooms((prev) => [...prev.filter((r) => r.floorId !== floorId), ...result.rooms]);
    setDoorsWithIds((prev) => ({ ...prev, [floorId]: result.doors }));
    setSelectedFloorId(floorId);
    setMode("app");
    setViewMode("2d");
    // Bascule vers le Plan 2D après enregistrement (demande explicite de
    // Paul, 02/08/2026 — **remplace** une demande antérieure qui
    // préférait la Vue 3D). L'utilisateur voit d'abord l'ensemble du
    // plan qu'il vient de dessiner, avant de basculer lui-même en 3D
    // s'il le souhaite.
    setInitialRoomId(null); // utilise floor.avatarStart si l'utilisateur bascule ensuite en Vue 3D
  };

  const handleCancelEdit = () => {
    const hasNothing = floors.length === 0 || rooms.length === 0;
    if (hasNothing && onBackToDashboard) {
      // Rien n'a encore été enregistré pour ce logement (vient du
      // Dashboard, "+ Créer un logement", puis annulé sans rien tracer)
      // -> retour au Dashboard, pas à CET écran d'accueil interne, qui
      // n'a plus de sens dans ce contexte.
      onBackToDashboard();
      return;
    }
    setMode(hasNothing ? "onboarding" : "app");
  };

  // "🗑️ Supprimer cet étage" (01/08/2026, déplacé le 02/08/2026 dans
  // LayoutEditor.jsx — demande explicite de Paul, même raison que "+
  // Ajouter un étage" : une action destructrice sur LE PLAN doit vivre
  // dans l'éditeur, pas dans l'écran de consultation). Appelée
  // désormais toujours avec `floorId === selectedFloorId` (LayoutEditor
  // n'opère que sur l'étage en cours), après confirmation gérée par
  // l'éditeur lui-même. Sort du Mode Édition en conséquence : vers la
  // vue si un autre étage reste, vers l'accueil sinon.
  const handleDeleteFloor = async (floorId) => {
    setSaving(true);
    const result = await deleteFloor(householdId, floorId);
    setSaving(false);
    if (!result.success) {
      setSaveError(result.error);
      return;
    }
    setFloors((prev) => prev.filter((f) => f.id !== floorId));
    setRooms((prev) => prev.filter((r) => r.floorId !== floorId));
    setDoorsWithIds((prev) => {
      const next = { ...prev };
      delete next[floorId];
      return next;
    });
    const remaining = floors.filter((f) => f.id !== floorId);
    setSelectedFloorId(remaining[0]?.id ?? null);
    setInitialRoomId(null);
    setMode(remaining.length > 0 ? "app" : "onboarding");
  };

  const handleExportLayout = () => {
    downloadLayoutAsJson({
      version: 2, // v2 : doors porte désormais `orientation` (modèle mur-arête, voir la conversation)
      exportedAt: new Date().toISOString(),
      floors,
      rooms,
      doors: Object.fromEntries(
        Object.entries(doorsWithIds).map(([floorId, list]) => [floorId, list.map((d) => ({ orientation: d.orientation, x: d.x, y: d.y }))])
      ),
    });
  };

  // Importer un fichier REMPLACE tout le plan de ce logement (comme le
  // faisait déjà l'ancienne version localStorage) : on repart d'un
  // logement vide, puis chaque étage du fichier est recréé un par un
  // (réutilise saveFloorLayout, déjà vérifié, une fois par étage).
  const handleImportLayout = async (file) => {
    const result = await readLayoutFile(file);
    if (!result.success) {
      setImportError(result.error);
      return;
    }
    setImportError(null);
    setSaving(true);

    const resetRes = await resetHouseholdLayout(householdId);
    if (!resetRes.success) {
      setSaving(false);
      setSaveError(resetRes.error);
      return;
    }

    const imported = result.data;
    const newFloors = [];
    const newRooms = [];
    const newDoorsWithIds = {};

    for (const floor of imported.floors) {
      const roomsForFloor = imported.rooms.filter((r) => r.floorId === floor.id);
      const doorsForFloor = (imported.doors[floor.id] || []).map((d) => ({ orientation: d.orientation, x: d.x, y: d.y }));
      const saveRes = await saveFloorLayout({
        householdId,
        floorId: null, // toujours recréé, jamais reconcilié avec un id importé
        floorMeta: { name: floor.name, shortLabel: floor.shortLabel, level: floor.level },
        existingDoorsWithIds: [],
        editedRoomRects: roomsForFloor,
        editedDoors: doorsForFloor,
      });
      if (!saveRes.success) {
        setSaving(false);
        setSaveError(saveRes.error);
        return;
      }
      newFloors.push(saveRes.floor);
      newRooms.push(...saveRes.rooms);
      newDoorsWithIds[saveRes.floor.id] = saveRes.doors;
    }

    setSaving(false);
    setFloors(newFloors);
    setRooms(newRooms);
    setDoorsWithIds(newDoorsWithIds);
    setSelectedFloorId(newFloors[0]?.id ?? null);
    setInitialRoomId(null);
    setMode(newFloors.length === 0 || newRooms.length === 0 ? "onboarding" : "app");
  };

  if (dataLoading) {
    return <p className="spatial-view__loading">Chargement du plan...</p>;
  }

  // LOCATAIRE : le plan est en lecture seule (voir la conversation —
  // rôles PROPRIETAIRE/LOCATAIRE). Le backend refuse déjà toute
  // écriture venant d'un non-propriétaire (isHouseholdOwner,
  // roomService.js) — ceci n'ajuste que l'affichage, pour éviter de
  // montrer un écran de création/édition qui échouerait de toute façon.
  if (!isOwner && (mode === "onboarding" || mode === "editing")) {
    return (
      <p className="spatial-view__loading">
        {role === "LOCATAIRE"
          ? "En attente du propriétaire — il n'a pas encore dessiné le plan de ce logement."
          : "Chargement..."}
      </p>
    );
  }

  if (mode === "onboarding") {
    return <OnboardingScreen onCreateHousing={handleStartCreateHousing} />;
  }

  if (mode === "editing") {
    return (
      <LayoutEditor
        existingRooms={editorInitialRooms}
        existingDoors={editorInitialDoors}
        floorName={selectedFloor?.name}
        onSave={handleSaveLayout}
        saving={saving}
        onCancel={handleCancelEdit}
        onAddFloor={handleStartAddFloor}
        onDeleteFloor={selectedFloorId ? () => handleDeleteFloor(selectedFloorId) : undefined}
        onExport={handleExportLayout}
        onImport={handleImportLayout}
        importError={importError || saveError}
        onDismissImportError={() => {
          setImportError(null);
          setSaveError(null);
        }}
      />
    );
  }

  return (
    <div className="spatial-view">
      {onBackToDashboard && (
        <div className="spatial-view__housing-bar">
          <button type="button" className="spatial-view__back-btn" onClick={onBackToDashboard}>
            ← Mes logements
          </button>
          {housingName && <span className="spatial-view__housing-name">{housingName}</span>}
        </div>
      )}

      <div className="spatial-view__floor-selector" role="tablist" aria-label="Choix de l'étage">
        {floors.map((floor) => (
          <button
            key={floor.id}
            type="button"
            role="tab"
            aria-selected={floor.id === selectedFloorId}
            className={floor.id === selectedFloorId ? "spatial-view__floor-btn spatial-view__floor-btn--active" : "spatial-view__floor-btn"}
            onClick={() => handleSelectFloor(floor.id)}
          >
            {floor.shortLabel}
          </button>
        ))}
        {isOwner && (
          <button type="button" className="spatial-view__edit-btn" onClick={handleStartEditLayout}>
            ✏️ Modifier le plan
          </button>
        )}
      </div>

      <div className="spatial-view__switcher" role="tablist" aria-label="Choix de la vue">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "2d"}
          className={viewMode === "2d" ? "spatial-view__tab spatial-view__tab--active" : "spatial-view__tab"}
          onClick={() => setViewMode("2d")}
        >
          🗺️ Plan 2D
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "3d"}
          className={viewMode === "3d" ? "spatial-view__tab spatial-view__tab--active" : "spatial-view__tab"}
          onClick={handleShowFloorView}
        >
          🏠 Vue 3D
        </button>
      </div>

      {roomsOnSelectedFloor.length === 0 ? (
        <p className="spatial-view__empty-floor">Aucune pièce sur cet étage — ouvre "Modifier le plan" pour en tracer.</p>
      ) : viewMode === "2d" ? (
        <Plan2DView key={selectedFloorId} floor={selectedFloor} edges={selectedFloorEdges} rooms={roomsOnSelectedFloor} onSelectRoom={handleSelectRoomFromPlan} />
      ) : (
        <FloorView3D
          key={selectedFloorId}
          floor={selectedFloor}
          tiles={selectedFloorTiles}
          rooms={roomsOnSelectedFloor}
          user={user}
          initialRoomId={initialRoomId}
        />
      )}
    </div>
  );
}
