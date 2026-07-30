// components/forms/PetFormFields.jsx
// Champs pour un occupant de type "animal" (name + species). Composant
// purement présentationnel, aligné sur le modèle actuel du backend
// (validateOccupant, PET_SPECIES) — PAS sur l'ancien schéma "pets"
// disparu depuis le chantier occupants.
//
// IMPORTANT — pas encore branché : ItemForm.jsx n'a pas de kind
// "pet"/"occupant" aujourd'hui, et api.js n'a pas encore de fonction
// createOccupant. Construire l'écran complet (créer + lister + réclamer
// un occupant) est un chantier séparé, déjà noté dans le README ("Ce qui
// manque"). Ce composant est prêt pour ce jour-là, pas branché avant.
import { PET_SPECIES } from "../../utils/formValidators";

export default function PetFormFields({ values, set }) {
  return (
    <>
      <label>
        Nom de l'animal
        <input value={values.name} onChange={set("name")} />
      </label>
      <label>
        Espèce
        <select value={values.species} onChange={set("species")}>
          <option value="">— Choisir —</option>
          {PET_SPECIES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
