import assert from "node:assert/strict";
import test from "node:test";
import { resolveTagIds } from "../src/lib/tags.js";

const tags = [
  { id: "tag_career", name: "Career" },
  { id: "tag_work", name: "Work" },
  { id: "custom_1", name: "Work" },
];

test("resolves tag IDs directly", () => {
  assert.deepEqual(resolveTagIds(["tag_career"], tags), ["tag_career"]);
});

test("resolves exact tag names", () => {
  assert.deepEqual(resolveTagIds(["Career"], tags), ["tag_career"]);
});

test("rejects unknown tag names with available tags", () => {
  assert.throws(() => resolveTagIds(["Health"], tags), /Available tags: Career, Work/);
});

test("rejects ambiguous tag names", () => {
  assert.throws(() => resolveTagIds(["Work"], tags), /Tag "Work" is ambiguous/);
});
