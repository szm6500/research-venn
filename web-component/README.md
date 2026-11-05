# research-venn element

A custom element that draws overlapping circles and lets you explore what pairs of them share. Plain JS, no dependencies: `research-venn.js` plus `parse.js`.

## Install

```bash
npm install research-venn
```

```js
import "research-venn";                        // defines <research-venn>
import { parseMap } from "research-venn/parse"; // the Markdown parser, if you want it on its own
```

No bundler? Load it straight from a CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/research-venn/research-venn.js"></script>
```

Or just copy `research-venn.js` and `parse.js` into your site.

## Use it

```html
<script type="module" src="./research-venn.js"></script>
<research-venn src="./map.md"></research-venn>
```

`src` is fetched, so you need a web server (not `file://`). You can also hand it text or objects:

```js
map.source = "# A\n# B\n## A + B\n### Methods\n- Term";   // Markdown text
map.data = { foundations, intersections };                  // already-parsed objects
```

## The Markdown format

```md
# Participatory Design          <!-- one per circle, up to about 10 -->
color: #52796F                  <!-- optional, any CSS color; a palette is used otherwise -->

## Participatory Design + Machine Intelligence   <!-- names must match the circles -->
title: Human–AI collaboration   <!-- optional -->
### Methods                     <!-- any number of groups -->
- Co-design                     <!-- any number of terms -->
```

Layout is computed: circles go evenly around a ring, labels sit outside the overlap, and the fill and label colors come from the circle's color. Mistakes (unknown circle, typo, stray term) show up in the element itself with the line number.

See `example-map.md` for a full file.

## Interaction

Select a circle, then move around inside it. The side you are on picks the neighbor, the shared terms appear next to the map, and an arc on the rim shows the side. Keyboard: Enter selects, arrows change side, Escape lets go. Touch: tap a side, tap near the center to let go.

## Events

```js
map.addEventListener("research-venn-select", ({ detail }) => {
  // detail.dimension  "methods"   (the group name, lowercase)
  // detail.value      "Co-design"
  // detail.intersection  the pair it came from
});
```

## Connecting evidence

`parse.js` also exports `parsePublications` (see `example-publications.md`) and `checkEvidence`, which warns when a tag in your publications is not a term in your map, or the other way round. The demo page in the repo root shows it filtering a list on `research-venn-select`.
