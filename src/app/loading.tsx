export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2.5 text-slate-400">
        <span className="h-2 w-2 animate-bounce rounded-full bg-cardinal-600 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cardinal-600 [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cardinal-600 [animation-delay:240ms]" />
      </div>
    </div>
  );
}
