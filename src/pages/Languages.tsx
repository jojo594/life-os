import { Languages as LangIcon, Globe, Flame } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { dayOf, fmtDate, cn, dateOnly } from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";
import type { CEFR } from "@/lib/types";

const levels: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const flagFor: Record<string, string> = {
  Italian: "🇮🇹",
  Russian: "🇷🇺",
  German: "🇩🇪",
  Spanish: "🇪🇸",
  Portuguese: "🇵🇹",
  Japanese: "🇯🇵",
};

export default function LanguagesPage() {
  const { languages, langSessions, destroy } = useStore();
  const langOptions = languages.map((l) => ({ value: l.id, label: l.name }));
  const langModal = useEntityModal("languages");
  const sessionModal = useEntityModal("langSessions", { languageId: langOptions });

  const last7 = Array.from({ length: 7 }, (_, i) => dateOnly(-6 + i));
  const weekMins = langSessions
    // dates arrive from the API as full ISO timestamps → compare on the day part
    .filter((s) => last7.includes(dayOf(s.date)))
    .reduce((sum, s) => sum + s.minutes, 0);
  const activeLangs = languages.filter((l) => l.active);
  const sessionsPage = usePagination(langSessions, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Practice · Progress"
        title="Languages"
        subtitle="Track every language you are learning and every session you log."
        action={<AddButton label="Language" onClick={langModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Languages" value={activeLangs.length} tone="cyan" icon={<LangIcon className="w-4 h-4" />} />
        <StatCard label="Week Minutes" value={`${weekMins}m`} tone="gold" icon={<Flame className="w-4 h-4" />} />
        <StatCard label="Total Sessions" value={langSessions.length} tone="emerald" />
        <StatCard label="Pipeline" value={languages.length} hint="lifetime list" tone="violet" icon={<Globe className="w-4 h-4" />} />
      </section>

      <Card>
        <CardHeader title="Language ladder" subtitle="Where each language sits on the CEFR scale" />
        <CardBody className="space-y-5">
          {languages.map((l) => {
            const cur = levels.indexOf(l.level);
            const target = levels.indexOf(l.target);
            return (
              <div key={l.id} className={cn("group p-4 rounded-lg border", l.active ? "border-ink-600 bg-ink-800/40" : "border-ink-700 bg-ink-850/30 opacity-70")}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{flagFor[l.name] || "🌍"}</div>
                  <button onClick={() => langModal.openEdit(l)} className="flex-1 min-w-0 text-left">
                    <div className="text-base font-semibold text-ink-50">{l.name}</div>
                    <div className="text-[11px] text-ink-300 mt-0.5">
                      {l.level} → target {l.target}
                      {!l.active && " · paused"}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={l.priority === "p0" ? "rose" : l.priority === "p1" ? "gold" : "neutral"}>
                      {l.priority.toUpperCase()}
                    </Badge>
                    <CrudActions
                      onDelete={() => destroy("languages", l.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {levels.map((lvl, i) => (
                    <div
                      key={lvl}
                      className={cn(
                        "flex-1 h-7 rounded-md border text-[10px] font-mono font-semibold flex items-center justify-center",
                        i <= cur
                          ? "bg-cyan/15 text-cyan border-cyan/40"
                          : i <= target
                            ? "bg-gold/10 text-gold border-gold/30"
                            : "bg-ink-800 text-ink-400 border-ink-700"
                      )}
                    >
                      {lvl}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Recent sessions"
          subtitle="Vocab · grammar · listening · speaking"
          action={<AddButton label="Session" onClick={sessionModal.openAdd} />}
        />
        <CardBody>
          <div className="space-y-2">
            {sessionsPage.slice.map((s) => {
              const lang = languages.find((l) => l.id === s.languageId);
              return (
                <div key={s.id} className="group flex items-center gap-3 p-2.5 rounded-md bg-ink-800/40 border border-ink-700">
                  <span className="text-xl">{flagFor[lang?.name || ""] || "🌍"}</span>
                  <button onClick={() => sessionModal.openEdit(s)} className="flex-1 min-w-0 text-left">
                    <div className="text-sm text-ink-100">
                      {lang?.name} · <span className="capitalize">{s.type}</span>
                      {s.resource && <span className="text-ink-300"> · {s.resource}</span>}
                    </div>
                    <div className="text-[11px] text-ink-300 mt-0.5">{fmtDate(s.date)}</div>
                  </button>
                  <Badge tone="cyan">{s.minutes}m</Badge>
                  <CrudActions
                    onDelete={() => destroy("langSessions", s.id)}
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
              );
            })}
          </div>
          <Pagination
            page={sessionsPage.page}
            totalPages={sessionsPage.totalPages}
            setPage={sessionsPage.setPage}
            total={langSessions.length}
          />
        </CardBody>
      </Card>

      {langModal.node}
      {sessionModal.node}
    </div>
  );
}
