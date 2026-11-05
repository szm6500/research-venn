import { parseMap, slug } from "./parse.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const R = 100; // circle radius in SVG units; everything else is derived from it
const PALETTE = ["#52796F", "#C96B4B", "#B58A2A", "#4F6D9A", "#8A5A83", "#5B8C3E"];
const DEAD_ZONE = 0.2 * R; // closer than this to the center, the pointer has no direction
const STICKY = (8 * Math.PI) / 180; // a side has to win by this much before it replaces the current one
const MAX_ARC = (40 * Math.PI) / 180; // widest half-angle of the rim highlight

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

// Smallest angle between two directions, 0 to PI.
function angleBetween(a, b) {
  const turn = (((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(turn - Math.PI);
}

// "Machine Intelligence" -> ["Machine", "Intelligence"]; long names split near the middle.
function splitLabel(label) {
  const words = label.split(/\s+/);
  if (words.length < 2) return [label];
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) [best, bestGap] = [i, gap];
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/**
 * Circles sit evenly on a ring around the origin. The ring is sized so
 * neighbors overlap by about the same amount whatever the count is.
 */
function layout(foundations) {
  const count = foundations.length;
  const ring = count > 1 ? (0.575 * R) / Math.sin(Math.PI / count) : 0;
  const start = count === 2 ? Math.PI : -Math.PI / 2; // two circles side by side, otherwise first on top
  const items = foundations.map((foundation, index) => {
    const angle = start + (index * 2 * Math.PI) / count;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const labelDistance = count > 1 ? ring + 0.42 * R : 0;
    return {
      ...foundation,
      color: foundation.color || PALETTE[index % PALETTE.length],
      cx: ring * ux,
      cy: ring * uy,
      labelX: labelDistance * ux,
      labelY: labelDistance * uy,
      lines: splitLabel(foundation.label),
    };
  });
  const pad = 8;
  const xs = items.map((item) => item.cx);
  const ys = items.map((item) => item.cy);
  const view = {
    x: Math.min(...xs) - R - pad,
    y: Math.min(...ys) - R - pad,
    width: Math.max(...xs) - Math.min(...xs) + 2 * (R + pad),
    height: Math.max(...ys) - Math.min(...ys) + 2 * (R + pad),
  };
  return { items, view };
}

/**
 * Set `element.data = { foundations, intersections }`, give it `src="map.md"`,
 * or set `element.source = "# Markdown text..."`.
 * Emits `research-map-select` with { dimension, value, intersection }.
 */
export class ResearchMap extends HTMLElement {
  static get observedAttributes() { return ["src"]; }

  #data = { foundations: [], intersections: [] };
  #items = [];
  #view = { x: 0, y: 0, width: 1, height: 1 };
  #errors = [];
  #warnings = [];
  #selectedId = null;
  #hoveredId = null;
  #secondaryId = null;
  #pointer = null;
  #pointerType = "mouse";
  #svg = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set data(value) {
    this.#data = {
      foundations: (value?.foundations || []).map((item) => ({ ...item, id: item.id || slug(item.label) })),
      intersections: value?.intersections || [],
    };
    this.#errors = [];
    this.#selectedId = this.#hoveredId = this.#secondaryId = this.#pointer = null;
    const { items, view } = layout(this.#data.foundations);
    this.#items = items;
    this.#view = view;
    this.render();
  }

  get data() { return this.#data; }

  // Markdown text in the format described in parse.js
  set source(text) {
    const result = parseMap(text);
    this.#warnings = result.warnings;
    if (result.warnings.length) console.warn("research-map:\n" + result.warnings.join("\n"));
    if (result.errors.length) {
      this.#errors = result.errors;
      this.render();
      return;
    }
    this.data = result;
  }

  get warnings() { return this.#warnings; }

  connectedCallback() { this.render(); }

  attributeChangedCallback(name, previous, value) {
    if (name === "src" && value) this.#load(value);
  }

  async #load(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      this.source = await response.text();
    } catch (error) {
      this.#errors = [`Could not load ${url} (${error.message}).`];
      this.render();
    }
  }

  #primary() {
    const id = this.#selectedId || this.#hoveredId;
    return this.#items.find((item) => item.id === id) || null;
  }

  #others(primary) {
    return this.#items.filter((item) => item.id !== primary.id);
  }

  #direction(from, to) {
    return Math.atan2(to.cy - from.cy, to.cx - from.cx);
  }

  // Which side of the primary circle is the pointer on? Compare the pointer's
  // direction from the primary's center with the direction to each neighbor.
  #pickSecondary(primary, pointer) {
    const others = this.#others(primary);
    if (!others.length) return null;
    if (others.length === 1) return others[0].id;
    const dx = pointer.x - primary.cx;
    const dy = pointer.y - primary.cy;
    if (Math.hypot(dx, dy) < DEAD_ZONE) return this.#secondaryId;
    const heading = Math.atan2(dy, dx);
    const ranked = others
      .map((other) => ({ id: other.id, gap: angleBetween(heading, this.#direction(primary, other)) }))
      .sort((a, b) => a.gap - b.gap);
    const current = ranked.find((entry) => entry.id === this.#secondaryId);
    if (current && current.gap <= ranked[0].gap + STICKY) return current.id;
    return ranked[0].id;
  }

  // Neighbors in clockwise order, used by the arrow keys.
  #clockwise(primary) {
    const turn = (item) => (((this.#direction(primary, item)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return this.#others(primary).sort((a, b) => turn(a) - turn(b));
  }

  #pointerPosition(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(this.#svg.getScreenCTM().inverse());
    return { x: point.x, y: point.y };
  }

  #track(pointer) {
    this.#pointer = pointer;
    const primary = this.#primary();
    if (primary && pointer) this.#secondaryId = this.#pickSecondary(primary, pointer);
    this.#update();
  }

  #choosePrimary(id, pointer) {
    if ((this.#primary()?.id) !== id) this.#secondaryId = null;
    this.#selectedId = this.#selectedId === id ? null : id;
    this.#hoveredId = id;
    this.#track(pointer);
  }

  #stepSide(primary, direction) {
    const sides = this.#clockwise(primary);
    if (!sides.length) return;
    const at = sides.findIndex((item) => item.id === this.#secondaryId);
    const next = at === -1 ? (direction > 0 ? 0 : sides.length - 1) : (at + direction + sides.length) % sides.length;
    this.#secondaryId = sides[next].id;
    this.#update();
  }

  #update() {
    const primary = this.#primary();
    const secondary = primary ? this.#items.find((item) => item.id === this.#secondaryId) : null;
    const intersection = primary && secondary
      ? this.#data.intersections.find((item) => item.ids.includes(primary.id) && item.ids.includes(secondary.id))
      : null;

    this.shadowRoot.querySelectorAll("[data-foundation]").forEach((node) => {
      const id = node.dataset.foundation;
      node.classList.toggle("primary", id === primary?.id);
      node.classList.toggle("secondary", id === secondary?.id);
      node.classList.toggle("dim", Boolean(primary && id !== primary.id && id !== secondary?.id));
      node.setAttribute("aria-pressed", String(this.#selectedId === id));
    });

    const lens = this.shadowRoot.querySelector(".lens-layer");
    const rim = this.shadowRoot.querySelector(".rim-layer");
    lens.replaceChildren();
    rim.replaceChildren();
    if (primary && secondary) {
      const circle = svgElement("circle", { cx: secondary.cx, cy: secondary.cy, r: R, "clip-path": `url(#clip-${primary.id})`, class: "lens" });
      circle.style.fill = `color-mix(in srgb, ${primary.color} 22%, transparent)`;
      circle.style.stroke = primary.color;
      lens.append(circle);

      // arc on the primary's rim marking the side the pointer is on
      const aim = this.#direction(primary, secondary);
      const gaps = this.#others(primary).map((other) => angleBetween(aim, this.#direction(primary, other))).filter((gap) => gap > 0.01);
      const half = Math.min(MAX_ARC, gaps.length ? Math.min(...gaps) / 2 : MAX_ARC);
      const point = (angle) => `${primary.cx + R * Math.cos(angle)} ${primary.cy + R * Math.sin(angle)}`;
      rim.append(svgElement("path", { d: `M ${point(aim - half)} A ${R} ${R} 0 0 1 ${point(aim + half)}`, stroke: primary.color, class: "rim" }));
    }

    const details = this.shadowRoot.querySelector(".details");
    details.replaceChildren();
    if (!primary || !secondary) return;
    const title = document.createElement("h3");
    title.textContent = intersection?.title || `${primary.label} × ${secondary.label}`;
    details.append(title);
    if (!intersection) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = "Nothing written for this pair yet.";
      details.append(note);
      return;
    }
    intersection.groups.forEach((group) => {
      const section = document.createElement("section");
      const heading = document.createElement("p");
      heading.textContent = group.label;
      const terms = document.createElement("div");
      group.terms.forEach((term) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = term;
        button.addEventListener("click", () => this.dispatchEvent(new CustomEvent("research-map-select", {
          detail: { dimension: group.label.toLowerCase(), value: term, intersection }, bubbles: true, composed: true,
        })));
        terms.append(button);
      });
      section.append(heading, terms);
      details.append(section);
    });
  }

  #renderMessage(lines, heading) {
    const box = document.createElement("div");
    box.className = "problems";
    const title = document.createElement("strong");
    title.textContent = heading;
    const list = document.createElement("ul");
    lines.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.append(item);
    });
    box.append(title, list);
    return box;
  }

  render() {
    if (!this.isConnected) return;
    this.shadowRoot.replaceChildren();
    const style = document.createElement("style");
    style.textContent = STYLES;
    this.shadowRoot.append(style);

    if (this.#errors.length) {
      this.shadowRoot.append(this.#renderMessage(this.#errors, "research-map could not read its input"));
      return;
    }
    if (this.#items.length < 2) return;

    const { x, y, width, height } = this.#view;
    const svg = svgElement("svg", { class: "map", viewBox: `${x} ${y} ${width} ${height}`, role: "group", "aria-label": "Interactive research map" });
    this.#svg = svg;

    const defs = svgElement("defs");
    this.#items.forEach((item) => {
      const clip = svgElement("clipPath", { id: `clip-${item.id}` });
      clip.append(svgElement("circle", { cx: item.cx, cy: item.cy, r: R }));
      defs.append(clip);
    });
    svg.append(defs);

    this.#items.forEach((item) => {
      const group = svgElement("g", { class: "circle", role: "button", tabindex: "0", "data-foundation": item.id, "aria-label": item.label, "aria-pressed": "false" });
      const body = svgElement("circle", { cx: item.cx, cy: item.cy, r: R });
      body.style.fill = `color-mix(in srgb, ${item.color} 13%, transparent)`;
      body.style.stroke = item.color;
      group.append(body);

      const label = svgElement("text", { x: item.labelX, "text-anchor": "middle" });
      label.style.fill = `color-mix(in srgb, ${item.color} 55%, black)`;
      item.lines.forEach((line, index) => {
        const span = svgElement("tspan", { x: item.labelX, y: item.labelY + 4 + (index - (item.lines.length - 1) / 2) * 14 });
        span.textContent = line;
        label.append(span);
      });
      group.append(label);

      group.addEventListener("pointerenter", (event) => {
        if (this.#selectedId) return;
        if (this.#hoveredId !== item.id) this.#secondaryId = null;
        this.#hoveredId = item.id;
        this.#track(this.#pointerPosition(event));
      });
      group.addEventListener("click", (event) => {
        const pointer = this.#pointerPosition(event);
        const primary = this.#primary();
        // On touch there is no hover, so once a circle is selected a tap picks a side
        // instead of switching circles. Tap near the selected circle's center to let go.
        if (this.#pointerType === "touch" && this.#selectedId && Math.hypot(pointer.x - primary.cx, pointer.y - primary.cy) >= DEAD_ZONE) {
          this.#track(pointer);
          return;
        }
        this.#choosePrimary(item.id, pointer);
      });
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.#choosePrimary(item.id, null);
        } else if (this.#selectedId === item.id && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
          event.preventDefault();
          this.#stepSide(item, event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Escape" && this.#selectedId) {
          this.#selectedId = this.#secondaryId = null;
          this.#update();
        }
      });
      svg.append(group);
    });

    svg.append(svgElement("g", { class: "lens-layer" }), svgElement("g", { class: "rim-layer" }));
    const marker = svgElement("g", { "aria-hidden": "true" });
    marker.append(svgElement("circle", { cx: 0, cy: 0, r: 11, fill: "#172033" }), svgElement("path", { d: "M -4 0 H 4 M 0 -4 V 4", stroke: "white", "stroke-width": "1.5" }));
    svg.append(marker);

    svg.addEventListener("pointerdown", (event) => { this.#pointerType = event.pointerType; });
    svg.addEventListener("pointermove", (event) => {
      this.#pointerType = event.pointerType;
      if (event.pointerType !== "touch") this.#track(this.#pointerPosition(event));
    });
    svg.addEventListener("pointerleave", () => {
      if (this.#selectedId) return;
      this.#hoveredId = this.#secondaryId = this.#pointer = null;
      this.#update();
    });

    const columns = document.createElement("div");
    columns.className = "layout";
    const mapWrap = document.createElement("div");
    mapWrap.append(svg);
    const details = document.createElement("aside");
    details.className = "details";
    details.setAttribute("aria-live", "polite");
    columns.append(mapWrap, details);

    const instruction = document.createElement("p");
    instruction.className = "instruction";
    instruction.textContent = "Select a circle, then move toward one of its sides to see what it shares with the neighbor there. Keyboard: Enter selects, arrow keys change side, Escape lets go. Touch: tap a side.";
    this.shadowRoot.append(columns, instruction);
    this.#update();
  }
}

const STYLES = `
  :host { display: block; font-family: Inter, system-ui, sans-serif; color: #172033; }
  .layout { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(230px, .75fr); gap: 24px; align-items: center; }
  .map { width: 100%; overflow: visible; }
  .circle { cursor: pointer; transition: opacity .18s; outline: none; }
  .circle circle { stroke-width: 1.5; }
  .circle.primary circle { stroke-width: 3; }
  .circle:focus-visible circle { stroke-width: 3; stroke-dasharray: 5 4; }
  .circle.dim { opacity: .22; }
  .circle text { font-size: 12px; font-weight: 700; pointer-events: none; }
  .lens-layer, .rim-layer { pointer-events: none; }
  .lens { stroke-width: 1.5; }
  .rim { fill: none; stroke-width: 5; stroke-linecap: round; }
  .details { padding: 18px; border: 1px solid #dce3ed; border-radius: 12px; background: #fff; }
  .details:empty { display: none; }
  .details h3 { margin: 0 0 14px; font-size: 18px; }
  .details section + section { margin-top: 14px; }
  .details p { margin: 0 0 6px; color: #718096; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .details p.note { font-size: 12px; font-weight: 400; letter-spacing: 0; text-transform: none; }
  .details div { display: flex; flex-wrap: wrap; gap: 6px; }
  .details button { padding: 5px 8px; border: 1px solid #dce3ed; border-radius: 999px; background: #fafbff; color: #334155; cursor: pointer; font: 12px Inter, system-ui, sans-serif; }
  .details button:hover { border-color: #52796F; color: #284C43; }
  .instruction { margin: 14px 0 0; color: #718096; font-size: 12px; }
  .problems { padding: 14px 16px; border: 1px solid #e3b4a8; border-radius: 8px; background: #fdf3f0; color: #7a2e1d; font-size: 13px; }
  .problems ul { margin: 8px 0 0; padding-left: 18px; }
  @media (max-width: 620px) { .layout { grid-template-columns: 1fr; } }
`;

if (!customElements.get("research-map")) customElements.define("research-map", ResearchMap);
