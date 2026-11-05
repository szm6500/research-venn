import { useEffect, useState } from "react";
import publications from "../data/publications.json";
import intersections from "../data/researchIntersections.json";
import PublicationList from "../components/PublicationList";

const groups = Object.values(intersections.flatMap((item) => item.groups).reduce((all, group) => {
  const key = group.label.toLowerCase();
  if (!all[key]) all[key] = { key, label: group.label, terms: [] };
  all[key].terms = [...new Set([...all[key].terms, ...group.terms])];
  return all;
}, {}));
function filterFromUrl() { const p = new URLSearchParams(window.location.search); const dimension = p.get("dimension"); const value = p.get("value"); return groups.find((g) => g.key === dimension)?.terms.includes(value) ? { dimension, value } : null; }

export default function Publications() {
  const [active, setActive] = useState(filterFromUrl);
  useEffect(() => { const sync = () => setActive(filterFromUrl()); window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, []);
  const filtered = publications.filter((item) => !active || item.dimensions?.[active.dimension]?.includes(active.value));
  function setFilter(dimension, value) { const next = dimension ? { dimension, value } : null; setActive(next); const p = new URLSearchParams(window.location.search); if (next) { p.set("dimension", dimension); p.set("value", value); } else { p.delete("dimension"); p.delete("value"); } window.history.replaceState(null, "", `${p.size ? `?${p}` : ""}#publications`); }
  return <><p className="eyebrow">Evidence layer</p><h2>The metadata makes the map accountable.</h2><p className="evidence-intro">Each interaction term hands off its selection through the URL and filters connected publication metadata.</p><label className="filter-select-label"><span>Explore a dimension</span><select value={active ? `${active.dimension}:${active.value}` : ""} onChange={(e) => { if (!e.target.value) return setFilter(null, null); const [dimension, value] = e.target.value.split(":"); setFilter(dimension, value); }}><option value="">All example publications</option>{groups.map((group) => <optgroup key={group.key} label={group.label}>{group.terms.map((term) => <option key={term} value={`${group.key}:${term}`}>{term}</option>)}</optgroup>)}</select></label>{active && <p className="publication-filter-status">Showing example publications tagged <strong>{active.value}</strong> <button className="dimension-reset" onClick={() => setFilter(null, null)}>Show all</button></p>}{filtered.length ? <PublicationList publications={filtered} /> : <p className="publication-empty">No example publications are tagged with this term yet.</p>}</>;
}
