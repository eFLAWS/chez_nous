// components/forms/RoomFormFields.jsx
// Champs du formulaire "room". Composant purement présentationnel :
// aucun état, aucune validation ici — tout ça reste dans ItemForm.jsx
// (le wrapper), qui transmet `values` et `set(field)`.
//
// Pas de champ étage ici, volontairement : floorId est déjà fixé par le
// parent (FloorPlanSection passe l'étage courant via newItemDefaults) —
// pas besoin de le redemander dans le formulaire.
export default function RoomFormFields({ values, set }) {
  return (
    <>
      <label>
        Nom de la pièce
        <input value={values.name} onChange={set("name")} />
      </label>
      <label>
        Largeur (m)
        <input type="number" step="0.1" min="0.5" max="30" value={values.width} onChange={set("width")} />
      </label>
      <label>
        Longueur (m)
        <input type="number" step="0.1" min="0.5" max="30" value={values.length} onChange={set("length")} />
      </label>
      <label>
        Couleur
        <input type="color" value={values.color} onChange={set("color")} />
      </label>
    </>
  );
}
