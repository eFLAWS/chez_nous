// components/forms/ProjectFormFields.jsx
// Champs du formulaire "project". Composant purement présentationnel :
// aucun état, aucune validation ici — tout ça reste dans ItemForm.jsx
// (le wrapper), qui transmet `values` (l'état actuel) et `set(field)`
// (la fonction qui construit le onChange pour un champ donné).
export default function ProjectFormFields({ values, set, users }) {
  return (
    <>
      <label>
        Nom du projet
        <input value={values.name} onChange={set("name")} />
      </label>
      <label>
        Responsable
        <select value={values.ownerId} onChange={set("ownerId")}>
          <option value="">— Choisir —</option>
          {(users || []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
