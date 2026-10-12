import { Component, type ErrorInfo, type ReactNode } from "react";

// A render error (for instance a browser extension or translation rewriting nodes React owns) used
// to unmount the whole page. Recording state lives in the engine, outside React, so remounting the
// tree loses nothing: retry in place a few times, and only then show a reload prompt.
type State = { key: number; failures: number[]; fatal: boolean };

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  State
> {
  state: State = { key: 0, failures: [], fatal: false };

  static getDerivedStateFromError() {
    return null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // The component stack names the exact component that threw; keep it with the error.
    console.error(
      "Voice Bench UI error, remounting:",
      error,
      "\nin component:",
      info.componentStack,
    );
    const now = Date.now();
    const failures = [
      ...this.state.failures.filter((t) => now - t < 10000),
      now,
    ];
    this.setState({
      key: this.state.key + 1,
      failures,
      fatal: failures.length > 3,
    });
  }

  render() {
    if (this.state.fatal) return this.props.fallback;
    return (
      <div key={this.state.key} style={{ display: "contents" }}>
        {this.props.children}
      </div>
    );
  }
}
