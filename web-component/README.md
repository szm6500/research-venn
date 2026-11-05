# research-map element

A custom element that draws overlapping circles and lets you explore what pairs of them share. Plain JS, no dependencies: `research-map.js` plus `parse.js`.

## Use it

```html
<script type="module" src="./research-map.js"></script>
<research-map src="./map.md"></research-map>
```

`src` is fetched, so you need a web server (not `file://`). You can also hand it text or objects:

```js
map.source = "# A\n# B\n## A + B\n### Methods\n- Term";   // Markdown text
map.data = { foundations, intersections };                  // already-parsed objects
```

## The Markdown format

```md
# Participatory Design          <!-- one per circle, 2 to 5 works best -->
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
map.addEventListener("research-map-select", ({ detail }) => {
  // detail.dimension  "methods"   (the group name, lowercase)
  // detail.value      "Co-design"
  // detail.intersection  the pair it came from
});
```

## Connecting evidence

`parse.js` also exports `parsePublications` (see `example-publications.md`) and `checkEvidence`, which warns when a tag in your publications is not a term in your map, or the other way round. The demo page in the repo root shows it filtering a list on `research-map-select`.
