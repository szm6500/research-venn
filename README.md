# Research Map

Research Map is a JSON-driven interaction pattern for communicating a research agenda as a connected system, rather than a chronological publication list.

## Interaction

1. Select a foundation in the diagram.
2. Move toward a neighboring foundation to reveal their overlap.
3. Select an intersection term.
4. The term is passed as `?dimension=value` and filters the connected evidence metadata.

## Data contract

| File | Purpose |
| --- | --- |
| `src/data/researchFoundations.json` | Diagram foundations, labels, colors, and geometry. |
| `src/data/researchIntersections.json` | Foundation pairs and their grouped vocabulary. |
| `src/data/publications.json` | Evidence records and the dimension tags the interaction filters. |

Publication `dimensions` keys and terms must match the lowercase group label and terms in `researchIntersections.json`. That shared vocabulary is the JSON pipeline connecting the interaction to evidence.

The visual component is `src/components/VennDiagram.jsx`. The data contract can be reused in a website, app, or Figma handoff. The included content is fictional demo data.

## Run locally

```bash
npm install
npm run dev
```

Build the production site with `npm run build`.
