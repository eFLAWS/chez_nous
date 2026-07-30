// src/features/household/ApartmentSpatialMvp.jsx
// Orchestrateur du MVP spatial. Trois modes :
//   - "onboarding" : aucun étage/pièce -> écran d'accueil
//   - "editing"    : Mode Édition (LayoutEditor) -> CRÉE/MODIFIE le plan
//   - "app"        : le logement sélectionné, commutateur "Plan 2D" /
//                    "Vue 2.5D" — deux façons de LIRE le même plan déjà
//                    construit, jamais de le modifier (ça, c'est le rôle
//                    exclusif du mode "editing").
//
// ÉTAPE 4/4, DERNIÈRE (voir la conversation) : le PLAN (étages/pièces/
// portes) est maintenant chargé/enregistré via le vrai backend
// (features/household/utils/householdLayoutApi.js), plus localStorage.
// `layoutStorage.js` (localStorage) reste utilisé UNIQUEMENT par
// l'export/import de fichier JSON (validation locale du fichier), pas
// pour la persistance elle-même. `householdId` (nouveau, remplace
// `storageKey`) est le VRAI id du foyer, venu de HouseholdRoot.jsx —
// plus besoin de clé synthétique maintenant que la liste des logements
// ET leur plan sont tous les deux réels.
//
// PERSISTANCE, changement de modèle important : plus de sauvegarde
// automatique à chaque frappe (impossible de toute façon — chaque
// changement doit passer par des appels API individuels, pas un simple
// blob écrit en continu). La sauvegarde reste un geste explicite
// ("Enregistrer le plan" dans LayoutEditor), comme demandé
// explicitement dans une conversation précédente sur ce sujet.
//
// RÉCONCILIATION "supprimer puis recréer" (voir householdLayoutApi.js
// pour le détail et les limites assumées) — vérifiée avec de vraies
// requêtes HTTP avant d'être branchée ici.
//
// RÔLE (nouveau, voir la conversation) : `isOwner`/`role` viennent de
// HouseholdViewPage.jsx (useHouseholdRole) — un LOCATAIRE ne voit
// jamais le bouton "Modifier le plan", et si le plan est encore vide,
// voit un message d'attente plutôt que l'écran de création (qui
// échouerait de toute façon côté backend). Le backend reste la vraie
// barrière de sécurité — ceci n'ajuste que l'affichage.
import { useState, useMemo, useEffect } from "react";
import { MOCK_USER } from "./mockData";
import { generateFloorTiles, extractRoomRectsFromTiles } from "../layout-editor/utils/layoutGeneration";
import { downloadLayoutAsJson, readLayoutFile } from "../layout-editor/utils/layoutStorage";
import { fetchHouseholdLayout, saveFloorLayout, resetHouseholdLayout } from "./utils/householdLayoutApi";
import FloorView2D from "./FloorView2D";
import Plan2DView from "./Plan2DView";
import LayoutEditor from "../layout-editor/components/LayoutEditor";
import OnboardingScreen from "./OnboardingScreen";
import "./ApartmentSpatialMvp.css";

export default function ApartmentSpatialMvp({
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

  // floorTiles dérivé, jamais stocké — la SEULE source que lisent à la
  // fois LayoutEditor (via extractRoomRectsFromTiles) et FloorView2D/
  // Plan2DView (directement). `doorsWithIds` réduit à {x,y} ici : ces
  // deux fonctions n'ont jamais besoin de connaître l'id backend d'une
  // porte, seulement sa position.
  const floorTiles = useMemo(() => {
    const result = {};
    for (const floor of floors) {
      const floorRooms = rooms.filter((r) => r.floorId === floor.id);
      const floorDoors = (doorsWithIds[floor.id] || []).map((d) => ({ x: d.x, y: d.y }));
      result[floor.id] = generateFloorTiles(floorRooms, { explicitDoors: floorDoors }).tiles;
    }
    return result;
  }, [floors, rooms, doorsWithIds]);

  const roomsOnSelectedFloor = rooms.filter((r) => r.floorId === selectedFloorId);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];
  const selectedFloorTiles = floorTiles[selectedFloorId] || [];

  const handleSelectFloor = (floorId) => {
    setSelectedFloorId(floorId);
    setInitialRoomId(null); // repart sur la position par défaut du nouvel étage
  };

  // Bascule vers "Vue 2.5D" — recentre sur la première pièce valide de
  // l'étage à chaque fois.
  const handleShowFloorView = () => {
    setInitialRoomId(roomsOnSelectedFloor[0]?.id ?? null);
    setViewMode("2.5d");
  };

  // Clic sur une pièce depuis Plan2DView (lecture seule) : bascule vers
  // la Vue 2.5D, centrée sur CETTE pièce précisément.
  const handleSelectRoomFromPlan = (roomId) => {
    setInitialRoomId(roomId);
    setViewMode("2.5d");
  };

  /* ------------------------------ Mode Édition ------------------------------ */

  const handleStartCreateHousing = () => {
    setMode("editing");
  };

  const handleStartEditLayout = () => {
    setMode("editing");
  };

  const editorInitialRooms = mode === "editing" && selectedFloorId ? extractRoomRectsFromTiles(selectedFloorTiles, roomsOnSelectedFloor) : [];
  const editorInitialDoors = mode === "editing" && selectedFloorId ? (doorsWithIds[selectedFloorId] || []).map((d) => ({ x: d.x, y: d.y })) : [];

  const handleSaveLayout = async (editedRoomRects, editedDoors) => {
    setSaving(true);
    setSaveError(null);

    const result = await saveFloorLayout({
      householdId,
      floorId: selectedFloorId,
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
    setViewMode("2.5d");
    // Bascule vers la Vue 2.5D après enregistrement, comme demandé
    // explicitement — l'avatar apparaît immédiatement dans le plan qui
    // vient d'être enregistré.
    setInitialRoomId(null); // utilise floor.avatarStart, qu'on vient de recevoir
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

  // Supprime TOUS les étages de ce logement côté backend (cascade vers
  // pièces/portes/tâches) -> retombe sur l'écran d'accueil.
  const handleResetLayout = async () => {
    setSaving(true);
    const result = await resetHouseholdLayout(householdId);
    setSaving(false);
    if (!result.success) {
      setSaveError(result.error);
      return;
    }
    setFloors([]);
    setRooms([]);
    setDoorsWithIds({});
    setSelectedFloorId(null);
    setMode("onboarding");
  };

  const handleExportLayout = () => {
    downloadLayoutAsJson({
      version: 1,
      exportedAt: new Date().toISOString(),
      floors,
      rooms,
      doors: Object.fromEntries(Object.entries(doorsWithIds).map(([floorId, list]) => [floorId, list.map((d) => ({ x: d.x, y: d.y }))])),
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
      const doorsForFloor = (imported.doors[floor.id] || []).map((d) => ({ x: d.x, y: d.y }));
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
    return <p className="spatial-mvp__loading">Chargement du plan...</p>;
  }

  // LOCATAIRE : le plan est en lecture seule (voir la conversation —
  // rôles PROPRIETAIRE/LOCATAIRE). Le backend refuse déjà toute
  // écriture venant d'un non-propriétaire (isHouseholdOwner,
  // roomService.js) — ceci n'ajuste que l'affichage, pour éviter de
  // montrer un écran de création/édition qui échouerait de toute façon.
  if (!isOwner && (mode === "onboarding" || mode === "editing")) {
    return (
      <p className="spatial-mvp__loading">
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
        onReset={handleResetLayout}
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
    <div className="spatial-mvp">
      {onBackToDashboard && (
        <div className="spatial-mvp__housing-bar">
          <button type="button" className="spatial-mvp__back-btn" onClick={onBackToDashboard}>
            ← Mes logements
          </button>
          {housingName && <span className="spatial-mvp__housing-name">{housingName}</span>}
        </div>
      )}

      <div className="spatial-mvp__floor-selector" role="tablist" aria-label="Choix de l'étage">
        {floors.map((floor) => (
          <button
            key={floor.id}
            type="button"
            role="tab"
            aria-selected={floor.id === selectedFloorId}
            className={floor.id === selectedFloorId ? "spatial-mvp__floor-btn spatial-mvp__floor-btn--active" : "spatial-mvp__floor-btn"}
            onClick={() => handleSelectFloor(floor.id)}
          >
            {floor.shortLabel}
          </button>
        ))}
        {isOwner && (
          <button type="button" className="spatial-mvp__edit-btn" onClick={handleStartEditLayout}>
            ✏️ Modifier le plan
          </button>
        )}
      </div>

      <div className="spatial-mvp__switcher" role="tablist" aria-label="Choix de la vue">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "2d"}
          className={viewMode === "2d" ? "spatial-mvp__tab spatial-mvp__tab--active" : "spatial-mvp__tab"}
          onClick={() => setViewMode("2d")}
        >
          🗺️ Plan 2D
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "2.5d"}
          className={viewMode === "2.5d" ? "spatial-mvp__tab spatial-mvp__tab--active" : "spatial-mvp__tab"}
          onClick={handleShowFloorView}
        >
          🏠 Vue 2.5D
        </button>
      </div>

      {roomsOnSelectedFloor.length === 0 ? (
        <p className="spatial-mvp__empty-floor">Aucune pièce sur cet étage — ouvre "Modifier le plan" pour en tracer.</p>
      ) : viewMode === "2d" ? (
        <Plan2DView key={selectedFloorId} floor={selectedFloor} tiles={selectedFloorTiles} rooms={roomsOnSelectedFloor} onSelectRoom={handleSelectRoomFromPlan} />
      ) : (
        <FloorView2D
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
