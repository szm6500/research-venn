# Research Venn

A small interaction for explaining a research agenda as a connected system instead of a chronological list of papers. You describe your areas in a Markdown file and it draws overlapping circles you can explore.

This is a side project, not a product. It works, but it's rough in places (there's a list of those at the bottom).

## Why I made this

The question I started with: how can someone communicate a research identity, and how earlier work connects to what comes next, more clearly than a list of topics or papers?

I went bottom-up. Start with the publications or projects you already have, tag them with a controlled vocabulary, then use those shared tags to find the intersections and build a visual explanation from them. The diagram is just one view of the data. The publication tags are the evidence behind it.

## How it works

1. Select a circle.
2. Move around inside it. Which side of the circle you're on decides which neighbor you're looking at, and what the two share shows up next to the map.
3. Click a term. It gets passed along as `?dimension=value` and filters the evidence below.

### The pointer rule

This is the part I care about most. Once a circle is selected (or hovered), I turn the pointer position into SVG coordinates and take the angle from that circle's center to the pointer. Then I compare it with the angle from the same center to every other circle's center. The neighbor with the smallest difference wins, and that pair decides which intersection is shown. A short arc on the selected circle's rim shows which side is active.

So you never have to aim at the tiny overlap area. You just move toward the neighbor you want.

Two small things keep it from feeling twitchy: a dead zone around the middle of the circle (no direction there, so it keeps the current side), and a few degrees of stickiness at the borders between sides so it doesn't flip back and forth. Because it's only an angle, it works the same for any number of circles.

It also works without a mouse. Enter selects a circle, arrow keys move between sides, Escape lets go. On touch, tap a side (tap near the center to let go).

## The map file

Circles, colors and layout are generated from a Markdown file, so there's no geometry or pixel coordinates to edit.

```md
# Participatory Design
color: #52796F
# Machine Intelligence

## Participatory Design + Machine Intelligence
title: Human-AI collaboration
### Methods
- Co-design
- Prototyping
```

- `# Name` is a circle. Add as many as you want. Up to 5 the circles stay the same size. After that they shrink and the labels move outside the ring, and it reads fine up to about 10 (the parser warns past that).
- `color:` is optional and can be any CSS color. Without it a built-in palette is used. The fill and label colors are derived from it.
- `## A + B` describes what two circles share. The names have to match the circles above.
- `### Group` and `- term` are the vocabulary for that pair. Any number of each.

If something's wrong (mistyped circle name, a term with no group) the error shows up on the page with the line number, and it suggests the name you probably meant.

The circles go evenly around a ring. The size is picked so neighbors overlap by about the same amount whatever the count is. With more circles, pairs that aren't neighbors stop touching. You can still pick them with the pointer or the arrow keys, and instead of a shaded overlap you get a dashed line between the two circles.

## Evidence

The publications are Markdown too (`web-component/example-publications.md`):

```md
## Co-designing AI Tools With Frontline Practitioners
venue: Example Conference
year: 2026
methods: Co-design, Prototyping
```

`venue`, `year`, `type`, `authors`, `takeaway` and `url` are normal fields. Any other key is a list of tags, and its name has to match a group in the map (lowercase), with the same terms. That's what connects a clicked term to actual papers. If a tag doesn't match anything, or a term in the map has no paper behind it, the demo prints a warning in the console.

The content in this repo is made-up demo data.

## Using it

The element is plain JavaScript with no dependencies: `web-component/research-venn.js` and `web-component/parse.js`. Copy those and your Markdown file into any static site, or `npm install research-venn`:

```html
<script type="module" src="./research-venn.js"></script>
<research-venn src="./map.md"></research-venn>
```

`src` is fetched, so you need a web server (it won't work from `file://`). You can also give it text (`map.source = "..."`) or already-parsed objects (`map.data = {...}`). It fires a `research-venn-select` event with the clicked term, and your page decides what to do with it, like filtering a list. The details are in the [component README](./web-component/README.md).

To run the demo page:

```bash
npm install
npm run dev
```

`npm run build` makes the production build, and `npm test` runs the parser tests.

To make it yours, clone it and replace the two example files in `web-component/`: `example-map.md` for your circles and vocabulary, and `example-publications.md` for your papers.

## On my website

A version of this runs on my site, [sammoradzadeh.me](https://www.sammoradzadeh.me/). It's the same idea, tweaked for a real homepage, so it's different from this repo in a few ways:

- It's a React component in the site's code, not a web component. The JSON (circles, pairs, page text) is imported at build time and bundled with the site, so nothing is fetched when the page loads.
- It has my three research areas, and the geometry and colors are written by hand in JSON.
- It still uses the older rule, where the neighbor is whichever circle center is nearest to the pointer. The angle rule, rim arc and keyboard side-switching are only in this repo so far.
- Clicking a term opens my publications section in a new tab, already filtered. Here the element just fires an event.
- The revealed terms show up in a floating panel next to the diagram, and each pair can set where that panel goes. The terms also animate in one by one.
- Tabbing onto a circle previews it, and the SVG has a title and description for screen readers.
- It sits inside a section of the page with the rest of the site around it and uses the site's styling.

## Rough edges and what I'd like to do next

- Only the Markdown parser has tests. The component itself I've only checked by hand in a browser.
- Past 5 circles the circles get smaller, and by 10 the text is small and the diagram gets crowded.
- Only pairs of circles, not three-way overlaps.
- Parser errors aren't sorted by line number.
- Publication tags are matched by exact text, so "Co-design" and "co-design" count as different.
- The demo data is fictional. A real example would be better.

## License

MIT, see [LICENSE](./LICENSE). Use it, change it, put it on your own site.
