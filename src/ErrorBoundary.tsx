import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected UI error", error, info);
  }
  render() {
    if (this.state.error)
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            minHeight: "100vh",
            padding: 32,
            textAlign: "center",
          }}
        >
          <h2>Algo deu errado · Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => location.reload()}>
            Recarregar · Reload
          </button>
        </div>
      );
    return this.props.children;
  }
}
