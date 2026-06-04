import { PrismaClient } from "@prisma/client";
import { DEFAULT_SCORING_RULES, scoreLead } from "../src/lib/services/scoring";
import { generateMockLead } from "../src/lib/providers/mockData";
import { listToString, encodeJson } from "../src/lib/serialization";

const db = new PrismaClient();

const DEFAULT_TEMPLATES = [
  {
    name: "Stanford Alum Outreach",
    type: "stanford_alum",
    subjectTemplate: "Stanford Consulting — quick hello",
    bodyTemplate:
      "Hi {{firstName}},\n\nI'm {{senderName}}, {{senderRole}} at Stanford Consulting. As a fellow member of the Stanford community, I wanted to reach out about the work happening at {{company}}. Would you be open to a quick 15-minute call?\n\n{{signature}}",
    followUp1Template:
      "Hi {{firstName}},\n\nJust floating this back up — would a quick call work in the next week or two?\n\n{{signature}}",
    followUp2Template:
      "Hi {{firstName}},\n\nClosing the loop here. I'm one reply away if it's ever useful.\n\n{{signature}}",
  },
  {
    name: "Founder / Startup Outreach",
    type: "founder_startup",
    subjectTemplate: "Stanford Consulting x {{company}}",
    bodyTemplate:
      "Hi {{firstName}},\n\nI'm {{senderName}} at Stanford Consulting, a student-run consulting org. We work with companies on strategy, GTM, product, and ops. I'd love 15 minutes to learn about {{company}} and see if we could help.\n\n{{signature}}",
    followUp1Template:
      "Hi {{firstName}},\n\nFollowing up — would a short call work?\n\n{{signature}}",
    followUp2Template:
      "Hi {{firstName}},\n\nLast note from me — happy to connect whenever the timing is right.\n\n{{signature}}",
  },
  {
    name: "Corporate Executive Outreach",
    type: "corporate_exec",
    subjectTemplate: "Intro from Stanford Consulting",
    bodyTemplate:
      "Hi {{firstName}},\n\nI'm {{senderName}}, {{senderRole}} at Stanford Consulting. We partner with companies on strategy and operations projects. Given your work at {{company}}, I'd value a brief 15-minute introduction.\n\n{{signature}}",
    followUp1Template:
      "Hi {{firstName}},\n\nCircling back in case this slipped through — open to a quick call?\n\n{{signature}}",
    followUp2Template:
      "Hi {{firstName}},\n\nI'll leave it here for now. Thanks for your time either way.\n\n{{signature}}",
  },
  {
    name: "Prior Client / Warm Intro",
    type: "prior_client_warm",
    subjectTemplate: "Reconnecting — Stanford Consulting",
    bodyTemplate:
      "Hi {{firstName}},\n\nGreat to reconnect. I'm {{senderName}} at Stanford Consulting. Given our prior work together, I'd love to catch up for 15 minutes on what's ahead.\n\n{{signature}}",
    followUp1Template:
      "Hi {{firstName}},\n\nFollowing up on my note — would a short call work soon?\n\n{{signature}}",
    followUp2Template:
      "Hi {{firstName}},\n\nClosing the loop — always happy to reconnect down the line.\n\n{{signature}}",
  },
  {
    name: "Cold High-Fit Outreach",
    type: "cold_high_fit",
    subjectTemplate: "Stanford Consulting — {{industry}}",
    bodyTemplate:
      "Hi {{firstName}},\n\nI'm {{senderName}} at Stanford Consulting. We're focused on {{industry}} this quarter and your work at {{company}} stood out. Would you be open to a quick 15-minute call?\n\n{{signature}}",
    followUp1Template:
      "Hi {{firstName}},\n\nQuick follow-up — would 15 minutes work?\n\n{{signature}}",
    followUp2Template:
      "Hi {{firstName}},\n\nLast note — I'm one reply away if helpful.\n\n{{signature}}",
  },
];

async function main() {
  console.log("🌱 Seeding SC Sourcing Engine...");

  // Clear existing data (idempotent reseed).
  await db.interaction.deleteMany();
  await db.outreachDraft.deleteMany();
  await db.lead.deleteMany();
  await db.company.deleteMany();
  await db.pDProfile.deleteMany();
  await db.user.deleteMany();
  await db.scoringRule.deleteMany();
  await db.emailTemplate.deleteMany();
  await db.importJob.deleteMany();

  // --- Users -------------------------------------------------------------
  const admin = await db.user.create({
    data: { name: "Sasha Lead", email: "admin@stanfordconsulting.org", role: "ADMIN" },
  });
  const reviewer = await db.user.create({
    data: { name: "Riley Reviewer", email: "reviewer@stanfordconsulting.org", role: "REVIEWER" },
  });

  const pdSpecs = [
    {
      name: "Maya Fintech",
      email: "maya@stanfordconsulting.org",
      industries: ["Fintech", "SaaS"],
      functions: ["gtm", "strategy"],
      availability: "high",
      notes: "Strong interest in payments and B2B SaaS.",
    },
    {
      name: "Leo Health",
      email: "leo@stanfordconsulting.org",
      industries: ["Healthtech", "Biotech"],
      functions: ["operations", "market_research"],
      availability: "medium",
      notes: "Pre-med background, loves healthcare ops.",
    },
    {
      name: "Nina AI",
      email: "nina@stanfordconsulting.org",
      industries: ["AI / ML", "SaaS"],
      functions: ["ai", "product", "technical"],
      availability: "high",
      notes: "CS major, ML research experience.",
    },
  ];

  const pds = [];
  for (const spec of pdSpecs) {
    const user = await db.user.create({
      data: { name: spec.name, email: spec.email, role: "PD" },
    });
    await db.pDProfile.create({
      data: {
        userId: user.id,
        industries: listToString(spec.industries),
        functions: listToString(spec.functions),
        availability: spec.availability,
        activeLeadCount: 0,
        notes: spec.notes,
      },
    });
    pds.push(user);
  }
  console.log(`  ✔ ${2 + pds.length} users (1 admin, 1 reviewer, ${pds.length} PDs)`);

  // --- Scoring rules -----------------------------------------------------
  for (const rule of DEFAULT_SCORING_RULES) {
    await db.scoringRule.create({
      data: { key: rule.key, label: rule.label, weight: rule.weight, enabled: true },
    });
  }
  console.log(`  ✔ ${DEFAULT_SCORING_RULES.length} scoring rules`);

  // --- Email templates ---------------------------------------------------
  for (const t of DEFAULT_TEMPLATES) {
    await db.emailTemplate.create({ data: { ...t, enabled: true } });
  }
  console.log(`  ✔ ${DEFAULT_TEMPLATES.length} email templates`);

  // --- Companies + Leads -------------------------------------------------
  const statuses = [
    "sourced", "enriched", "drafted", "needs_review", "approved",
    "sent", "replied", "booked",
  ];
  const warmTypes = ["none", "alumni", "intro_available", "mutual", "prior_client"];

  const createdLeads = [];
  for (let i = 0; i < 30; i++) {
    const mock = generateMockLead(i);
    const company = await db.company.upsert({
      where: { id: `seed-co-${mock.companyName}` },
      create: {
        id: `seed-co-${mock.companyName}`,
        name: mock.companyName,
        website: mock.companyWebsite,
        industry: mock.industry,
        size: mock.companySize,
        location: mock.location,
        description: `${mock.companyName} is a company in ${mock.industry}.`,
        fundingSignal: i % 5 === 0 ? "Series B raised recently" : null,
        hiringSignal: i % 4 === 0 ? "Actively hiring across GTM" : null,
      },
      update: {},
    });

    const isSCAlum = i % 6 === 0;
    const warm = warmTypes[i % warmTypes.length];
    const status = statuses[i % statuses.length];
    const assignedPD =
      ["replied", "booked"].includes(status) ? pds[i % pds.length] : null;

    const leadData = {
      firstName: mock.firstName,
      lastName: mock.lastName,
      fullName: mock.fullName,
      email: mock.email,
      workEmail: mock.workEmail,
      linkedinUrl: mock.linkedinUrl,
      title: mock.title,
      seniority: mock.seniority,
      companyName: mock.companyName,
      companyWebsite: mock.companyWebsite,
      industry: mock.industry,
      location: mock.location,
      companySize: mock.companySize,
      source: i % 3 === 0 ? "csv_alumni" : i % 3 === 1 ? "apollo" : "csv_generic",
      isStanfordAlum: mock.isStanfordAlum || isSCAlum,
      isSCAlum,
      isFormerClient: warm === "prior_client",
      warmConnectionType: warm,
      warmConnectionNotes:
        i % 4 === 0 ? "Met at a Stanford event; mentioned hiring growth." : "",
      verifiedEmail: mock.verifiedEmail,
      status,
      assignedPDId: assignedPD?.id ?? null,
      companyId: company.id,
    };

    const breakdown = scoreLead(leadData as never);

    const lead = await db.lead.create({
      data: {
        ...leadData,
        score: breakdown.total,
        scoreBreakdownJson: encodeJson(breakdown),
        priority: breakdown.priority,
      },
    });
    createdLeads.push(lead);

    // Status-change interaction so the timeline isn't empty.
    await db.interaction.create({
      data: {
        leadId: lead.id,
        type: "status_change",
        notes: `Lead created with status "${status}".`,
        createdById: admin.id,
      },
    });
    if (assignedPD) {
      await db.interaction.create({
        data: {
          leadId: lead.id,
          type: "assignment",
          notes: `Assigned to ${assignedPD.name}.`,
          createdById: admin.id,
        },
      });
    }
  }
  console.log(`  ✔ 30 leads (+ companies, interactions)`);

  // Recompute active lead counts for PDs.
  for (const pd of pds) {
    const count = await db.lead.count({
      where: { assignedPDId: pd.id, status: { in: ["replied", "booked", "assigned"] } },
    });
    await db.pDProfile.update({
      where: { userId: pd.id },
      data: { activeLeadCount: count },
    });
  }

  // --- Outreach drafts ---------------------------------------------------
  const draftTypes = [
    "stanford_alum", "founder_startup", "corporate_exec",
    "prior_client_warm", "cold_high_fit",
  ];
  for (let i = 0; i < 10; i++) {
    const lead = createdLeads[i];
    const type = draftTypes[i % draftTypes.length];
    const first = lead.firstName ?? "there";
    const status = i < 5 ? "needs_review" : i < 8 ? "approved" : "ready_to_send";
    await db.outreachDraft.create({
      data: {
        leadId: lead.id,
        type,
        subject: `Stanford Consulting — quick hello`,
        body: `Hi ${first},\n\nI'm reaching out from Stanford Consulting, a student-run consulting organization. We work with companies on strategy, GTM, product, and operations. Given the work at ${lead.companyName}, would you be open to a quick 15-minute call?\n\nBest,\nThe Stanford Consulting Team`,
        followUp1: `Hi ${first},\n\nJust floating this back to the top of your inbox — would a quick call work?\n\nBest,\nStanford Consulting`,
        followUp2: `Hi ${first},\n\nClosing the loop here. I'm one reply away if useful.\n\nBest,\nStanford Consulting`,
        personalizationNote: `Industry: ${lead.industry}. Role: ${lead.title}.`,
        confidenceScore: 70 + (i % 25),
        warningsJson: encodeJson(lead.verifiedEmail ? [] : ["Email is unverified."]),
        status,
        reviewerId: status !== "needs_review" ? reviewer.id : null,
        reviewedAt: status !== "needs_review" ? new Date() : null,
      },
    });
    if (lead.status === "sourced" || lead.status === "enriched") {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: status === "needs_review" ? "needs_review" : "drafted" },
      });
    }
  }
  console.log(`  ✔ 10 outreach drafts`);

  // --- An example import job ---------------------------------------------
  await db.importJob.create({
    data: {
      type: "alumni",
      filename: "sc_alumni_seed.csv",
      rowCount: 12,
      importedCount: 10,
      duplicateCount: 2,
      errorCount: 0,
      status: "completed",
    },
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
