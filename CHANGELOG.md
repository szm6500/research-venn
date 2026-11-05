# Changelog

Notable changes to this project, newest first.

## 0.1.0 - 2026-11-05

Rebuilt as a standalone web component with a Markdown input.

### Added
- Markdown input for the map (`# circle`, `## A + B`, `### group`, `- term`) and a parser for it, `web-component/parse.js`.
- Layout is computed from the number of circles instead of hardcoded. Circles sit evenly on a ring, and labels, viewBox and colors are derived. 2 to 5 circles works well; the parser warns above that.
- Optional `color:` per circle (any CSS color), with a built-in palette as the default.
- Side-of-circle pointer rule: the angle from the selected circle's center to the pointer picks the neighbor, replacing the nearest-center rule. It has a dead zone in the middle and a little stickiness at side borders.
- Arc on the selected circle's rim showing the active side.
- Keyboard support (Enter selects, arrows change side, Escape lets go) and touch support (tap a side).
- `<research-map src="map.md">`, plus `.source` for Markdown text and `.data` for parsed objects.
- Input errors are shown in the element with line numbers and "did you mean" hints.
- Publications as Markdown (`parsePublications`) and `checkEvidence`, which warns when tags and map terms don't match.
- Parser tests, run with `npm test`.
- MIT license.

### Changed
- Moved from a React app to a dependency-free native Web Component (`web-component/`). The React code is gone.
- Demo data moved from JSON files and `demo-data.js` to `example-map.md` and `example-publications.md`.
- The demo builds publication cards with DOM methods instead of `innerHTML`.
- README rewritten for the new version.

## 2026-10-29

Initial version: a React component with three hardcoded circles, JSON data files, and a demo page deployed to GitHub Pages.
