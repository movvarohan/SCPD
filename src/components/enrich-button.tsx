"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { enrichMissingEmails } from "@/server/actions/leads";

export function EnrichButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function run() {
    start(async () => {
      const res = await enrichMissingEmails();
      toast(
        res.updated > 0
          ? `Enriched ${res.updated} leads${res.verified ? `, ${res.verified} verified` : " (unverified guesses)"} · ${res.skipped} skipped (no domain).`
          : `No leads enriched — ${res.skipped} lacked a usable company domain + name.`,
        res.updated > 0 ? "success" : "info"
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={pending} title="Guess emails from company domain for leads missing one">
      <Wand2 className="h-3.5 w-3.5" /> {pending ? "Enriching…" : "Enrich missing emails"}
    </Button>
  );
}
