/**
 * Public OpenAPI YAML fidelity through the built SDK factory.
 * Only ordinary synthetic strings and valid JSON Schema metadata are used.
 */
import "./helpers/credentialFreeEnv.js";
import nodeAssert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import type { JsonObject } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const sdk = await import("../dist/index.js");
nodeAssert.equal(
  typeof sdk.createOpenAPIGenerator,
  "function",
  "Built public SDK lacks createOpenAPIGenerator",
);
const { test, section, runSuite } = defineSuite(
  "Public OpenAPI YAML serialization fidelity",
  { offline: true },
);
const fixtureDocument = JSON.parse(
  readFileSync(
    new URL("./fixtures/serialization/ordinary-strings.json", import.meta.url),
    "utf8",
  ),
) as {
  fixtures: Array<{ id: string; value: string; utf8Hex: string }>;
  extraSchemaTypeControl: JsonObject;
};
nodeAssert.equal(fixtureDocument.fixtures.length, 12);
for (const fixture of fixtureDocument.fixtures) {
  nodeAssert.equal(typeof fixture.id, "string");
  nodeAssert.equal(typeof fixture.value, "string");
  nodeAssert.equal(
    Buffer.from(fixture.value, "utf8").toString("hex"),
    fixture.utf8Hex,
    "Synthetic fixture UTF-8 identity changed",
  );
}

function assertRoundTrip(
  generator: ReturnType<typeof sdk.createOpenAPIGenerator>,
): void {
  const specification = generator.generate();
  nodeAssert.equal(specification.openapi, "3.1.0");
  nodeAssert.deepStrictEqual(
    JSON.parse(generator.toJSON(false)),
    specification,
    "Public JSON and structured specification disagree",
  );
  const yamlText = generator.toYAML();
  nodeAssert.equal(typeof yamlText, "string");
  nodeAssert.ok(yamlText.length > 0, "Public YAML output is empty");
  nodeAssert.deepStrictEqual(
    load(yamlText),
    specification,
    "Parsed public YAML differs from the public JSON specification",
  );
}

section("Ordinary strings retain exact values and types");
for (const fixture of fixtureDocument.fixtures) {
  await test(`public YAML preserves ${fixture.id}`, async () => {
    const schema = {
      type: "string",
      description: fixture.value,
      default: fixture.value,
      enum: [fixture.value, "ordinary alternative"],
    };
    const generator = sdk.createOpenAPIGenerator({
      info: { title: "Ordinary serialization fixture", version: "1.0" },
      customSchemas: { SerializationControl: schema },
    });
    nodeAssert.deepStrictEqual(
      generator.generate().components.schemas.SerializationControl,
      schema,
      "The public generator did not reach the exact input string metadata",
    );
    assertRoundTrip(generator);
  });
}

section("Keys, JSON types, routes and defaults");
await test("public YAML preserves the complete default specification", async () => {
  const generator = sdk.createOpenAPIGenerator();
  nodeAssert.ok(generator.generate().paths["/api/health"]);
  nodeAssert.ok(generator.generate().components.securitySchemes?.bearerAuth);
  assertRoundTrip(generator);
});

await test("public YAML preserves ordinary schema keys, types and empty containers", async () => {
  const schema = fixtureDocument.extraSchemaTypeControl;
  const generator = sdk.createOpenAPIGenerator({
    includeSecurity: false,
    customSchemas: { SerializationControl: schema },
  });
  const specification = generator.generate();
  nodeAssert.equal(specification.security, undefined);
  nodeAssert.equal(specification.components.securitySchemes, undefined);
  nodeAssert.deepStrictEqual(
    specification.components.schemas.SerializationControl,
    schema,
  );
  assertRoundTrip(generator);
});

await test("public YAML preserves a documented parameterized route", async () => {
  const generator = sdk.createOpenAPIGenerator({
    routes: [
      {
        method: "POST",
        path: "/api/serialization/:documentId",
        handler: async () => ({ documented: true }),
        description: 'Read an ordinary document at "café"',
        tags: ["documentation"],
        auth: true,
        requestSchema: {
          type: "object",
          properties: { label: { type: "string" } },
        },
        responseSchema: {
          type: "object",
          properties: { documented: { type: "boolean" } },
        },
      },
    ],
  });
  nodeAssert.ok(
    generator.generate().paths["/api/serialization/{documentId}"]?.post,
    "The public parameterized route was not documented",
  );
  assertRoundTrip(generator);
});

await runSuite();
