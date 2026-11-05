import { useEffect, useRef, useState } from "react";
import { RefreshCw, Search, Menu, Database, Loader2, CloudOff, X, Sun, Moon } from "lucide-react";
import { Button, Kbd } from "@/components/ui";
import { useStore } from "@/lib/store";
import { DataModal } from "@/components/DataModal";
import { cn } from "@/lib/utils";

const quotes = [
  "Discipline equals freedom.",
  "Compound the right inputs.",
  "Discipline is built, not born.",
  "Make the work undeniable.",
  "Every rep is a vote for who you become.",
];
const todayQuote = () => quotes[new Date().getDate() % quotes.length];
const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const TopBar = () => {
  const {
    loadAll,
    flushOutbox,
    discardOutbox,
    discardOp,
    status,
    syncPending,
    setMobileNav,
    setCommandOpen,
    outbox,
    theme,
    toggleTheme,
  } = useStore();
  const [dataOpen, setDataOpen] = useState(false);
  const [outboxOpen, setOutboxOpen] = useState(false);
  const outboxRef = useRef<HTMLDivElement>(null);

  // Click-outside closes the outbox popover.
  useEffect(() => {
    if (!outboxOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (outboxRef.current && !outboxRef.current.contains(e.target as Node)) {
        setOutboxOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [outboxOpen]);

  const syncing = syncPending > 0;
  const unsynced = outbox.length;
  const dot =
    status === "error"
      ? { cls: "bg-rose", label: "offline" }
      : syncing
        ? { cls: "bg-gold animate-pulse", label: "saving…" }
        : status === "ready"
          ? { cls: "bg-emerald", label: "DB live" }
          : { cls: "bg-gold animate-pulse", label: "sync" };

  return (
    <>
      {/* Centered floating search pill — search + status + date */}
      <div className="fixed top-3 md:top-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1rem)] max-w-[680px] px-2 md:px-0">
        <div className="glass-strong rounded-2xl flex items-center gap-2 pl-2 pr-2 h-12 shadow-[0_8px_30px_-12px_rgb(0_0_0/var(--shadow-alpha))]">
          {/* Mobile menu */}
          <button
            onClick={() => setMobileNav(true)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-ink-200 hover:bg-ink-50/[0.06] transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Status orb (always visible — replaces the old text status block) */}
          <div
            className="hidden md:flex items-center gap-1.5 pl-2 pr-1 shrink-0"
            title={`API: ${status}`}
          >
            <span className="relative inline-flex w-2 h-2">
              <span className={cn("relative inline-flex rounded-full w-2 h-2", dot.cls)} />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-300">
              {dot.label}
            </span>
          </div>

          {/* Search trigger → command palette */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 flex-1 min-w-0 h-9 rounded-xl px-3 text-left hover:bg-ink-50/[0.05] transition-colors group"
            aria-label="Open command palette"
          >
            <Search className="w-4 h-4 text-ink-400 group-hover:text-ink-200 shrink-0 transition-colors" />
            <span className="text-sm text-ink-400 truncate flex-1">
              Search or jump to…
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          {/* Date pill — calm italic serif */}
          <div className="hidden lg:flex items-center pr-2 pl-1 shrink-0">
            <span className="font-serif italic text-[12px] text-ink-300">
              {todayLabel()}
            </span>
          </div>
        </div>
        {/* Whisper-quiet daily quote underneath the pill */}
        <div className="hidden md:block text-center mt-1.5">
          <span className="font-serif italic text-[11px] text-ink-400/70">
            "{todayQuote()}"
          </span>
        </div>
      </div>

      {/* Right-anchored floating action pill */}
      <div className="fixed top-3 md:top-4 right-3 md:right-6 z-20">
        <div className="glass-strong rounded-2xl flex items-center gap-1 p-1.5 shadow-[0_8px_30px_-12px_rgb(0_0_0/var(--shadow-alpha))]">
          {/* compact sync indicator for narrow screens */}
          <div className="md:hidden flex items-center px-1.5" title={dot.label}>
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" />
            ) : (
              <span className={cn("w-1.5 h-1.5 rounded-full", dot.cls)} />
            )}
          </div>
          {/* Unsynced-writes badge — click to inspect / retry / discard queued ops */}
          {unsynced > 0 && (
            <div className="relative" ref={outboxRef}>
              <button
                onClick={() => setOutboxOpen((o) => !o)}
                title={`${unsynced} change${unsynced > 1 ? "s" : ""} kept locally — click to inspect`}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-rose/10 border border-rose/30 text-rose hover:bg-rose/15 transition-colors"
              >
                <CloudOff className="w-3.5 h-3.5" />
                <span className="text-xs font-mono">{unsynced}</span>
                <span className="hidden lg:inline text-xs">unsynced</span>
              </button>
              {outboxOpen && (
                <div className="absolute right-0 top-11 z-30 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl glass-strong shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-ink-600/60">
                    <div>
                      <div className="text-sm font-medium text-ink-50">
                        Unsynced changes
                      </div>
                      <div className="font-serif italic text-[11px] text-ink-400 mt-0.5">
                        {unsynced} pending · kept in localStorage
                      </div>
                    </div>
                    <button
                      onClick={() => setOutboxOpen(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-300 hover:bg-ink-50/[0.06] hover:text-ink-50"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-ink-700/60">
                    {outbox.map((op) => (
                      <div key={op.id} className="px-3 py-2.5 flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span
                              className={cn(
                                "font-mono uppercase px-1.5 py-0.5 rounded border text-[10px]",
                                op.kind === "create"
                                  ? "border-emerald/40 text-emerald bg-emerald/10"
                                  : op.kind === "update"
                                    ? "border-cyan/40 text-cyan bg-cyan/10"
                                    : "border-rose/40 text-rose bg-rose/10"
                              )}
                            >
                              {op.kind}
                            </span>
                            <span className="text-ink-100 font-medium truncate">
                              {op.collection}
                            </span>
                            {op.kind !== "create" && (
                              <span className="text-[10px] font-mono text-ink-400 truncate">
                                #{op.recordId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-ink-400 mt-1 font-mono">
                            attempts: {op.attempts}
                          </div>
                          {op.lastError && (
                            <div className="text-[10px] text-rose/80 mt-0.5 break-words line-clamp-2">
                              {op.lastError}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => discardOp(op.id)}
                          title="Discard this change"
                          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-rose/10 hover:text-rose"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-2.5 border-t border-ink-600/60">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => flushOutbox()}
                      title="Retry every queued write"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry all
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            `Discard ${unsynced} unsynced change${unsynced > 1 ? "s" : ""}? They will be lost.`
                          )
                        ) {
                          discardOutbox();
                          setOutboxOpen(false);
                        }
                      }}
                    >
                      Discard all
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
            className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-ink-200 hover:bg-ink-50/[0.06] hover:text-ink-50 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => loadAll()}
            title="Refresh from server"
            className="h-8 w-8 lg:w-auto lg:px-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-ink-200 hover:bg-ink-50/[0.06] hover:text-ink-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-xs">Refresh</span>
          </button>
          <button
            onClick={() => setDataOpen(true)}
            title="Data & backup"
            className="h-8 w-8 lg:w-auto lg:px-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-ink-200 hover:bg-ink-50/[0.06] hover:text-ink-50 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-xs">Data</span>
          </button>
        </div>
      </div>

      <DataModal open={dataOpen} onClose={() => setDataOpen(false)} />
    </>
  );
};
