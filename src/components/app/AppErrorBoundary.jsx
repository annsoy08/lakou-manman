"use client";

import React from "react";
import { trackError } from "@/lib/telemetry";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    trackError(error, {
      scope: "react_error_boundary",
      componentStack: (errorInfo && errorInfo.componentStack) || "",
    });
  }

  handleRetry() {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Une erreur est survenue</h1>
            <p className="mt-3 text-sm text-slate-500">
              L'application a rencontré un problème inattendu. Vous pouvez recharger la page pour continuer.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-6 inline-flex rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
