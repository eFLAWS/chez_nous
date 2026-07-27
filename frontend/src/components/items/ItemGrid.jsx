// ItemGrid.jsx — Composant 3 : "Conteneur Principal / Grille"
// Depuis l'introduction du Dashboard (qui a besoin des tâches ET des
// projets en même temps), la récupération des données est remontée dans
// AppShell : ItemGrid reçoit son état via la prop `state` (le retour de
// useItems, calculé une seule fois par AppShell) au lieu d'appeler le hook
// lui-même. Ça évite un double appel réseau pour les mêmes données, sans
// dupliquer la logique de useItems.
//
// Toujours responsable de : l'orchestration cartes/formulaire, ses propres
// états locaux (élément en édition, bannière d'erreur d'action), et — nouveau
// pour cette étape — le calcul du taux d'avancement par projet (à partir des
// tâches reçues), pour alimenter la barre de progression de chaque carte projet.
//
// `renderItems` (optionnel) permet d'afficher les éléments autrement qu'en
// cartes (ex. RoomFloorPlan pour les pièces, en blocs positionnés sur un
// plan) SANS dupliquer le formulaire, les toasts, les bannières d'erreur ni
// le squelette de chargement — tout ce qui entoure la liste reste partagé.
import { useState } from "react";
import { useToast } from "../../hooks/useToast";
import ItemCard from "./ItemCard";
import ItemForm from "./ItemForm";
import ToastStack from "../common/Toast";
import SkeletonGrid from "../common/Skeleton";

const ACTION_LABELS = {
  task: { create: "Tâche créée", update: "Tâche mise à jour", remove: "Tâche supprimée" },
  project: { create: "Projet créé", update: "Projet mis à jour", remove: "Projet supprimé" },
  pet: { create: "Animal ajouté", update: "Animal mis à jour", remove: "Animal supprimé" },
  room: { create: "Pièce ajoutée", update: "Pièce mise à jour", remove: "Pièce supprimée" },
};
const KIND_TITLES = { task: "Tâches", project: "Projets", pet: "Animaux", room: "Pièces" };

function completionForProject(projectId, tasks) {
  if (!tasks) return null;
  const related = tasks.filter((t) => t.projectId === projectId);
  if (!related.length) return null;
  const done = related.filter((t) => t.status === "done").length;
  return Math.round((done / related.length) * 100);
}

export default function ItemGrid({ kind, users, projects, tasks, rooms, pets, floors, householdId, state, renderItems, newItemDefaults }) {
  const { items, loading, error, creating, mutatingIds, refresh, create, update, remove } = state;
  const { toasts, showToast, dismiss } = useToast();
  const [editing, setEditing] = useState(null); // null = fermé, {} = création, {...item} = édition
  const [actionError, setActionError] = useState(null);

  const labels = ACTION_LABELS[kind];

  const handleSubmit = async (values) => {
    const isEdit = Boolean(editing && editing.id);
    const res = isEdit ? await update(editing.id, values) : await create(values);
    if (res.success) {
      setEditing(null);
      showToast(isEdit ? labels.update : labels.create, "success");
    }
    return res;
  };

  const handleDelete = async (id) => {
    setActionError(null);
    const res = await remove(id);
    if (res.success) showToast(labels.remove, "success");
    else setActionError(res.error);
  };

  // utilisé par RoomFloorPlan (glisser-déposer) : même circuit toast/erreur
  // que create/delete, sans rien dupliquer. Retourne { success, error } au
  // composant appelant pour qu'il puisse revenir en arrière visuellement
  // si le serveur a refusé la position (ex. chevauchement détecté).
  const handleMove = async (id, patch) => {
    setActionError(null);
    const res = await update(id, patch);
    if (res.success) showToast(labels.update, "success");
    else setActionError(res.error);
    return res;
  };

  if (loading) {
    return (
      <section className="item-grid">
        <header className="item-grid__header">
          <h2>{KIND_TITLES[kind] || kind}</h2>
        </header>
        <SkeletonGrid />
      </section>
    );
  }

  if (error) {
    return (
      <section className="item-grid">
        <div className="banner banner--error">
          <span>{error}</span>
          <button type="button" onClick={refresh}>
            Réessayer
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="item-grid">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <header className="item-grid__header">
        <h2>{KIND_TITLES[kind] || kind}</h2>
        <button type="button" onClick={() => setEditing(newItemDefaults || {})} disabled={creating}>
          {creating ? "Création…" : "+ Nouveau"}
        </button>
      </header>

      {actionError && (
        <div className="banner banner--error">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      {editing && (
        <ItemForm
          kind={kind}
          initialValue={editing}
          users={users}
          projects={projects}
          rooms={rooms}
          floors={floors}
          householdId={householdId}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      {renderItems ? (
        renderItems(items, { onMove: handleMove, onDelete: handleDelete })
      ) : (
        <div className="item-grid__cards">
          {items.length === 0 ? (
            <p className="item-grid__empty">Rien à afficher pour l'instant.</p>
          ) : (
            items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                kind={kind}
                ownerName={users?.find((u) => u.id === item.ownerId)?.name}
                assigneeName={users?.find((u) => u.id === item.assigneeId)?.name}
                roomName={rooms?.find((r) => r.id === item.roomId)?.name}
                petName={pets?.find((p) => p.id === item.petId)?.name}
                completion={kind === "project" ? completionForProject(item.id, tasks) : null}
                isMutating={mutatingIds.has(item.id)}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
