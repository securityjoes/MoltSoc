/**
 * MoltSOC OpenClaw plugin: security summary (RPC + optional agent tool) and CLI to open the full dashboard.
 */

import { exec } from "child_process";

const DEFAULT_COLLECTOR = "http://127.0.0.1:7777";
const DEFAULT_DASHBOARD = "http://localhost:5173";
const MAX_ALERTS_IN_SUMMARY = 25;

type MoltsocConfig = {
  collectorUrl?: string;
  dashboardUrl?: string;
};

function getConfig(api: { config?: Record<string, unknown> }): MoltsocConfig {
  const entries = (api.config?.plugins as Record<string, unknown>)?.entries as Record<string, { config?: MoltsocConfig }> | undefined;
  return entries?.moltsoc?.config ?? {};
}

function getCollectorUrl(api: { config?: Record<string, unknown> }): string {
  return getConfig(api).collectorUrl ?? DEFAULT_COLLECTOR;
}

function getDashboardUrl(api: { config?: Record<string, unknown> }): string {
  return getConfig(api).dashboardUrl ?? DEFAULT_DASHBOARD;
}

async function fetchEvents(collectorUrl: string): Promise<unknown[]> {
  const base = collectorUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/events`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`MoltSOC collector returned ${res.status}`);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

function buildSummary(events: unknown[], dashboardUrl: string): Record<string, unknown> {
  const bySeverity: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  const alerts: Array<{ ts: string; rule?: string; severity?: string; summary?: string }> = [];

  for (const e of events) {
    const ev = e as Record<string, unknown>;
    const sev = typeof ev.severity === "string" ? ev.severity : "info";
    if (bySeverity[sev] !== undefined) bySeverity[sev]++;
    if (ev.type === "alert") {
      const details = (ev.details ?? {}) as Record<string, unknown>;
      alerts.push({
        ts: typeof ev.ts === "string" ? ev.ts : "",
        rule: typeof details.rule === "string" ? details.rule : undefined,
        severity: typeof ev.severity === "string" ? ev.severity : undefined,
        summary: typeof ev.summary === "string" ? ev.summary : undefined,
      });
    }
  }

  alerts.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  const lastAlerts = alerts.slice(0, MAX_ALERTS_IN_SUMMARY);

  return {
    totalEvents: events.length,
    bySeverity,
    alerts: lastAlerts,
    dashboardUrl,
  };
}

async function getSummary(api: { config?: Record<string, unknown> }): Promise<Record<string, unknown>> {
  const collectorUrl = getCollectorUrl(api);
  const dashboardUrl = getDashboardUrl(api);
  try {
    const events = await fetchEvents(collectorUrl);
    return buildSummary(events, dashboardUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: message,
      collectorUrl,
      dashboardUrl,
      totalEvents: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      alerts: [],
    };
  }
}

function openUrl(url: string): void {
  const cmd =
    process.platform === "win32"
      ? `start "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error("MoltSOC: could not open browser:", err.message);
  });
}

export default function register(api: {
  config?: Record<string, unknown>;
  registerGatewayMethod: (name: string, handler: (opts: { respond: (ok: boolean, data: unknown) => void }) => void | Promise<void>) => void;
  registerCli: (fn: (opts: { program: { command: (name: string) => { description: (d: string) => { command: (name: string) => { description: (d: string) => { action: (fn: () => void) => void } } } } } }) => void, opts: { commands: string[] }) => void;
  registerTool: (tool: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (id: string, params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
  }, opts?: { optional?: boolean }) => void;
}) {
  // Gateway RPC: moltsoc.summary → short security summary (counts, last alerts, dashboard URL)
  api.registerGatewayMethod("moltsoc.summary", async ({ respond }) => {
    try {
      const summary = await getSummary(api);
      respond(true, summary);
    } catch (err) {
      respond(false, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  // CLI: openclaw moltsoc dashboard → open full MoltSOC dashboard in browser
  api.registerCli(
    ({ program }) => {
      const moltsoc = program.command("moltsoc").description("MoltSOC security monitoring");
      moltsoc
        .command("dashboard")
        .description("Open MoltSOC dashboard in browser (timeline, alerts, rules, AI context)")
        .action(() => {
          const url = getDashboardUrl(api);
          console.log("Opening MoltSOC dashboard:", url);
          openUrl(url);
        });
    },
    { commands: ["moltsoc"] }
  );

  // Optional agent tool: moltsoc_get_summary — AI can query incident summary for triage
  api.registerTool(
    {
      name: "moltsoc_get_summary",
      description:
        "Get a short MoltSOC security summary: event counts by severity, last alerts (rule, severity, summary), and dashboard URL. Use when the user asks about security incidents, SOC status, or MoltSOC alerts.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      async execute(_id, _params) {
        const summary = await getSummary(api);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      },
    },
    { optional: true }
  );
}
