import { useMemo } from "react";
import { Building2, Award, Clock, Trophy } from "lucide-react";
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
import { fmtDate } from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";
import { useListControls, opts } from "@/lib/listControls";
import { ListToolbar } from "@/components/ListToolbar";
import { BulkBar, SelectCheckbox } from "@/components/BulkBar";
import type { Application } from "@/lib/types";

const APP_STAGES = [
  "researching",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "accepted",
] as const;
const APP_TYPES = ["internship", "full_time", "freelance"] as const;

const stageColor: Record<Application["stage"], string> = {
  researching: "text-ink-200 bg-ink-700 border-ink-500",
  applied: "text-cyan bg-cyan/10 border-cyan/30",
  screening: "text-violet bg-violet/10 border-violet/30",
  interview: "text-gold bg-gold/10 border-gold/30",
  offer: "text-emerald bg-emerald/10 border-emerald/30",
  accepted: "text-emerald bg-emerald/20 border-emerald/50",
  rejected: "text-rose bg-rose/10 border-rose/30",
};

export default function Career() {
  const { applications, destroy, patch } = useStore();

  const appsCtrl = useListControls(applications, {
    storageKey: "applications",
    text: (a) =>
      `${a.company} ${a.role} ${a.location ?? ""} ${(a.stack ?? []).join(" ")} ${a.notes ?? ""}`,
    filters: {
      stage: { label: "Stage", options: opts(APP_STAGES), get: (a) => a.stage },
      type: { label: "Type", options: opts(APP_TYPES), get: (a) => a.type },
    },
    sorts: {
      recent: {
        label: "Recent",
        compare: (a, b) => b.createdAt.localeCompare(a.createdAt),
      },
      applied: {
        label: "Applied (newest)",
        compare: (a, b) => (b.applied ?? "").localeCompare(a.applied ?? ""),
      },
      stage: {
        label: "Stage progress",
        compare: (a, b) =>
          APP_STAGES.indexOf(b.stage) - APP_STAGES.indexOf(a.stage),
      },
      company: {
        label: "Company A→Z",
        compare: (a, b) => a.company.localeCompare(b.company),
      },
    },
    defaultSort: "recent",
  });
  const appModal = useEntityModal("applications");

  const appsPage = usePagination(appsCtrl.filtered, 5);

  const stats = useMemo(
    () => ({
      total: applications.length,
      live: applications.filter(
        (a) => !["rejected", "accepted"].includes(a.stage)
      ).length,
      interview: applications.filter((a) =>
        ["interview", "offer", "accepted"].includes(a.stage)
      ).length,
      offers: applications.filter((a) =>
        ["offer", "accepted"].includes(a.stage)
      ).length,
    }),
    [applications]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internship · Full-time · Freelance"
        title="Career Dashboard"
        subtitle="Pipeline of every shot taken — from researching to offer."
        action={<AddButton label="Application" onClick={appModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Apps" value={stats.total} tone="cyan" icon={<Building2 className="w-4 h-4" />} />
        <StatCard label="Live Pipeline" value={stats.live} tone="gold" icon={<Clock className="w-4 h-4" />} />
        <StatCard label="Reached Interview" value={stats.interview} tone="emerald" icon={<Award className="w-4 h-4" />} />
        <StatCard label="Offers" value={stats.offers} tone="violet" icon={<Trophy className="w-4 h-4" />} />
      </section>

      <Card>
        <CardHeader title="Application pipeline" subtitle="Tracking every shot taken" />
        <CardBody>
          <ListToolbar ctrl={appsCtrl} />
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
                  <th className="w-6 py-2">
                    <SelectCheckbox
                      checked={appsCtrl.allVisibleSelected}
                      onChange={() =>
                        appsCtrl.allVisibleSelected
                          ? appsCtrl.clearSelection()
                          : appsCtrl.selectAllVisible()
                      }
                      ariaLabel="Select all visible"
                    />
                  </th>
                  <th className="text-left font-medium py-2">Company</th>
                  <th className="text-left font-medium py-2">Role</th>
                  <th className="text-left font-medium py-2">Stack</th>
                  <th className="text-left font-medium py-2">Stage</th>
                  <th className="text-left font-medium py-2">Applied</th>
                  <th className="text-right font-medium py-2"></th>
                </tr>
              </thead>
              <tbody>
                {appsPage.slice.map((a) => (
                  <tr key={a.id} className="group border-b border-ink-700/60 hover:bg-ink-800/40">
                    <td className="py-2.5">
                      <SelectCheckbox
                        checked={appsCtrl.isSelected(a.id)}
                        onChange={() => appsCtrl.toggleSelect(a.id)}
                      />
                    </td>
                    <td className="py-2.5 text-ink-100 font-medium">{a.company}</td>
                    <td className="py-2.5 text-ink-200">{a.role}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(a.stack || []).slice(0, 3).map((s) => (
                          <Badge key={s} tone="neutral" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <Badge className={stageColor[a.stage]}>
                        {a.stage.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs text-ink-300 font-mono">
                      {a.applied ? fmtDate(a.applied) : "—"}
                    </td>
                    <td className="py-2.5">
                      <CrudActions
                        onEdit={() => appModal.openEdit(a)}
                        onDelete={() => destroy("applications", a.id)}
                        className="justify-end opacity-0 group-hover:opacity-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={appsPage.page}
            totalPages={appsPage.totalPages}
            setPage={appsPage.setPage}
            total={appsCtrl.filtered.length}
          />
          <BulkBar
            ctrl={appsCtrl}
            actions={[
              {
                label: "Mark applied",
                run: (ids) => ids.forEach((id) => patch("applications", id, { stage: "applied" })),
              },
              {
                label: "Mark interview",
                run: (ids) => ids.forEach((id) => patch("applications", id, { stage: "interview" })),
              },
              {
                label: "Mark rejected",
                run: (ids) => ids.forEach((id) => patch("applications", id, { stage: "rejected" })),
              },
              {
                label: "Delete",
                tone: "danger",
                confirm: "Delete {n} application(s)?",
                run: (ids) => ids.forEach((id) => destroy("applications", id)),
              },
            ]}
          />
        </CardBody>
      </Card>

      {appModal.node}
    </div>
  );
}
