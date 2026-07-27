// tests/ItemForm.test.jsx
// Teste ItemForm.jsx en tant qu'ENVELOPPE : état, coercion des champs,
// appel du bon validateur, soumission, affichage des erreurs. Les
// validateurs réels sont simulés (vi.mock) plutôt qu'importés tels
// quels : ils sont déjà couverts par les 125 tests backend, et un test
// de composant doit vérifier le câblage du composant, pas re-vérifier
// des règles métier testées ailleurs.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemForm from "../src/components/items/ItemForm";

vi.mock("../src/validators/formValidators", () => ({
  validateTask: vi.fn((values) =>
    values.title ? { valid: true, errors: [] } : { valid: false, errors: ["title : chaîne non vide requise."] }
  ),
  validateProject: vi.fn((values) =>
    values.name ? { valid: true, errors: [] } : { valid: false, errors: ["name : chaîne non vide requise."] }
  ),
  validateRoom: vi.fn((values) =>
    values.name ? { valid: true, errors: [] } : { valid: false, errors: ["name : chaîne non vide requise."] }
  ),
}));

describe("ItemForm — rendu délégué aux sous-composants", () => {
  it('kind="task" affiche les champs de TaskFormFields', () => {
    render(<ItemForm kind="task" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/titre de la tâche/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/récurrence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assigné à/i)).toBeInTheDocument();
  });

  it('kind="room" affiche les champs de RoomFormFields', () => {
    render(<ItemForm kind="room" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/nom de la pièce/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/largeur/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/couleur/i)).toBeInTheDocument();
  });

  it('kind="project" affiche les champs de ProjectFormFields', () => {
    render(<ItemForm kind="project" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/nom du projet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/responsable/i)).toBeInTheDocument();
  });
});

describe("ItemForm — validation et soumission", () => {
  it("bloque la soumission et affiche l'erreur si le titre de la tâche est vide", async () => {
    const onSubmit = vi.fn();
    render(<ItemForm kind="task" onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText(/chaîne non vide requise/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("soumet les valeurs coercées (recurrenceDays en nombre, champs vides en null)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<ItemForm kind="task" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/titre de la tâche/i), "Passer l'aspirateur");
    await user.type(screen.getByLabelText(/récurrence/i), "7");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.title).toBe("Passer l'aspirateur");
    expect(submitted.recurrenceDays).toBe(7); // Number, pas la chaîne "7"
    expect(submitted.roomId).toBeNull(); // "" converti en null
    expect(submitted.projectId).toBeNull();
  });

  it("convertit width/length en nombres pour kind='room'", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<ItemForm kind="room" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/nom de la pièce/i), "Salon");
    await user.clear(screen.getByLabelText(/largeur/i));
    await user.type(screen.getByLabelText(/largeur/i), "5");
    await user.clear(screen.getByLabelText(/longueur/i));
    await user.type(screen.getByLabelText(/longueur/i), "4");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.width).toBe(5);
    expect(submitted.length).toBe(4);
  });

  it("affiche l'erreur renvoyée par le serveur si onSubmit échoue", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ success: false, error: "Erreur serveur simulée" });
    render(<ItemForm kind="task" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/titre de la tâche/i), "Une tâche");
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText("Erreur serveur simulée")).toBeInTheDocument();
  });

  it("appelle onCancel quand on clique sur Annuler, sans appeler onSubmit", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<ItemForm kind="task" onSubmit={onSubmit} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /annuler/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
