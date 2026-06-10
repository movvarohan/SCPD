import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cardinal-700 text-lg font-bold text-white">SC</div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        That page doesn&apos;t exist (or the lead was deleted). Use ⌘K to jump anywhere.
      </p>
      <Link href="/" className="mt-5 rounded-md bg-cardinal-700 px-4 py-2 text-sm font-medium text-white hover:bg-cardinal-800">
        Back to dashboard
      </Link>
    </div>
  );
}
