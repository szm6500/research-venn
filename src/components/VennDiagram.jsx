import { useState } from "react";
import foundations from "../data/researchFoundations.json";
import intersections from "../data/researchIntersections.json";
import SectionHeading from "./SectionHeading";

const radius = 98.4;
const viewBox = { x: 0, y: -5, width: 320, height: 305 };

function getIntersection(firstId, secondId) {
  return intersections.find(
    (item) => item.ids.includes(firstId) && item.ids.includes(secondId),
  );
}

function publicationFilterHref(label, term) {
  const params = new URLSearchParams({
    dimension: label.toLowerCase(),
    value: term,
  });
  return `?${params.toString()}#publications`;
}

export default function VennDiagram() {
  const [selectedPrimaryId, setSelectedPrimaryId] = useState(null);
  const [hoveredPrimaryId, setHoveredPrimaryId] = useState(null);
  const [pointer, setPointer] = useState(null);
  const primaryId = selectedPrimaryId || hoveredPrimaryId;
  const primary = foundations.find((item) => item.id === primaryId);
  const secondary =
    primary && pointer
      ? foundations
          .filter((item) => item.id !== primary.id)
          .sort(
            (first, second) =>
              Math.hypot(
                pointer.x - first.geometry.cx,
                pointer.y - first.geometry.cy,
              ) -
              Math.hypot(
                pointer.x - second.geometry.cx,
                pointer.y - second.geometry.cy,
              ),
          )[0]
      : null;
  const intersection =
    primary && secondary ? getIntersection(primary.id, secondary.id) : null;
  const windowPosition = intersection?.positions?.[primary?.id];

  function pointerPosition(event, target = event.currentTarget) {
    const bounds = target.getBoundingClientRect();
    return {
      x:
        viewBox.x +
        ((event.clientX - bounds.left) / bounds.width) * viewBox.width,
      y:
        viewBox.y +
        ((event.clientY - bounds.top) / bounds.height) * viewBox.height,
    };
  }

  function choosePrimary(id, nextPointer) {
    setSelectedPrimaryId((current) => (current === id ? null : id));
    setHoveredPrimaryId(id);
    const foundation = foundations.find((item) => item.id === id);
    setPointer(
      nextPointer || { x: foundation.geometry.cx, y: foundation.geometry.cy },
    );
  }

  return (
    <section className="research-section" aria-labelledby="research-title">
      <SectionHeading
        id="research-title"
        title="Explore the research map"
        help="Select a foundation, then move toward a neighboring foundation to reveal their overlap."
      />
      <div
        className={`venn-foundation-layout ${intersection ? "has-foundation" : ""}`}
        onPointerLeave={() => {
          if (!selectedPrimaryId) {
            setHoveredPrimaryId(null);
            setPointer(null);
          }
        }}
      >
        <div className="venn-wrap">
          <svg
            className="venn foundation-venn"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            aria-labelledby="venn-title venn-desc"
            onPointerMove={(event) => {
              if (event.pointerType !== "touch")
                setPointer(pointerPosition(event));
            }}
            onPointerDown={(event) => setPointer(pointerPosition(event))}
          >
            <title id="venn-title">Three connected research foundations</title>
            <desc id="venn-desc">Select a circle to explore an intersection, then choose a term to filter its linked evidence.</desc>
            <defs>
              {foundations.map((item) => (
                <clipPath id={`clip-${item.id}`} key={item.id}>
                  <circle
                    cx={item.geometry.cx}
                    cy={item.geometry.cy}
                    r={radius}
                  />
                </clipPath>
              ))}
            </defs>
            {foundations.map((item) => {
              const isPrimary = item.id === primaryId;
              const isSecondary = item.id === secondary?.id;
              const isDimmed = primaryId && !isPrimary && !isSecondary;
              return (
                <g
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  data-foundation={item.id}
                  aria-label={`${item.label}: ${item.foundation}`}
                  aria-pressed={selectedPrimaryId === item.id}
                  className={`${isPrimary ? "is-primary" : ""} ${isSecondary ? "is-secondary" : ""} ${isDimmed ? "is-dimmed" : ""}`}
                  onPointerEnter={(event) => {
                    if (!selectedPrimaryId) {
                      setHoveredPrimaryId(item.id);
                      setPointer(
                        pointerPosition(
                          event,
                          event.currentTarget.ownerSVGElement,
                        ),
                      );
                    }
                  }}
                  onFocus={() => {
                    if (!selectedPrimaryId) {
                      setHoveredPrimaryId(item.id);
                      setPointer({
                        x: item.geometry.cx,
                        y: item.geometry.cy,
                      });
                    }
                  }}
                  onBlur={() => {
                    if (!selectedPrimaryId) {
                      setHoveredPrimaryId(null);
                      setPointer(null);
                    }
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    choosePrimary(
                      item.id,
                      pointerPosition(
                        event,
                        event.currentTarget.ownerSVGElement,
                      ),
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      choosePrimary(item.id);
                    }
                  }}
                >
                  <circle
                    className="pillar-circle"
                    cx={item.geometry.cx}
                    cy={item.geometry.cy}
                    r={radius}
                    fill={item.fill}
                    stroke={item.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                  />
                  <text
                    x={item.geometry.x}
                    y={item.geometry.y}
                    textAnchor="middle"
                    fill={item.labelColor}
                  >
                    {item.labelLines
                      ? item.labelLines.map((line, index) => (
                          <tspan
                            key={line}
                            x={item.geometry.x}
                            dy={index === 0 ? 0 : 14}
                          >
                            {line}
                          </tspan>
                        ))
                      : item.label}
                  </text>
                </g>
              );
            })}
            {primary && secondary && intersection && (
              <circle
                className="venn-intersection"
                cx={secondary.geometry.cx}
                cy={secondary.geometry.cy}
                r={radius}
                fill={primary.fill}
                stroke={primary.color}
                strokeWidth="1.5"
                strokeOpacity="0.85"
                clipPath={`url(#clip-${primary.id})`}
              />
            )}
            <g className="venn-node" aria-hidden="true">
              <circle cx="160" cy="158" r="11" />
              <path d="M156 158H164M160 154V162" />
            </g>
          </svg>
        </div>

        <div
          className={`foundation-reveal ${windowPosition ? `window-${windowPosition}` : ""}`}
          aria-live="polite"
        >
          {intersection && primary && secondary && (
            <article
              className="foundation-card"
              style={{ "--foundation-color": primary.color }}
            >
              <h3>{intersection.foundation}</h3>
              <div
                className="foundation-cloud"
                aria-label={`${intersection.foundation} research concepts`}
              >
                {intersection.groups.map((group) => (
                  <div className="foundation-group" key={group.label}>
                    <p>{group.label}</p>
                    <div>
                      {group.terms.map((term, index) => (
                        <a
                          key={term}
                          className="foundation-term"
                          href={publicationFilterHref(group.label, term)}
                          style={{ "--word-index": index }}
                          aria-label={`View publications about ${term}`}
                        >
                          {term}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      </div>
      <p className="venn-instruction">
        Select a circle, then move toward either neighboring circle to explore
        that intersection.
      </p>
    </section>
  );
}
