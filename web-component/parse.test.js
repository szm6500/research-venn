import test from "node:test";
import assert from "node:assert/strict";
import { parseMap, parsePublications, checkEvidence } from "./parse.js";

const good = `
# Alpha
color: #123456
# Beta
# Gamma

## Alpha + Beta
title: Shared
### Methods
- One
- Two
`;

test("parses circles, settings and pairs", () => {
  const result = parseMap(good);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.foundations.map((f) => f.id), ["alpha", "beta", "gamma"]);
  assert.equal(result.foundations[0].color, "#123456");
  assert.deepEqual(result.intersections[0].ids, ["alpha", "beta"]);
  assert.equal(result.intersections[0].title, "Shared");
  assert.deepEqual(result.intersections[0].groups, [{ label: "Methods", terms: ["One", "Two"] }]);
});

test("pair order in the file does not matter and gets a default title", () => {
  const result = parseMap("# A\n# B\n## B + A\n### G\n- t\n");
  assert.deepEqual(result.errors, []);
  assert.equal(result.intersections[0].title, "B × A");
});

test("typos in a pair heading are reported with a suggestion", () => {
  const result = parseMap("# Public Systems\n# Other\n## Public System + Other\n");
  assert.match(result.errors[0], /did you mean "Public Systems"/);
});

test("rejects fewer than two circles, duplicate pairs and stray terms", () => {
  assert.ok(parseMap("# Only").errors.length);
  assert.ok(parseMap("# A\n# B\n## A + B\n## B + A\n").errors.some((e) => /already described/.test(e)));
  assert.ok(parseMap("# A\n# B\n- loose\n").errors.some((e) => /no "### Group"/.test(e)));
});

test("warns about too many circles and unknown settings", () => {
  const many = Array.from({ length: 6 }, (_, i) => `# C${i}`).join("\n");
  assert.ok(parseMap(many).warnings.some((w) => /6 circles/.test(w)));
  assert.ok(parseMap("# A\nflavor: x\n# B").warnings.some((w) => /unknown setting/.test(w)));
});

test("publications: plain fields and tag lists", () => {
  const { publications, errors } = parsePublications("## Paper\nyear: 2025\nvenue: V\nMethods: Co-design, Prototyping\n");
  assert.deepEqual(errors, []);
  assert.equal(publications[0].year, 2025);
  assert.deepEqual(publications[0].dimensions, { methods: ["Co-design", "Prototyping"] });
});

test("checkEvidence flags unknown and unused tags", () => {
  const map = parseMap(good);
  const { publications } = parsePublications("## P\nmethods: One, Nope\nflavor: x\n");
  const warnings = checkEvidence(map, publications);
  assert.ok(warnings.some((w) => /"Nope" is not a term/.test(w)));
  assert.ok(warnings.some((w) => /"flavor" is not a group/.test(w)));
  assert.ok(warnings.some((w) => /methods \/ Two/.test(w)));
});
