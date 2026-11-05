/**
 * Renders the schema-driven add/edit modal anywhere in the app, driven by
 * store.formRequest. Lets the command palette (or any code) open a create/edit
 * form for any collection without a page-local hook. Reuses EntityForm + the
 * generic store CRUD — not a parallel system.
 */
import { useStore } from "@/lib/store";
import { EntityForm } from "@/components/form";
import { formSchemas, addDefaults } from "@/lib/forms";

export function GlobalFormHost() {
  const formRequest = useStore((s) => s.formRequest);
  const closeForm = useStore((s) => s.closeForm);
  const create = useStore((s) => s.create);
  const patch = useStore((s) => s.patch);
  const courses = useStore((s) => s.courses);
  const languages = useStore((s) => s.languages);

  if (!formRequest) return null;
  const schema = formSchemas[formRequest.collection];
  if (!schema) return null;

  // FK dropdown options (harmless for forms that don't use these keys).
  const dynamicOptions = {
    courseId: courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` })),
    languageId: languages.map((l) => ({ value: l.id, label: l.name })),
  };

  return (
    <EntityForm
      schema={schema}
      mode={formRequest.mode}
      dynamicOptions={dynamicOptions}
      initial={
        formRequest.mode === "add"
          ? addDefaults[formRequest.collection]
          : formRequest.data
      }
      onCancel={closeForm}
      onSubmit={(vals) => {
        if (formRequest.mode === "add") {
          create(formRequest.collection, vals);
        } else if (formRequest.data) {
          patch(formRequest.collection, formRequest.data.id, vals);
        }
        closeForm();
      }}
    />
  );
}
