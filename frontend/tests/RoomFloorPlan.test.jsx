// tests/RoomFloorPlan.test.jsx
// Teste le plan 2D : affichage des pièces, et le glisser-déposer via de
// vrais événements pointer (pointerdown/pointermove/pointerup) — pas de
// glisser-déposer HTML5 natif ici, le composant gère tout lui-même via
// les gestionnaires onPointer*.
//
// Point à vérifier en lançant ces tests pour de vrai : jsdom doit
// supporter la construction de PointerEvent (vrai depuis un moment, mais
// je ne peux pas l'exécuter moi-même ici pour le confirmer). Le composant
// appelle déjà `setPointerCapture?.()` avec chaînage optionnel — pensé à
// l'origine pour la compatibilité navigateur, ça évite aussi un crash si
// jsdom ne l'implémente pas.
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RoomFloorPlan from "../src/components/floorplan/RoomFloorPlan";

const PX_PER_METER = 40;

const rooms = [
  { id: "r1", name: "Salon", x: 0, y: 0, width: 5, length: 4, color: "#F0DEC5" },
  { id: "r2", name: "Cuisine", x: 10, y: 10, width: 3, length: 3, color: "#CFE3D8" },
];

function drag(el, { fromX, fromY, toX, toY }) {
  fireEvent.pointerDown(el, { clientX: fromX, clientY: fromY, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: toX, clientY: toY, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: toX, clientY: toY, pointerId: 1 });
}

describe("RoomFloorPlan — affichage", () => {
  it("affiche chaque pièce avec son nom et ses dimensions", () => {
    render(<RoomFloorPlan rooms={rooms} tasks={[]} onMove={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Salon")).toBeInTheDocument();
    expect(screen.getByText("Cuisine")).toBeInTheDocument();
    expect(screen.getByText("5 × 4 m")).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucune pièce", () => {
    render(<RoomFloorPlan rooms={[]} tasks={[]} onMove={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/aucune pièce pour l'instant/i)).toBeInTheDocument();
  });
});

describe("RoomFloorPlan — sélection et déplacement", () => {
  it("un glisser de 1 mètre (40px) appelle onMove avec la nouvelle position", async () => {
    const onMove = vi.fn().mockResolvedValue({ success: true });
    render(<RoomFloorPlan rooms={rooms} tasks={[]} onMove={onMove} onDelete={vi.fn()} />);

    const salon = screen.getByTestId("room-r1");
    // Salon (0,0) est loin de Cuisine (10,10) : ce déplacement de 1m ne
    // doit déclencher ni magnétisme ni collision.
    drag(salon, { fromX: 100, fromY: 100, toX: 100 + PX_PER_METER, toY: 100 });

    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    const [movedId, position] = onMove.mock.calls[0];
    expect(movedId).toBe("r1");
    expect(position.x).toBeCloseTo(1, 2); // 40px / 40px-par-mètre = 1 mètre
    expect(position.y).toBeCloseTo(0, 2);
  });

  it("bloque le déplacement s'il chevaucherait une autre pièce (la position reste inchangée)", async () => {
    const onMove = vi.fn().mockResolvedValue({ success: true });
    render(<RoomFloorPlan rooms={rooms} tasks={[]} onMove={onMove} onDelete={vi.fn()} />);

    const salon = screen.getByTestId("room-r1");
    // 10m à droite et 10m vers le bas (400px) : atterrirait en plein sur
    // la Cuisine (10,10,3x3) -> doit être bloqué.
    drag(salon, { fromX: 0, fromY: 0, toX: 10 * PX_PER_METER, toY: 10 * PX_PER_METER });

    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    const [, position] = onMove.mock.calls[0];
    // Bloqué : la position envoyée doit être celle de départ (0,0), pas
    // la position en chevauchement (10,10).
    expect(position.x).toBeCloseTo(0, 2);
    expect(position.y).toBeCloseTo(0, 2);
  });

  it("un très léger déplacement vers Cuisine (dans le seuil de 0,4 m) déclenche le magnétisme (collage sur le bord)", async () => {
    const onMove = vi.fn().mockResolvedValue({ success: true });
    // Salon à 0,35 m du bord gauche de Cuisine (son bord droit est à 9,65,
    // Cuisine commence à 10) — à l'intérieur du seuil de magnétisme (0,4 m).
    const nearbyRooms = [
      { id: "r1", name: "Salon", x: 4.65, y: 10, width: 5, length: 4, color: "#F0DEC5" },
      { id: "r2", name: "Cuisine", x: 10, y: 10, width: 3, length: 3, color: "#CFE3D8" },
    ];
    render(<RoomFloorPlan rooms={nearbyRooms} tasks={[]} onMove={onMove} onDelete={vi.fn()} />);

    const salon = screen.getByTestId("room-r1");
    // Ne pousse que de 0,05 m (2px) de plus vers la droite — le calcul
    // arithmétique brut n'atteindrait que x = 4,70, mais le magnétisme
    // doit "tirer" la pièce jusqu'au contact exact (x = 10 - 5 = 5).
    drag(salon, { fromX: 0, fromY: 0, toX: 0.05 * PX_PER_METER, toY: 0 });

    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    const [, position] = onMove.mock.calls[0];
    // Le magnétisme doit avoir collé le bord droit du Salon (x + largeur)
    // exactement contre le bord gauche de Cuisine : x = 10 - 5 = 5, PAS
    // 4,70 (ce qu'un simple calcul arithmétique aurait donné sans aimant).
    expect(position.x).toBeCloseTo(5, 2);
  });
});
