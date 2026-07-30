// FloorThumbnail.jsx
// Miniature statique, style "de biais" (isométrique), utilisée UNIQUEMENT
// dans le sélecteur d'étages — pour reconnaître un étage d'un coup d'œil
// avant de le choisir. Pas de rotation, pas de glisser-déposer, pas
// d'étiquette de nom (trop petit pour être lisible) : juste la forme et
// les couleurs des pièces. La vue de travail réelle reste toujours en 2D
// (RoomFloorPlan.jsx) — voir le README pour ce choix.
const PIXELS_PER_METER = 6;
const HEIGHT_METERS = 2.5;
const SPIN_DEG = -45;
const TILT_DEG = 58;

function shade(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function FloorThumbnail({ rooms }) {
  if (!rooms || rooms.length === 0) {
    return <div className="floor-thumb floor-thumb--empty" aria-hidden="true" />;
  }

  return (
    <div className="floor-thumb" aria-hidden="true">
      <div
        className="floor-thumb__scene"
        style={{ transform: `translate(-50%, -50%) rotateX(${TILT_DEG}deg) rotateZ(${SPIN_DEG}deg)` }}
      >
        {rooms.map((room) => {
          const w = room.width * PIXELS_PER_METER;
          const d = room.height * PIXELS_PER_METER;
          const h = HEIGHT_METERS * PIXELS_PER_METER;
          return (
            <div
              key={room.id}
              className="floor-thumb__room"
              style={{ width: w, height: d, left: room.x * PIXELS_PER_METER, top: room.y * PIXELS_PER_METER }}
            >
              <div
                className="floor-thumb__face floor-thumb__face--front"
                style={{ width: w, height: h, top: d, background: shade(room.color, -25) }}
              />
              <div
                className="floor-thumb__face floor-thumb__face--right"
                style={{ width: h, height: d, left: w, background: shade(room.color, -45) }}
              />
              <div
                className="floor-thumb__face floor-thumb__face--top"
                style={{ width: w, height: d, transform: `translateZ(${h}px)`, background: room.color }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
