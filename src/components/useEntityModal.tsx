/**
 * One-liner CRUD modal wiring for a page.
 *   const tasks = useEntityModal("tasks");
 *   <AddButton label="Task" onClick={tasks.openAdd} />
 *   <CrudActions onEdit={() => tasks.openEdit(t)} onDelete={() => destroy("tasks", t.id)} />
 *   {tasks.node}
 */
import { useState, type ReactNode } from "react";
import { EntityForm } from "@/components/form";
import { formSchemas, addDefaults } from "@/lib/forms";
import { useStore, type CollectionKey } from "@/lib/store";
import { dateOnly } from "@/lib/utils";

type EditData = { id: string } & Record<string, unknown>;
type ModalState =
  | { mode: "add"; prefill?: Record<string, unknown> }
  | { mode: "edit"; data: EditData }
  | null;

export function useEntityModal(
  collection: CollectionKey,
  dynamicOptions?: Record<string, { value: string; label: string }[]>
) {
  const create = useStore((s) => s.create);
  const patch = useStore((s) => s.patch);
  const [state, setState] = useState<ModalState>(null);

  const openAdd = (prefill?: Record<string, unknown>) =>
    setState({ mode: "add", prefill });
  // Accept any record with an id (concrete entity types lack index signatures).
  const openEdit = (data: { id: string }) =>
    setState({ mode: "edit", data: data as EditData });
  const close = () => setState(null);

  const schema = formSchemas[collection];

  /**
   * A required date is pre-filled with today, computed when the form opens
   * (not at import time, so a tab left open overnight still says today).
   */
  const dateDefaults = () => {
    const field = schema?.fields.find(
      (f) => f.required && (f.type === "date" || f.type === "dateonly")
    );
    return field ? { [field.key]: dateOnly() } : {};
  };

  const node: ReactNode =
    state && schema ? (
      <EntityForm
        schema={schema}
        mode={state.mode}
        dynamicOptions={dynamicOptions}
        initial={
          state.mode === "add"
            ? {
                ...addDefaults[collection],
                ...dateDefaults(),
                ...(state.prefill ?? {}),
              }
            : state.data
        }
        onCancel={close}
        onSubmit={(vals) => {
          if (state.mode === "add") create(collection, vals);
          else patch(collection, state.data.id, vals);
          close();
        }}
      />
    ) : null;

  return { openAdd, openEdit, close, node };
}
