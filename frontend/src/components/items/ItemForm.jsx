// ItemForm.jsx — Composant 2 : "Formulaire de Saisie / Édition"
// Enveloppe (wrapper) : gère l'état, la validation (réutilise TEL QUEL
// les validateurs du backend — aucune règle n'est réécrite ici), la
// conversion des champs numériques/optionnels avant soumission, et les
// boutons/erreurs communs. Le RENDU des champs est délégué au
// sous-composant dédié (components/forms/), un par entité — voir ce
// dossier pour ProjectFormFields/TaskFormFields/RoomFormFields
// (branchés) et PetFormFields (prêt, pas encore branché — voir son
// propre commentaire).
//
// Note : le kind "pet" a été retiré du formulaire (occupants pas encore
// câblés côté écran — voir README, "Ce qui manque"). Pas de kind
// "floor" ici : les étages ont leur propre petit formulaire dédié dans
// FloorPlanSection.jsx (UX volontairement compacte, deux boutons, pas
// une grille générique) — il réutilise validateFloor directement, lui
// aussi.
import { useState } from "react";
import { validateTask, validateProject, validateRoom } from "../../validators/formValidators";
import Spinner from "../common/Spinner";
import ProjectFormFields from "../forms/ProjectFormFields";
import TaskFormFields from "../forms/TaskFormFields";
import RoomFormFields from "../forms/RoomFormFields";

const VALIDATORS = { task: validateTask, project: validateProject, room: validateRoom };

export default function ItemForm({ kind, initialValue, users, projects, rooms, floors, householdId, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({
    title: "",
    name: "",
    projectId: "",
    ownerId: "",
    assigneeId: "",
    status: "todo",
    dueDate: "",
    width: "",
    length: "",
    color: "#D6E1CC",
    roomId: "",
    petId: "",
    recurrenceDays: "",
    description: "",
    floorId: "",
    householdId: householdId || "",
    ...initialValue,
  }));
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const existingUserIds = new Set((users || []).map((u) => u.id));
    const existingProjectIds = new Set((projects || []).map((p) => p.id));
    const existingHouseholdIds = new Set(householdId ? [householdId] : []);
    const existingRoomIds = new Set((rooms || []).map((r) => r.id));
    const existingFloorIds = new Set((floors || []).map((f) => f.id));

    // Les champs numériques arrivent en chaînes depuis les <input type="number">,
    // et les champs "aucun/optionnel" en chaîne vide : on convertit AVANT de
    // valider, pour que le validateur voie de vrais nombres / de vrais null.
    let submitValues = values;
    if (kind === "room") {
      submitValues = {
        ...values,
        width: Number(values.width),
        length: Number(values.length),
        floorId: values.floorId || null,
      };
    } else if (kind === "task") {
      submitValues = {
        ...values,
        projectId: values.projectId || null,
        roomId: values.roomId || null,
        petId: values.petId || null,
        dueDate: values.dueDate || null,
        description: values.description || null,
        recurrenceDays: values.recurrenceDays === "" ? null : Number(values.recurrenceDays),
      };
    }

    const { valid, errors: validationErrors } = VALIDATORS[kind](submitValues, {
      existingUserIds,
      existingProjectIds,
      existingRoomIds,
      existingFloorIds,
      existingHouseholdIds,
    });
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    const result = await onSubmit(submitValues); // le parent appelle l'API ; le serveur revalide de toute façon
    setSubmitting(false);
    if (!result.success) setErrors([result.error]);
  };

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      {kind === "project" && <ProjectFormFields values={values} set={set} users={users} />}
      {kind === "task" && <TaskFormFields values={values} set={set} users={users} projects={projects} rooms={rooms} />}
      {kind === "room" && <RoomFormFields values={values} set={set} />}

      {errors.length > 0 && (
        <ul className="item-form__errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <div className="item-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner size={14} /> Enregistrement…
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Annuler
        </button>
      </div>
    </form>
  );
}
