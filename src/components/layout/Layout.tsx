import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { GlobalFormHost } from "@/components/GlobalFormHost";
import { Toaster } from "@/components/Toaster";
import { AlertTriangle, Sparkles } from "lucide-react";
import { API_BASE } from "@/lib/api";

export const Layout = () => {
  const { status, error, loadAll } = useStore();
  const location = useLocation();

  // Fetch all collections once on mount.
  useEffect(() => {
    loadAll();
  }, [loadAll]);


  // Background sync: drain queued writes whenever the browser comes back
  // online, the tab regains focus, or every 20s as a fallback. Without this,
  // a transient API outage stuck writes in `unsynced` until manual refresh.
  useEffect(() => {
    const { flushOutbox } = useStore.getState();
    const tryFlush = () => {
      if (useStore.getState().outbox.length > 0) {
        void flushOutbox();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tryFlush();
    };
    window.addEventListener("online", tryFlush);
    window.addEventListener("focus", tryFlush);
    document.addEventListener("visibilitychange", onVisible);
    const t = window.setInterval(tryFlush, 20_000);
    return () => {
      window.removeEventListener("online", tryFlush);
      window.removeEventListener("focus", tryFlush);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-screen flex ambient-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <TopBar />
        <main className="flex-1 pt-24 md:pt-28 px-5 md:px-10 pb-10 max-w-[1600px] w-full mx-auto">
          {status === "ready" ? (
            // key resets the boundary on navigation so one bad page
            // never permanently blanks the app.
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          ) : status === "error" ? (
            <ConnectionError message={error} onRetry={loadAll} />
          ) : (
            <BootLoading />
          )}
        </main>
      </div>

      {/* Global overlays — available from every page */}
      <CommandPalette />
      <GlobalFormHost />
      <Toaster />
    </div>
  );
};

const BootLoading = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
    <div className="w-12 h-12 rounded-xl bg-ink-800 border border-cyan/35 flex items-center justify-center mb-4 animate-pulse">
      <Sparkles className="w-5 h-5 text-cyan" strokeWidth={1.75} />
    </div>
    <div className="text-sm text-ink-100 font-medium">Booting command center…</div>
    <div className="text-xs text-ink-400 mt-1 font-mono">syncing from database</div>
  </div>
);

const ConnectionError = ({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
    <div className="w-12 h-12 rounded-xl bg-rose/10 border border-rose/30 flex items-center justify-center mb-4">
      <AlertTriangle className="w-5 h-5 text-rose" />
    </div>
    <div className="text-sm text-ink-50 font-medium">Can't reach the API</div>
    <div className="text-xs text-ink-300 mt-1 max-w-md">
      The backend at{" "}
      <span className="font-mono text-ink-200">{API_BASE}</span> isn't
      responding. Start it with{" "}
      <span className="font-mono text-cyan">npm run dev</span> inside{" "}
      <span className="font-mono text-ink-200">server/</span> and make sure
      Postgres is up (<span className="font-mono text-cyan">docker compose up -d</span>).
    </div>
    {message && (
      <div className="text-[11px] text-rose/80 mt-2 font-mono">{message}</div>
    )}
    <Button variant="primary" className="mt-5" onClick={onRetry}>
      Retry connection
    </Button>
  </div>
);
