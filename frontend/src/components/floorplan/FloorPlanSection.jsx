// FloorPlanSection.jsx
// Vue du plan de l'appartement, consciente des étages. Choix explicite de
// l'utilisateur : des plans SÉPARÉS (comme des strates), jamais un
// empilement visuel. S'il n'y a qu'un seul étage (ou aucun), le plan
// s'affiche directement, sans sélecteur — dès qu'il y en a plusieurs, un
// sélecteur apparaît pour choisir lequel regarder, et seules les pièces
// de cet étage-là sont affichées à la fois.
import { useState, useEffect } from "react";
import { useItems } from "../../hooks/useItems";
import { useToast } from "../../hooks/useToast";
import { validateFloor } from "../../validators/formValidators";
import ItemGrid from "../items/ItemGrid";
import RoomFloorPlan from "./RoomFloorPlan";
import FloorThumbnail from "./FloorThumbnail";
import ToastStack from "../common/Toast";
import Spinner from "../common/Spinner";

export default function FloorPlanSection({ householdId, roomState, tasks }) {
  const floorState = useItems("floor", { householdId });
  const { toasts, showToast, dismiss } = useToast();

  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [addingFloor, setAddingFloor] = useState(false);
  const [floorName, setFloorName] = useState("");
  const [floorLevel, setFloorLevel] = useState(0);
  const [removeError, setRemoveError] = useState(null);
  const [confirmingRemoveFloor, setConfirmingRemoveFloor] = useState(false);

  const floors = [...floorState.items].sort((a, b) => a.level - b.level);

  // Choisit automatiquement un étage par défaut (le plus bas niveau) dès
  // que la liste change, si rien n'est encore sélectionné ou si le choix
  // précédent a disparu (étage supprimé, par ex.).
  useEffect(() => {
    if (floors.length === 0) {
      if (selectedFloorId !== null) setSelectedFloorId(null);
      return;
    }
    if (!floors.some((f) => f.id === selectedFloorId)) {
      setSelectedFloorId(floors[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors.map((f) => f.id).join(",")]);

  if (floorState.loading || roomState.loading) {
    return (
      <section className="floor-plan-section">
        <p className="item-grid__state">
          <Spinner size={14} /> Chargement du plan…
        </p>
      </section>
    );
  }

  const showSwitcher = floors.length >= 2;

  // 0 étage déclaré : toutes les pièces sont "sans étage" (floorId null).
  // 1 étage ou plus : uniquement celles de l'étage sélectionné.
  const visibleRooms = floors.length === 0
    ? roomState.items.filter((r) => !r.floorId)
    : roomState.items.filter((r) => r.floorId === selectedFloorId);

  // Décompte, avant même d'appeler le serveur, ce que la suppression de
  // l'étage actuellement affiché emporterait avec elle — les données sont
  // déjà chargées, pas besoin d'un aller-retour supplémentaire pour ça.
  const roomsOnSelectedFloor = roomState.items.filter((r) => r.floorId === selectedFloorId);
  const roomIdsOnSelectedFloor = new Set(roomsOnSelectedFloor.map((r) => r.id));
  const tasksOnSelectedFloor = (tasks || []).filter((t) => roomIdsOnSelectedFloor.has(t.roomId));

  const [addFloorErrors, setAddFloorErrors] = useState([]);

  const handleAddFloor = async (e) => {
    e.preventDefault();
    const nextLevel = floors.length ? Math.max(...floors.map((f) => f.level)) + 1 : 0;
    const candidate = {
      id: `tmp-${Date.now()}`, // id réel généré côté serveur ; requis seulement pour satisfaire validateFloor
      name: floorName.trim(),
      level: Number.isFinite(Number(floorLevel)) ? Number(floorLevel) : nextLevel,
      householdId,
    };

    const existingHouseholdIds = new Set(householdId ? [householdId] : []);
    const { valid, errors } = validateFloor(candidate, { existingHouseholdIds });
    if (!valid) {
      setAddFloorErrors(errors);
      return;
    }

    setAddFloorErrors([]);
    const res = await floorState.create({ name: candidate.name, level: candidate.level, householdId });
    if (res.success) {
      showToast("Étage ajouté", "success");
      setFloorName("");
      setFloorLevel(nextLevel + 1);
      setAddingFloor(false);
      setSelectedFloorId(res.data.id);
    } else {
      showToast(res.error, "error");
    }
  };

  const handleRemoveFloor = async () => {
    if (!selectedFloorId) return;
    setRemoveError(null);
    setConfirmingRemoveFloor(false);
    const res = await floorState.remove(selectedFloorId);
    if (res.success) {
      const { deletedRoomCount, deletedTaskCount } = res.data;
      showToast(
        deletedRoomCount > 0
          ? `Étage retiré (${deletedRoomCount} pièce${deletedRoomCount > 1 ? "s" : ""} et ${deletedTaskCount} tâche${deletedTaskCount > 1 ? "s" : ""} supprimées)`
          : "Étage retiré",
        "success"
      );
    } else {
      setRemoveError(res.error);
    }
  };

  const selectedFloorName = floors.find((f) => f.id === selectedFloorId)?.name;

  return (
    <section className="floor-plan-section">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="floor-plan-section__header">
        <h2>Plan de l'appartement</h2>

        <div className="floor-plan-section__actions">
          {selectedFloorId && !confirmingRemoveFloor && (
            <button type="button" className="ghost-btn" onClick={() => setConfirmingRemoveFloor(true)}>
              − Retirer l'étage
            </button>
          )}
          <button type="button" className="ghost-btn" onClick={() => setAddingFloor((a) => !a)}>
            {addingFloor ? "Fermer" : "+ Ajouter un étage"}
          </button>
        </div>
      </div>

      {confirmingRemoveFloor && (
        <div className="banner banner--error">
          <span>
            Supprimer "{selectedFloorName}" ?
            {roomsOnSelectedFloor.length > 0
              ? ` Cela supprimera aussi ${roomsOnSelectedFloor.length} pièce${roomsOnSelectedFloor.length > 1 ? "s" : ""}` +
                (tasksOnSelectedFloor.length > 0
                  ? ` et ${tasksOnSelectedFloor.length} tâche${tasksOnSelectedFloor.length > 1 ? "s" : ""} rattachée${tasksOnSelectedFloor.length > 1 ? "s" : ""}.`
                  : ".")
              : " Cet étage ne contient aucune pièce."}
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={handleRemoveFloor}>
              Confirmer
            </button>
            <button type="button" onClick={() => setConfirmingRemoveFloor(false)}>
              Annuler
            </button>
          </span>
        </div>
      )}

      {removeError && (
        <div className="banner banner--error">
          <span>{removeError}</span>
          <button type="button" onClick={() => setRemoveError(null)} aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      {addingFloor && (
        <form className="item-form" onSubmit={handleAddFloor}>
          <label>
            Nom de l'étage
            <input value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder="ex. Étage 1" autoFocus />
          </label>
          <label>
            Niveau (0 = rez-de-chaussée, négatif = sous-sol)
            <input type="number" step="1" value={floorLevel} onChange={(e) => setFloorLevel(e.target.value)} />
          </label>

          {addFloorErrors.length > 0 && (
            <ul className="item-form__errors">
              {addFloorErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          <div className="item-form__actions">
            <button type="submit" disabled={floorState.creating}>
              {floorState.creating ? (
                <>
                  <Spinner size={14} /> Création…
                </>
              ) : (
                "Ajouter"
              )}
            </button>
          </div>
        </form>
      )}

      {showSwitcher && (
        <div className="floor-switcher">
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === selectedFloorId ? "floor-switcher__tab floor-switcher__tab--active" : "floor-switcher__tab"}
              onClick={() => { setSelectedFloorId(f.id); setConfirmingRemoveFloor(false); }}
            >
              <span className="floor-switcher__thumb">
                <FloorThumbnail rooms={roomState.items.filter((r) => r.floorId === f.id)} />
              </span>
              <span className="floor-switcher__label">{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {floors.length > 0 && !selectedFloorId && (
        <p className="item-grid__empty">Sélectionnez un étage ci-dessus pour voir son plan.</p>
      )}

      {(floors.length === 0 || selectedFloorId) && (
        <ItemGrid
          kind="room"
          householdId={householdId}
          state={roomState}
          floors={floors}
          newItemDefaults={{ floorId: selectedFloorId }}
          renderItems={(items, { onMove, onDelete }) => (
            <RoomFloorPlan rooms={visibleRooms} tasks={tasks} onMove={onMove} onDelete={onDelete} />
          )}
        />
      )}
    </section>
  );
}
