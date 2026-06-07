// Runs once when the server starts (Next.js instrumentation hook). Boots the
// in-process follow-up scheduler in the Node.js runtime only.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
