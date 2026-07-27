// components/forms/TaskFormFields.jsx
// Champs du formulaire "task". Composant purement présentationnel :
// aucun état, aucune validation ici — tout ça reste dans ItemForm.jsx
// (le wrapper), qui transmet `values` et `set(field)`.
export default function TaskFormFields({ values, set, users, projects, rooms }) {
  return (
    <>
      <label>
        Titre de la tâche
        <input value={values.title} onChange={set("title")} />
      </label>
      <label>
        Description (optionnel)
        <textarea value={values.description} onChange={set("description")} rows={3} maxLength={2000} />
      </label>
      <label>
        Pièce (optionnel)
        <select value={values.roomId} onChange={set("roomId")}>
          <option value="">Aucune</option>
          {(rooms || []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Projet (optionnel)
        <select value={values.projectId} onChange={set("projectId")}>
          <option value="">Aucun</option>
          {(projects || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assigné à
        <select value={values.assigneeId} onChange={set("assigneeId")}>
          <option value="">Personne</option>
          {(users || []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Récurrence (jours, optionnel)
        <input
          type="number"
          min="1"
          max="365"
          placeholder="ex. 7 pour chaque semaine"
          value={values.recurrenceDays}
          onChange={set("recurrenceDays")}
        />
      </label>
      <label>
        Statut
        <select value={values.status} onChange={set("status")}>
          <option value="todo">À faire</option>
          <option value="in_progress">En cours</option>
          <option value="done">Terminé</option>
        </select>
      </label>
      <label>
        Échéance
        <input type="date" value={values.dueDate || ""} onChange={set("dueDate")} />
      </label>
    </>
  );
}
