/**
 * AI Daily Brief — pulls a 3-line ops summary from the server's /api/brief
 * route. Server-side cache (4h TTL) means most renders are instant; the
 * Refresh button forces regeneration via POST.
 *
 * Renders nothing visible while the first load is pending — so cold renders
 * don't push the main dashboard down. Once a brief lands, sits at the top of
 * Home as a focused, dense card.
 */
import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface State {
  brief?: string;
  generatedAt?: string;
  cached?: boolean;
  loading: boolean;
  error?: string;
  // Surfaces the specific "API key not configured" path so we can show a
  // friendlier setup message instead of the raw 503 string.
  needsKey?: boolean;
}

const fmtRelative = (iso?: string) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function BriefCard() {
  const [state, setState] = useState<State>({ loading: true });

  const load = useCallback(async (force = false) => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const data = force ? await api.briefRefresh() : await api.brief();
      setState({
        brief: data.brief,
        generatedAt: data.generatedAt,
        cached: data.cached,
        loading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const needsKey = msg.includes("503") || msg.includes("ANTHROPIC_API_KEY");
      setState({ loading: false, error: msg, needsKey });
    }
  }, []);

  // Fire on mount. The server cache means this is usually instant.
  useEffect(() => {
    load(false);
  }, [load]);

  // Don't render anything until first load resolves — prevents a layout jolt.
  if (state.loading && !state.brief && !state.error) {
    return (
      <Card className="border-cyan/30">
        <CardBody>
          <div className="flex items-center gap-2 text-xs text-ink-400 font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-cyan animate-pulse" />
            briefing in progress…
          </div>
        </CardBody>
      </Card>
    );
  }

  // Setup-state — friendly path when ANTHROPIC_API_KEY isn't in server/.env.
  if (state.needsKey) {
    return (
      <Card className="border-gold/30">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              Daily brief — setup required
            </span>
          }
          subtitle="Add an Anthropic API key to enable the AI daily brief."
        />
        <CardBody>
          <ol className="text-sm text-ink-200 space-y-1.5 list-decimal pl-5">
            <li>
              Add{" "}
              <code className="font-mono text-cyan bg-ink-800 px-1.5 py-0.5 rounded">
                ANTHROPIC_API_KEY=sk-ant-…
              </code>{" "}
              to <code className="font-mono text-ink-100">server/.env</code>
            </li>
            <li>
              Restart the API:{" "}
              <code className="font-mono text-ink-100">cd server && npm run dev</code>
            </li>
            <li>Refresh this tab.</li>
          </ol>
          <p className="mt-3 text-[11px] text-ink-400">
            Your key stays on the server — never leaves your machine. Life-OS is
            local-only by design.
          </p>
        </CardBody>
      </Card>
    );
  }

  // Generic error path — anything other than the missing-key case.
  if (state.error) {
    return (
      <Card className="border-rose/30">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose" />
              Daily brief unavailable
            </span>
          }
          subtitle={state.error}
          action={
            <button
              onClick={() => load(true)}
              className="text-[11px] font-mono text-ink-300 hover:text-cyan flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              retry
            </button>
          }
        />
      </Card>
    );
  }

  // Happy path — render the 3-line brief.
  const lines = (state.brief ?? "").split(/\n+/).filter(Boolean).slice(0, 3);

  return (
    <Card className="border-cyan/30 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-850 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan/8 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan" />
              Daily ops brief
            </span>
          }
          subtitle={
            <span className="text-[11px] font-mono text-ink-400">
              {state.cached ? "cached" : "fresh"} ·{" "}
              {fmtRelative(state.generatedAt)}
            </span>
          }
          action={
            <div className="flex items-center gap-2">
              <Badge tone="cyan" className="text-[10px]">
                AI
              </Badge>
              <button
                onClick={() => load(true)}
                disabled={state.loading}
                title="Force regenerate"
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center text-ink-300 hover:bg-ink-800 hover:text-cyan transition-colors",
                  state.loading && "animate-spin"
                )}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <CardBody>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[10px] font-mono text-cyan/60 mt-1.5 shrink-0 w-4">
                  0{i + 1}
                </span>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    i === 0
                      ? "text-ink-50 font-medium"
                      : i === 1
                        ? "text-ink-100"
                        : "text-ink-200"
                  )}
                >
                  {line}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </div>
    </Card>
  );
}
