"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DEFAULT_SCORING_RULES, type RuleWeights } from "@/lib/services/scoring";

// Load scoring rules into the weight map the scoring service expects.
export async function getRuleWeights(): Promise<RuleWeights> {
  const rules = await db.scoringRule.findMany();
  if (!rules.length) {
    const fallback: RuleWeights = {};
    for (const r of DEFAULT_SCORING_RULES) {
      fallback[r.key] = { weight: r.weight, enabled: true, label: r.label };
    }
    return fallback;
  }
  const weights: RuleWeights = {};
  for (const r of rules) {
    weights[r.key] = { weight: r.weight, enabled: r.enabled, label: r.label };
  }
  return weights;
}

export async function updateScoringRule(
  id: string,
  data: { weight?: number; enabled?: boolean }
) {
  await db.scoringRule.update({ where: { id }, data });
  revalidatePath("/scoring");
  return { ok: true };
}

export async function resetScoringRules() {
  await db.scoringRule.deleteMany();
  for (const rule of DEFAULT_SCORING_RULES) {
    await db.scoringRule.create({
      data: { key: rule.key, label: rule.label, weight: rule.weight, enabled: true },
    });
  }
  revalidatePath("/scoring");
  return { ok: true };
}
