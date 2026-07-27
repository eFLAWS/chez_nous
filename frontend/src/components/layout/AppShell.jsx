// AppShell.jsx
// Conteneur racine : seul endroit qui appelle useItems pour "task",
// "project" et "room"/"floor" (via FloorPlanSection). Partage ensuite les
// mêmes listes au Dashboard, à TaskOverview et aux grilles, pour ne
// jamais recharger deux fois les mêmes données.
//
// `currentUserId`/`householdId` représentent la session de l'utilisateur
// connecté (voir App.jsx) — ce composant suppose qu'une authentification
// a déjà eu lieu en amont ; il ne la gère pas lui-même.
//
// Note : le kind "pet" est retiré pour l'instant (occupants pas encore
// câblés côté écran — voir README, "Ce qui manque").
import { useState } from "react";
import { useItems } from "../../hooks/useItems";
import { useToast } from "../../hooks/useToast";
import { api } from "../../api";
import Dashboard from "./Dashboard";
import TaskOverview from "../tasks/TaskOverview";
import ItemGrid from "../items/ItemGrid";
import FloorPlanSection from "../floorplan/FloorPlanSection";
import InviteForm from "../auth/InviteForm";
import ToastStack from "../common/Toast";

export default function AppShell({ users, householdId, currentUserId }) {
  const taskState = useItems("task");
  const projectState = useItems("project");
  const roomState = useItems("room", { householdId });
  const { toasts, showToast, dismiss } = useToast();
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);

  return (
    <div className="app-shell">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="app-shell__header">
        <h1 className="app-shell__title">Tableau de bord</h1>
        <button type="button" className="ghost-btn" onClick={() => setInvitePanelOpen((o) => !o)}>
          {invitePanelOpen ? "Fermer" : "+ Inviter quelqu'un"}
        </button>
      </div>

      {invitePanelOpen && (
        <InviteForm
          householdId={householdId}
          invitedBy={currentUserId}
          onSubmit={async (values) => {
            const res = await api.inviteUser(values);
            if (res.success) showToast(`Invitation créée pour ${values.email}`, "success");
            return res;
          }}
        />
      )}

      <Dashboard
        tasks={taskState.items}
        projects={projectState.items}
        loading={taskState.loading || projectState.loading}
      />

      {/* Vue synthétique des tâches, triable par urgence ou par pièce (étape 4, complétée ici) */}
      <TaskOverview tasks={taskState.items} rooms={roomState.items} users={users} />

      <div className="app-shell__grids">
        <ItemGrid kind="project" users={users} tasks={taskState.items} state={projectState} />
        <ItemGrid kind="task" users={users} projects={projectState.items} rooms={roomState.items} state={taskState} />
      </div>

      {/* Plan de l'appartement, conscient des étages : plans séparés, pas empilés (voir FloorPlanSection) */}
      <FloorPlanSection householdId={householdId} roomState={roomState} tasks={taskState.items} />
    </div>
  );
}
