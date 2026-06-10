"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The error has been logged{error.digest ? ` (ref ${error.digest})` : ""}. Try again — if it persists,
        ask the Help assistant or your admin.
      </p>
      <button onClick={reset} className="mt-5 rounded-md bg-cardinal-700 px-4 py-2 text-sm font-medium text-white hover:bg-cardinal-800">
        Try again
      </button>
    </div>
  );
}
