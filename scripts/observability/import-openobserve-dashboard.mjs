#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDashboardPath = path.resolve(
  __dirname,
  "../../docs/assets/dashboards/neurolink-proxy-observability-dashboard.json",
);

function usage() {
  console.error(`Usage:
  node scripts/observability/import-openobserve-dashboard.mjs [options]

Options:
  --dashboard <path>       Dashboard JSON to import
  --openobserve-url <url>  OpenObserve base URL
  --org <org>              OpenObserve org identifier
  --user <email>           OpenObserve login email
  --password <password>    OpenObserve login password
  --replace-by-title       Delete older dashboards with the same title after import
  --dry-run                Validate config and list matching dashboards without importing
  --help                   Show this message
`);
}

function parseArgs(argv) {
  const options = {
    dashboard: defaultDashboardPath,
    openobserveUrl: process.env.NEUROLINK_OPENOBSERVE_URL ?? "http://localhost:5080",
    org: process.env.NEUROLINK_OPENOBSERVE_ORG ?? "default",
    user: process.env.NEUROLINK_OPENOBSERVE_USER ?? "root@example.com",
    password:
      process.env.NEUROLINK_OPENOBSERVE_PASSWORD ?? "Complexpass#123",
    replaceByTitle: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--dashboard":
        options.dashboard = argv[index + 1];
        index += 1;
        break;
      case "--openobserve-url":
        options.openobserveUrl = argv[index + 1];
        index += 1;
        break;
      case "--org":
        options.org = argv[index + 1];
        index += 1;
        break;
      case "--user":
        options.user = argv[index + 1];
        index += 1;
        break;
      case "--password":
        options.password = argv[index + 1];
        index += 1;
        break;
      case "--replace-by-title":
        options.replaceByTitle = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
        usage();
        process.exit(0);
        break; // satisfy noFallthroughSwitchClause
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function readDashboardTemplate(filePath) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  const template = structuredClone(raw.v5 ?? raw);

  delete template.dashboardId;
  delete template.owner;
  delete template.created;

  if (!template.title) {
    throw new Error(`Dashboard template ${filePath} is missing v5.title`);
  }

  return template;
}

function normalizeDashboardList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.dashboards)) {
    return payload.dashboards;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function dashboardIdOf(item) {
  return item?.dashboardId ?? item?.v5?.dashboardId ?? null;
}

function dashboardTitleOf(item) {
  return item?.title ?? item?.v5?.title ?? null;
}

async function requestJson(url, { user, password, ...init }) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }

  return payload;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dashboard = await readDashboardTemplate(
    path.resolve(process.cwd(), options.dashboard),
  );
  const baseUrl = options.openobserveUrl.replace(/\/+$/, "");
  const dashboardsUrl = `${baseUrl}/api/${options.org}/dashboards`;

  const existingPayload = await requestJson(dashboardsUrl, {
    method: "GET",
    user: options.user,
    password: options.password,
  });
  const existingDashboards = normalizeDashboardList(existingPayload).filter(
    (item) => dashboardTitleOf(item) === dashboard.title,
  );

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          dashboardPath: path.resolve(process.cwd(), options.dashboard),
          title: dashboard.title,
          matchingDashboardIds: existingDashboards
            .map((item) => dashboardIdOf(item))
            .filter(Boolean),
          openobserveUrl: baseUrl,
          org: options.org,
        },
        null,
        2,
      ),
    );
    return;
  }

  const createdPayload = await requestJson(dashboardsUrl, {
    method: "POST",
    body: JSON.stringify(dashboard),
    user: options.user,
    password: options.password,
  });

  const createdDashboardId =
    createdPayload?.dashboardId ??
    createdPayload?.v5?.dashboardId ??
    createdPayload?.data?.dashboardId;

  if (!createdDashboardId) {
    throw new Error("OpenObserve did not return a dashboardId for the new dashboard");
  }

  const deletedDashboardIds = [];

  if (options.replaceByTitle) {
    for (const entry of existingDashboards) {
      const duplicateId = dashboardIdOf(entry);
      if (!duplicateId || duplicateId === createdDashboardId) {
        continue;
      }

      await requestJson(`${dashboardsUrl}/${duplicateId}`, {
        method: "DELETE",
        user: options.user,
        password: options.password,
      });
      deletedDashboardIds.push(duplicateId);
    }
  }

  console.log(
    JSON.stringify(
      {
        title: dashboard.title,
        dashboardId: createdDashboardId,
        deletedDashboardIds,
        openobserveUrl: `${baseUrl}/web/dashboards?org_identifier=${options.org}`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
