// Turns the plain-text Markdown input into the plain objects <research-map> draws.
// Nothing here touches the DOM, so it also runs in Node (see parse.test.js).

export function slug(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

// "did you mean" for typos in circle names
function closest(name, candidates) {
  const target = name.toLowerCase();
  let best = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const score = editDistance(target, candidate.toLowerCase());
    if (score < bestScore) [best, bestScore] = [candidate, score];
  }
  return bestScore <= Math.max(2, Math.floor(target.length / 3)) ? best : null;
}

const KEY_VALUE = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/;

/**
 * Map format:
 *   # Circle name            one per circle
 *   color: #52796F           optional, any CSS color
 *   ## Circle A + Circle B   one per pair you want to describe
 *   title: Some heading      optional
 *   ### Group name           any number of groups
 *   - a term                 any number of terms
 */
export function parseMap(text) {
  const errors = [];
  const warnings = [];
  const foundations = [];
  const pending = []; // pair headings, resolved once every circle is known

  let target = null; // where "key: value" lines go: a circle or a pair
  let group = null;

  String(text).split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const where = `line ${index + 1}`;
    if (!line || line.startsWith("<!--")) return;

    let match;
    if ((match = line.match(/^###\s+(.+)$/))) {
      if (!target?.names) {
        errors.push(`${where}: group "${match[1]}" needs a "## A + B" heading above it.`);
        return;
      }
      group = { label: match[1].trim(), terms: [] };
      target.groups.push(group);
    } else if ((match = line.match(/^##\s+(.+)$/))) {
      group = null;
      target = { names: match[1].split(/\s*(?:\+|×)\s*/).map((name) => name.trim()), groups: [], where, title: null };
      pending.push(target);
    } else if ((match = line.match(/^#\s+(.+)$/))) {
      group = null;
      const label = match[1].trim();
      target = { id: slug(label), label, where };
      if (foundations.some((item) => item.id === target.id)) {
        errors.push(`${where}: there are two circles called "${label}".`);
      }
      foundations.push(target);
    } else if ((match = line.match(/^[-*+]\s+(.+)$/))) {
      if (!group) errors.push(`${where}: "${match[1]}" is a term but there is no "### Group" above it.`);
      else group.terms.push(match[1].trim());
    } else if (!group && target && (match = line.match(KEY_VALUE))) {
      const key = match[1].toLowerCase();
      const allowed = target.names ? ["title"] : ["color", "tagline"];
      if (allowed.includes(key)) target[key] = match[2].trim();
      else warnings.push(`${where}: unknown setting "${match[1]}" (allowed here: ${allowed.join(", ")}).`);
    } else {
      warnings.push(`${where}: ignored "${line}".`);
    }
  });

  if (foundations.length < 2) errors.push("Add at least two circles, each starting with a line like: # My Area");
  if (foundations.length > 5) {
    warnings.push(`${foundations.length} circles is a lot. Layouts are tuned for 2 to 5; some pairs will not overlap.`);
  }

  const byName = new Map(foundations.map((item) => [item.label.toLowerCase(), item]));
  const intersections = [];
  const seen = new Set();
  for (const item of pending) {
    if (item.names.length !== 2) {
      errors.push(`${item.where}: a pair heading needs exactly two circles, like "## A + B".`);
      continue;
    }
    const found = item.names.map((name) => byName.get(name.toLowerCase()));
    item.names.forEach((name, i) => {
      if (found[i]) return;
      const hint = closest(name, foundations.map((entry) => entry.label));
      errors.push(`${item.where}: no circle called "${name}"${hint ? ` (did you mean "${hint}"?)` : ""}.`);
    });
    if (found.some((entry) => !entry)) continue;
    if (found[0] === found[1]) {
      errors.push(`${item.where}: "${item.names[0]}" is paired with itself.`);
      continue;
    }
    const ids = found.map((entry) => entry.id);
    const key = [...ids].sort().join("|");
    if (seen.has(key)) {
      errors.push(`${item.where}: the pair "${found[0].label} + ${found[1].label}" is already described.`);
      continue;
    }
    seen.add(key);
    item.groups.filter((entry) => !entry.terms.length).forEach((entry) => {
      warnings.push(`${item.where}: group "${entry.label}" has no terms.`);
    });
    intersections.push({ ids, title: item.title || `${found[0].label} × ${found[1].label}`, groups: item.groups });
  }

  return {
    foundations: foundations.map(({ id, label, color, tagline }) => ({ id, label, ...(color && { color }), ...(tagline && { tagline }) })),
    intersections,
    errors,
    warnings,
  };
}

const PUBLICATION_FIELDS = new Set(["venue", "year", "type", "authors", "takeaway", "url"]);

/**
 * Evidence format. One "## Title" per record, then "key: value" lines.
 * venue, year, type, authors, takeaway and url are plain fields. Any other key
 * is a tag list (comma separated) whose name must match a group in the map.
 */
export function parsePublications(text) {
  const errors = [];
  const warnings = [];
  const publications = [];
  let current = null;

  String(text).split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const where = `line ${index + 1}`;
    if (!line || line.startsWith("<!--")) return;
    let match;
    if ((match = line.match(/^##?\s+(.+)$/))) {
      current = { id: slug(match[1]), title: match[1].trim(), dimensions: {} };
      publications.push(current);
    } else if ((match = line.match(KEY_VALUE))) {
      if (!current) return void errors.push(`${where}: "${line}" comes before any "## Title".`);
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      if (PUBLICATION_FIELDS.has(key)) current[key] = key === "year" && /^\d+$/.test(value) ? Number(value) : value;
      else current.dimensions[key] = value.split(",").map((term) => term.trim()).filter(Boolean);
    } else {
      warnings.push(`${where}: ignored "${line}".`);
    }
  });

  return { publications, errors, warnings };
}

// Compares the tags used in the evidence with the vocabulary in the map.
export function checkEvidence(map, publications) {
  const warnings = [];
  const vocabulary = new Map();
  map.intersections.forEach((intersection) => intersection.groups.forEach((group) => {
    const key = group.label.toLowerCase();
    if (!vocabulary.has(key)) vocabulary.set(key, new Set());
    group.terms.forEach((term) => vocabulary.get(key).add(term));
  }));

  const used = new Map([...vocabulary.keys()].map((key) => [key, new Set()]));
  publications.forEach((publication) => {
    Object.entries(publication.dimensions).forEach(([dimension, terms]) => {
      if (!vocabulary.has(dimension)) {
        warnings.push(`"${publication.title}": "${dimension}" is not a group in the map.`);
        return;
      }
      terms.forEach((term) => {
        if (vocabulary.get(dimension).has(term)) used.get(dimension).add(term);
        else warnings.push(`"${publication.title}": "${term}" is not a term under "${dimension}" in the map.`);
      });
    });
  });
  vocabulary.forEach((terms, dimension) => terms.forEach((term) => {
    if (!used.get(dimension).has(term)) warnings.push(`Nothing is tagged ${dimension} / ${term} yet.`);
  }));
  return warnings;
}
