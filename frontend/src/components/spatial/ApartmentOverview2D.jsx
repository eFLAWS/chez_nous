// src/components/spatial/ApartmentOverview2D.jsx
// Vue d'ensemble (macro) : chaque pièce est un bloc coloré (sa propre
// couleur, room.color) avec son nom. Positionnement des blocs via
// `room.layoutArea` (défini dans mockData.js) sur une grille CSS — pas
// de vraies coordonnées de plan réel ici, juste un agencement
// approximatif pour donner une impression de plan du dessus.
//
// SIMPLIFIÉ (voir la conversation) : plus de pourcentage de tâches ni de
// code couleur par avancement — tâches retirées du MVP pour l'instant,
// le foyer se concentre sur l'éditeur de plan. Cette vue redeviendra un
// vrai tableau de bord (heatmap d'avancement) quand les tâches
// reviendront.
//
// 100% mock (voir src/data/mockData.js), pas d'appel API ici.
import { MOCK_ROOMS } from "../../data/mockData";
import "./ApartmentOverview2D.css";

export default function ApartmentOverview2D({ rooms = MOCK_ROOMS, onSelectRoom }) {
  return (
    <div className="overview-wrapper">
      <p className="overview-hint">Touchez une pièce pour l'ouvrir en détail.</p>

      <div className="overview-grid">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            className="overview-room"
            style={{ ...room.layoutArea, background: room.color }}
            onClick={() => onSelectRoom(room.id)}
            aria-label={room.name}
          >
            <span className="overview-room__name">{room.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
