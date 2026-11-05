import "./demo.css";
import "./research-map.js";
import { parseMap, parsePublications, checkEvidence } from "./parse.js";
import mapText from "./example-map.md?raw";
import publicationsText from "./example-publications.md?raw";

const map = document.querySelector("#map");
const list = document.querySelector("#publication-list");
const status = document.querySelector("#filter-status");

map.source = mapText;

const { publications, errors, warnings } = parsePublications(publicationsText);
const problems = [...errors, ...warnings, ...checkEvidence(parseMap(mapText), publications)];
if (problems.length) console.warn("publications:\n" + problems.join("\n"));

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPublications(filter = null) {
  const visible = publications.filter((publication) => !filter || publication.dimensions[filter.dimension]?.includes(filter.value));
  status.textContent = filter ? `Showing records tagged “${filter.value}”.` : "Select an intersection term to filter these records.";
  list.replaceChildren(...visible.map((publication) => {
    const card = element("article", "publication-card");
    const venue = element("div", "venue", publication.venue);
    venue.append(element("span", "", publication.year), element("span", "", publication.type));
    const body = element("div");
    body.append(element("h3", "", publication.title), element("p", "", publication.authors), element("p", "", publication.takeaway));
    card.append(venue, body);
    return card;
  }));
}

const parameters = new URLSearchParams(window.location.search);
const initial = parameters.get("dimension") && parameters.get("value") ? { dimension: parameters.get("dimension"), value: parameters.get("value") } : null;
renderPublications(initial);
map.addEventListener("research-map-select", ({ detail }) => {
  const next = new URLSearchParams({ dimension: detail.dimension, value: detail.value });
  history.replaceState(null, "", `?${next}#publications`);
  renderPublications(detail);
  document.querySelector("#publications").scrollIntoView({ behavior: "smooth", block: "start" });
});
