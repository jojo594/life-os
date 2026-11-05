import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Contains render errors to the current page instead of unmounting the whole app
 * to a blank screen. Wrap the routed <Outlet/> with this (keyed by route so it
 * resets on navigation). React error boundaries must be class components.
 */
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced in the console for debugging; the UI shows a contained fallback.
    console.error("[life-os] page error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-rose/10 border border-rose/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-rose" />
          </div>
          <div className="text-sm text-ink-50 font-medium">
            This page hit an error
          </div>
          <div className="text-xs text-ink-300 mt-1 max-w-md">
            The rest of the app is fine — use the sidebar to navigate, or try
            again.
          </div>
          <div className="text-[11px] text-rose/80 mt-2 font-mono max-w-lg break-words">
            {this.state.error.message}
          </div>
          <Button variant="primary" className="mt-5" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
