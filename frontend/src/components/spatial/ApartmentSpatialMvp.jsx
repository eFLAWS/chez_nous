// src/components/spatial/ApartmentSpatialMvp.jsx
// Orchestrateur du MVP spatial. Trois modes :
//   - "onboarding" : aucun logement (aucun étage/pièce) -> écran d'accueil
//   - "editing"    : Mode Édition (LayoutEditor) -> tracé de pièces
//   - "app"        : Vue Ensemble / Vue Étage habituelles
//
// C'est ce composant que main.jsx monte temporairement pour le MVP — pas
// App.jsx ni Dashboard.jsx, qui restent le vrai flux applicatif (voir
// README pour ce choix).
//
// SIMPLIFIÉ (voir la conversation) : mobilier et tâches retirés pour
// l'instant.
//
// PERSISTANCE (nouveau) : `floors`/`rooms`/`doors` sont maintenant
// automatiquement sauvegardés dans localStorage à chaque changement, et
// rechargés depuis là au démarrage si présents — voir
// services/layoutStorage.js.
//
// CHANGEMENT D'ARCHITECTURE IMPORTANT : `floorTiles` n'est PLUS un état
// séparé (fini `setFloorTiles`). Comme il est entièrement DÉRIVÉ de
// `rooms` + `doors` via generateFloorTiles, le garder comme état à part
// risquait de le laisser désynchronisé (oublier de le régénérer après
// un changement). Il est maintenant recalculé à chaque rendu via
// useMemo — ne peut plus jamais diverger des données qui le produisent.
import { useState, useMemo, useEffect } from "react";
import { MOCK_FLOORS, MOCK_ROOMS, MOCK_USER } from "../../data/mockData";
import { generateFloorTiles, extractRoomRectsFromTiles } from "../../services/layoutGeneration";
import { buildLayoutPayload, saveLayoutToStorage, loadLayoutFromStorage, clearLayoutStorage, downloadLayoutAsJson, readLayoutFile } from "../../services/layoutStorage";
import ApartmentOverview2D from "./ApartmentOverview2D";
import FloorView2D from "./FloorView2D";
import LayoutEditor from "./LayoutEditor";
import OnboardingScreen from "./OnboardingScreen";
import "./ApartmentSpatialMvp.css";

export default function ApartmentSpatialMvp({
  floors: initialFloors = MOCK_FLOORS,
  rooms: initialRooms = MOCK_ROOMS,
  user = MOCK_USER,
}) {
  // Lu à chaque rendu, mais seul son résultat au tout premier rendu
  // compte (utilisé uniquement dans les initialiseurs useState
  // ci-dessous, que React n'invoque qu'une fois).
  const storedLayout = loadLayoutFromStorage();

  const [floors, setFloors] = useState(() => storedLayout?.floors ?? initialFloors);
  const [rooms, setRooms] = useState(() => storedLayout?.rooms ?? initialRooms);
  const [doors, setDoors] = useState(() => storedLayout?.doors ?? {}); // { [floorId]: [{x,y}, ...] }

  // Aucun étage/pièce -> écran d'accueil au premier rendu. Une fois un
  // logement créé (ou si les données de départ/stockées en avaient déjà
  // un), on reste en mode "app" — ce n'est vérifié qu'à l'initialisation,
  // pas à chaque rendu, pour ne pas repasser en accueil si l'utilisateur
  // vide son plan par erreur en cours de route.
  const [mode, setMode] = useState(() => (floors.length === 0 || rooms.length === 0 ? "onboarding" : "app"));

  const [view, setView] = useState("overview"); // "overview" | "floor"
  const [selectedFloorId, setSelectedFloorId] = useState(floors[0]?.id ?? null);
  const [initialRoomId, setInitialRoomId] = useState(null);
  const [importError, setImportError] = useState(null);

  // Sauvegarde automatique : à chaque changement de floors/rooms/doors
  // (création, déplacement, suppression, ajout de porte, changement de
  // type/nom — tout passe par ces trois états), persiste silencieusement
  // dans localStorage. Échoue sans bruit si le stockage est indisponible
  // (mode privé, quota dépassé...) — une sauvegarde ratée ne doit jamais
  // faire planter l'appli.
  useEffect(() => {
    saveLayoutToStorage(buildLayoutPayload({ floors, rooms, doors }));
  }, [floors, rooms, doors]);

  // floorTiles dérivé, jamais stocké (voir l'en-tête du fichier).
  const floorTiles = useMemo(() => {
    const result = {};
    for (const floor of floors) {
      const floorRooms = rooms.filter((r) => r.floorId === floor.id);
      const floorDoors = doors[floor.id] || [];
      result[floor.id] = generateFloorTiles(floorRooms, { explicitDoors: floorDoors }).tiles;
    }
    return result;
  }, [floors, rooms, doors]);

  const roomsOnSelectedFloor = rooms.filter((r) => r.floorId === selectedFloorId);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];
  const selectedFloorTiles = floorTiles[selectedFloorId] || [];

  const handleSelectFloor = (floorId) => {
    setSelectedFloorId(floorId);
    setView("overview");
  };

  const handleSelectRoom = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) setSelectedFloorId(room.floorId);
    setInitialRoomId(roomId);
    setView("floor");
  };

  const handleShowFloorView = () => {
    setInitialRoomId(roomsOnSelectedFloor[0]?.id ?? null);
    setView("floor");
  };

  /* ------------------------------ Mode Édition ------------------------------ */

  const handleStartCreateHousing = () => {
    setMode("editing");
  };

  const handleStartEditLayout = () => {
    setMode("editing");
  };

  const editorInitialRooms = mode === "editing" && selectedFloorId ? extractRoomRectsFromTiles(selectedFloorTiles, roomsOnSelectedFloor) : [];
  // Portes de l'étage édité — lues directement depuis l'état `doors`
  // (plus depuis les dalles) : c'est maintenant la source canonique.
  const editorInitialDoors = mode === "editing" && selectedFloorId ? doors[selectedFloorId] || [] : [];

  const handleSaveLayout = (editedRoomRects, editedDoors) => {
    // Aucun étage encore (premier logement) : en crée un par défaut pour
    // accueillir les pièces tracées.
    let floorId = selectedFloorId;
    let nextFloors = floors;
    if (!floorId) {
      floorId = `floor-${Date.now()}`;
      nextFloors = [{ id: floorId, name: "Rez-de-chaussée", shortLabel: "RDC", level: 0, avatarStart: { x: 0, y: 0 } }];
      setSelectedFloorId(floorId);
    }

    const roomsWithFloorId = editedRoomRects.map((r) => ({ ...r, floorId }));
    const otherFloorsRooms = rooms.filter((r) => r.floorId !== floorId);
    const nextRooms = [...otherFloorsRooms, ...roomsWithFloorId];

    // Position de départ de l'avatar : TOUJOURS recalculée au centre de
    // la première pièce tracée (jamais une position fixe codée en dur) —
    // vérifié par calcul que le centre d'un rectangle de pièce tombe
    // toujours sur une case de sol de cette même pièce, par construction.
    const firstRoom = editedRoomRects[0];
    const avatarStart = firstRoom
      ? { x: firstRoom.x + Math.floor(firstRoom.width / 2), y: firstRoom.y + Math.floor(firstRoom.height / 2) }
      : { x: 0, y: 0 };
    nextFloors = nextFloors.map((f) => (f.id === floorId ? { ...f, avatarStart } : f));

    setFloors(nextFloors);
    setRooms(nextRooms);
    setDoors((prev) => ({ ...prev, [floorId]: editedDoors }));
    setMode("app");
    // Bascule directement vers la Vue Étage (FloorView2D), pas la Vue
    // Ensemble, comme demandé explicitement.
    setInitialRoomId(null); // utilise floor.avatarStart, qu'on vient de calculer
    setView("floor");
  };

  const handleCancelEdit = () => {
    setMode(floors.length === 0 || rooms.length === 0 ? "onboarding" : "app");
  };

  // Efface le stockage ET remet l'état en mémoire à zéro -> retombe sur
  // l'écran d'accueil, prêt pour un nouveau logement de zéro.
  const handleResetLayout = () => {
    clearLayoutStorage();
    setFloors([]);
    setRooms([]);
    setDoors({});
    setSelectedFloorId(null);
    setMode("onboarding");
  };

  const handleExportLayout = () => {
    downloadLayoutAsJson(buildLayoutPayload({ floors, rooms, doors }));
  };

  const handleImportLayout = async (file) => {
    const result = await readLayoutFile(file);
    if (!result.success) {
      setImportError(result.error);
      return;
    }
    setImportError(null);
    const imported = result.data;
    setFloors(imported.floors);
    setRooms(imported.rooms);
    setDoors(imported.doors);
    setSelectedFloorId(imported.floors[0]?.id ?? null);
    setMode(imported.floors.length === 0 || imported.rooms.length === 0 ? "onboarding" : "app");
    setView("overview");
  };

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
        onCancel={handleCancelEdit}
        onReset={handleResetLayout}
        onExport={handleExportLayout}
        onImport={handleImportLayout}
        importError={importError}
        onDismissImportError={() => setImportError(null)}
      />
    );
  }

  return (
    <div className="spatial-mvp">
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
        <button type="button" className="spatial-mvp__edit-btn" onClick={handleStartEditLayout}>
          ✏️ Modifier le plan
        </button>
      </div>

      <div className="spatial-mvp__switcher" role="tablist" aria-label="Choix de la vue">
        <button
          type="button"
          role="tab"
          aria-selected={view === "overview"}
          className={view === "overview" ? "spatial-mvp__tab spatial-mvp__tab--active" : "spatial-mvp__tab"}
          onClick={() => setView("overview")}
        >
          🗺️ Vue ensemble
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "floor"}
          className={view === "floor" ? "spatial-mvp__tab spatial-mvp__tab--active" : "spatial-mvp__tab"}
          onClick={handleShowFloorView}
        >
          🏠 Vue étage
        </button>
      </div>

      {view === "overview" && <ApartmentOverview2D rooms={roomsOnSelectedFloor} onSelectRoom={handleSelectRoom} />}

      {view === "floor" && roomsOnSelectedFloor.length > 0 && (
        <FloorView2D
          key={selectedFloorId}
          floor={selectedFloor}
          tiles={selectedFloorTiles}
          rooms={roomsOnSelectedFloor}
          user={user}
          initialRoomId={initialRoomId}
          onBack={() => setView("overview")}
        />
      )}
    </div>
  );
}
