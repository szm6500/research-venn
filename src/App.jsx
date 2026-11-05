import VennDiagram from "./components/VennDiagram";
import Publications from "./pages/Publications";

export default function App() {
  return (
    <>
      <header className="topbar"><div className="nav-inner"><a className="brand" href="#explorer"><span className="brand-mark">RM</span><span>Research Map</span></a><nav className="nav-tabs"><a href="#explorer">Explore</a><a href="#publications">Evidence</a><a href="#data-model">Data model</a></nav></div></header>
      <main className="main standalone-main">
        <section className="map-intro" id="explorer"><p className="eyebrow">Interactive research communication</p><h1>Make a research agenda <span>navigable.</span></h1><p>Research Map turns conceptual foundations into an explorable visual system. Select a foundation, move toward a neighboring one, and use an intersection term to find the work that supports the story.</p><p className="demo-note">The content below is illustrative demo data.</p></section>
        <VennDiagram />
        <section className="data-model-section" id="data-model"><p className="eyebrow">Portable by design</p><h2>One interaction, backed by connected JSON.</h2><p>The diagram, its intersection vocabulary, and the evidence list are separate data sources. Change the JSON to adapt this component for a website, product surface, prototype, or a Figma handoff.</p><div className="data-flow"><code>researchFoundations.json</code><span>+</span><code>researchIntersections.json</code><span>→</span><code>VennDiagram</code><span>→</span><code>?dimension=value</code><span>→</span><code>publications.json</code></div></section>
        <section className="evidence-section" id="publications"><Publications /></section>
      </main>
      <footer className="main-footer">Research Map · demo component</footer>
    </>
  );
}
