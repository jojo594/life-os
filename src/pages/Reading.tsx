import { BookOpen, Brain } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Progress,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { useMemo } from "react";
import { cn, fmtDate } from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";
import { useListControls, opts } from "@/lib/listControls";
import { ListToolbar } from "@/components/ListToolbar";
import { BulkBar, SelectCheckbox } from "@/components/BulkBar";

const BOOK_RATINGS = ["1", "2", "3", "4", "5"] as const;

export default function Reading() {
  const { books, destroy, patch } = useStore();
  const bookModal = useEntityModal("books");

  const reading = books.filter((b) => b.status === "reading");
  const read = books.filter((b) => b.status === "read");
  const toRead = books.filter((b) => b.status === "to_read");

  // Category filter options are data-driven across the whole library.
  const categoryOptions = useMemo(
    () =>
      [...new Set(books.map((b) => b.category).filter(Boolean))]
        .sort()
        .map((c) => ({ value: c, label: c })),
    [books]
  );

  const readingCtrl = useListControls(reading, {
    storageKey: "books-reading",
    text: (b) => `${b.title} ${b.author} ${b.category} ${b.takeaways ?? ""}`,
    filters: {
      category: { label: "Category", options: categoryOptions, get: (b) => b.category },
    },
    sorts: {
      progress: { label: "Progress (high→low)", compare: (a, b) => b.progress - a.progress },
      recent: { label: "Recently updated", compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt) },
      title: { label: "Title A→Z", compare: (a, b) => a.title.localeCompare(b.title) },
    },
    defaultSort: "progress",
  });

  const readCtrl = useListControls(read, {
    storageKey: "books-finished",
    text: (b) => `${b.title} ${b.author} ${b.category} ${b.takeaways ?? ""}`,
    filters: {
      category: { label: "Category", options: categoryOptions, get: (b) => b.category },
      rating: {
        label: "Rating",
        options: opts(BOOK_RATINGS),
        get: (b) => (b.rating != null ? String(b.rating) : undefined),
      },
    },
    sorts: {
      finished: {
        label: "Finished (newest)",
        compare: (a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""),
      },
      rating: {
        label: "Rating (high→low)",
        compare: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      },
      title: { label: "Title A→Z", compare: (a, b) => a.title.localeCompare(b.title) },
    },
    defaultSort: "finished",
  });

  const toReadCtrl = useListControls(toRead, {
    storageKey: "books-todo",
    text: (b) => `${b.title} ${b.author} ${b.category}`,
    filters: {
      category: { label: "Category", options: categoryOptions, get: (b) => b.category },
    },
    sorts: {
      recent: { label: "Recently added", compare: (a, b) => b.createdAt.localeCompare(a.createdAt) },
      title: { label: "Title A→Z", compare: (a, b) => a.title.localeCompare(b.title) },
      author: { label: "Author A→Z", compare: (a, b) => a.author.localeCompare(b.author) },
    },
    defaultSort: "recent",
  });

  const readingPage = usePagination(readingCtrl.filtered, 5);
  const readPage = usePagination(readCtrl.filtered, 5);
  const toReadPage = usePagination(toReadCtrl.filtered, 5);

  const nowIso = () => new Date().toISOString();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge · Notes · Takeaways"
        title="Reading"
        subtitle="Track your books and keep the notes worth revisiting."
        action={<AddButton label="Book" onClick={bookModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Currently Reading" value={reading.length} tone="cyan" icon={<BookOpen className="w-4 h-4" />} />
        <StatCard label="Read" value={read.length} tone="emerald" icon={<Brain className="w-4 h-4" />} />
        <StatCard label="On Deck" value={toRead.length} tone="gold" />
        <StatCard label="Avg Rating" value={(read.reduce((s, b) => s + (b.rating || 0), 0) / Math.max(1, read.filter((b) => b.rating).length)).toFixed(1)} hint="of read books" tone="violet" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Currently reading" subtitle="Books in progress now" />
          <CardBody className="space-y-3">
            <ListToolbar ctrl={readingCtrl} />
            {readingPage.slice.map((b) => (
              <div key={b.id} className="group p-3 rounded-lg bg-ink-800/40 border border-ink-700">
                <div className="flex items-start justify-between gap-3">
                  <SelectCheckbox
                    checked={readingCtrl.isSelected(b.id)}
                    onChange={() => readingCtrl.toggleSelect(b.id)}
                  />
                  <button onClick={() => bookModal.openEdit(b)} className="min-w-0 text-left flex-1">
                    <div className="text-base font-semibold text-ink-50">{b.title}</div>
                    <div className="text-xs text-ink-300 mt-0.5">{b.author}</div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Badge tone="neutral">{b.category}</Badge>
                    <CrudActions
                      onDelete={() => destroy("books", b.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={b.progress} tone="cyan" className="flex-1" />
                  <span className="text-xs font-mono text-ink-100">{b.progress}%</span>
                </div>
                {b.startedAt && (
                  <div className="text-[10px] text-ink-400 mt-1 font-mono">started {fmtDate(b.startedAt)}</div>
                )}
              </div>
            ))}
            <Pagination
              page={readingPage.page}
              totalPages={readingPage.totalPages}
              setPage={readingPage.setPage}
              total={readingCtrl.filtered.length}
            />
            <BulkBar
              ctrl={readingCtrl}
              actions={[
                {
                  label: "Mark finished",
                  run: (ids) =>
                    ids.forEach((id) =>
                      patch("books", id, { status: "read", finishedAt: nowIso(), progress: 100 })
                    ),
                },
                {
                  label: "Abandon",
                  run: (ids) => ids.forEach((id) => patch("books", id, { status: "abandoned" })),
                },
                {
                  label: "Delete",
                  tone: "danger",
                  confirm: "Delete {n} book(s)?",
                  run: (ids) => ids.forEach((id) => destroy("books", id)),
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recently finished" subtitle="Notes worth revisiting" />
          <CardBody className="space-y-2">
            <ListToolbar ctrl={readCtrl} />
            {readPage.slice.map((b) => (
              <div key={b.id} className="group p-2.5 rounded-md bg-ink-800/40 border border-ink-700">
                <div className="flex items-start justify-between gap-2">
                  <SelectCheckbox
                    checked={readCtrl.isSelected(b.id)}
                    onChange={() => readCtrl.toggleSelect(b.id)}
                  />
                  <button onClick={() => bookModal.openEdit(b)} className="text-left flex-1 min-w-0">
                    <div className="text-sm text-ink-50 font-medium">{b.title}</div>
                    <div className="text-[11px] text-ink-300 mt-0.5">{b.author}</div>
                  </button>
                  <CrudActions
                    onDelete={() => destroy("books", b.id)}
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-gold text-xs">{"★".repeat(b.rating || 0)}</span>
                  <span className="text-[10px] text-ink-400 font-mono">{b.finishedAt ? fmtDate(b.finishedAt) : "—"}</span>
                </div>
              </div>
            ))}
            <Pagination
              page={readPage.page}
              totalPages={readPage.totalPages}
              setPage={readPage.setPage}
              total={readCtrl.filtered.length}
            />
            <BulkBar
              ctrl={readCtrl}
              actions={[
                {
                  label: "Re-read",
                  run: (ids) =>
                    ids.forEach((id) =>
                      patch("books", id, { status: "reading", finishedAt: undefined })
                    ),
                },
                {
                  label: "Delete",
                  tone: "danger",
                  confirm: "Delete {n} book(s)?",
                  run: (ids) => ids.forEach((id) => destroy("books", id)),
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="On deck" subtitle="The to-read pile" />
        <CardBody>
          <ListToolbar ctrl={toReadCtrl} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {toReadPage.slice.map((b) => (
              <div key={b.id} className={cn("group p-3 rounded-lg bg-ink-850/60 border border-dashed border-ink-700")}>
                <div className="flex items-start justify-between gap-2">
                  <SelectCheckbox
                    checked={toReadCtrl.isSelected(b.id)}
                    onChange={() => toReadCtrl.toggleSelect(b.id)}
                  />
                  <button onClick={() => bookModal.openEdit(b)} className="text-left flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-100">{b.title}</div>
                    <div className="text-[11px] text-ink-300 mt-0.5">{b.author}</div>
                  </button>
                  <CrudActions
                    onDelete={() => destroy("books", b.id)}
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
                <Badge tone="neutral" className="mt-2">{b.category}</Badge>
              </div>
            ))}
          </div>
          <Pagination
            page={toReadPage.page}
            totalPages={toReadPage.totalPages}
            setPage={toReadPage.setPage}
            total={toReadCtrl.filtered.length}
          />
          <BulkBar
            ctrl={toReadCtrl}
            actions={[
              {
                label: "Start reading",
                run: (ids) =>
                  ids.forEach((id) =>
                    patch("books", id, { status: "reading", startedAt: nowIso() })
                  ),
              },
              {
                label: "Delete",
                tone: "danger",
                confirm: "Delete {n} book(s)?",
                run: (ids) => ids.forEach((id) => destroy("books", id)),
              },
            ]}
          />
        </CardBody>
      </Card>

      {bookModal.node}
    </div>
  );
}
