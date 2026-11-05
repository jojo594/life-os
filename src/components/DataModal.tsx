/**
 * Data & Backup center: export, import/restore (with validation), and blank
 * slate.
 *
 * The destructive "Wipe" action sits in a Danger zone and requires typing an
 * exact word to enable the button.
 */
import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { Dialog } from "@/components/form";
import { Button, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Result = { kind: "ok" | "err"; message: string } | null;

export function DataModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { exportJSON, importAll, clearAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [wipeConfirm, setWipeConfirm] = useState("");

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setResult({ kind: "ok", message: "Backup downloaded." });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResult(null);
    setBusy("import");
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Backup must be a JSON object of collections.");
      }
      const res = await importAll(parsed as Record<string, unknown>);
      setResult({ kind: "ok", message: `Restored ${res.inserted} records from backup.` });
    } catch (err) {
      setResult({
        kind: "err",
        message: err instanceof Error ? err.message : "Import failed.",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleWipe = async () => {
    if (wipeConfirm !== "DELETE") return;
    setBusy("wipe");
    setResult(null);
    try {
      await clearAll();
      setWipeConfirm("");
      setResult({ kind: "ok", message: "All data cleared. Blank slate ready." });
    } catch {
      setResult({ kind: "err", message: "Wipe failed. Is the API running?" });
    } finally {
      setBusy(null);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Data & Backup"
      subtitle="Export, restore, or reset your Life-OS database."
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        {result && (
          <div
            className={cn(
              "flex items-start gap-2 p-2.5 rounded-lg border text-sm",
              result.kind === "ok"
                ? "border-emerald/40 bg-emerald/5 text-ink-100"
                : "border-rose/40 bg-rose/5 text-ink-100"
            )}
          >
            {result.kind === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose mt-0.5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        {/* Safe actions */}
        <Row
          icon={<Download className="w-4 h-4 text-cyan" />}
          title="Export backup"
          desc="Download everything as a JSON file you can restore later."
          action={<Button variant="secondary" size="sm" onClick={handleExport}>Export</Button>}
        />

        <Row
          icon={<Upload className="w-4 h-4 text-cyan" />}
          title="Restore from backup"
          desc="Replace all current data with a previously exported file. Validated before applying."
          action={
            <>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={busy === "import"}
                onClick={() => fileRef.current?.click()}
              >
                {busy === "import" ? "Importing…" : "Choose file"}
              </Button>
            </>
          }
        />

        {/* Danger zone */}
        <div className="rounded-xl border border-ink-600 bg-ink-850/50 p-3.5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-ink-700">
            <ShieldAlert className="w-4 h-4 text-rose" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-100">
              Danger zone
            </span>
            <span className="text-[10px] text-ink-400">— this action is irreversible</span>
          </div>

          {/* Blank slate */}
          <div className="rounded-lg border border-rose/30 bg-rose/5 p-3">
            <div className="flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-rose mt-0.5 shrink-0" />
              <div className="min-w-0 w-full">
                <div className="text-sm font-medium text-ink-50">Blank slate</div>
                <div className="text-xs text-ink-300 mt-0.5">
                  Permanently delete <span className="text-rose">all</span> records and
                  start empty. Export first if unsure.
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    value={wipeConfirm}
                    onChange={(e) => setWipeConfirm(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="h-8 max-w-[200px]"
                    aria-label="Type DELETE to confirm"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={wipeConfirm !== "DELETE" || busy === "wipe"}
                    onClick={handleWipe}
                  >
                    {busy === "wipe" ? "Clearing…" : "Wipe everything"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Row({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/40 p-3.5">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-50">{title}</div>
        <div className="text-xs text-ink-300 mt-0.5">{desc}</div>
      </div>
      <div className="shrink-0 flex items-center gap-2">{action}</div>
    </div>
  );
}
