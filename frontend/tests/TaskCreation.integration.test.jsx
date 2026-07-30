// tests/TaskCreation.integration.test.jsx
// Test d'intégration : ItemGrid + ItemForm + useItems (le VRAI câblage
// entre ces trois-là), avec seulement api.js simulé — c'est la bonne
// frontière à simuler pour un test frontend (on ne veut pas dépendre
// d'un vrai serveur qui tourne pendant `npm test`, mais on veut vérifier
// que nos propres composants s'articulent correctement).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useItems } from "../src/hooks/useItems";
import ItemGrid from "../src/components/ui/ItemGrid";
import { api } from "../src/api";

vi.mock("../src/utils/formValidators", () => ({
  validateTask: vi.fn((values) =>
    values.title ? { valid: true, errors: [] } : { valid: false, errors: ["title : chaîne non vide requise."] }
  ),
  validateProject: vi.fn(() => ({ valid: true, errors: [] })),
  validateRoom: vi.fn(() => ({ valid: true, errors: [] })),
}));

vi.mock("../src/api", () => ({
  api: {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

// Petit harnais : reproduit exactement comment AppShell utilise useItems +
// ItemGrid (useItems appelé une fois par le parent, son résultat transmis
// en prop `state` — voir README, "le fil conducteur").
function TaskGridHarness({ rooms, users }) {
  const state = useItems("task");
  return <ItemGrid kind="task" users={users} rooms={rooms} state={state} />;
}

describe("Intégration — créer une tâche assignée à une pièce", () => {
  const rooms = [{ id: "room-1", name: "Salon" }];
  const users = [{ id: "u1", name: "Chloë" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appelle api.createTask avec le roomId choisi, et affiche la tâche (avec sa pièce) après rafraîchissement", async () => {
    const user = userEvent.setup();

    api.listTasks
      .mockResolvedValueOnce({ success: true, data: [] }) // chargement initial (liste vide)
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: "t1", title: "Nettoyer le sol", roomId: "room-1", status: "todo" }],
      }); // useItems.refresh() après la création réussie

    api.createTask.mockResolvedValue({
      success: true,
      data: { id: "t1", title: "Nettoyer le sol", roomId: "room-1", status: "todo" },
    });

    render(<TaskGridHarness rooms={rooms} users={users} />);

    // attend la fin du chargement initial (liste vide affichée)
    await waitFor(() => expect(api.listTasks).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/rien à afficher pour l'instant/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Nouveau" }));
    await user.type(screen.getByLabelText(/titre de la tâche/i), "Nettoyer le sol");
    await user.selectOptions(screen.getByLabelText(/pièce/i), "room-1");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    // 1. api.createTask a bien reçu le roomId sélectionné
    await waitFor(() => expect(api.createTask).toHaveBeenCalledTimes(1));
    expect(api.createTask.mock.calls[0][0]).toMatchObject({
      title: "Nettoyer le sol",
      roomId: "room-1",
    });

    // 2. useItems a bien rafraîchi la liste après la création réussie
    await waitFor(() => expect(api.listTasks).toHaveBeenCalledTimes(2));

    // 3. la tâche apparaît, avec l'association à sa pièce correctement affichée
    expect(await screen.findByText("Nettoyer le sol")).toBeInTheDocument();
    expect(screen.getByText(/salon/i)).toBeInTheDocument();
  });

  it("n'appelle jamais api.createTask si le titre est vide (bloqué côté client)", async () => {
    const user = userEvent.setup();
    api.listTasks.mockResolvedValue({ success: true, data: [] });

    render(<TaskGridHarness rooms={rooms} users={users} />);
    await waitFor(() => expect(api.listTasks).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "+ Nouveau" }));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText(/chaîne non vide requise/i)).toBeInTheDocument();
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it("affiche un bandeau d'erreur si le serveur refuse la création, sans faire planter la liste", async () => {
    const user = userEvent.setup();
    api.listTasks.mockResolvedValue({ success: true, data: [] });
    api.createTask.mockResolvedValue({ success: false, error: "roomId ne correspond à aucune pièce existante." });

    render(<TaskGridHarness rooms={rooms} users={users} />);
    await waitFor(() => expect(api.listTasks).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "+ Nouveau" }));
    await user.type(screen.getByLabelText(/titre de la tâche/i), "Une tâche");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText(/ne correspond à aucune pièce existante/i)).toBeInTheDocument();
    // la liste ne doit pas avoir été rafraîchie après un échec
    expect(api.listTasks).toHaveBeenCalledTimes(1);
  });
});
