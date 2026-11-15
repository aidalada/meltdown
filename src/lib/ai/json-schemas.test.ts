import { expect, it } from "vitest";
import { COACH_OUTPUT_JSON_SCHEMA, DEBRIEF_OUTPUT_JSON_SCHEMA, SCENARIO_OUTPUT_JSON_SCHEMA, TURN_OUTPUT_JSON_SCHEMA } from "./json-schemas";

const forbidden = ["minLength", "maxLength", "minimum", "maximum", "maxItems"];

function checkSchema(value: unknown, path: string): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkSchema(item, `${path}[${index}]`));
    return;
  }
  const node = value as Record<string, unknown>;
  for (const key of forbidden) expect(node, path).not.toHaveProperty(key);
  if (node.type === "object") {
    expect(node.additionalProperties, path).toBe(false);
    expect(node.properties, path).toBeTypeOf("object");
    expect(Array.isArray(node.required), path).toBe(true);
    const required = node.required as string[];
    expect([...required].sort(), path).toEqual(Object.keys(node.properties as object).sort());
  }
  for (const [key, child] of Object.entries(node)) checkSchema(child, `${path}.${key}`);
}

it.each([
  ["turn", TURN_OUTPUT_JSON_SCHEMA], ["scenario", SCENARIO_OUTPUT_JSON_SCHEMA], ["debrief", DEBRIEF_OUTPUT_JSON_SCHEMA],
  ["coach", COACH_OUTPUT_JSON_SCHEMA],
] as const)("uses supported constraints and closed, fully required objects in %s", (name, schema) => {
  expect(schema.type).toBe("object");
  checkSchema(schema, name);
});
