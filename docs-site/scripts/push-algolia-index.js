/**
 * Push search-index.json to Algolia using atomic index replacement.
 *
 * Usage:
 *   ALGOLIA_APP_ID=... ALGOLIA_ADMIN_API_KEY=... node scripts/push-algolia-index.js
 *
 * Reads the build-time generated search-index.json and replaces the Algolia
 * index contents atomically via a temporary index + move operation, so live
 * search is never interrupted.
 */

const fs = require("fs");
const path = require("path");

const INDEX_NAME = "neurolink_docs_v1";
const TMP_INDEX_NAME = `${INDEX_NAME}_tmp`;

async function main() {
  const appId = process.env.ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;

  if (!appId || !adminKey) {
    console.error(
      "Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_API_KEY environment variables",
    );
    process.exit(1);
  }

  // Find the search index — prefer build output, fall back to static
  const buildPath = path.join(__dirname, "..", "build", "search-index.json");
  const staticPath = path.join(__dirname, "..", "static", "search-index.json");
  const indexPath = fs.existsSync(buildPath) ? buildPath : staticPath;

  if (!fs.existsSync(indexPath)) {
    console.error(`Search index not found at ${buildPath} or ${staticPath}`);
    console.error("Run the docs build first to generate search-index.json");
    process.exit(1);
  }

  const records = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  console.log(`Loaded ${records.length} records from ${indexPath}`);

  const headers = {
    "X-Algolia-Application-Id": appId,
    "X-Algolia-API-Key": adminKey,
    "Content-Type": "application/json",
  };

  const tmpBaseUrl = `https://${appId}.algolia.net/1/indexes/${TMP_INDEX_NAME}`;

  // Step 1: Clear the temporary index
  console.log(`Clearing temporary index "${TMP_INDEX_NAME}"...`);
  const clearResp = await fetch(`${tmpBaseUrl}/clear`, {
    method: "POST",
    headers,
  });
  if (!clearResp.ok) {
    const err = await clearResp.text();
    console.error(`Failed to clear temp index: ${clearResp.status} ${err}`);
    process.exit(1);
  }
  const clearResult = await clearResp.json();
  await waitForTask(appId, TMP_INDEX_NAME, headers, clearResult.taskID);

  // Step 2: Configure settings on the temporary index
  console.log("Configuring index settings on temp index...");
  const settingsResp = await fetch(`${tmpBaseUrl}/settings`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      searchableAttributes: [
        "title",
        "hierarchy.lvl0",
        "hierarchy.lvl1",
        "hierarchy.lvl2",
        "hierarchy.lvl3",
        "content",
      ],
      attributesToRetrieve: [
        "title",
        "url",
        "hierarchy",
        "content",
        "objectID",
      ],
      attributesToHighlight: [
        "title",
        "content",
        "hierarchy.lvl0",
        "hierarchy.lvl1",
        "hierarchy.lvl2",
        "hierarchy.lvl3",
      ],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      attributesToSnippet: ["content:30"],
      distinct: true,
      attributeForDistinct: "url",
    }),
  });

  if (!settingsResp.ok) {
    const err = await settingsResp.text();
    console.error(`Failed to configure settings: ${settingsResp.status} ${err}`);
    process.exit(1);
  }
  const settingsResult = await settingsResp.json();
  await waitForTask(appId, TMP_INDEX_NAME, headers, settingsResult.taskID);

  // Step 3: Batch upload records to the temporary index
  const BATCH_SIZE = 1000;
  let uploaded = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const requests = batch.map((record) => ({
      action: "addObject",
      body: record,
    }));

    const batchResp = await fetch(`${tmpBaseUrl}/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ requests }),
    });

    if (!batchResp.ok) {
      const err = await batchResp.text();
      console.error(`Batch upload failed: ${batchResp.status} ${err}`);
      process.exit(1);
    }

    const batchResult = await batchResp.json();
    await waitForTask(appId, TMP_INDEX_NAME, headers, batchResult.taskID);

    uploaded += batch.length;
    console.log(`Uploaded ${uploaded}/${records.length} records`);
  }

  // Step 4: Atomically move temp index to production index
  console.log(
    `Atomically replacing "${INDEX_NAME}" with "${TMP_INDEX_NAME}"...`,
  );
  const moveResp = await fetch(
    `https://${appId}.algolia.net/1/indexes/${TMP_INDEX_NAME}/operation`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        operation: "move",
        destination: INDEX_NAME,
      }),
    },
  );

  if (!moveResp.ok) {
    const err = await moveResp.text();
    console.error(`Failed to move index: ${moveResp.status} ${err}`);
    process.exit(1);
  }

  const moveResult = await moveResp.json();
  await waitForTask(appId, TMP_INDEX_NAME, headers, moveResult.taskID);

  console.log(
    `Done! Pushed ${records.length} records to Algolia index "${INDEX_NAME}" (zero-downtime swap)`,
  );
}

async function waitForTask(appId, indexName, headers, taskID) {
  const url = `https://${appId}.algolia.net/1/indexes/${indexName}/task/${taskID}`;
  for (let i = 0; i < 30; i++) {
    const resp = await fetch(url, { headers });
    if (resp.ok) {
      const data = await resp.json();
      if (data.status === "published") {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn(`Task ${taskID} did not complete within 30s, continuing...`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
