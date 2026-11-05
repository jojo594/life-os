import { useMemo } from "react";
import {
  GraduationCap,
  Calendar,
  Trophy,
  AlertTriangle,
  FileText,
  Clock,
} from "lucide-react";
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
import {
  cn,
  daysUntil,
  fmtDate,
  statusColor,
  statusLabel,
} from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";

const colorMap: Record<string, string> = {
  cyan: "from-cyan/30 to-cyan/5 border-cyan/30",
  gold: "from-gold/30 to-gold/5 border-gold/30",
  emerald: "from-emerald/30 to-emerald/5 border-emerald/30",
  violet: "from-violet/30 to-violet/5 border-violet/30",
  rose: "from-rose/30 to-rose/5 border-rose/30",
};

export default function University() {
  const { courses, assignments, exams, destroy } = useStore();
  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: `${c.code} · ${c.name}`,
  }));
  const courseModal = useEntityModal("courses");
  const assignmentModal = useEntityModal("assignments", { courseId: courseOptions });
  const examModal = useEntityModal("exams", { courseId: courseOptions });

  const upcoming = useMemo(
    () =>
      [...assignments]
        .filter((a) => a.status !== "done")
        .sort(
          (a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()
        ),
    [assignments]
  );

  const sortedExams = useMemo(
    () =>
      [...exams].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [exams]
  );

  const coursesPage = usePagination(courses, 5);
  const upcomingPage = usePagination(upcoming, 5);
  const examsPage = usePagination(sortedExams, 5);

  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const avgProgress = Math.round(
    courses.reduce((s, c) => s + c.progress, 0) / Math.max(1, courses.length)
  );
  const nextExam = sortedExams[0];
  const studyHours = exams.reduce((s, e) => s + e.studied, 0);
  const targetHours = exams.reduce((s, e) => s + e.target, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Courses · Exams · Progress"
        title="University Dashboard"
        subtitle="Lectures, labs, exams, and the GPA push. One stop for academic execution."
        action={<AddButton label="Course" onClick={courseModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Courses"
          value={courses.length}
          hint={`${totalCredits} credits`}
          tone="cyan"
          icon={<GraduationCap className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Progress"
          value={`${avgProgress}%`}
          hint="weighted across courses"
          tone="emerald"
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatCard
          label="Next Exam"
          value={nextExam ? `${daysUntil(nextExam.date)}d` : "—"}
          hint={
            nextExam
              ? courses.find((c) => c.id === nextExam.courseId)?.code
              : ""
          }
          tone="gold"
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Study Hours"
          value={`${studyHours}h`}
          hint={`target ${targetHours}h`}
          tone="violet"
          icon={<Clock className="w-4 h-4" />}
        />
      </section>

      {/* Courses */}
      <Card>
        <CardHeader
          title="Courses"
          subtitle="Live progress on every active course"
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coursesPage.slice.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group relative rounded-xl border bg-gradient-to-br p-4 overflow-hidden",
                  colorMap[c.color || "cyan"]
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => courseModal.openEdit(c)}
                    className="text-left min-w-0"
                  >
                    <div className="text-[10px] font-mono uppercase tracking-widest text-ink-200">
                      {c.code}
                    </div>
                    <div className="text-base font-semibold text-ink-50 mt-1 leading-tight">
                      {c.name}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge tone="neutral">{c.credits} ECTS</Badge>
                    <CrudActions
                      onEdit={() => courseModal.openEdit(c)}
                      onDelete={() => destroy("courses", c.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-ink-200">Progress</span>
                    <span className="font-mono text-ink-100">{c.progress}%</span>
                  </div>
                  <Progress
                    value={c.progress}
                    tone={
                      (c.color as
                        | "cyan"
                        | "gold"
                        | "emerald"
                        | "violet"
                        | "rose") || "cyan"
                    }
                  />
                </div>
                {c.examDate && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-200">
                    <Calendar className="w-3 h-3" />
                    Exam {fmtDate(c.examDate)} ·{" "}
                    <span className="font-mono">{daysUntil(c.examDate)}d</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination
            page={coursesPage.page}
            totalPages={coursesPage.totalPages}
            setPage={coursesPage.setPage}
            total={courses.length}
          />
        </CardBody>
      </Card>

      {/* Upcoming + Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upcoming assignments"
            subtitle="Labs, homework, projects, presentations"
            action={<AddButton label="Assignment" onClick={assignmentModal.openAdd} />}
          />
          <CardBody>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
                    <th className="text-left font-medium py-2">Title</th>
                    <th className="text-left font-medium py-2">Course</th>
                    <th className="text-left font-medium py-2">Type</th>
                    <th className="text-left font-medium py-2">Due</th>
                    <th className="text-left font-medium py-2">Status</th>
                    <th className="text-right font-medium py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPage.slice.map((a) => {
                    const course = courses.find((c) => c.id === a.courseId);
                    const d = daysUntil(a.due);
                    const urgent = d !== null && d <= 3;
                    return (
                      <tr
                        key={a.id}
                        className="group border-b border-ink-700/60 hover:bg-ink-800/40 transition-colors"
                      >
                        <td className="py-2.5 text-ink-100">{a.title}</td>
                        <td className="py-2.5 text-ink-300 font-mono text-xs">
                          {course?.code}
                        </td>
                        <td className="py-2.5">
                          <Badge tone="neutral" className="capitalize">
                            {a.type}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-xs">
                          <span className="text-ink-200">{fmtDate(a.due)}</span>
                          {d !== null && (
                            <span
                              className={cn(
                                "ml-2 font-mono",
                                urgent ? "text-rose" : "text-ink-300"
                              )}
                            >
                              {d}d
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <Badge className={statusColor[a.status]}>
                            {statusLabel[a.status]}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          <CrudActions
                            onEdit={() => assignmentModal.openEdit(a)}
                            onDelete={() => destroy("assignments", a.id)}
                            className="justify-end opacity-0 group-hover:opacity-100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={upcomingPage.page}
              totalPages={upcomingPage.totalPages}
              setPage={upcomingPage.setPage}
              total={upcoming.length}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Exam study tracker"
            subtitle="Hours studied vs target"
            action={<AddButton label="Exam" onClick={examModal.openAdd} />}
          />
          <CardBody className="space-y-4">
            {examsPage.slice.map((e) => {
              const course = courses.find((c) => c.id === e.courseId);
              const pct = Math.min(100, (e.studied / e.target) * 100);
              const d = daysUntil(e.date);
              return (
                <div key={e.id} className="group">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <button
                      onClick={() => examModal.openEdit(e)}
                      className="min-w-0 text-left flex-1"
                    >
                      <div className="text-sm font-medium text-ink-50 truncate">
                        {course?.code} · {course?.name}
                      </div>
                      <div className="text-[11px] text-ink-300 mt-0.5">
                        {fmtDate(e.date)} ·{" "}
                        <span className="font-mono">
                          {d !== null && d >= 0 ? `${d}d left` : `${Math.abs(d ?? 0)}d ago`}
                        </span>{" "}
                        · confidence {"★".repeat(e.confidence)}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono text-ink-100">
                        {e.studied}/{e.target}h
                      </span>
                      <CrudActions
                        onDelete={() => destroy("exams", e.id)}
                        className="opacity-0 group-hover:opacity-100"
                      />
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    tone={pct < 40 ? "rose" : pct < 75 ? "gold" : "emerald"}
                  />
                </div>
              );
            })}
            <Pagination
              page={examsPage.page}
              totalPages={examsPage.totalPages}
              setPage={examsPage.setPage}
              total={sortedExams.length}
            />
          </CardBody>
        </Card>
      </div>

      {courseModal.node}
      {assignmentModal.node}
      {examModal.node}
    </div>
  );
}
